const fs=require('node:fs');
const path=require('node:path');
const {ObjectId,Int32,Double}=require('mongodb');
const {connect,close}=require('../config/database');
async function seed(db) {
  const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;
  // The two seed files only use these simple database calls. Keep the originals
  // intact and adapt mongosh's synchronous API to the Node driver's promises.
  for (const file of ['sample_data.js','demo_data.mongodb.js']) {
    const source=fs.readFileSync(path.resolve(__dirname,'../../../database',file),'utf8');
    const code=source.replace(/\bdb\.(\w+)\.(findOne|updateOne|updateMany|insertOne)\(/g,'await db.collection("$1").$2(');
    await new AsyncFunction('db','ObjectId','Int32','Double','print',code)(db,v=>v?new ObjectId(v):new ObjectId(),v=>new Int32(v),v=>new Double(v),console.log);
  }
  console.log('Existing sample data and supplemental demo data are ready.');
}
if (require.main===module) connect().then(seed).catch(error=>{console.error('Seed failed:',error.code || error.name);process.exitCode=1;}).finally(close);
module.exports={seed};
