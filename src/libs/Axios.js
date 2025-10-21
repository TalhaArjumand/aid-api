const axios = require('axios');

const baseURL = process.env.API_BASE_URL || 'http://127.0.0.1:3000';

const api = axios.create({
  baseURL,
  timeout: 15000,
});

// helper: make a fully-qualified URL for logs
function resolveUrl(config) {
  const isAbsolute = /^https?:\/\//i.test(config.url || '');
  return isAbsolute
    ? config.url
    : `${config.baseURL || baseURL}${config.url || ''}`;
}

api.interceptors.request.use((config) => {
  // If anyone forgot baseURL AND uses a relative URL -> throw noisy error BEFORE it hits :80
  const isAbsolute = /^https?:\/\//i.test(config.url || '');
  if (!isAbsolute && !(config.baseURL || baseURL)) {
    const err = new Error(`Relative URL "${config.url}" used without baseURL`);
    console.error('🚫 AXIOS MISUSE:', err.message);
    throw err;
  }

  const finalUrl = resolveUrl(config);
  console.log(`🌐 ${String(config.method || 'GET').toUpperCase()} ${finalUrl}`);
  return config;
});

// This is the important bit: log failing request *with a stack*.
api.interceptors.response.use(
  (res) => res,
  (err) => {
    try {
      const cfg = err.config || {};
      const finalUrl = cfg ? resolveUrl(cfg) : '(no url)';
      console.error('💥 AXIOS ERROR:', {
        method: (cfg.method || 'GET').toUpperCase(),
        baseURL: cfg.baseURL || baseURL,
        url: cfg.url,
        finalUrl,
        message: err.message,
      });
      // dump a stack so we see WHO called it
      console.error(new Error('Axios caller stack').stack);
    } catch (_) {}
    return Promise.reject(err);
  }
);

module.exports = api;