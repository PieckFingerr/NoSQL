const v = require('../utils/validation');
const { fail } = require('../utils/errors');
const lookup = { $lookup: { from:'rooms',localField:'roomId',foreignField:'_id',as:'room' } };
const unwind = { $unwind: {path:'$room',preserveNullAndEmptyArrays:true} };
function buildReport(name, q = {}, now = new Date()) {
  const period = {};
  if (q.month) period.month = v.integer(q.month,'month',1,12);
  if (q.year) period.year = v.integer(q.year,'year',2020,9999);
  const timeMatch = {};
  if (period.month) timeMatch.$expr = {$eq:[{$month:{date:'$paymentDate',timezone:'Asia/Ho_Chi_Minh'}},period.month]};
  if (period.year) {
    const yearExpr={$eq:[{$year:{date:'$paymentDate',timezone:'Asia/Ho_Chi_Minh'}},period.year]};
    timeMatch.$expr=timeMatch.$expr?{$and:[timeMatch.$expr,yearExpr]}:yearExpr;
  }
  const revenueMatch = {$match:{status:'SUCCESS',...timeMatch}};
  switch (name) {
    case 'monthly-revenue': return ['payments',[revenueMatch,{$group:{_id:{year:{$year:{date:'$paymentDate',timezone:'Asia/Ho_Chi_Minh'}},month:{$month:{date:'$paymentDate',timezone:'Asia/Ho_Chi_Minh'}}},totalRevenue:{$sum:'$amount'},transactionCount:{$sum:1}}},{$project:{_id:0,year:'$_id.year',month:'$_id.month',totalRevenue:1,transactionCount:1}},{$sort:{year:-1,month:-1}}]];
    case 'electricity-usage':
    case 'water-usage': {
      const type = name === 'electricity-usage'?'electricity':'water';
      return ['meter_readings',[{$match:period},{$group:{_id:{year:'$year',month:'$month'},totalUsage:{$sum:{$subtract:[`$${type}.newIndex`,`$${type}.oldIndex`]}},roomsRecorded:{$sum:1}}},{$project:{_id:0,year:'$_id.year',month:'$_id.month',totalUsage:1,roomsRecorded:1}},{$sort:{year:-1,month:-1}}]];
    }
    case 'expiring-contracts': return ['contracts',[{$match:{status:'ACTIVE',endDate:{$gte:now,$lte:new Date(now.getTime()+v.integer(q.days || 30,'days',1,3650)*86400000)}}},lookup,unwind,{$lookup:{from:'tenants',localField:'tenantIds',foreignField:'_id',as:'tenants'}},{$project:{roomNumber:'$room.roomNumber',tenantNames:'$tenants.fullName',startDate:1,endDate:1,monthlyRent:1,status:1,daysLeft:{$ceil:{$divide:[{$subtract:['$endDate',now]},86400000]}}}},{$sort:{endDate:1}}]];
    case 'overdue-invoices': return ['invoices',[{$match:{status:{$in:['UNPAID','PARTIAL']},dueDate:{$lt:now},...period}},lookup,unwind,{$lookup:{from:'payments',let:{invoice:'$_id'},pipeline:[{$match:{$expr:{$and:[{$eq:['$invoiceId','$$invoice']},{$eq:['$status','SUCCESS']}]}}}],as:'payments'}},{$project:{roomNumber:'$room.roomNumber',month:1,year:1,total:1,status:1,dueDate:1,paidAmount:{$sum:'$payments.amount'},remaining:{$subtract:['$total',{$sum:'$payments.amount'}]},daysOverdue:{$floor:{$divide:[{$subtract:[now,'$dueDate']},86400000]}}}},{$sort:{dueDate:1}}]];
    case 'tenant-rental-history': return ['contracts',[{$match:{tenantIds:v.id(q.tenantId,'tenantId')}},lookup,unwind,{$lookup:{from:'tenants',localField:'tenantIds',foreignField:'_id',as:'tenants'}},{$project:{roomNumber:'$room.roomNumber',tenantNames:'$tenants.fullName',startDate:1,endDate:1,monthlyRent:1,deposit:1,status:1}},{$sort:{startDate:-1}}]];
    case 'room-occupancy': return ['rooms',[{$group:{_id:'$status',count:{$sum:1}}},{$project:{_id:0,status:'$_id',count:1}},{$sort:{status:1}}]];
    case 'invoice-status': return ['invoices',[{$match:period},{$group:{_id:'$status',count:{$sum:1},totalAmount:{$sum:'$total'}}},{$project:{_id:0,status:'$_id',count:1,totalAmount:1}},{$sort:{status:1}}]];
    case 'revenue-by-method': return ['payments',[revenueMatch,{$group:{_id:'$paymentMethod',totalRevenue:{$sum:'$amount'},transactionCount:{$sum:1}}},{$project:{_id:0,paymentMethod:'$_id',totalRevenue:1,transactionCount:1}},{$sort:{totalRevenue:-1}}]];
    case 'room-billing-history': return ['invoices',[{$match:{roomId:v.id(q.roomId,'roomId'),...period}},lookup,unwind,{$lookup:{from:'payments',localField:'_id',foreignField:'invoiceId',as:'payments'}},{$project:{roomNumber:'$room.roomNumber',month:1,year:1,rent:1,services:1,total:1,status:1,dueDate:1,payments:1}},{$sort:{year:-1,month:-1}}]];
    default: fail(404,'Unknown report.');
  }
}
async function report(db,name,q) { const [collection,pipeline]=buildReport(name,q); return db.collection(collection).aggregate(pipeline).toArray(); }
async function dashboard(db,q={}) {
  const now=new Date();
  const dateParts = new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'numeric'}).formatToParts(now);
  const period={month:q.month || dateParts.find(p=>p.type==='month').value,year:q.year || dateParts.find(p=>p.type==='year').value};
  const [rooms,totalTenants,activeContracts,expiring,unpaidInvoices,overdueInvoices,revenue,electricity,water] = await Promise.all([
    report(db,'room-occupancy',{}),db.collection('tenants').countDocuments(),db.collection('contracts').countDocuments({status:'ACTIVE'}),report(db,'expiring-contracts',{days:30}),db.collection('invoices').countDocuments({status:{$in:['UNPAID','PARTIAL']}}),db.collection('invoices').countDocuments({status:{$in:['UNPAID','PARTIAL']},dueDate:{$lt:now}}),report(db,'monthly-revenue',period),report(db,'electricity-usage',period),report(db,'water-usage',period)
  ]);
  const count=status=>rooms.find(r=>r.status===status)?.count || 0;
  return {period,totalRooms:rooms.reduce((s,r)=>s+r.count,0),availableRooms:count('AVAILABLE'),occupiedRooms:count('OCCUPIED'),maintenanceRooms:count('MAINTENANCE'),totalTenants,activeContracts,expiringContracts:expiring.length,unpaidInvoices,overdueInvoices,monthlyRevenue:revenue[0]?.totalRevenue || 0,monthlyElectricityUsage:electricity[0]?.totalUsage || 0,monthlyWaterUsage:water[0]?.totalUsage || 0,expiringContractRows:expiring};
}
module.exports = {buildReport,report,dashboard};
