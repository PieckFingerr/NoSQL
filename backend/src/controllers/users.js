const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getDb } = require('../config/database');
const v = require('../utils/validation');
const { fail } = require('../utils/errors');
const safe = user => { const {passwordHash,...result}=user; return result; };
const password = value => {
  if (typeof value !== 'string' || value.length < 10 || Buffer.byteLength(value,'utf8') > 72) fail(400,'Password must contain at least 10 characters and at most 72 UTF-8 bytes.');
  return value;
};
async function login(body) {
  const username=v.text(body.username,'username',60).toLowerCase();
  if (typeof body.password!=='string' || body.password.length>200) fail(401,'Invalid username or password.');
  const user=await getDb().collection('users').findOne({username,active:true});
  if (!user || !await bcrypt.compare(body.password,user.passwordHash)) fail(401,'Invalid username or password.');
  return {token:jwt.sign({},process.env.JWT_SECRET,{subject:String(user._id),expiresIn:'8h',algorithm:'HS256'}),user:safe(user)};
}
async function save(body,value) {
  const col=getDb().collection('users');
  const old=value?await col.findOne({_id:v.id(value)}):null;
  if (value && !old) fail(404,'User not found.');
  const d={username:v.text(body.username,'username',60).toLowerCase(),fullName:v.text(body.fullName,'fullName'),role:v.choice(body.role,['ADMIN','MANAGER'],'role'),active:v.boolean(body.active ?? old?.active ?? true,'active')};
  const duplicate=await col.findOne({username:d.username});
  if (duplicate && (!old || !duplicate._id.equals(old._id))) fail(409,'Username already exists.');
  if (old?.role==='ADMIN' && old.active && (d.role!=='ADMIN' || !d.active) && await col.countDocuments({role:'ADMIN',active:true})<=1) fail(409,'Keep at least one active administrator.');
  if (!old || body.password) d.passwordHash=await bcrypt.hash(password(body.password),12);
  if (old) {await col.updateOne({_id:old._id},{$set:d});return safe(await col.findOne({_id:old._id}));}
  d.createdAt=new Date();const result=await col.insertOne(d);return safe({_id:result.insertedId,...d});
}
async function toggle(value,actor) {
  const user=await getDb().collection('users').findOne({_id:v.id(value)});
  if (!user) fail(404,'User not found.');
  if (user._id.equals(actor._id)) fail(409,'You cannot deactivate your own account.');
  return save({...user,active:!user.active},value);
}
async function remove(value,actor) {
  const col=getDb().collection('users');const user=await col.findOne({_id:v.id(value)});
  if (!user) fail(404,'User not found.');
  if (user._id.equals(actor._id)) fail(409,'You cannot delete your own account.');
  if (user.role==='ADMIN' && user.active && await col.countDocuments({role:'ADMIN',active:true})<=1) fail(409,'Keep at least one active administrator.');
  await col.deleteOne({_id:user._id});return {deleted:true};
}
module.exports={login,save,toggle,remove,password};
