const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Doctor = require('../models/Doctor');
const { JWT_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD, NODE_ENV } = require('../config/env');

const SALT_ROUNDS = 12;

function signToken(id, role) {
  return jwt.sign({ id, role }, JWT_SECRET, { expiresIn: '2h' });
}

function setAuthCookie(res, token) {
  res.cookie('authToken', token, {
    httpOnly: true,
    secure: NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 2 * 60 * 60 * 1000,
  });
}

function flash(req, type, intro, message) {
  req.session.message = { type, intro, message };
}

// ---- Patient signup / login ----

exports.getSignup = (req, res) => res.render('signup', { isAuthenticated: false });

exports.postSignup = async (req, res) => {
  const { name, email, password, phone } = req.body;

  if (!name || !email || !password || password.length < 8) {
    flash(req, 'danger', 'Signup failed:', 'Please provide a valid name, email, and a password of at least 8 characters.');
    return res.redirect('/signup');
  }

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    flash(req, 'danger', 'User already exists:', 'An account with this email already exists. Please log in instead.');
    return res.redirect('/signup');
  }

  const hashed = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await User.create({ name, email: email.toLowerCase(), password: hashed, phone });

  const token = signToken(user._id, 'patient');
  setAuthCookie(res, token);
  return res.redirect('/');
};

exports.getLogin = (req, res) => res.render('login', { isAuthenticated: false });

exports.postLogin = async (req, res) => {
  const { email, password, role } = req.body;
  const normalizedEmail = (email || '').toLowerCase().trim();

  const fail = () => {
    flash(req, 'danger', 'Login failed:', 'Invalid email, password, or role.');
    return res.redirect('/login');
  };

  if (!normalizedEmail || !password || !role) return fail();

  if (role === 'admin') {
    if (!ADMIN_PASSWORD) {
      flash(req, 'danger', 'Admin login unavailable:', 'ADMIN_PASSWORD is not configured on the server.');
      return res.redirect('/login');
    }
    if (normalizedEmail !== ADMIN_EMAIL.toLowerCase() || password !== ADMIN_PASSWORD) return fail();

    const token = signToken('admin', 'admin');
    setAuthCookie(res, token);
    return res.redirect('/admin');
  }

  if (role === 'patient') {
    const user = await User.findOne({ email: normalizedEmail }).select('+password');
    if (!user) return fail();
    if (user.status === 'suspended') {
      flash(req, 'danger', 'Account suspended:', 'This account has been suspended. Contact support for help.');
      return res.redirect('/login');
    }
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return fail();

    const token = signToken(user._id, 'patient');
    setAuthCookie(res, token);
    return res.redirect('/');
  }

  if (role === 'doctor') {
    const doctor = await Doctor.findOne({ email: normalizedEmail }).select('+password');
    if (!doctor) return fail();
    const valid = await bcrypt.compare(password, doctor.password);
    if (!valid) return fail();

    if (doctor.status === 'pending') {
      flash(req, 'danger', 'Application pending:', 'Your doctor application is still under review by an admin.');
      return res.redirect('/login');
    }
    if (doctor.status === 'rejected') {
      flash(req, 'danger', 'Application rejected:', 'Your doctor application was not approved. Contact support for details.');
      return res.redirect('/login');
    }
    if (doctor.status === 'suspended') {
      flash(req, 'danger', 'Account suspended:', 'This doctor account has been suspended.');
      return res.redirect('/login');
    }

    const token = signToken(doctor._id, 'doctor');
    setAuthCookie(res, token);
    return res.redirect('/doctor/dashboard');
  }

  return fail();
};

exports.logout = (req, res) => {
  res.clearCookie('authToken');
  req.session.destroy(() => res.redirect('/'));
};

// ---- Doctor signup (application, not instant access) ----

exports.getDoctorSignup = (req, res) => res.render('docsignup', { isAuthenticated: false });

exports.postDoctorSignup = async (req, res) => {
  const { name, email, password, specialization, education, fee, maxPatientsPerDay, number,
          workingHoursStart, workingHoursEnd } = req.body;
  const workingDays = [].concat(req.body.workingDays || []);

  if (!name || !email || !password || password.length < 8 || !specialization) {
    flash(req, 'danger', 'Application failed:', 'Please fill in your name, email, a password of at least 8 characters, and specialization.');
    return res.redirect('/doctor/signup');
  }

  const existing = await Doctor.findOne({ email: email.toLowerCase() });
  if (existing) {
    flash(req, 'danger', 'Doctor already exists:', 'An application or account with this email already exists.');
    return res.redirect('/doctor/signup');
  }

  const hashed = await bcrypt.hash(password, SALT_ROUNDS);
  const profileImage = req.file ? req.file.filename : null;

  await Doctor.create({
    name,
    email: email.toLowerCase(),
    password: hashed,
    specialization,
    education,
    fee: fee ? Number(fee) : 0,
    maxPatientsPerDay: maxPatientsPerDay ? Number(maxPatientsPerDay) : 20,
    number,
    workingDays: workingDays.length ? workingDays : undefined,
    workingHoursStart: workingHoursStart || undefined,
    workingHoursEnd: workingHoursEnd || undefined,
    profileImage,
    status: 'pending',
  });

  flash(req, 'success', 'Application submitted:', 'Your doctor application has been submitted for review. You will be able to log in once an admin approves it.');
  return res.redirect('/login');
};
