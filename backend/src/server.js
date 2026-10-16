const {connect,close}=require('./config/database');
const {createApp}=require('./app');
async function start() {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET==='change_this_secret' || process.env.JWT_SECRET.length<32) throw new Error('Set JWT_SECRET to at least 32 random characters in backend/.env.');
  await connect();
  const server=createApp().listen(process.env.PORT || 5000,'127.0.0.1',()=>console.log(`API listening on http://localhost:${process.env.PORT || 5000}`));
  for (const signal of ['SIGINT','SIGTERM']) process.on(signal,()=>server.close(async()=>{await close();process.exit(0);}));
  server.on('error',async()=>{console.error('API could not listen on the requested port.');await close();process.exitCode=1;});
}
if (require.main===module) start().catch(async(error)=>{
  console.error('Startup failed:',error.message.includes('JWT_SECRET') || error.message.startsWith('Set ')?error.message:'Cannot connect to MongoDB. Check URI, Atlas network access, database user and connection availability.');
  await close();process.exitCode=1;
});
module.exports={start};
