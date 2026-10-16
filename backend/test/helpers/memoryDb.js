// Limited test adapter for Business unit tests. This does NOT emulate MongoDB's
// validator, transaction, lookup or index engine; those require integration tests.
const {BSON,ObjectId}=require('mongodb');
const clone=value=>BSON.deserialize(BSON.serialize(value));
const project=(d,options)=>{const result=clone(d);for(const [key,value] of Object.entries(options?.projection || {}))if(value===0)delete result[key];return result;};
const equal=(a,b)=>a instanceof ObjectId?String(a)===String(b):Number.isFinite(Number(a)) && Number.isFinite(Number(b))?Number(a)===Number(b):a===b;
function get(d,k) {
  const parts=k.split('.');const first=parts.shift();const value=d?.[first];
  if (!parts.length) return value;
  return Array.isArray(value)?value.map(item=>get(item,parts.join('.'))):get(value,parts.join('.'));
}
function match(d,q) {
  return Object.entries(q).every(([k,v])=>{
    if(k==='$or')return v.some(query=>match(d,query));
    const x=get(d,k);
    if(v && typeof v==='object' && !(v instanceof ObjectId) && !(v instanceof Date) && !v._bsontype) return Object.entries(v).every(([op,y])=>{
      if(op==='$ne')return !equal(x,y);
      if(op==='$in')return (Array.isArray(x)?x:[x]).some(a=>y.some(b=>equal(a,b)));
      if(op==='$lt')return x<y;if(op==='$lte')return x<=y;if(op==='$gte')return x>=y;
      if(op==='$regex')return new RegExp(y,v.$options || '').test(x);
      if(op==='$options')return true;
      throw new Error('Unsupported test operator '+op);
    });
    return Array.isArray(x)?x.some(a=>equal(a,v)):equal(x,v);
  });
}
class MemoryDb {
  constructor(){this.data={};this.databaseName='QuanLyPhongTro_Offline_Test';}
  async command(){return {ok:1};}
  collection(name){
    const rows=this.data[name] ||= [];
    return {
      findOne:async(q,options)=>{const d=rows.find(d=>match(d,q));return d?project(d,options):null;},
      find:(q,options)=>{let result=rows.filter(d=>match(d,q || {})).map(d=>project(d,options));const cursor={sort:sort=>{result.sort((a,b)=>{for(const [key,direction] of Object.entries(sort)){if(get(a,key)>get(b,key))return direction;if(get(a,key)<get(b,key))return -direction;}return 0;});return cursor;},toArray:async()=>result};return cursor;},
      insertOne:async d=>{d._id ||= new ObjectId();rows.push(clone(d));return {insertedId:d._id};},
      countDocuments:async q=>rows.filter(d=>match(d,q || {})).length,
      updateOne:async(q,update,options)=>{
        const d=rows.find(d=>match(d,q));
        if(d && update.$set)Object.assign(d,clone(update.$set));
        if(!d && options?.upsert)rows.push(clone({_id:new ObjectId(),...q,...update.$setOnInsert,...update.$set}));
        return {modifiedCount:d?1:0};
      },
      insertMany:async docs=>{rows.push(...docs.map(clone));return {insertedCount:docs.length};},
      deleteMany:async q=>{const remain=rows.filter(d=>!match(d,q));rows.splice(0,rows.length,...remain);return {deletedCount:0};},
      deleteOne:async q=>{const index=rows.findIndex(d=>match(d,q));if(index>=0)rows.splice(index,1);return {deletedCount:index>=0?1:0};},
      aggregate:pipeline=>{
        if(name!=='payments')throw new Error('Only payment-sum aggregation is supported in this unit-test adapter.');
        const selected=rows.filter(d=>match(d,pipeline[0].$match));
        return {toArray:async()=>selected.length?[{_id:null,paidAmount:selected.reduce((sum,d)=>sum+Number(d.amount),0)}]:[]};
      }
    };
  }
}
module.exports=MemoryDb;
