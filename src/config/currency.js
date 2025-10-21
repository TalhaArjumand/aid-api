/**
 * Currency Configuration
 * Single source of truth for default fiat currency across the system
 */

module.exports = {
  DEFAULT_FIAT_CURRENCY: process.env.DEFAULT_FIAT_CURRENCY || 'PKR',
  DEFAULT_LOCALE: process.env.DEFAULT_LOCALE || 'en-PK', // for Intl formatting
};

