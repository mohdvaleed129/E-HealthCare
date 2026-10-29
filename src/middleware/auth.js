const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/env');

// Reads the authToken cookie (if present) and attaches req.user.
// Never blocks the request — pages that don't require auth still render.
function attachUser(req, res, next) {
  const token = req.cookies && req.cookies.authToken;
  res.locals.isAuthenticated = false;
  res.locals.currentUser = null;

  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
      res.locals.isAuthenticated = true;
      res.locals.currentUser = decoded;
    } catch (err) {
      // Invalid/expired token — treat as logged out.
      res.clearCookie('authToken');
    }
  }
  next();
}

// Blocks the request entirely unless authenticated.
function requireAuth(req, res, next) {
  if (!req.user) {
    if (req.accepts('html')) return res.redirect('/login');
    return res.status(401).json({ error: 'Authentication required.' });
  }
  next();
}

// Restricts access to one or more roles. Use after requireAuth.
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      if (req.accepts('html')) {
        return res.status(403).render('error', {
          title: 'Access denied',
          message: "You don't have permission to view this page.",
          isAuthenticated: res.locals.isAuthenticated,
        });
      }
      return res.status(403).json({ error: 'Forbidden.' });
    }
    next();
  };
}

module.exports = { attachUser, requireAuth, requireRole };
