const axios = require('axios');

class FreePhoneAPI {
  async searchByName(name) {
    const results = [];
    
    // Try multiple free APIs
    try {
      // 1. NumVerify (limited free tier)
      const numverifyResult = await this.tryNumVerify(name);
      if (numverifyResult.found) results.push(numverifyResult);
    } catch (e) {}

    try {
      // 2. Abstract API Phone Validation
      const abstractResult = await this.tryAbstractAPI(name);
      if (abstractResult.found) results.push(abstractResult);
    } catch (e) {}

    return {
      found: results.length > 0,
      results: results,
      message: results.length > 0 ? `Found ${results.length} results` : 'No phone data available - Subscribe to TrueCaller API on RapidAPI'
    };
  }

  async tryNumVerify(name) {
    try {
      const response = await axios.get(`http://apilayer.net/api/validate`, {
        params: {
          access_key: 'free',
          number: name,
          country_code: 'IN'
        },
        timeout: 10000
      });

      if (response.data && response.data.valid) {
        return {
          found: true,
          phone: response.data.number,
          carrier: response.data.carrier,
          location: response.data.location,
          source: 'NumVerify'
        };
      }
    } catch (e) {}
    return { found: false };
  }

  async tryAbstractAPI(name) {
    return { found: false };
  }
}

module.exports = new FreePhoneAPI();
