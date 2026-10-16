const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'../../frontend');
test('all local HTML pages reference existing scripts and styles',()=>{
  const files=fs.readdirSync(root).filter(f=>f.endsWith('.html'));assert.equal(files.length,12);
  for(const file of files){
    const html=fs.readFileSync(path.join(root,file),'utf8');assert(html.includes('viewport'));
    for(const [,asset] of html.matchAll(/(?:src|href)="((?:js|css)\/[^\"]+)"/g))assert(fs.existsSync(path.join(root,asset)),`${file}: ${asset}`);
    assert(!/mongodb\+srv|JWT_SECRET|MONGODB_URI/.test(html));
  }
});
test('frontend API helper attaches JWT, handles envelopes, uploads and errors',async()=>{
  const calls=[];const storage=new Map([['token','test-token']]);
  const context=vm.createContext({
    sessionStorage:{getItem:k=>storage.get(k),removeItem:k=>storage.delete(k)},
    location:{pathname:'/frontend/rooms.html',href:''},
    fetch:async(url,options)=>{calls.push({url,options});return {ok:true,status:200,json:async()=>({success:true,data:{ok:true}})};}
  });
  vm.runInContext(fs.readFileSync(path.join(root,'js/api.js'),'utf8'),context);
  await vm.runInContext("apiPost('/rooms',{roomNumber:'P1'})",context);
  assert.equal(calls[0].url,'http://localhost:5000/api/rooms');assert.equal(calls[0].options.headers.Authorization,'Bearer test-token');
  assert.equal(JSON.parse(calls[0].options.body).roomNumber,'P1');
  context.form={file:'stub'};await vm.runInContext("apiUpload('/data/import/rooms',form)",context);assert(!calls[1].options.headers['Content-Type']);
  context.fetch=async()=>({ok:false,status:409,json:async()=>({success:false,message:'Conflict'})});
  await assert.rejects(()=>vm.runInContext("apiDelete('/rooms/1')",context),/Conflict/);
  context.fetch=async()=>({ok:false,status:401,json:async()=>({success:false,message:'Expired'})});
  await assert.rejects(()=>vm.runInContext("apiGet('/rooms')",context),/Expired/);assert.equal(context.location.href,'login.html');assert(!storage.has('token'));
});
test('billing form allows no optional services while contracts require tenants',()=>{
  const context=vm.createContext({document:{},startPage:fn=>fn()});
  const common=fs.readFileSync(path.join(root,'js/common.js'),'utf8');
  // Override the renderer to inspect each page's actual form configuration.
  vm.runInContext(common+'\ncrudPage = config => { globalThis.captured = config; }; startPage = fn => fn();',context);
  vm.runInContext(fs.readFileSync(path.join(root,'js/invoices.js'),'utf8'),context);
  assert.equal(context.captured.fields.find(f=>f.name==='serviceIds').optional,true);
  vm.runInContext(fs.readFileSync(path.join(root,'js/contracts.js'),'utf8'),context);
  assert(!context.captured.fields.find(f=>f.name==='tenantIds').optional);
});
