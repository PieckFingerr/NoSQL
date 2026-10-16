function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);
  let status = error.status || 500;
  let message = error.message;
  if (error.code === 11000) { status = 409; message = 'Duplicate record: a unique identifier, room/month, or ACTIVE contract already exists.'; }
  if (error.code === 121) { status = 400; message = 'Document does not satisfy the existing MongoDB validator.'; }
  if (error.name === 'MulterError') { status = 400; message = 'Invalid upload or file exceeds the 10 MB limit.'; }
  if (error instanceof SyntaxError || error.name === 'BSONError') { status = 400; message = 'Invalid JSON or BSON value.'; }
  if (status >= 500) {
    console.error('API operation failed:', error.code || error.name);
    message = 'Operation failed. Check database connectivity and server logs.';
  }
  res.status(status).json({ success: false, message });
}
module.exports = errorHandler;
