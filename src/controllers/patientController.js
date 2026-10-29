const moment = require('moment');
const User = require('../models/User');
const Appointment = require('../models/Appointment');

function flash(req, type, intro, message) {
  req.session.message = { type, intro, message };
}

exports.getProfile = async (req, res) => {
  const user = await User.findById(req.user.id);
  res.render('profile', { profileUser: user, isAuthenticated: true });
};

exports.updateProfile = async (req, res) => {
  const { name, phone } = req.body;
  await User.findByIdAndUpdate(req.user.id, { name, phone });
  flash(req, 'success', 'Saved:', 'Your profile has been updated.');
  res.redirect('/profile');
};

// Powers the patient dashboard summary cards.
exports.dashboardSummary = async (req, res) => {
  const today = moment().format('YYYY-MM-DD');
  const [upcoming, total] = await Promise.all([
    Appointment.findOne({ patientId: req.user.id, date: { $gte: today }, status: { $in: ['pending', 'confirmed'] } })
      .populate('doctorId', 'name specialization')
      .sort({ date: 1, time: 1 }),
    Appointment.countDocuments({ patientId: req.user.id }),
  ]);
  return { upcoming, total };
};
