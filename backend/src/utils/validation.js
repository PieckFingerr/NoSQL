const { ObjectId, Int32, Double } = require('mongodb');
const { fail } = require('./errors');
const COLLECTIONS = ['rooms', 'tenants', 'contracts', 'services', 'meter_readings', 'invoices', 'payments'];
function collection(name) { if (!COLLECTIONS.includes(name)) fail(400, 'Unsupported business collection.'); return name; }
function id(value, name = 'id') {
  if (value instanceof ObjectId) return value;
  if (typeof value !== 'string' || !/^[a-f\d]{24}$/i.test(value)) fail(400, `Invalid ${name}.`);
  return new ObjectId(value);
}
function text(value, name, max = 200) {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > max) fail(400, `${name} is required (maximum ${max} characters).`);
  return value.trim();
}
function number(value, name, min = 0, max = Number.MAX_SAFE_INTEGER) {
  if (value === '' || value === null || value === undefined || (typeof value !== 'number' && typeof value !== 'string' && !['Double', 'Int32'].includes(value?._bsontype))) fail(400, `${name} must be a number.`);
  const n = Number(value);
  if (!Number.isFinite(n) || n < min || n > max) fail(400, `${name} must be between ${min} and ${max}.`);
  return n;
}
function integer(value, name, min, max) {
  const n = number(value, name, min, max);
  if (!Number.isInteger(n)) fail(400, `${name} must be an integer.`);
  return n;
}
function double(value, name) { return new Double(number(value, name)); }
function date(value, name) {
  if (!(value instanceof Date) && (typeof value !== 'string' || !value.trim())) fail(400, `${name} is required.`);
  const d = new Date(value);
  if (!Number.isFinite(d.getTime())) fail(400, `Invalid ${name}.`);
  return d;
}
function choice(value, values, name) { if (!values.includes(value)) fail(400, `Invalid ${name}. Expected ${values.join(', ')}.`); return value; }
function boolean(value, name) { if (typeof value !== 'boolean') fail(400, `${name} must be true or false.`); return value; }
function period(body) { return { month: new Int32(integer(body.month, 'month', 1, 12)), year: new Int32(integer(body.year, 'year', 2020, 9999)) }; }
function document(name, b) {
  if (!b || typeof b !== 'object' || Array.isArray(b)) fail(400, 'Expected a document object.');
  let d;
  switch (name) {
    case 'rooms': d = {roomNumber: text(b.roomNumber,'roomNumber'), floor: new Int32(integer(b.floor,'floor',0,1000)), price: double(b.price,'price'), area: double(b.area,'area'), status: choice(b.status,['AVAILABLE','OCCUPIED','MAINTENANCE'],'status')}; break;
    case 'tenants':
      d = {fullName: text(b.fullName,'fullName'), phone: text(b.phone,'phone',30), email: text(b.email,'email'), identityCard: text(b.identityCard,'identityCard',30), dateOfBirth: date(b.dateOfBirth,'dateOfBirth')};
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email)) fail(400,'Invalid email.');
      if (d.dateOfBirth > new Date()) fail(400,'Date of birth cannot be in the future.');
      break;
    case 'services': d = {name: text(b.name,'name'), unit: text(b.unit,'unit'), price: double(b.price,'price'), active: boolean(b.active ?? true,'active')}; break;
    case 'contracts':
      if (!Array.isArray(b.tenantIds) || !b.tenantIds.length) fail(400,'At least one tenant is required.');
      d = {roomId: id(b.roomId,'roomId'), tenantIds: b.tenantIds.map(v => id(v,'tenantId')), startDate: date(b.startDate,'startDate'), endDate: date(b.endDate,'endDate'), monthlyRent: double(b.monthlyRent,'monthlyRent'), deposit: double(b.deposit,'deposit'), status: choice(b.status ?? 'ACTIVE',['ACTIVE','EXPIRED','TERMINATED'],'status')};
      if (new Set(d.tenantIds.map(String)).size !== d.tenantIds.length) fail(400,'Duplicate tenantIds.');
      if (d.endDate <= d.startDate) fail(400,'endDate must be after startDate.');
      break;
    case 'meter_readings':
      d = {roomId: id(b.roomId,'roomId'), ...period(b), recordedAt: date(b.recordedAt ?? new Date(),'recordedAt')};
      for (const type of ['electricity','water']) {
        d[type] = {oldIndex: double(b[type]?.oldIndex,`${type}.oldIndex`), newIndex: double(b[type]?.newIndex,`${type}.newIndex`)};
        if (Number(d[type].newIndex) < Number(d[type].oldIndex)) fail(400,`${type}: newIndex must be >= oldIndex.`);
      }
      break;
    case 'invoices':
      if (!Array.isArray(b.services)) fail(400,'services must be an array of snapshots.');
      d = {roomId: id(b.roomId,'roomId'), contractId: id(b.contractId,'contractId'), ...period(b), rent: double(b.rent,'rent'), services: b.services.map(s => ({name: text(s.name,'service name'), quantity: double(s.quantity,'quantity'), unitPrice: double(s.unitPrice,'unitPrice'), amount: double(s.amount,'amount')})), total: double(b.total,'total'), status: choice(b.status,['UNPAID','PARTIAL','PAID'],'status'), dueDate: date(b.dueDate,'dueDate'), createdAt: date(b.createdAt ?? new Date(),'createdAt')};
      for (const s of d.services) if (Math.abs(Number(s.amount) - Number(s.quantity)*Number(s.unitPrice)) > .001) fail(400,'Invalid service amount.');
      if (Math.abs(Number(d.total) - Number(d.rent) - d.services.reduce((sum,s) => sum+Number(s.amount),0)) > .001) fail(400,'Invoice total must equal rent plus services.');
      break;
    case 'payments': d = {invoiceId: id(b.invoiceId,'invoiceId'), amount: double(b.amount,'amount'), paymentMethod: choice(b.paymentMethod,['CASH','BANK_TRANSFER','OTHER'],'paymentMethod'), paymentDate: date(b.paymentDate ?? new Date(),'paymentDate'), status: choice(b.status ?? 'SUCCESS',['SUCCESS','PENDING','CANCELLED'],'status'), note: typeof b.note === 'string' ? b.note.slice(0,1000) : ''};
      if (Number(d.amount) <= 0) fail(400,'Payment amount must be positive.');
      break;
    default: fail(400,'Unsupported document.');
  }
  if (b._id !== undefined) d._id = id(b._id);
  return d;
}
const escapeRegex = s => text(s,'search').replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
module.exports = {COLLECTIONS, collection, id, text, number, integer, double, date, choice, boolean, period, document, escapeRegex};
