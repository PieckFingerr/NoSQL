const { ObjectId } = require('mongodb');
const v = require('../utils/validation');
const { fail } = require('../utils/errors');

class Business {
  constructor(db, session) { this.db = db; this.options = session ? { session } : {}; }
  col(name) { return this.db.collection(v.collection(name)); }
  async one(name, value) {
    const doc = await this.col(name).findOne({ _id: v.id(value) }, this.options);
    if (!doc) fail(404, `${name} record not found.`);
    return doc;
  }
  async exists(name, filter) { return this.col(name).findOne(filter, this.options); }
  async roomStatus(roomId) {
    const active = await this.exists('contracts', { roomId, status: 'ACTIVE' });
    const room = await this.one('rooms', roomId);
    if (active || room.status !== 'MAINTENANCE') await this.col('rooms').updateOne({ _id: roomId }, { $set: { status: active ? 'OCCUPIED' : 'AVAILABLE' } }, this.options);
  }
  async expire() {
    const expired = await this.col('contracts').find({ status: 'ACTIVE', endDate: { $lt: new Date() } }, this.options).toArray();
    for (const c of expired) {
      await this.col('contracts').updateOne({ _id: c._id }, { $set: { status: 'EXPIRED' } }, this.options);
      await this.roomStatus(c.roomId);
    }
    return expired.length;
  }
  async paid(invoiceId) {
    const result = await this.col('payments').aggregate([
      { $match: { invoiceId, status: 'SUCCESS' } },
      { $group: { _id: null, paidAmount: { $sum: '$amount' } } }
    ], this.options).toArray();
    return Number(result[0]?.paidAmount || 0);
  }
  async sync(invoiceId) {
    const invoice = await this.one('invoices', invoiceId);
    const paidAmount = await this.paid(invoiceId);
    if (paidAmount > Number(invoice.total) + .001) fail(409, 'Successful payments exceed the invoice total.');
    const status = paidAmount === 0 ? 'UNPAID' : paidAmount >= Number(invoice.total) ? 'PAID' : 'PARTIAL';
    await this.col('invoices').updateOne({ _id: invoiceId }, { $set: { status } }, this.options);
    return { paidAmount, remaining: Math.max(0, Number(invoice.total) - paidAmount), status };
  }
  async validateRelations(name, d, old) {
    if (['contracts','meter_readings','invoices'].includes(name)) await this.one('rooms', d.roomId);
    if (name === 'rooms') {
      const active = await this.exists('contracts', { roomId: old?._id || d._id || new ObjectId(), status: 'ACTIVE' });
      if (active && d.status === 'AVAILABLE') fail(409, 'A room with an ACTIVE contract cannot be AVAILABLE.');
    }
    if (name === 'tenants') {
      const duplicate = await this.exists('tenants', { phone: d.phone, _id: { $ne: old?._id || d._id || new ObjectId() } });
      if (duplicate) fail(409, 'Tenant phone already exists.');
    }
    if (name === 'services' && old && d.name !== old.name && await this.exists('invoices', { 'services.name': old.name })) fail(409, 'Cannot rename a service used by invoice history. Disable it instead.');
    if (name === 'contracts') {
      for (const tenantId of d.tenantIds) await this.one('tenants', tenantId);
      if (old && !old.roomId.equals(d.roomId) && await this.exists('invoices', { contractId: old._id })) fail(409, 'Cannot change the room on a billed contract.');
      if (d.status === 'ACTIVE') {
        if (d.endDate < new Date()) fail(400, 'An ACTIVE contract must not already have ended.');
        const active = await this.exists('contracts', { roomId: d.roomId, status: 'ACTIVE', _id: { $ne: old?._id || d._id || new ObjectId() } });
        if (active) fail(409, 'This room already has an ACTIVE contract.');
        const room = await this.one('rooms', d.roomId);
        if (room.status === 'MAINTENANCE' && (!old || old.status !== 'ACTIVE')) fail(409, 'This room is under maintenance.');
      }
    }
    if (name === 'meter_readings' && old) {
      if (await this.exists('invoices', { roomId: old.roomId, month: old.month, year: old.year })) fail(409, 'A billed meter reading cannot be changed.');
    }
    if (['meter_readings','invoices'].includes(name)) {
      const duplicate=await this.exists(name,{roomId:d.roomId,month:d.month,year:d.year,_id:{$ne:old?._id || new ObjectId()}});
      if (duplicate) fail(409,`A ${name} record already exists for this room/month.`);
    }
    if (name === 'invoices') {
      const c = await this.one('contracts', d.contractId);
      if (!c.roomId.equals(d.roomId)) fail(400, 'Invoice room and contract do not match.');
    }
    if (name === 'payments') {
      const invoice = await this.one('invoices', d.invoiceId);
      if (d.status === 'SUCCESS' && await this.paid(d.invoiceId) + Number(d.amount) > Number(invoice.total) + .001) fail(409, 'Payment exceeds the remaining invoice balance.');
    }
  }
  async save(name, body, value) {
    const old = value ? await this.one(name, value) : null;
    const d = v.document(name, body);
    if (old) delete d._id;
    else if (d._id && await this.exists(name,{_id:d._id})) fail(409,'A document with this _id already exists.');
    await this.validateRelations(name, d, old);
    if (name === 'invoices' && old) fail(400, 'Use invoice due-date editing; billing snapshots are immutable.');
    if (name === 'payments' && old) fail(400, 'Payments are append-only.');
    if (old) await this.col(name).updateOne({ _id: old._id }, { $set: d }, this.options);
    else { d._id ||= new ObjectId(); await this.col(name).insertOne(d, this.options); }
    if (name === 'contracts') {
      if (old && !old.roomId.equals(d.roomId)) await this.roomStatus(old.roomId);
      await this.roomStatus(d.roomId);
    }
    if (name === 'payments') await this.sync(d.invoiceId);
    return this.one(name, old?._id || d._id);
  }
  async remove(name, value) {
    const d = await this.one(name, value);
    const checks = {
      rooms: [['contracts',{roomId:d._id}],['meter_readings',{roomId:d._id}],['invoices',{roomId:d._id}]],
      tenants: [['contracts',{tenantIds:d._id}]],
      services: [['invoices',{'services.name':d.name}]],
      meter_readings: [['invoices',{roomId:d.roomId,month:d.month,year:d.year}]],
      contracts: [['invoices',{contractId:d._id}]],
      invoices: [['payments',{invoiceId:d._id}]]
    };
    if (!checks[name]) fail(400,'Deletion is not supported.');
    for (const [related,filter] of checks[name]) if (await this.exists(related,filter)) fail(409,`Cannot delete: referenced by ${related} history.`);
    await this.col(name).deleteOne({_id:d._id},this.options);
    if (name === 'contracts') await this.roomStatus(d.roomId);
    return {deleted:true};
  }
  async extend(value, body) {
    const old = await this.one('contracts', value);
    if (old.status !== 'ACTIVE') fail(409,'Only ACTIVE contracts can be extended.');
    const endDate = v.date(body.endDate,'endDate');
    if (endDate <= old.endDate) fail(400,'New endDate must be later than the current endDate.');
    return this.save('contracts',{...old,endDate},old._id);
  }
  async terminate(value) {
    const old = await this.one('contracts',value);
    return this.save('contracts',{...old,status:'TERMINATED'},old._id);
  }
  async generate(body) {
    if (body.serviceIds !== undefined && !Array.isArray(body.serviceIds)) fail(400,'serviceIds must be an array.');
    const roomId = v.id(body.roomId,'roomId');
    const period = v.period(body);
    const contract = await this.exists('contracts',{roomId,status:'ACTIVE'});
    if (!contract) fail(409,'An ACTIVE contract is required.');
    const first = new Date(Date.UTC(Number(period.year),Number(period.month)-1,1));
    const next = new Date(Date.UTC(Number(period.year),Number(period.month),1));
    if (contract.startDate >= next || contract.endDate < first) fail(400,'Billing period is outside the contract dates.');
    if (await this.exists('invoices',{roomId,...period})) fail(409,'An invoice already exists for this room/month.');
    const reading = await this.exists('meter_readings',{roomId,...period});
    if (!reading) fail(409,'Record the monthly meter readings first.');
    const services = [];
    // Match Member 3: Electricity, Water, Internet and Garbage. Optional services
    // such as Parking can be explicitly selected with serviceIds.
    const names = ['Electricity','Water','Internet','Garbage'];
    const selected = await this.col('services').find({active:true,$or:[{name:{$in:names}},{_id:{$in:(body.serviceIds || []).map(x=>v.id(x))}}]},this.options).toArray();
    for (const required of ['Electricity','Water']) if (!selected.some(s=>s.name===required)) fail(409,`${required} must exist and be active.`);
    for (const service of selected) {
      const quantity = service.name === 'Electricity' ? Number(reading.electricity.newIndex)-Number(reading.electricity.oldIndex) : service.name === 'Water' ? Number(reading.water.newIndex)-Number(reading.water.oldIndex) : 1;
      services.push({name:service.name,quantity,unitPrice:Number(service.price),amount:quantity*Number(service.price)});
    }
    return this.save('invoices',{roomId,contractId:contract._id,...period,rent:Number(contract.monthlyRent),services,total:Number(contract.monthlyRent)+services.reduce((sum,s)=>sum+s.amount,0),status:'UNPAID',dueDate:body.dueDate,createdAt:new Date()});
  }
  async editInvoice(value, body) {
    const invoice = await this.one('invoices',value);
    if (Object.keys(body).some(k=>k!=='dueDate')) fail(400,'Only dueDate may be edited. Existing billing snapshots are preserved.');
    await this.col('invoices').updateOne({_id:invoice._id},{$set:{dueDate:v.date(body.dueDate,'dueDate')}},this.options);
    return this.one('invoices',invoice._id);
  }
  async list(name, q = {}) {
    const filter = {};
    if (q.status) filter.status = v.text(q.status,'status');
    for (const field of ['roomId','invoiceId','contractId']) if (q[field]) filter[field] = v.id(q[field],field);
    if (q.tenantId) filter.tenantIds = v.id(q.tenantId,'tenantId');
    if (q.floor !== undefined && q.floor !== '') filter.floor = v.integer(q.floor,'floor',0,1000);
    if (q.month) filter.month = v.integer(q.month,'month',1,12);
    if (q.year) filter.year = v.integer(q.year,'year',2020,9999);
    if (q.active !== undefined && q.active !== '') filter.active = v.choice(q.active,['true','false'],'active') === 'true';
    if (q.overdue === 'true') {filter.status={$in:['UNPAID','PARTIAL']};filter.dueDate={$lt:new Date()};}
    if (q.phone) filter.phone = {$regex:v.escapeRegex(q.phone),$options:'i'};
    if (q.search) {
      let fields = {rooms:['roomNumber'],tenants:['fullName','phone','identityCard'],services:['name']}[name];
      if (name === 'contracts') {
        const rooms = await this.col('rooms').find({roomNumber:{$regex:v.escapeRegex(q.search),$options:'i'}},this.options).toArray();
        const tenants = await this.col('tenants').find({fullName:{$regex:v.escapeRegex(q.search),$options:'i'}},this.options).toArray();
        filter.$or = [{roomId:{$in:rooms.map(r=>r._id)}},{tenantIds:{$in:tenants.map(t=>t._id)}}];
      } else if (fields) filter.$or = fields.map(k=>({[k]:{$regex:v.escapeRegex(q.search),$options:'i'}}));
    }
    const sort = {rooms:{roomNumber:1},tenants:{fullName:1},services:{name:1},contracts:{endDate:1},meter_readings:{year:-1,month:-1},invoices:{year:-1,month:-1},payments:{paymentDate:-1}}[name];
    const rows = await this.col(name).find(filter,this.options).sort(sort).toArray();
    for (const row of rows) {
      if (row.roomId) row.room = await this.one('rooms',row.roomId);
      if (name === 'contracts') row.tenants = await this.col('tenants').find({_id:{$in:row.tenantIds}},this.options).toArray();
      if (name === 'meter_readings') {row.electricityUsage=Number(row.electricity.newIndex)-Number(row.electricity.oldIndex);row.waterUsage=Number(row.water.newIndex)-Number(row.water.oldIndex);}
      if (name === 'invoices') {row.paidAmount=await this.paid(row._id);row.remaining=Math.max(0,Number(row.total)-row.paidAmount);}
    }
    return rows;
  }
}
module.exports = Business;
