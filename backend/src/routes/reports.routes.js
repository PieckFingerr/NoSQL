const router=require('express').Router();
const {auth}=require('../middleware/auth');
const {getDb}=require('../config/database');
const {report}=require('../services/reports');
const Business=require('../services/business');
const {route,ok,fail}=require('../utils/errors');
const {mutate}=require('./businessRouter');
router.use(auth,route(async(req,res,next)=>{await mutate(s=>s.expire());next();}));
router.get('/basic/:name',route(async(req,res)=>{
  const choices={
    'available-rooms':['rooms',{status:'AVAILABLE'}],
    'occupied-rooms':['rooms',{status:'OCCUPIED'}],
    'maintenance-rooms':['rooms',{status:'MAINTENANCE'}],
    'tenant-phone':['tenants',{phone:req.query.phone}],
    'active-contracts':['contracts',{status:'ACTIVE'}],
    'active-services':['services',{active:'true'}],
    'unpaid-invoices':['invoices',{status:'UNPAID'}],
    'invoice-payments':['payments',{invoiceId:req.query.invoiceId}]
  };
  const query=choices[req.params.name];if (!query) fail(404,'Unknown basic query.');
  if (req.params.name==='tenant-phone' && !req.query.phone) fail(400,'phone is required.');
  if (req.params.name==='invoice-payments' && !req.query.invoiceId) fail(400,'invoiceId is required.');
  ok(res,await new Business(getDb()).list(...query));
}));
router.get('/:name',route(async(req,res)=>ok(res,await report(getDb(),req.params.name,req.query))));
module.exports=router;
