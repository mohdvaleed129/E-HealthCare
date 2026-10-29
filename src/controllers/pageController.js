const Doctor = require('../models/Doctor');

exports.home = async (req, res) => {
  const featuredDoctors = await Doctor.find({ status: 'approved' }).sort({ createdAt: -1 }).limit(6);
  res.render('index', { featuredDoctors, isAuthenticated: res.locals.isAuthenticated });
};

exports.privacy = (req, res) => res.render('privacy', { isAuthenticated: res.locals.isAuthenticated });
exports.terms = (req, res) => res.render('terms', { isAuthenticated: res.locals.isAuthenticated });
