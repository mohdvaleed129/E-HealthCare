const moment = require('moment');
const Doctor = require('../models/Doctor');
const Appointment = require('../models/Appointment');

function flash(req, type, intro, message) {
  req.session.message = { type, intro, message };
}

// GET /doctors — find doctors (public), supports name/specialization search
exports.findDoctors = async (req, res) => {
  const { q, specialization } = req.query;
  const filter = { status: 'approved' };

  if (q) filter.name = { $regex: q, $options: 'i' };
  if (specialization) filter.specialization = { $regex: `^${specialization}$`, $options: 'i' };

  const doctors = await Doctor.find(filter).sort({ name: 1 });
  const specializations = await Doctor.distinct('specialization', { status: 'approved' });

  res.render('finddoc', {
    doctors,
    specializations,
    query: q || '',
    selectedSpecialization: specialization || '',
    isAuthenticated: res.locals.isAuthenticated,
  });
};

// GET /doctor/dashboard
exports.dashboard = async (req, res) => {
  const doctor = await Doctor.findById(req.user.id);
  if (!doctor) return res.redirect('/login');

  const today = moment().format('YYYY-MM-DD');
  const [todays, upcoming, completed, cancelled] = await Promise.all([
    Appointment.find({ doctorId: doctor._id, date: today, status: { $in: ['pending', 'confirmed'] } })
      .populate('patientId', 'name phone')
      .sort({ time: 1 }),
    Appointment.countDocuments({ doctorId: doctor._id, date: { $gt: today }, status: { $in: ['pending', 'confirmed'] } }),
    Appointment.countDocuments({ doctorId: doctor._id, status: 'completed' }),
    Appointment.countDocuments({ doctorId: doctor._id, status: 'cancelled' }),
  ]);

  res.render('docdashboard', {
    doctor,
    todaysAppointments: todays,
    upcomingCount: upcoming,
    completedCount: completed,
    cancelledCount: cancelled,
    currentNumber: doctor.currentAppointmentNumber || 0,
    isAvailable: doctor.availabilityStatus === 'Available',
    isAuthenticated: true,
  });
};

// POST /doctor/profile
exports.updateProfile = async (req, res) => {
  const { specialization, education, fee, maxPatientsPerDay, number,
          workingHoursStart, workingHoursEnd } = req.body;
  const workingDays = [].concat(req.body.workingDays || []);

  const update = {
    specialization,
    education,
    fee: fee ? Number(fee) : undefined,
    maxPatientsPerDay: maxPatientsPerDay ? Number(maxPatientsPerDay) : undefined,
    number,
    workingHoursStart,
    workingHoursEnd,
    workingDays: workingDays.length ? workingDays : undefined,
  };
  Object.keys(update).forEach((k) => update[k] === undefined && delete update[k]);

  if (req.file) update.profileImage = req.file.filename;

  await Doctor.findByIdAndUpdate(req.user.id, update);
  flash(req, 'success', 'Saved:', 'Your profile has been updated.');
  res.redirect('/doctor/dashboard');
};

// POST /doctor/availability
exports.updateAvailability = async (req, res) => {
  await Doctor.findByIdAndUpdate(req.user.id, { availabilityStatus: req.body.availabilityStatus });
  res.redirect('/doctor/dashboard');
};

// POST /doctor/queue
exports.updateQueue = async (req, res) => {
  const currentNumber = Math.max(0, Number(req.body.currentNumber) || 0);
  await Doctor.findByIdAndUpdate(req.user.id, { currentAppointmentNumber: currentNumber });
  res.redirect('/doctor/dashboard');
};

// POST /doctor/appointments/:id/complete
exports.completeAppointment = async (req, res) => {
  await Appointment.updateOne(
    { _id: req.params.id, doctorId: req.user.id },
    { status: 'completed' }
  );
  res.redirect('/doctor/dashboard');
};

// POST /doctor/appointments/:id/cancel
exports.cancelAppointment = async (req, res) => {
  await Appointment.updateOne(
    { _id: req.params.id, doctorId: req.user.id },
    { status: 'cancelled' }
  );
  res.redirect('/doctor/dashboard');
};
