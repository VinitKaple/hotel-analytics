class AppError extends Error {
  constructor(message, status = 400, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

function notFound(req, res, next) {
  next(new AppError('The requested resource was not found.', 404));
}

// Never leak raw backend / database errors to the browser.
function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  if (err.name === 'CastError') return res.status(400).json({ message: 'The identifier supplied is not valid.' });
  if (err.name === 'ValidationError') return res.status(400).json({ message: 'Some of the information provided is not valid. Please review and try again.' });
  if (err.code === 11000) return res.status(409).json({ message: 'This record already exists.' });
  if (err.type === 'entity.parse.failed') return res.status(400).json({ message: 'The request could not be understood.' });
  if (err.status && err.status < 500) return res.status(err.status).json({ message: err.message, errors: err.details });
  console.error('[error]', err);
  res.status(500).json({ message: 'Something went wrong on our side. Please try again in a moment.' });
}

module.exports = { AppError, notFound, errorHandler };
