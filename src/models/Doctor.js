const mongoose = require('mongoose');

const doctorSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: { type: String, required: true, select: false },
    specialization: { type: String, required: true, trim: true },
    education: { type: String, trim: true },
    experienceYears: { type: Number, min: 0, default: 0 },
    fee: { type: Number, min: 0, default: 0 },
    number: { type: String, trim: true },
    profileImage: { type: String, default: null },

    // Availability
    workingDays: {
      type: [String],
      default: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    },
    workingHoursStart: { type: String, default: '09:00' },
    workingHoursEnd: { type: String, default: '17:00' },
    maxPatientsPerDay: { type: Number, default: 20, min: 1 },
    availabilityStatus: {
      type: String,
      enum: ['Available', 'Not Available'],
      default: 'Not Available',
    },
    currentAppointmentNumber: { type: Number, default: 0 },

    // Verification workflow — doctors cannot log in until approved.
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'suspended'],
      default: 'pending',
    },
    role: { type: String, enum: ['doctor'], default: 'doctor' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Doctor', doctorSchema);
