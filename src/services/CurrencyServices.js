require('dotenv').config();
const axios = require('axios').default;
const currencySymbolMap = require('currency-symbol-map');

const OXR_BASE = process.env.OPENEXCHANGE_URL || 'https://openexchangerates.org/api';
const OXR_AppId = process.env.OPEN_EXCHANGE_APP || '';

class CurrencyServices {
  async getCurrencySymbol(code) {
    return currencySymbolMap(code) || code;
  }

  async getSpecificCurrencyExchangeRate(currencyCode) {
    // If not configured, return safe defaults — DO NOT throw
    if (!OXR_AppId) {
      return {
        usdBase: 1600,              // dummy NGN per USD
        currencyCode,
        currencySymbol: await this.getCurrencySymbol(currencyCode),
        rate: 1                     // dummy rate for requested code vs USD
      };
    }

    try {
      const baseCurrency = 'USD';
      const usdUrl = `${OXR_BASE}/latest.json?app_id=${OXR_AppId}&base=${baseCurrency}&symbols=NGN`;
      const url    = `${OXR_BASE}/latest.json?app_id=${OXR_AppId}&base=${baseCurrency}&symbols=${currencyCode}`;

      const [usdResp, curResp] = await Promise.all([axios.get(usdUrl), axios.get(url)]);
      const usdBase = usdResp.data?.rates?.NGN;
      const rate    = curResp.data?.rates?.[currencyCode];

      return {
        usdBase: typeof usdBase === 'number' ? usdBase : 1600,
        currencyCode,
        currencySymbol: await this.getCurrencySymbol(currencyCode),
        rate: typeof rate === 'number' ? rate : 1
      };
    } catch (err) {
      // Log and return defaults instead of throwing
      console.error('CurrencyServices error:', {
        status: err.response?.status,
        url: err.config?.url,
        message: err.message
      });
      return {
        usdBase: 1600,
        currencyCode,
        currencySymbol: await this.getCurrencySymbol(currencyCode),
        rate: 1
      };
    }
  }
}

module.exports = new CurrencyServices();