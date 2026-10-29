const moment = require('moment');
const Doctor = require('../models/Doctor');
const User = require('../models/User');
const Appointment = require('../models/Appointment');
const fs = require('fs');
const path = require('path');

function flash(req, type, intro, message) {
  req.session.message = { type, intro, message };
}

exports.dashboard = async (req, res) => {
  const today = moment().format('YYYY-MM-DD');

  const [totalPatients, totalDoctors, pendingDoctors, totalAppointments,
         todaysAppointments, completedAppointments, cancelledAppointments] = await Promise.all([
    User.countDocuments(),
    Doctor.countDocuments({ status: 'approved' }),
    Doctor.countDocuments({ status: 'pending' }),
    Appointment.countDocuments(),
    Appointment.countDocuments({ date: today }),
    Appointment.countDocuments({ status: 'completed' }),
    Appointment.countDocuments({ status: 'cancelled' }),
  ]);

  res.render('admin', {
    stats: {
      totalPatients, totalDoctors, pendingDoctors, totalAppointments,
      todaysAppointments, completedAppointments, cancelledAppointments,
    },
    isAuthenticated: true,
  });
};

exports.listDoctors = async (req, res) => {
  const { status, q } = req.query;
  const filter = {};
  if (status) filter.status = status;
  if (q) filter.name = { $regex: q, $options: 'i' };

  const doctors = await Doctor.find(filter).sort({ createdAt: -1 });
  res.render('admin-doctors', { doctors, statusFilter: status || '', query: q || '', isAuthenticated: true });
};

exports.deleteDoctor = async (req, res) => {
  const doctor = await Doctor.findById(req.params.id);
  if (!doctor) {
    flash(req, 'danger', 'Not found:', 'Doctor not found.');
    return res.redirect('/admin/doctors');
  }

  // Cancel any active appointments tied to this doctor (keeps patient history intact)
  await Appointment.updateMany(
    { doctorId: doctor._id, status: { $in: ['pending', 'confirmed'] } },
    { status: 'cancelled' }
  );

  // Remove uploaded profile photo if one exists
  if (doctor.profileImage) {
    const imgPath = path.join(__dirname, '..', '..', 'public', 'pictures', doctor.profileImage);
    fs.unlink(imgPath, () => {}); // ignore errors (file may not exist)
  }

  await Doctor.findByIdAndDelete(req.params.id);
  flash(req, 'success', 'Deleted:', `Dr. ${doctor.name} has been removed.`);
  res.redirect('/admin/doctors');
};

exports.updateDoctorStatus = async (req, res) => {
  const { status } = req.body;
  if (!['pending', 'approved', 'rejected', 'suspended'].includes(status)) {
    flash(req, 'danger', 'Invalid status:', 'That is not a valid doctor status.');
    return res.redirect('/admin/doctors');
  }
  await Doctor.findByIdAndUpdate(req.params.id, { status });
  flash(req, 'success', 'Updated:', `Doctor status set to ${status}.`);
  res.redirect('/admin/doctors');
};

exports.listPatients = async (req, res) => {
  const { q } = req.query;
  const filter = q ? { name: { $regex: q, $options: 'i' } } : {};
  const patients = await User.find(filter).sort({ createdAt: -1 });
  res.render('admin-patients', { patients, query: q || '', isAuthenticated: true });
};

exports.updatePatientStatus = async (req, res) => {
  const { status } = req.body;
  if (!['active', 'suspended'].includes(status)) {
    flash(req, 'danger', 'Invalid status:', 'That is not a valid patient status.');
    return res.redirect('/admin/patients');
  }
  await User.findByIdAndUpdate(req.params.id, { status });
  flash(req, 'success', 'Updated:', `Patient account set to ${status}.`);
  res.redirect('/admin/patients');
};

exports.deleteUser = async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    flash(req, 'danger', 'Not found:', 'Patient not found.');
    return res.redirect('/admin/patients');
  }

  // Cancel any active appointments tied to this patient
  await Appointment.updateMany(
    { patientId: user._id, status: { $in: ['pending', 'confirmed'] } },
    { status: 'cancelled' }
  );

  await User.findByIdAndDelete(req.params.id);
  flash(req, 'success', 'Deleted:', `${user.name}'s account has been removed.`);
  res.redirect('/admin/patients');
};

exports.listAppointments = async (req, res) => {
  const { status, doctorId, date, q } = req.query;
  const filter = {};
  if (status) filter.status = status;
  if (doctorId) filter.doctorId = doctorId;
  if (date) filter.date = date;
  if (q) filter.patientName = { $regex: q, $options: 'i' };

  const [appointments, doctors] = await Promise.all([
    Appointment.find(filter).populate('doctorId', 'name specialization').sort({ date: -1, time: -1 }).limit(200),
    Doctor.find({ status: 'approved' }, 'name'),
  ]);

  res.render('admin-appointments', {
    appointments, doctors,
    filters: { status: status || '', doctorId: doctorId || '', date: date || '', q: q || '' },
    isAuthenticated: true,
  });
};
