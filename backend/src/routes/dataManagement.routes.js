const router=require('express').Router();
const {auth,admin}=require('../middleware/auth');
const upload=require('../middleware/upload');
const {exclusive}=require('../config/database');
const data=require('../services/dataManagement');
const {route,ok,fail}=require('../utils/errors');
router.use(auth,admin);
router.post('/import/:collection',upload.single('file'),route(async(req,res)=>ok(res,await exclusive(()=>data.importData(req.params.collection,req.file)))));
router.get('/export/:collection',route(async(req,res)=>{
  if (req.query.format && req.query.format!=='json') fail(400,'Only JSON export is supported.');
  const body=await data.exportData(req.params.collection);
  res.attachment(`${req.params.collection}_${new Date().toISOString().slice(0,10)}.json`).type('json').send(body);
}));
router.post('/backup',route(async(req,res)=>ok(res,await exclusive(()=>data.backup()),201)));
router.get('/backups',route(async(req,res)=>ok(res,await data.backups())));
router.get('/backups/:filename',route(async(req,res)=>{
  const file=data.filename(req.params.filename);
  await require('node:fs/promises').access(file).catch(()=>fail(404,'Backup not found.'));
  res.download(file);
}));
router.post('/restore',upload.single('file'),route(async(req,res)=>ok(res,await exclusive(()=>data.restore(req.body,req.file)))));
module.exports=router;
