const router=require('express').Router();
const {route,ok,fail}=require('../utils/errors');
const users=require('../controllers/users');
const {auth}=require('../middleware/auth');
// Small bounded in-memory login throttle; no additional collection is needed.
const attempts=new Map();
router.post('/login',route(async(req,res)=>{
  const key=req.ip;const now=Date.now();
  for (const [ip,value] of attempts) if (value.until<now) attempts.delete(ip);
  const record=attempts.get(key) || {count:0,until:now+60000};
  if (record.count>=15) fail(429,'Too many login attempts. Try again in one minute.');
  record.count++;attempts.set(key,record);
  const result=await users.login(req.body);attempts.delete(key);ok(res,result);
}));
router.get('/me',auth,(req,res)=>ok(res,req.user));
module.exports=router;
