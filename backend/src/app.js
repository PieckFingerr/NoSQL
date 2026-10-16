const express=require('express');
const cors=require('cors');
const helmet=require('helmet');
const {getDb}=require('./config/database');
const {route,ok}=require('./utils/errors');
const errorHandler=require('./middleware/errorHandler');
function createApp() {
  const app=express();app.disable('x-powered-by');app.use(helmet());
  const origins=(process.env.FRONTEND_URL || 'http://127.0.0.1:5500').split(',').map(s=>s.trim());
  app.use(cors({origin:(origin,cb)=>cb(null,!origin || origins.includes(origin)),exposedHeaders:['Content-Disposition']}));
  app.use(express.json({limit:'1mb'}));
  app.use((req,res,next)=>{req.body ||= {};next();});
  app.get('/api/health',route(async(req,res)=>{await getDb().command({ping:1});ok(res,{database:'connected'});}));
  app.use('/api/auth',require('./routes/auth.routes'));
  app.use('/api/users',require('./routes/users.routes'));
  for (const name of ['rooms','tenants','contracts','services','meterReadings','invoices','payments']) {
    app.use(`/api/${name==='meterReadings'?'meter-readings':name}`,require(`./routes/${name}.routes`));
  }
  app.use('/api/dashboard',require('./routes/dashboard.routes'));
  app.use('/api/reports',require('./routes/reports.routes'));
  app.use('/api/data',require('./routes/dataManagement.routes'));
  app.use((req,res)=>res.status(404).json({success:false,message:'API endpoint not found.'}));
  app.use(errorHandler);return app;
}
module.exports={createApp};
