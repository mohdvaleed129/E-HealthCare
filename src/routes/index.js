const express = require('express');
const { body } = require('express-validator');
const asyncHandler = require('../utils/asyncHandler');
const { requireAuth, requireRole } = require('../middleware/auth');
const upload = require('../middleware/upload');

const pageController = require('../controllers/pageController');
const authController = require('../controllers/authController');
const doctorController = require('../controllers/doctorController');
const appointmentController = require('../controllers/appointmentController');
const patientController = require('../controllers/patientController');
const adminController = require('../controllers/adminController');

const router = express.Router();
const h = asyncHandler;

// ---- Public pages ----
router.get('/', h(pageController.home));
router.get('/privacy', pageController.privacy);
router.get('/terms', pageController.terms);

// ---- Auth ----
router.get('/signup', authController.getSignup);
router.post('/signup', h(authController.postSignup));
router.get('/login', authController.getLogin);
router.post('/login', h(authController.postLogin));
router.post('/logout', authController.logout);

router.get('/doctor/signup', authController.getDoctorSignup);
router.post('/doctor/signup', upload.single('profileImage'), h(authController.postDoctorSignup));

// ---- Doctor search / profile (public) ----
router.get('/doctors', h(doctorController.findDoctors));
router.get('/doctors/:id', h(appointmentController.viewDoctor));

// ---- Patient-only ----
router.get('/profile', requireAuth, requireRole('patient'), h(patientController.getProfile));
router.post('/profile', requireAuth, requireRole('patient'), h(patientController.updateProfile));

router.get('/appointments', requireAuth, requireRole('patient'), h(appointmentController.myAppointments));
router.post('/appointments', requireAuth, requireRole('patient'), h(appointmentController.bookAppointment));
router.post('/appointments/:id/cancel', requireAuth, requireRole('patient'), h(appointmentController.cancelAppointment));

// ---- Doctor-only ----
router.get('/doctor/dashboard', requireAuth, requireRole('doctor'), h(doctorController.dashboard));
router.post('/doctor/profile', requireAuth, requireRole('doctor'), upload.single('profileImage'), h(doctorController.updateProfile));
router.post('/doctor/availability', requireAuth, requireRole('doctor'), h(doctorController.updateAvailability));
router.post('/doctor/queue', requireAuth, requireRole('doctor'), h(doctorController.updateQueue));
router.post('/doctor/appointments/:id/complete', requireAuth, requireRole('doctor'), h(doctorController.completeAppointment));
router.post('/doctor/appointments/:id/cancel', requireAuth, requireRole('doctor'), h(doctorController.cancelAppointment));

// ---- Admin-only ----
router.get('/admin', requireAuth, requireRole('admin'), h(adminController.dashboard));
router.get('/admin/doctors', requireAuth, requireRole('admin'), h(adminController.listDoctors));
router.post('/admin/doctors/:id/status', requireAuth, requireRole('admin'), h(adminController.updateDoctorStatus));
router.post('/admin/doctors/:id/delete', requireAuth, requireRole('admin'), h(adminController.deleteDoctor));
router.get('/admin/patients', requireAuth, requireRole('admin'), h(adminController.listPatients));
router.post('/admin/patients/:id/status', requireAuth, requireRole('admin'), h(adminController.updatePatientStatus));
router.post('/admin/patients/:id/delete', requireAuth, requireRole('admin'), h(adminController.deleteUser));
router.get('/admin/appointments', requireAuth, requireRole('admin'), h(adminController.listAppointments));

module.exports = router;
