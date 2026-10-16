const jwt = require('jsonwebtoken');
const { ObjectId } = require('mongodb');
const { getDb } = require('../config/database');
const { fail, route } = require('../utils/errors');
const auth = route(async (req, res, next) => {
  const token = req.headers.authorization?.match(/^Bearer (.+)$/)?.[1];
  if (!token) fail(401, 'Please log in.');
  let payload;
  try { payload = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] }); }
  catch { fail(401, 'Login expired. Please log in again.'); }
  if (!ObjectId.isValid(payload.sub)) fail(401, 'Invalid login.');
  const user = await getDb().collection('users').findOne({ _id: new ObjectId(payload.sub), active: true }, { projection: { passwordHash: 0 } });
  if (!user) fail(401, 'Account is inactive or deleted.');
  req.user = user;
  next();
});
const admin = (req, res, next) => req.user.role === 'ADMIN' ? next() : next(Object.assign(new Error('Administrator access required.'), { status: 403 }));
module.exports = { auth, admin };
