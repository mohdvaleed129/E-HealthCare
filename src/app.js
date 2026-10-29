const express = require('express');
const path = require('path');
const hbs = require('hbs');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const rateLimit = require('express-rate-limit');
const bodyParser = require('body-parser');

const { attachUser } = require('./middleware/auth');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const routes = require('./routes');
const { SESSION_SECRET, COOKIE_SECRET, NODE_ENV } = require('./config/env');

const templatePath = path.join(__dirname, '..', 'templates');
const publicPath = path.join(__dirname, '..', 'public');

const app = express();

app.set('view engine', 'hbs');
app.set('views', templatePath);
hbs.registerPartials(path.join(templatePath, 'partials'));

// ---- Template helpers ----
hbs.registerHelper('eq', (a, b) => String(a) === String(b));
hbs.registerHelper('gt', (a, b) => Number(a) > Number(b));
hbs.registerHelper('inc', (value) => Number(value) + 1);
hbs.registerHelper('badgeClass', (status) => `badge-${String(status || '').toLowerCase().replace(/\s+/g, '-')}`);
hbs.registerHelper('prettyDate', (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
});
hbs.registerHelper('json', (context) => JSON.stringify(context));
hbs.registerHelper('concat', (...parts) => parts.slice(0, -1).join(''));

// ---- Security ----
app.use(
  helmet({
    contentSecurityPolicy: false, // enable & tune once external asset domains are finalized
  })
);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many attempts. Please try again later.',
});
app.use(['/login', '/signup', '/doctor/signup'], authLimiter);

// ---- Parsers ----
app.use(express.json({ limit: '1mb' }));
app.use(bodyParser.urlencoded({ extended: false, limit: '1mb' }));
app.use(cookieParser(COOKIE_SECRET));

app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 2 * 60 * 60 * 1000,
    },
  })
);

// Flash message middleware (reads req.session.message set by controllers)
app.use((req, res, next) => {
  res.locals.message = req.session.message || null;
  delete req.session.message;
  next();
});

app.use(attachUser);
app.use((req, res, next) => {
  res.locals.currentYear = new Date().getFullYear();
  next();
});
app.use(express.static(publicPath));

// ---- Routes ----
app.use('/', routes);

// ---- Errors ----
app.use(notFound);
app.use(errorHandler);

module.exports = app;
