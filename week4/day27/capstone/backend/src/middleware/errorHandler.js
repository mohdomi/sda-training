// eslint-disable-next-line no-unused-vars
export default function errorHandler(err, req, res, next) {
  const status = err.status || 500;
  if (status >= 500) console.error(err);
  const body = { success: false, message: err.message || 'Server error' };
  if (Array.isArray(err.details) && err.details.length) body.details = err.details;
  res.status(status).json(body);
}
