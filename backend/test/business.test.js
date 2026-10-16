const {test}=require('node:test');
const assert=require('node:assert/strict');
const {ObjectId}=require('mongodb');
const Business=require('../src/services/business');
const MemoryDb=require('./helpers/memoryDb');
async function fixture(){
  const db=new MemoryDb();const s=new Business(db);
  const room=await s.save('rooms',{roomNumber:'P1',floor:1,area:20,price:2500000,status:'AVAILABLE'});
  const tenant=await s.save('tenants',{fullName:'Tenant',phone:'0901',email:'tenant@example.com',identityCard:'001',dateOfBirth:'1990-01-01'});
  const now=new Date();
  const body={roomId:room._id,tenantIds:[tenant._id],startDate:new Date(now.getTime()-5*86400000),endDate:new Date(now.getTime()+20*86400000),monthlyRent:2500000,deposit:2500000,status:'ACTIVE'};
  return {db,s,room,tenant,body,month:now.getMonth()+1,year:now.getFullYear()};
}
test('contract creation, duplicate ACTIVE rejection and occupancy changes',async()=>{
  const {s,room,body}=await fixture();const contract=await s.save('contracts',body);
  assert.equal((await s.one('rooms',room._id)).status,'OCCUPIED');
  await assert.rejects(()=>s.save('contracts',body),e=>e.status===409);
  await s.terminate(contract._id);assert.equal((await s.one('rooms',room._id)).status,'AVAILABLE');
});
test('contract extension validates later dates and inactive state',async()=>{
  const {s,body}=await fixture();const c=await s.save('contracts',body);
  await assert.rejects(()=>s.extend(c._id,{endDate:body.endDate}),e=>e.status===400);
  const next=new Date(body.endDate.getTime()+86400000);assert.equal((await s.extend(c._id,{endDate:next})).endDate.getTime(),next.getTime());
  await s.terminate(c._id);await assert.rejects(()=>s.extend(c._id,{endDate:next}),e=>e.status===409);
});
test('termination and expiration preserve maintenance',async()=>{
  const {s,db,room,body}=await fixture();const c=await s.save('contracts',body);
  await s.save('rooms',{...room,status:'MAINTENANCE'},room._id);await s.terminate(c._id);
  assert.equal((await s.one('rooms',room._id)).status,'MAINTENANCE');
  db.data.contracts[0].status='ACTIVE';db.data.contracts[0].endDate=new Date(0);
  assert.equal(await s.expire(),1);assert.equal((await s.one('contracts',c._id)).status,'EXPIRED');
  assert.equal((await s.one('rooms',room._id)).status,'MAINTENANCE');
});
test('invalid references and safe deletion protect contract history',async()=>{
  const {s,room,tenant,body}=await fixture();
  await assert.rejects(()=>s.save('contracts',{...body,tenantIds:[new ObjectId()]}),e=>e.status===404);
  await s.save('contracts',body);
  await assert.rejects(()=>s.remove('rooms',room._id),e=>e.status===409);
  await assert.rejects(()=>s.remove('tenants',tenant._id),e=>e.status===409);
  await assert.rejects(()=>s.save('rooms',{...room,status:'AVAILABLE'},room._id),e=>e.status===409);
});
test('rooms and tenants support CRUD and literal filters',async()=>{
  const {s,room,tenant}=await fixture();
  assert.equal((await s.list('rooms',{search:'P1',floor:'1',status:'AVAILABLE'})).length,1);
  assert.equal((await s.list('tenants',{search:'0901'})).length,1);
  await s.save('rooms',{...room,price:3000000},room._id);assert.equal((await s.one('rooms',room._id)).price,3000000);
  await s.save('tenants',{...tenant,fullName:'Updated Tenant'},tenant._id);assert.equal((await s.one('tenants',tenant._id)).fullName,'Updated Tenant');
  await s.remove('rooms',room._id);await s.remove('tenants',tenant._id);
  assert.equal((await s.list('rooms')).length,0);assert.equal((await s.list('tenants')).length,0);
});
test('services support CRUD, toggle and price changes',async()=>{
  const {s}=await fixture();let service=await s.save('services',{name:'Electricity',unit:'kWh',price:3500,active:true});
  service=await s.save('services',{...service,price:4000,active:false},service._id);
  assert.equal(service.price,4000);assert.equal((await s.list('services',{active:'false'})).length,1);
  await s.remove('services',service._id);assert.equal((await s.list('services')).length,0);
});
test('monthly billing and payment workflow uses snapshots and successful payments only',async()=>{
  const {s,room,body,month,year}=await fixture();await s.save('contracts',body);
  for(const [name,price,unit] of [['Electricity',3500,'kWh'],['Water',15000,'m3'],['Internet',100000,'room/month'],['Garbage',30000,'room/month']])await s.save('services',{name,price,unit,active:true});
  const reading=await s.save('meter_readings',{roomId:room._id,month,year,electricity:{oldIndex:100,newIndex:160},water:{oldIndex:20,newIndex:28}});
  assert.equal((await s.list('meter_readings'))[0].electricityUsage,60);
  await assert.rejects(()=>s.save('meter_readings',{...reading,_id:undefined}),e=>e.status===409);
  const invoice=await s.generate({roomId:room._id,month,year,dueDate:new Date()});
  assert.equal(invoice.rent,2500000);assert.equal(invoice.total,2960000);
  await assert.rejects(()=>s.generate({roomId:room._id,month,year,dueDate:new Date()}),e=>e.status===409);
  const electricity=(await s.list('services',{search:'Electricity'}))[0];await s.save('services',{...electricity,price:4500},electricity._id);
  assert.equal((await s.one('invoices',invoice._id)).services.find(s=>s.name==='Electricity').unitPrice,3500);
  await assert.rejects(()=>s.remove('meter_readings',reading._id),e=>e.status===409);
  await assert.rejects(()=>s.save('meter_readings',reading,reading._id),e=>e.status===409);
  const payment={invoiceId:invoice._id,amount:1000000,paymentMethod:'CASH',status:'SUCCESS'};
  await s.save('payments',{...payment,status:'CANCELLED'});await s.save('payments',{...payment,status:'PENDING'});
  assert.equal((await s.one('invoices',invoice._id)).status,'UNPAID');
  await s.save('payments',payment);assert.equal((await s.one('invoices',invoice._id)).status,'PARTIAL');
  await assert.rejects(()=>s.save('payments',{...payment,amount:invoice.total}),e=>e.status===409);
  await s.save('payments',{...payment,amount:1960000,paymentMethod:'BANK_TRANSFER'});
  assert.equal((await s.one('invoices',invoice._id)).status,'PAID');assert.equal(await s.paid(invoice._id),2960000);
  await assert.rejects(()=>s.remove('invoices',invoice._id),e=>e.status===409);
  await assert.rejects(()=>s.remove('services',electricity._id),e=>e.status===409);
});
test('invoice generation requires active contract, meter reading and enabled rates',async()=>{
  const {s,room,body,month,year}=await fixture();const invoice={roomId:room._id,month,year,dueDate:new Date()};
  await assert.rejects(()=>s.generate(invoice),e=>e.status===409);
  await s.save('contracts',body);await assert.rejects(()=>s.generate(invoice),e=>e.status===409);
  await s.save('meter_readings',{roomId:room._id,month,year,electricity:{oldIndex:0,newIndex:0},water:{oldIndex:0,newIndex:0}});
  await assert.rejects(()=>s.generate(invoice),e=>e.status===409);
  await assert.rejects(()=>s.generate({...invoice,serviceIds:'wrong'}),e=>e.status===400);
});
