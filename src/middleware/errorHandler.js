// Centralized error handling — never leak internal error details
// (stack traces, DB error strings) to the client.
function notFound(req, res) {
  res.status(404).render('error', {
    title: 'Page not found',
    message: "The page you're looking for doesn't exist.",
    isAuthenticated: res.locals.isAuthenticated,
  });
}

function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  console.error(err);

  const status = err.status || 500;
  const publicMessage =
    status === 500
      ? 'Something went wrong on our end. Please try again shortly.'
      : err.message || 'Request could not be completed.';

  if (req.accepts('html')) {
    return res.status(status).render('error', {
      title: status === 500 ? 'Server error' : 'Request failed',
      message: publicMessage,
      isAuthenticated: res.locals.isAuthenticated,
    });
  }
  res.status(status).json({ error: publicMessage });
}

module.exports = { notFound, errorHandler };
