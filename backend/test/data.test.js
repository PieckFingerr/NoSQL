const {test,mock}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const {BSON}=require('mongodb');
const MemoryDb=require('./helpers/memoryDb');
const database=require('../src/config/database');
const db=new MemoryDb();
mock.method(database,'getDb',()=>db);
mock.method(database,'transaction',async fn=>{
  const before=BSON.deserialize(BSON.serialize({data:db.data}));
  try{return await fn(undefined);}catch(error){db.data=before.data;throw error;}
});
const data=require('../src/services/dataManagement');
const {seed}=require('../src/scripts/seed');
const {COLLECTIONS}=require('../src/utils/validation');
test('seed relationships, JSON import/export and safety-backup restore using test adapter',async()=>{
  const files=[];
  try {
    await seed(db);
    const initial=Object.fromEntries(COLLECTIONS.map(name=>[name,db.data[name].length]));
    assert.deepEqual(initial,{rooms:11,tenants:5,contracts:7,services:5,meter_readings:8,invoices:6,payments:7});
    const all={createdAt:new Date().toISOString(),database:db.databaseName,collections:db.data};
    assert.equal(Object.keys(data.validateBackup(all)).length,7);
    await seed(db);for(const name of COLLECTIONS)assert.equal(db.data[name].length,initial[name],'Seed rerun is idempotent: '+name);
    const importBody=[{roomNumber:'IMPORTED',floor:1,area:20,price:2000000,status:'AVAILABLE'}];
    const imported=await data.importData('rooms',{buffer:Buffer.from(JSON.stringify(importBody))});assert.equal(imported.insertedCount,1);
    const beforeCount=db.data.rooms.length;
    const conflictBatch=[{...importBody[0],roomNumber:'ROLLBACK-THIS'}, {...importBody[0],_id:String(db.data.rooms[0]._id)}];
    const conflicted=await data.importData('rooms',{buffer:Buffer.from(JSON.stringify(conflictBatch))});
    assert.equal(conflicted.insertedCount,0);assert.equal(db.data.rooms.length,beforeCount);assert(!db.data.rooms.some(r=>r.roomNumber==='ROLLBACK-THIS'));
    const invalid=await data.importData('rooms',{buffer:Buffer.from(JSON.stringify([...importBody,{roomNumber:'INVALID',price:-1}]))});assert.equal(invalid.insertedCount,0);assert(invalid.errors.length);
    const exported=await data.exportData('rooms');assert(exported.includes('$oid'));assert.equal(BSON.EJSON.parse(exported).length,12);
    await assert.rejects(()=>data.importData('users',{buffer:Buffer.from('[]')}),e=>e.status===400);
    await assert.rejects(()=>data.importData('rooms',{buffer:Buffer.from('{}')}),e=>e.status===400);
    const backup=await data.backup();files.push(backup.filename);assert.equal(backup.counts.rooms,12);
    assert((await data.backups()).some(b=>b.filename===backup.filename));
    const roomId=db.data.rooms[0]._id;
    db.data.rooms[0].roomNumber='MUTATED';
    await assert.rejects(()=>data.restore({filename:backup.filename,confirm:'NO'}),e=>e.status===400);
    const restored=await data.restore({filename:backup.filename,confirm:'RESTORE'});files.push(restored.safetyBackup);
    assert.equal(restored.restored,true);assert.equal(db.data.rooms[0].roomNumber,'P101');assert(db.data.rooms[0]._id.equals(roomId));
    assert.equal(db.data.rooms[0].status,'OCCUPIED');
    const backupFile=await fs.readFile(data.filename(backup.filename));
    const uploadedRestore=await data.restore({confirm:'RESTORE'},{buffer:backupFile});files.push(uploadedRestore.safetyBackup);
    assert.equal(uploadedRestore.counts.payments,7);
    const normalized=data.validateBackup(data.parse(backupFile));
    normalized.contracts[0].roomId=require('mongodb').ObjectId.createFromHexString('000000000000000000000001');
    assert.throws(()=>data.validateBackup({...all,collections:normalized}));
  } finally {for(const name of files)await fs.unlink(data.filename(name)).catch(()=>{});}
});
