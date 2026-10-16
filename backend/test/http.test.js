const {test,mock}=require('node:test');
const assert=require('node:assert/strict');
const {once}=require('node:events');
const crypto=require('node:crypto');
const MemoryDb=require('./helpers/memoryDb');
const database=require('../src/config/database');
// These tests exercise real Express, JWT, bcrypt and fetch. Database operations
// use the limited adapter; live MongoDB behavior has its own integration suite.
const db=new MemoryDb();
mock.method(database,'getDb',()=>db);
mock.method(database,'transaction',fn=>fn(undefined));
const {createApp}=require('../src/app');
const users=require('../src/controllers/users');
test('local HTTP API authenticates, manages accounts and enforces business permissions',{timeout:15000},async()=>{
  process.env.JWT_SECRET=crypto.randomBytes(32).toString('hex');
  const admin=await users.save({username:'admin',fullName:'Administrator',role:'ADMIN',active:true,password:'test-admin-password'});
  const server=createApp().listen(0,'127.0.0.1');await once(server,'listening');
  let token='';const base=`http://127.0.0.1:${server.address().port}/api`;
  async function request(method,url,body,status=200) {
    const response=await fetch(base+url,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:body===undefined?undefined:JSON.stringify(body)});
    const data=await response.json();assert.equal(response.status,status,JSON.stringify(data));return status<400?data.data:data;
  }
  try {
    await request('GET','/rooms',undefined,401);
    await request('POST','/auth/login',{username:'admin',password:'wrong'},401);
    token=(await request('POST','/auth/login',{username:'admin',password:'test-admin-password'})).token;
    assert.equal((await request('GET','/auth/me')).role,'ADMIN');
    const account=await request('POST','/users',{username:'manager',fullName:'Manager',role:'MANAGER',active:true,password:'test-manager-password'},201);
    assert(!account.passwordHash);assert(!JSON.stringify(await request('GET','/users')).includes('passwordHash'));
    await request('PUT',`/users/${account._id}`,{...account,fullName:'Updated Manager'});
    assert.equal((await request('GET',`/users/${account._id}`)).fullName,'Updated Manager');
    const managerToken=(await request('POST','/auth/login',{username:'manager',password:'test-manager-password'})).token;
    const adminToken=token;token=managerToken;await request('GET','/users',undefined,403);await request('POST','/data/backup',{},403);token=adminToken;
    await request('PATCH',`/users/${account._id}/toggle-active`,{});
    token=managerToken;await request('GET','/rooms',undefined,401);token=adminToken;
    await request('DELETE',`/users/${admin._id}`,undefined,409);
    await request('PATCH',`/users/${admin._id}/toggle-active`,{},409);
    await request('DELETE',`/users/${account._id}`);
    const room=await request('POST','/rooms',{roomNumber:'HTTP-ROOM',floor:1,price:2500000,area:20,status:'AVAILABLE'},201);
    assert.equal((await request('GET','/rooms?search=HTTP')).length,1);
    await request('GET','/rooms/bad-id',undefined,400);
    await request('PUT',`/rooms/${room._id}`,{...room,area:24});
    const tenant=await request('POST','/tenants',{fullName:'HTTP Tenant',phone:'0901234567',identityCard:'HTTP123',email:'http@example.com',dateOfBirth:'1990-01-01'},201);
    const now=Date.now();
    const c=await request('POST','/contracts',{roomId:room._id,tenantIds:[tenant._id],startDate:new Date(now-86400000),endDate:new Date(now+86400000*30),monthlyRent:2500000,deposit:2500000,status:'ACTIVE'},201);
    assert.equal((await request('GET',`/rooms/${room._id}`)).status,'OCCUPIED');
    await request('POST','/contracts',{...c,_id:undefined},409);
    await request('DELETE',`/rooms/${room._id}`,undefined,409);
    await request('PATCH',`/contracts/${c._id}/terminate`,{});
    assert.equal((await request('GET',`/rooms/${room._id}`)).status,'AVAILABLE');
    await request('GET','/missing',undefined,404);
    await request('POST','/data/import/users',{},400);
  } finally {await new Promise(resolve=>server.close(resolve));}
});
