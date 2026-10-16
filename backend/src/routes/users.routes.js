const router=require('express').Router();
const {auth,admin}=require('../middleware/auth');
const {getDb,exclusive}=require('../config/database');
const {route,ok,fail}=require('../utils/errors');
const users=require('../controllers/users');
router.use(auth,admin);
router.get('/',route(async(req,res)=>ok(res,await getDb().collection('users').find({},{projection:{passwordHash:0}}).sort({username:1}).toArray())));
router.get('/:id',route(async(req,res)=>{
  const user=await getDb().collection('users').findOne({_id:require('../utils/validation').id(req.params.id)},{projection:{passwordHash:0}});
  if (!user) fail(404,'User not found.');ok(res,user);
}));
router.post('/',route(async(req,res)=>ok(res,await exclusive(()=>users.save(req.body)),201)));
router.put('/:id',route(async(req,res)=>{
  if (String(req.user._id)===req.params.id && (req.body.active===false || req.body.role!=='ADMIN')) fail(409,'You cannot deactivate or demote your own account.');
  ok(res,await exclusive(()=>users.save(req.body,req.params.id)));
}));
router.patch('/:id/toggle-active',route(async(req,res)=>ok(res,await exclusive(()=>users.toggle(req.params.id,req.user)))));
router.delete('/:id',route(async(req,res)=>ok(res,await exclusive(()=>users.remove(req.params.id,req.user)))));
module.exports=router;
