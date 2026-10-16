const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {connect,close}=require('../config/database');
async function setup(db) {
  // Evaluate the repository's source-of-truth validators with a recording adapter.
  // Ignore its hard-coded playground use(): the explicit command targets .env.
  const validators={};const indexes=[];
  const adapter=new Proxy({
    getCollectionInfos:()=>[],
    createCollection:(name,options)=>{validators[name]=options;},
    runCommand:()=>({ok:1})
  },{get:(target,name)=>name in target?target[name]:{createIndex:(keys,options)=>indexes.push({name,keys,options})}});
  for (const file of ['create_collections.js','indexes.js']) vm.runInNewContext(fs.readFileSync(path.resolve(__dirname,'../../../database',file),'utf8'),{db:adapter,use:()=>{}},{filename:file});
  for (const [name,options] of Object.entries(validators)) {
    if (!(await db.listCollections({name}).toArray()).length) await db.createCollection(name,options);
    else await db.command({collMod:name,...options});
  }
  for (const {name,keys,options} of indexes) await db.collection(name).createIndex(keys,options);
  // Additional constraint enforces Member 2's existing one-ACTIVE-contract rule.
  await db.collection('contracts').createIndex({roomId:1},{name:'one_active_contract_per_room',unique:true,partialFilterExpression:{status:'ACTIVE'}});
  await db.collection('users').createIndex({username:1},{unique:true});
  console.log('Seven business validators, existing indexes and user indexes are ready. No demo data was inserted.');
}
if (require.main===module) connect().then(setup).catch(()=>{console.error('Setup failed. Check connectivity, existing duplicate ACTIVE contracts, and database permissions.');process.exitCode=1;}).finally(close);
module.exports={setup};
