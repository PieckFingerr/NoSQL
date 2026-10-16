const router=require('express').Router();
const {auth}=require('../middleware/auth');
const {getDb}=require('../config/database');
const {dashboard}=require('../services/reports');
const {route,ok}=require('../utils/errors');
const {mutate}=require('./businessRouter');
router.get('/',auth,route(async(req,res)=>{await mutate(s=>s.expire());ok(res,await dashboard(getDb(),req.query));}));
module.exports=router;
