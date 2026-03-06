const axios = require('axios');

class TrueCallerService {
  constructor() {
    this.apiKey = process.env.TRUECALLER_API_KEY;
    this.baseUrl = 'https://truecaller4.p.rapidapi.com';
    this.rapidApiKey = process.env.RAPIDAPI_KEY;
  }

  async searchByPhone(phoneNumber) {
    if (!this.apiKey && !this.rapidApiKey) {
      console.log('[TrueCaller] No API key configured, skipping');
      return { found: false, message: 'TrueCaller API key not configured' };
    }

    try {
      console.log('[TrueCaller] Searching phone:', phoneNumber);
      console.log('[TrueCaller] Using API key:', this.rapidApiKey ? 'RapidAPI' : 'Direct');
      
      // Clean phone number
      const cleanPhone = phoneNumber.replace(/[^\d+]/g, '');
      
      const response = await axios.get(`${this.baseUrl}/api/v1/getDetails`, {
        params: { 
          phone: cleanPhone, 
          countryCode: 'IN' 
        },
        headers: {
          'X-RapidAPI-Key': this.rapidApiKey || this.apiKey,
          'X-RapidAPI-Host': 'truecaller4.p.rapidapi.com'
        },
        timeout: 15000,
        validateStatus: (status) => status < 500
      });

      console.log('[TrueCaller] Response status:', response.status);

      if (response.status === 404) {
        return { found: false, message: 'Phone number not found in TrueCaller' };
      }

      if (response.status === 403) {
        return { found: false, message: 'TrueCaller API access denied - check subscription' };
      }

      if (response.data && response.data.data) {
        const result = response.data.data;
        console.log('[TrueCaller] ✅ Found data for:', phoneNumber);
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
      console.error('[TrueCaller] Error:', error.response?.status, error.message);
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
