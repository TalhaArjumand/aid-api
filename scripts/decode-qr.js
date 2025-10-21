// scripts/decode-qr.js
require('dotenv').config();
const fetch = require('node-fetch');

const QR_URL = process.argv[2]; // pass the token URL from DB
(async () => {
  if (!QR_URL) return console.error('Usage: node scripts/decode-qr.js <qr_url>');
  // Many QR services embed your JSON as a query param; if yours returns an image-only URL,
  // skip this and just trust the issuer payload constructed in consumer.
  console.log('Open this in browser to verify QR renders:', QR_URL);
})();