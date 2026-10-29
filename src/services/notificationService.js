const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER } = require('../config/env');

let client = null;
if (TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN) {
  const twilio = require('twilio');
  client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
} else {
  console.warn(
    'Twilio credentials not configured — SMS notifications are disabled. ' +
    'Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER to enable them.'
  );
}

// Appointment creation/cancellation must never fail because SMS failed —
// this always resolves, it never throws.
async function sendAppointmentSMS(toNumber, message) {
  if (!client || !toNumber) return { sent: false, reason: 'sms_not_configured' };
  try {
    const result = await client.messages.create({
      body: message,
      to: toNumber,
      from: TWILIO_PHONE_NUMBER,
    });
    return { sent: true, sid: result.sid };
  } catch (err) {
    console.error('SMS send failed:', err.message);
    return { sent: false, reason: 'send_failed' };
  }
}

module.exports = { sendAppointmentSMS };
