require('dotenv').config();

function required(name, fallback) {
  const value = process.env[name] || fallback;
  if (!value) {
    console.error(`Missing required environment variable: ${name}`);
    process.exit(1);
  }
  return value;
}

module.exports = {
  PORT: process.env.PORT || 3000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  MONGO_URI: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/ehealthcare',
  JWT_SECRET: required('JWT_SECRET', process.env.NODE_ENV === 'production' ? undefined : 'dev_only_insecure_secret_change_me'),
  SESSION_SECRET: required('SESSION_SECRET', process.env.NODE_ENV === 'production' ? undefined : 'dev_only_insecure_session_secret'),
  COOKIE_SECRET: required('COOKIE_SECRET', process.env.NODE_ENV === 'production' ? undefined : 'dev_only_insecure_cookie_secret'),
  ADMIN_EMAIL: process.env.ADMIN_EMAIL || 'admin@example.com',
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || null,
  TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID || null,
  TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN || null,
  TWILIO_PHONE_NUMBER: process.env.TWILIO_PHONE_NUMBER || null,
};
