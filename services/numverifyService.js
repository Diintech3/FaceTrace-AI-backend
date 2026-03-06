const axios = require('axios');

class NumverifyService {
  constructor() {
    this.apiKey = process.env.NUMVERIFY_API_KEY;
    this.baseUrl = 'http://apilayer.net/api/validate';
  }

  async validatePhone(phoneNumber) {
    try {
      if (!this.apiKey) {
        return { error: 'Numverify API key not configured' };
      }

      console.log('[Numverify] Validating phone:', phoneNumber);

      const response = await axios.get(this.baseUrl, {
        params: {
          access_key: this.apiKey,
          number: phoneNumber,
          country_code: '',
          format: 1
        },
        timeout: 10000
      });

      if (!response.data.valid) {
        console.log('[Numverify] Invalid phone number');
        return { valid: false, error: 'Invalid phone number' };
      }

      console.log('[Numverify] ✅ Phone validated successfully');
      return {
        valid: response.data.valid,
        number: response.data.number,
        localFormat: response.data.local_format,
        internationalFormat: response.data.international_format,
        countryPrefix: response.data.country_prefix,
        countryCode: response.data.country_code,
        countryName: response.data.country_name,
        location: response.data.location,
        carrier: response.data.carrier,
        lineType: response.data.line_type
      };
    } catch (error) {
      console.error('[Numverify] Error:', error.message);
      return { error: error.message, valid: false };
    }
  }
}

module.exports = new NumverifyService();
