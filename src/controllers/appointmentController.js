const moment = require('moment');
const Doctor = require('../models/Doctor');
const Appointment = require('../models/Appointment');
const { sendAppointmentSMS } = require('../services/notificationService');

function flash(req, type, intro, message) {
  req.session.message = { type, intro, message };
}

// GET /doctors/:id — public doctor profile + booking form
exports.viewDoctor = async (req, res) => {
  const doctor = await Doctor.findOne({ _id: req.params.id, status: 'approved' });
  if (!doctor) {
    return res.status(404).render('error', {
      title: 'Doctor not found',
      message: "This doctor doesn't exist or isn't accepting appointments.",
      isAuthenticated: res.locals.isAuthenticated,
    });
  }

  const today = moment().format('YYYY-MM-DD');
  const todaysCount = await Appointment.countDocuments({
    doctorId: doctor._id,
    date: today,
    status: { $in: ['pending', 'confirmed'] },
  });

  res.render('book-appointment', {
    doctor,
    todaysCount,
    isFull: todaysCount >= doctor.maxPatientsPerDay,
    isAuthenticated: res.locals.isAuthenticated,
    minDate: today,
  });
};

// POST /appointments — book (patients only)
exports.bookAppointment = async (req, res) => {
  const patientId = req.user.id;
  const { doctorId, date, time, patientName, age, gender, phone, reason } = req.body;

  const fail = (msg) => {
    flash(req, 'danger', 'Booking failed:', msg);
    return res.redirect(`/doctors/${doctorId}`);
  };

  const doctor = await Doctor.findOne({ _id: doctorId, status: 'approved' });
  if (!doctor) return fail('This doctor is not available for booking.');

  if (doctor.availabilityStatus !== 'Available') {
    return fail('This doctor is currently marked as not available.');
  }

  if (!date || !moment(date, 'YYYY-MM-DD', true).isValid()) return fail('Please choose a valid date.');
  if (moment(date, 'YYYY-MM-DD').isBefore(moment().startOf('day'))) {
    return fail('You cannot book an appointment in the past.');
  }

  const weekday = moment(date, 'YYYY-MM-DD').format('ddd');
  if (doctor.workingDays.length && !doctor.workingDays.includes(weekday)) {
    return fail(`Dr. ${doctor.name} is not available on ${weekday}.`);
  }

  if (!time || !/^\d{2}:\d{2}$/.test(time)) return fail('Please choose a valid time.');
  if (time < doctor.workingHoursStart || time > doctor.workingHoursEnd) {
    return fail(`Please pick a time between ${doctor.workingHoursStart} and ${doctor.workingHoursEnd}.`);
  }

  const activeCount = await Appointment.countDocuments({
    doctorId,
    date,
    status: { $in: ['pending', 'confirmed'] },
  });
  if (activeCount >= doctor.maxPatientsPerDay) {
    return fail('This doctor has reached their appointment capacity for that day.');
  }

  try {
    const appointment = await Appointment.create({
      patientId,
      doctorId,
      date,
      time,
      tokenNumber: activeCount + 1,
      patientName: patientName || req.user.name,
      age: age ? Number(age) : undefined,
      gender,
      phone,
      reason,
      status: 'confirmed',
    });

    if (phone) {
      sendAppointmentSMS(
        phone,
        `Hi ${appointment.patientName}, your appointment with Dr. ${doctor.name} is confirmed for ${date} at ${time}. Token #${appointment.tokenNumber}.`
      ).catch(() => {}); // never block the response on SMS
    }

    flash(req, 'success', 'Appointment booked:', `You're confirmed with token #${appointment.tokenNumber}.`);
    return res.redirect('/appointments');
  } catch (err) {
    if (err.code === 11000) {
      return fail('That time slot was just taken by someone else. Please pick another time.');
    }
    throw err;
  }
};

// GET /appointments — patient's own appointments
exports.myAppointments = async (req, res) => {
  const appointments = await Appointment.find({ patientId: req.user.id })
    .populate('doctorId', 'name specialization profileImage')
    .sort({ date: -1, time: -1 });

  const today = moment().format('YYYY-MM-DD');
  res.render('appointments', {
    upcoming: appointments.filter((a) => a.date >= today && a.status !== 'cancelled'),
    past: appointments.filter((a) => a.date < today || a.status === 'cancelled'),
    isAuthenticated: true,
  });
};

// POST /appointments/:id/cancel — patient cancels their own appointment
exports.cancelAppointment = async (req, res) => {
  const appointment = await Appointment.findOne({ _id: req.params.id, patientId: req.user.id });
  if (!appointment) {
    flash(req, 'danger', 'Not found:', 'Appointment not found.');
    return res.redirect('/appointments');
  }
  appointment.status = 'cancelled';
  await appointment.save();
  flash(req, 'success', 'Cancelled:', 'Your appointment has been cancelled.');
  return res.redirect('/appointments');
};
