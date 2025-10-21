const axios = require('axios');
const dotenv = require('dotenv');
const { Response } = require('../libs');
const { HttpStatusCode } = require('../utils');

dotenv.config();

const RECAPTCHA_SECRET = process.env.RECAPTCHA_SECRET_KEY || '';
const RECAPTCHA_DISABLED = process.env.RECAPTCHA_DISABLED === 'true';

const Axios = axios.create();

const IsRecaptchaVerified = async (req, res, next) => {
  try {
    // Bypass when disabled or not configured (dev)
    if (RECAPTCHA_DISABLED || !RECAPTCHA_SECRET) return next();

    const { token } = req.body;
    if (!token) {
      Response.setError(HttpStatusCode.STATUS_BAD_REQUEST, 'Missing reCAPTCHA token.');
      return Response.send(res);
    }

    const { data } = await Axios.post(
      'https://www.google.com/recaptcha/api/siteverify',
      null,
      { params: { secret: RECAPTCHA_SECRET, response: token } }
    );

    if (!data?.success) {
      Response.setError(HttpStatusCode.STATUS_FORBIDDEN, 'Error verifying reCAPTCHA.');
      return Response.send(res);
    }

    next();
  } catch (error) {
    Response.setError(
      HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
      'Server error. Please retry.'
    );
    return Response.send(res);
  }
};

module.exports = { IsRecaptchaVerified };