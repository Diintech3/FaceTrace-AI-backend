const axios = require('axios');

class TrueCallerService {
  constructor() {
    this.apiKey = process.env.TRUECALLER_API_KEY;
    this.baseUrl = 'https://truecaller4.p.rapidapi.com';
    this.rapidApiKey = process.env.RAPIDAPI_KEY;
  }

  async searchByPhone(phoneNumber) {
    if (!this.apiKey && !this.rapidApiKey) {
      return { found: false, message: 'TrueCaller API key not configured' };
    }

    try {
      console.log('[TrueCaller] Searching phone:', phoneNumber);
      
      const response = await axios.get(`${this.baseUrl}/api/v1/getDetails`, {
        params: { phone: phoneNumber, countryCode: 'IN' },
        headers: {
          'X-RapidAPI-Key': this.rapidApiKey || this.apiKey,
          'X-RapidAPI-Host': 'truecaller4.p.rapidapi.com'
        },
        timeout: 15000
      });

      if (response.data && response.data.data) {
        const result = response.data.data;
        return {
          found: true,
          name: result.name,
          phone: phoneNumber,
          carrier: result.carrier,
          location: result.address?.[0]?.city || 'Unknown',
          countryCode: result.countryCode,
          spamScore: result.spamScore || 0,
          verified: result.verified || false
        };
      }

      return { found: false, message: 'No data found' };
    } catch (error) {
      console.error('[TrueCaller] Error:', error.message);
      return { found: false, error: error.message };
    }
  }

  async searchByName(name) {
    if (!this.apiKey && !this.rapidApiKey) {
      return { found: false, message: 'TrueCaller API key not configured' };
    }

    try {
      console.log('[TrueCaller] Searching name:', name);
      
      const response = await axios.get(`${this.baseUrl}/api/v1/search`, {
        params: { query: name, countryCode: 'IN' },
        headers: {
          'X-RapidAPI-Key': this.rapidApiKey || this.apiKey,
          'X-RapidAPI-Host': 'truecaller4.p.rapidapi.com'
        },
        timeout: 15000
      });

      if (response.data && response.data.data && response.data.data.length > 0) {
        const results = response.data.data.map(item => ({
          name: item.name,
          phone: item.phones?.[0]?.e164Format || 'N/A',
          carrier: item.carrier,
          location: item.address?.[0]?.city || 'Unknown',
          verified: item.verified || false
        }));

        return { found: true, results };
      }

      return { found: false, message: 'No data found' };
    } catch (error) {
      console.error('[TrueCaller] Error:', error.message);
      return { found: false, error: error.message };
    }
  }
}

module.exports = new TrueCallerService();
