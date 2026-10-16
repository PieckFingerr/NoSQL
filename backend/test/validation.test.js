const {test}=require('node:test');
const assert=require('node:assert/strict');
const {ObjectId,BSON}=require('mongodb');
const v=require('../src/utils/validation');
const {buildReport}=require('../src/services/reports');
const {validateBackup,parse,filename}=require('../src/services/dataManagement');
const {password}=require('../src/controllers/users');
test('room validator preserves BSON int and double types',()=>{
  const room=v.document('rooms',{roomNumber:'P1',floor:1,area:20,price:2500000,status:'AVAILABLE'});
  assert.equal(room.floor._bsontype,'Int32');assert.equal(room.price._bsontype,'Double');assert.equal(room.area._bsontype,'Double');
  for (const invalid of [-1,'',null,{},Infinity]) assert.throws(()=>v.document('rooms',{...room,price:invalid}));
  assert.throws(()=>v.document('rooms',{...room,floor:1.5}));
});
test('reference and enum input rejects operators and invalid ids',()=>{
  assert.throws(()=>v.id({$ne:null}));assert.throws(()=>v.id('invalid'));assert.throws(()=>v.collection('users'));
  assert.equal(v.escapeRegex('a.*'),'a\\.\\*');
  assert.throws(()=>v.document('services',{name:'E',unit:'kWh',price:3,active:'false'}));
});
test('embedded meter validation rejects negative usage and duplicate period shape',()=>{
  const b={roomId:new ObjectId(),month:10,year:2026,electricity:{oldIndex:10,newIndex:20},water:{oldIndex:5,newIndex:8}};
  const reading=v.document('meter_readings',b);assert.equal(Number(reading.month),10);assert.equal(Number(reading.electricity.newIndex),20);
  assert.throws(()=>v.document('meter_readings',{...b,electricity:{oldIndex:20,newIndex:10}}));
  assert.throws(()=>v.document('meter_readings',{...b,month:13}));
});
test('contracts require tenants, valid dates and nonnegative rent/deposit',()=>{
  const b={roomId:new ObjectId(),tenantIds:[new ObjectId()],startDate:'2026-01-01',endDate:'2027-01-01',monthlyRent:1,deposit:1,status:'ACTIVE'};
  assert.equal(v.document('contracts',b).tenantIds.length,1);
  assert.throws(()=>v.document('contracts',{...b,tenantIds:[]}));assert.throws(()=>v.document('contracts',{...b,endDate:'2025-01-01'}));
  assert.throws(()=>v.document('contracts',{...b,tenantIds:[b.tenantIds[0],b.tenantIds[0]]}));
});
test('invoice snapshots enforce line amounts and total',()=>{
  const b={roomId:new ObjectId(),contractId:new ObjectId(),month:10,year:2026,rent:100,services:[{name:'Electricity',quantity:5,unitPrice:3,amount:15}],total:115,status:'UNPAID',dueDate:'2026-11-01'};
  assert.equal(Number(v.document('invoices',b).total),115);
  assert.throws(()=>v.document('invoices',{...b,total:110}));
  assert.throws(()=>v.document('invoices',{...b,services:[{...b.services[0],amount:14}]}));
});
test('payments validate positive amount and allowed methods/statuses',()=>{
  const b={invoiceId:new ObjectId(),amount:20,paymentMethod:'CASH',status:'SUCCESS'};
  assert.equal(Number(v.document('payments',b).amount),20);
  assert.throws(()=>v.document('payments',{...b,amount:0}));assert.throws(()=>v.document('payments',{...b,paymentMethod:'CRYPTO'}));
});
test('tenants require actual dates and email; user passwords are bounded',()=>{
  const b={fullName:'A',phone:'0901234567',email:'a@example.com',identityCard:'123',dateOfBirth:'1990-01-01'};
  assert(v.document('tenants',b).dateOfBirth instanceof Date);
  assert.throws(()=>v.document('tenants',{...b,dateOfBirth:null}));assert.throws(()=>v.document('tenants',{...b,email:'invalid'}));
  assert.throws(()=>password('short'));assert.throws(()=>password('🙂'.repeat(20)));assert.equal(password('demo-password-long'),'demo-password-long');
});
test('all ten advanced reports build MongoDB aggregation pipelines',()=>{
  const names=['monthly-revenue','electricity-usage','water-usage','expiring-contracts','overdue-invoices','tenant-rental-history','room-occupancy','invoice-status','revenue-by-method','room-billing-history'];
  for (const name of names) {
    const [collection,pipeline]=buildReport(name,{month:10,year:2026,roomId:String(new ObjectId()),tenantId:String(new ObjectId()),days:30});
    assert(v.COLLECTIONS.includes(collection));assert(pipeline.some(s=>s.$sort));
    if (name.includes('revenue')) assert.equal(pipeline[0].$match.status,'SUCCESS');
  }
  assert.throws(()=>buildReport('tenant-rental-history',{}));assert.throws(()=>buildReport('unknown',{}));assert.throws(()=>buildReport('monthly-revenue',{month:13}));
});
test('canonical Extended JSON round-trips ObjectId, date, Int32 and Double',()=>{
  const value={_id:new ObjectId(),date:new Date(),int:v.period({month:10,year:2026}).month,double:v.double(100,'money')};
  const restored=parse(Buffer.from(BSON.EJSON.stringify(value,{relaxed:false})));
  assert(restored._id.equals(value._id));assert.equal(restored.date.getTime(),value.date.getTime());assert.equal(restored.int._bsontype,'Int32');assert.equal(restored.double._bsontype,'Double');
  assert.throws(()=>parse(Buffer.from('not json')));assert.throws(()=>filename('../.env'));assert.throws(()=>filename('users.json'));
});
test('restore rejects unsupported collections, broken references and inconsistent statuses',()=>{
  const blank={createdAt:new Date().toISOString(),database:'Test',collections:Object.fromEntries(v.COLLECTIONS.map(k=>[k,[]]))};
  assert.equal(Object.keys(validateBackup(blank)).length,7);
  assert.throws(()=>validateBackup({...blank,collections:{...blank.collections,users:[]}}));
  assert.throws(()=>validateBackup({...blank,collections:{...blank.collections,payments:[{_id:new ObjectId(),invoiceId:new ObjectId(),amount:1,paymentMethod:'CASH',status:'SUCCESS'}]}}));
});
