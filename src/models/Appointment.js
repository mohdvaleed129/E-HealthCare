const mongoose = require('mongoose');

// Single source of truth for appointments — replaces the old design where
// the same booking was duplicated inside both User.appointments[] and
// Doctor.appointments[] (which could silently drift out of sync).
const appointmentSchema = new mongoose.Schema(
  {
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true, index: true },

    date: { type: String, required: true }, // YYYY-MM-DD
    time: { type: String, required: true }, // HH:mm
    tokenNumber: { type: Number, required: true },

    patientName: { type: String, required: true, trim: true },
    age: { type: Number, min: 0 },
    gender: { type: String, trim: true },
    phone: { type: String, trim: true },
    reason: { type: String, trim: true, maxlength: 1000 },

    status: {
      type: String,
      enum: ['pending', 'confirmed', 'completed', 'cancelled'],
      default: 'confirmed',
    },
  },
  { timestamps: true }
);

// A doctor cannot be double-booked for the same date + time slot
// (while the appointment is still active).
appointmentSchema.index(
  { doctorId: 1, date: 1, time: 1 },
  {
    unique: true,
    partialFilterExpression: { status: { $in: ['pending', 'confirmed'] } },
  }
);

module.exports = mongoose.model('Appointment', appointmentSchema);
