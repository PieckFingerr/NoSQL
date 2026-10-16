const fs = require('node:fs/promises');
const path = require('node:path');
const { BSON } = require('mongodb');
const { EJSON } = BSON;
const { getDb, transaction } = require('../config/database');
const Business = require('./business');
const v = require('../utils/validation');
const { fail } = require('../utils/errors');
const backupDirectory = path.resolve(__dirname,'../../backups');
function parse(buffer) {
  if (!buffer) fail(400,'A JSON file is required.');
  try {return EJSON.parse(buffer.toString('utf8'),{relaxed:false});}
  catch {fail(400,'File must contain valid JSON or MongoDB Extended JSON.');}
}
function filename(value) {
  if (typeof value!=='string' || !/^backup-[\w-]+\.json$/.test(value)) fail(400,'Invalid backup filename.');
  return path.join(backupDirectory,value);
}
async function snapshot(session) {
  const db=getDb();const collections={};
  for (const name of v.COLLECTIONS) collections[name]=await db.collection(name).find({}, {session, promoteValues:false}).toArray();
  return {createdAt:new Date().toISOString(),database:db.databaseName,collections};
}
async function backup() {
  const data=await transaction(snapshot);
  const name=`backup-${new Date().toISOString().replace(/[:.]/g,'-')}-${require('node:crypto').randomBytes(3).toString('hex')}.json`;
  await fs.mkdir(backupDirectory,{recursive:true});
  await fs.writeFile(filename(name),EJSON.stringify(data,null,2,{relaxed:false}),{flag:'wx'});
  return {filename:name,createdAt:data.createdAt,counts:Object.fromEntries(v.COLLECTIONS.map(k=>[k,data.collections[k].length]))};
}
async function backups() {
  await fs.mkdir(backupDirectory,{recursive:true});
  const names=(await fs.readdir(backupDirectory)).filter(n=>/^backup-[\w-]+\.json$/.test(n)).sort().reverse();
  const rows=[];
  for (const name of names) {const stat=await fs.stat(filename(name));rows.push({filename:name,createdAt:stat.mtime.toISOString(),bytes:stat.size});}
  return rows;
}
function validateBackup(data) {
  if (!data || typeof data.database!=='string' || !data.createdAt || !data.collections || typeof data.collections!=='object') fail(400,'Invalid backup structure.');
  v.date(data.createdAt,'backup createdAt');
  if (Object.keys(data.collections).length!==7 || Object.keys(data.collections).some(k=>!v.COLLECTIONS.includes(k))) fail(400,'Backup must contain exactly the seven business collections.');
  const normalized={};
  for (const name of v.COLLECTIONS) {
    if (!Array.isArray(data.collections[name])) fail(400,`${name} must be an array.`);
    normalized[name]=data.collections[name].map(raw=>{
      const d=v.document(name,raw);
      if (!d._id) fail(400,`Every ${name} document must include _id.`);
      if (name==='invoices' && !Object.hasOwn(raw,'createdAt')) delete d.createdAt;
      if (name==='payments' && !Object.hasOwn(raw,'note')) delete d.note;
      // Preserve existing optional schema fields (createdAt/updatedAt) and all
      // original BSON values; validation never changes a backup's document shape.
      return {...raw,...d};
    });
    if (new Set(normalized[name].map(d=>String(d._id))).size!==normalized[name].length) fail(400,`Duplicate _id in ${name}.`);
  }
  const find=(name,id)=>normalized[name].find(d=>String(d._id)===String(id));
  for (const [name,fields] of [['rooms',['roomNumber']],['tenants',['identityCard']],['services',['name']],['meter_readings',['roomId','year','month']],['invoices',['roomId','year','month']]]) {
    const keys=normalized[name].map(d=>JSON.stringify(fields.map(k=>String(d[k]))));
    if (new Set(keys).size!==keys.length) fail(409,`Backup has duplicate unique values in ${name}.`);
  }
  const active=new Set();
  for (const c of normalized.contracts) {
    if (!find('rooms',c.roomId) || c.tenantIds.some(id=>!find('tenants',id))) fail(400,'Contract has missing room or tenants.');
    if (c.status==='ACTIVE') {
      if (active.has(String(c.roomId))) fail(409,'Backup has duplicate ACTIVE room contracts.');
      active.add(String(c.roomId));
      if (!['OCCUPIED','MAINTENANCE'].includes(find('rooms',c.roomId).status)) fail(400,'ACTIVE contract room must be OCCUPIED (or intentionally MAINTENANCE).');
    }
  }
  for (const r of normalized.meter_readings) if (!find('rooms',r.roomId)) fail(400,'Meter reading has a missing room.');
  for (const i of normalized.invoices) {
    if (!find('rooms',i.roomId) || String(find('contracts',i.contractId)?.roomId)!==String(i.roomId)) fail(400,'Invoice has an invalid room/contract reference.');
    const paid=normalized.payments.filter(p=>String(p.invoiceId)===String(i._id) && p.status==='SUCCESS').reduce((s,p)=>s+Number(p.amount),0);
    if (paid>Number(i.total)+.001) fail(409,'Backup contains an overpaid invoice.');
    const expected=paid===0?'UNPAID':paid>=Number(i.total)?'PAID':'PARTIAL';
    if (i.status!==expected) fail(400,'Invoice status does not match successful payments.');
  }
  for (const p of normalized.payments) if (!find('invoices',p.invoiceId)) fail(400,'Payment has a missing invoice.');
  return normalized;
}
async function restore(body,file) {
  if (body.confirm!=='RESTORE') fail(400,'Explicit confirmation RESTORE is required.');
  if (file && body.filename) fail(400,'Choose a stored backup or an uploaded file, not both.');
  const data=file?parse(file.buffer):parse(await fs.readFile(filename(body.filename)).catch(()=>fail(404,'Backup not found.')));
  if (data.database!==getDb().databaseName) fail(400,'Backup database does not match the connected database.');
  const collections=validateBackup(data);
  const safetyBackup=await backup();
  await transaction(async session=>{
    // No collection drops: existing validators/indexes remain intact. A failure
    // rolls back every delete and insert in this transaction.
    for (const name of [...v.COLLECTIONS].reverse()) await getDb().collection(name).deleteMany({}, {session});
    for (const name of ['rooms','tenants','services','contracts','meter_readings','invoices','payments']) {
      if (collections[name].length) await getDb().collection(name).insertMany(collections[name],{session});
    }
  });
  return {restored:true,safetyBackup:safetyBackup.filename,counts:Object.fromEntries(v.COLLECTIONS.map(k=>[k,collections[k].length]))};
}
async function importData(name,file) {
  v.collection(name);
  const data=parse(file?.buffer);
  if (!Array.isArray(data) || !data.length || data.length>5000) fail(400,'Import must be a non-empty JSON array with at most 5000 documents.');
  const errors=[];const docs=[];
  data.forEach((raw,index)=>{try {docs.push(v.document(name,raw));} catch(error){errors.push({row:index+1,message:error.message});}});
  if (errors.length) return {insertedCount:0,errors};
  // All-or-nothing import: no partial database changes on any failed row.
  try {
    await transaction(async session=>{
      const service=new Business(getDb(),session);
      for (const d of docs) {
        // Import invoices with computed state. PAID/PARTIAL are derived from
        // imported payments, which must be imported after invoices.
        if (name==='invoices' && d.status!=='UNPAID') fail(400,'Import invoices as UNPAID, then import payments; use a full backup for exact historical restoration.');
        await service.save(name,d);
      }
    });
    return {insertedCount:docs.length,errors:[]};
  } catch(error) {
    if (!error.status && ![11000,121].includes(error.code)) throw error;
    return {insertedCount:0,errors:[{message:error.code===11000?'Duplicate unique value.':error.code===121?'MongoDB validator rejected a document.':error.message}]};
  }
}
async function exportData(name) {
  v.collection(name);
  const docs=await getDb().collection(name).find({}, {promoteValues:false}).toArray();
  return EJSON.stringify(docs,null,2,{relaxed:false});
}
module.exports={parse,filename,backup,backups,validateBackup,restore,importData,exportData};
