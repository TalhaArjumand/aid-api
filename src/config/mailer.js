require('dotenv').config();

module.exports = {
  host: process.env.MAIL_HOST || '127.0.0.1',
  port: Number(process.env.MAIL_PORT) || 1025,   // ✅ force number
  user: process.env.MAIL_USERNAME || '',
  pass: process.env.MAIL_PASSWORD || '',
  from: process.env.MAIL_SENDER || 'no-reply@chats.local',
  secure: process.env.MAIL_SECURE === 'true' || false
};