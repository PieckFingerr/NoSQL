const {Router}=require('express');
const {auth}=require('../middleware/auth');
const {getDb,transaction,exclusive}=require('../config/database');
const Business=require('../services/business');
const {report}=require('../services/reports');
const {route,ok}=require('../utils/errors');
const mutate=fn=>exclusive(()=>transaction(session=>fn(new Business(getDb(),session))));
function businessRouter(name) {
  const router=Router();router.use(auth);
  // Expiration is reconciled before reads/writes rather than by an automatic seed
  // or destructive background job. Updates are transactional and preserve maintenance.
  if (['rooms','contracts','invoices'].includes(name)) router.use(route(async(req,res,next)=>{await mutate(s=>s.expire());next();}));
  if (name==='contracts') {
    router.get('/expiring',route(async(req,res)=>ok(res,await report(getDb(),'expiring-contracts',req.query))));
    router.patch('/:id/extend',route(async(req,res)=>ok(res,await mutate(s=>s.extend(req.params.id,req.body)))));
    router.patch('/:id/terminate',route(async(req,res)=>ok(res,await mutate(s=>s.terminate(req.params.id)))));
  }
  if (name==='tenants') router.get('/:id/rental-history',route(async(req,res)=>{
    await new Business(getDb()).one('tenants',req.params.id);
    ok(res,await report(getDb(),'tenant-rental-history',{tenantId:req.params.id}));
  }));
  if (name==='services') router.patch('/:id/toggle-active',route(async(req,res)=>{
    const result=await mutate(async s=>{const d=await s.one(name,req.params.id);return s.save(name,{...d,active:!d.active},d._id);});
    ok(res,result);
  }));
  if (name==='invoices') router.post('/generate',route(async(req,res)=>ok(res,await mutate(s=>s.generate(req.body)),201)));
  router.get('/',route(async(req,res)=>ok(res,await new Business(getDb()).list(name,req.query))));
  router.get('/:id',route(async(req,res)=>{
    const service=new Business(getDb());const d=await service.one(name,req.params.id);
    if (name==='invoices') Object.assign(d,{paidAmount:await service.paid(d._id),remaining:Math.max(0,Number(d.total)-await service.paid(d._id)),payments:await service.list('payments',{invoiceId:String(d._id)})});
    ok(res,d);
  }));
  if (name!=='invoices') router.post('/',route(async(req,res)=>ok(res,await mutate(s=>s.save(name,req.body)),201)));
  if (name!=='payments') router.put('/:id',route(async(req,res)=>ok(res,await mutate(s=>name==='invoices'?s.editInvoice(req.params.id,req.body):s.save(name,req.body,req.params.id)))));
  if (name!=='payments') router.delete('/:id',route(async(req,res)=>ok(res,await mutate(s=>s.remove(name,req.params.id)))));
  return router;
}
module.exports={businessRouter,mutate};
