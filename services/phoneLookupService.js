const axios = require('axios');

class PhoneLookupService {
  constructor() {
    this.numverifyKey = process.env.NUMVERIFY_API_KEY;
    this.rapidApiKey = process.env.RAPIDAPI_KEY;
  }

  async comprehensiveLookup(phoneNumber) {
    console.log('[Phone Lookup] Starting comprehensive lookup for:', phoneNumber);
    
    const results = {
      phoneNumber,
      validation: null,
      notes: []
    };

    // 1. Numverify - Basic Validation
    try {
      const numverifyData = await this.numverifyLookup(phoneNumber);
      results.validation = numverifyData;
    } catch (e) {
      console.error('[Phone Lookup] Numverify failed:', e.message);
      results.notes.push('Numverify validation unavailable (missing key or API error).');
    }

    return results;
  }

  async numverifyLookup(phoneNumber) {
    if (!this.numverifyKey) {
      throw new Error('NUMVERIFY_API_KEY not configured');
    }
    const response = await axios.get('http://apilayer.net/api/validate', {
      params: {
        access_key: this.numverifyKey,
        number: phoneNumber,
        format: 1
      },
      timeout: 10000
    });

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
  }
}

module.exports = new PhoneLookupService();
