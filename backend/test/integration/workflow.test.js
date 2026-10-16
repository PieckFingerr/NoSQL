const {test}=require('node:test');
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const {once}=require('node:events');
const fs=require('node:fs/promises');
const path=require('node:path');
const database=require('../../src/config/database');
const {setup}=require('../../src/scripts/setup');
const {seed}=require('../../src/scripts/seed');
const {createApp}=require('../../src/app');
const users=require('../../src/controllers/users');
const {COLLECTIONS}=require('../../src/utils/validation');

test('complete local API workflow against an isolated MongoDB database',{timeout:180000},async t=>{
  if (!process.env.MONGODB_URI) {t.skip('Configure backend/.env with a MongoDB Atlas URI.');return;}
  // Never run these writes against the application's configured database.
  const testName=process.env.TEST_MONGODB_DB_NAME || `QuanLyPhongTro_Web_${crypto.randomBytes(5).toString('hex')}_Test`;
  assert.match(testName,/^QuanLyPhongTro_[\w]+_Test$/,'Use a dedicated QuanLyPhongTro_*_Test database.');
  process.env.MONGODB_DB_NAME=testName;
  process.env.JWT_SECRET=crypto.randomBytes(32).toString('hex');
  let server,db;let ownsTestData=false;const backupFiles=[];
  try {
    db=await database.connect();
    for (const name of [...COLLECTIONS,'users']) assert.equal(await db.collection(name).countDocuments(),0,'Integration database must be empty.');
    ownsTestData=true;
    await setup(db);
    await seed(db);
    await users.save({username:'testadmin',fullName:'Test Admin',password:'local-test-password',role:'ADMIN',active:true});
    server=createApp().listen(0,'127.0.0.1');await once(server,'listening');
    const base=`http://127.0.0.1:${server.address().port}/api`;
    let token='';
    async function request(method,url,body,status=200,raw=false) {
      const headers={};if(token)headers.Authorization='Bearer '+token;
      if(body!==undefined && !(body instanceof FormData))headers['Content-Type']='application/json';
      const response=await fetch(base+url,{method,headers,body:body===undefined?undefined:body instanceof FormData?body:JSON.stringify(body)});
      if(raw){assert.equal(response.status,status);return response;}
      const result=await response.json();assert.equal(response.status,status,JSON.stringify(result));
      if(status>=400){assert.equal(result.success,false);return result;}
      assert.equal(result.success,true);return result.data;
    }
    const now=new Date();const month=now.getMonth()+1;const year=now.getFullYear();
    const date=offset=>new Date(now.getTime()+offset*86400000).toISOString();
    let room,tenant,contract,reading,invoice,manager;
    await t.test('authentication and user administration',async()=>{
      await request('GET','/rooms',undefined,401);
      await request('POST','/auth/login',{username:'testadmin',password:'wrong'},401);
      const logged=await request('POST','/auth/login',{username:'testadmin',password:'local-test-password'});token=logged.token;
      assert(!JSON.stringify(logged).includes('passwordHash'));
      manager=await request('POST','/users',{username:'manager',fullName:'Manager',password:'manager-test-password',role:'MANAGER',active:true},201);
      const edited=await request('PUT',`/users/${manager._id}`,{...manager,fullName:'Updated Manager'});assert.equal(edited.fullName,'Updated Manager');
      assert((await request('GET','/users')).every(u=>!u.passwordHash));
      const managerToken=(await request('POST','/auth/login',{username:'manager',password:'manager-test-password'})).token;
      const adminToken=token;token=managerToken;await request('GET','/users',undefined,403);await request('POST','/data/backup',{},403);token=adminToken;
      await request('PATCH',`/users/${manager._id}/toggle-active`,{});
      token=managerToken;await request('GET','/rooms',undefined,401);token=adminToken;
      await request('POST','/auth/login',{username:'manager',password:'manager-test-password'},401);
      await request('DELETE',`/users/${manager._id}`);
    });
    await t.test('room CRUD, filters, BSON validation and safe deletion',async()=>{
      room=await request('POST','/rooms',{roomNumber:'WEB-DEMO',floor:5,price:2500000,area:22,status:'AVAILABLE'},201);
      assert.equal((await request('GET',`/rooms/${room._id}`)).roomNumber,'WEB-DEMO');
      room=await request('PUT',`/rooms/${room._id}`,{...room,area:23});assert.equal(room.area,23);
      assert.equal((await request('GET','/rooms?search=WEB-DEMO&floor=5&status=AVAILABLE')).length,1);
      await request('GET','/rooms/invalid',undefined,400);
      const temp=await request('POST','/rooms',{...room,_id:undefined,roomNumber:'DELETE-ME'},201);await request('DELETE',`/rooms/${temp._id}`);
      await request('POST','/rooms',{...room,_id:undefined},409);
    });
    await t.test('tenant CRUD, search and history',async()=>{
      tenant=await request('POST','/tenants',{fullName:'Web Demo Tenant',phone:'0990000001',email:'demo@example.com',identityCard:'WEB000001',dateOfBirth:'1999-01-01'},201);
      tenant=await request('PUT',`/tenants/${tenant._id}`,{...tenant,fullName:'Updated Demo Tenant'});
      assert.equal((await request('GET','/tenants?search=0990000001')).length,1);
      assert.deepEqual(await request('GET',`/tenants/${tenant._id}/rental-history`),[]);
      const temp=await request('POST','/tenants',{...tenant,_id:undefined,phone:'0990000002',identityCard:'WEB000002'},201);await request('DELETE',`/tenants/${temp._id}`);
    });
    await t.test('contract creates occupancy, prevents duplicate ACTIVE and extends',async()=>{
      const body={roomId:room._id,tenantIds:[tenant._id],startDate:date(-5),endDate:date(20),monthlyRent:2500000,deposit:2500000,status:'ACTIVE'};
      contract=await request('POST','/contracts',body,201);
      assert.equal((await request('GET',`/rooms/${room._id}`)).status,'OCCUPIED');
      await request('POST','/contracts',body,409);
      contract=await request('PATCH',`/contracts/${contract._id}/extend`,{endDate:date(25)});
      assert.equal((await request('GET','/contracts/expiring?days=30')).some(c=>c._id===contract._id),true);
      assert.equal((await request('GET',`/tenants/${tenant._id}/rental-history`)).length,1);
      await request('DELETE',`/rooms/${room._id}`,undefined,409);await request('DELETE',`/tenants/${tenant._id}`,undefined,409);
    });
    await t.test('service CRUD and enable/disable',async()=>{
      const service=await request('POST','/services',{name:'Test Laundry',unit:'load',price:20000,active:true},201);
      assert.equal((await request('PATCH',`/services/${service._id}/toggle-active`,{})).active,false);
      await request('PUT',`/services/${service._id}`,{...service,price:25000});await request('DELETE',`/services/${service._id}`);
    });
    await t.test('monthly readings, usage, edit, delete and duplicate rejection',async()=>{
      const body={roomId:room._id,month,year,electricity:{oldIndex:100,newIndex:160},water:{oldIndex:20,newIndex:28}};
      await request('POST','/meter-readings',{...body,electricity:{oldIndex:100,newIndex:90}},400);
      reading=await request('POST','/meter-readings',body,201);await request('POST','/meter-readings',body,409);
      reading=await request('PUT',`/meter-readings/${reading._id}`,{...reading,electricity:{oldIndex:100,newIndex:170}});
      assert.equal((await request('GET',`/meter-readings?roomId=${room._id}`))[0].electricityUsage,70);
      await request('DELETE',`/meter-readings/${reading._id}`);reading=await request('POST','/meter-readings',body,201);
    });
    await t.test('invoice rent, snapshots, total and duplicate month',async()=>{
      const body={roomId:room._id,month,year,dueDate:date(-1)};
      invoice=await request('POST','/invoices/generate',body,201);
      assert.equal(invoice.rent,2500000);assert.equal(invoice.total,2500000+60*3500+8*15000+100000+30000);
      await request('POST','/invoices/generate',body,409);
      const electricity=(await request('GET','/services?search=Electricity'))[0];
      await request('PUT',`/services/${electricity._id}`,{...electricity,price:4500});
      assert.equal((await request('GET',`/invoices/${invoice._id}`)).services.find(s=>s.name==='Electricity').unitPrice,3500);
      await request('PUT',`/invoices/${invoice._id}`,{total:1},400);
      await request('PUT',`/meter-readings/${reading._id}`,reading,409);await request('DELETE',`/meter-readings/${reading._id}`,undefined,409);
    });
    await t.test('partial/full payments, cancelled/pending exclusion, overpayment and revenue',async()=>{
      const payment={invoiceId:invoice._id,amount:1000000,paymentMethod:'CASH',status:'SUCCESS'};
      await request('POST','/payments',{...payment,status:'CANCELLED'},201);await request('POST','/payments',{...payment,status:'PENDING'},201);
      assert.equal((await request('GET',`/invoices/${invoice._id}`)).status,'UNPAID');
      const before=await request('GET',`/dashboard?month=${month}&year=${year}`);
      await request('POST','/payments',payment,201);assert.equal((await request('GET',`/invoices/${invoice._id}`)).status,'PARTIAL');
      await request('POST','/payments',{...payment,amount:invoice.total},409);
      await request('POST','/payments',{...payment,amount:invoice.total-1000000,paymentMethod:'BANK_TRANSFER'},201);
      assert.equal((await request('GET',`/invoices/${invoice._id}`)).status,'PAID');
      const after=await request('GET',`/dashboard?month=${month}&year=${year}`);assert.equal(after.monthlyRevenue-before.monthlyRevenue,invoice.total);
      await request('DELETE',`/invoices/${invoice._id}`,undefined,409);
    });
    await t.test('all basic and advanced reports execute real aggregations',async()=>{
      for (const name of ['available-rooms','occupied-rooms','maintenance-rooms','tenant-phone','active-contracts','active-services','unpaid-invoices','invoice-payments']) assert(Array.isArray(await request('GET',`/reports/basic/${name}?phone=0990000001&invoiceId=${invoice._id}`)));
      for (const name of ['monthly-revenue','electricity-usage','water-usage','expiring-contracts','overdue-invoices','tenant-rental-history','room-occupancy','invoice-status','revenue-by-method','room-billing-history']) assert(Array.isArray(await request('GET',`/reports/${name}?month=${month}&year=${year}&roomId=${room._id}&tenantId=${tenant._id}&days=30`)));
    });
    await t.test('import/export, full backup, validation and transactional restore',async()=>{
      const form=new FormData();form.append('file',new Blob([JSON.stringify([{roomNumber:'IMPORT-ROOM',floor:1,area:20,price:1,status:'AVAILABLE'}])],{type:'application/json'}),'rooms.json');
      assert.equal((await request('POST','/data/import/rooms',form)).insertedCount,1);
      await request('POST','/data/import/users',form,400);
      const invalid=new FormData();invalid.append('file',new Blob(['not json']),'bad.json');await request('POST','/data/import/rooms',invalid,400);
      const exported=await request('GET','/data/export/rooms?format=json',undefined,200,true);assert((await exported.text()).includes('$oid'));
      const backup=await request('POST','/data/backup',{},201);backupFiles.push(backup.filename);assert.equal(Object.keys(backup.counts).length,7);
      assert((await request('GET','/data/backups')).some(b=>b.filename===backup.filename));
      await request('POST','/data/restore',{filename:backup.filename,confirm:'NO'},400);
      const bad=new FormData();bad.append('file',new Blob([JSON.stringify({collections:{users:[]}})]),'bad.json');bad.append('confirm','RESTORE');await request('POST','/data/restore',bad,400);
      await request('POST','/rooms',{roomNumber:'AFTER-BACKUP',floor:1,area:10,price:1,status:'AVAILABLE'},201);
      const restored=await request('POST','/data/restore',{filename:backup.filename,confirm:'RESTORE'});backupFiles.push(restored.safetyBackup);
      assert.equal((await request('GET','/rooms?search=AFTER-BACKUP')).length,0);
      assert.equal((await request('GET',`/invoices/${invoice._id}`)).status,'PAID');
      assert.equal((await request('GET','/users')).length,1);
    });
    await t.test('termination preserves intentional maintenance',async()=>{
      const occupied=await request('GET',`/rooms/${room._id}`);await request('PUT',`/rooms/${room._id}`,{...occupied,status:'MAINTENANCE'});
      await request('PATCH',`/contracts/${contract._id}/terminate`,{});assert.equal((await request('GET',`/rooms/${room._id}`)).status,'MAINTENANCE');
    });
  } finally {
    if(server)await new Promise(resolve=>server.close(resolve));
    // Exact isolated test database only. Never dropDatabase, never production.
    if(ownsTestData && db && db.databaseName===testName && /_Test$/.test(testName)) for(const name of [...COLLECTIONS,'users']) await db.collection(name).deleteMany({});
    for(const file of backupFiles)await fs.unlink(path.resolve(__dirname,'../../backups',file)).catch(()=>{});
    await database.close();
  }
});
