const axios = require('axios');

class IPInfoService {
  constructor() {
    this.apiKey = process.env.IPINFO_API_KEY;
    this.baseUrl = 'https://ipinfo.io';
  }

  async lookupIP(ip) {
    try {
      if (!this.apiKey) {
        return { error: 'IPInfo API key not configured' };
      }

      console.log('[IPInfo] Looking up IP:', ip);

      const response = await axios.get(`${this.baseUrl}/${ip}/json?token=${this.apiKey}`, {
        timeout: 10000
      });

      console.log('[IPInfo] ✅ IP lookup successful');
      return {
        ip: response.data.ip,
        hostname: response.data.hostname,
        city: response.data.city,
        region: response.data.region,
        country: response.data.country,
        location: response.data.loc,
        organization: response.data.org,
        postal: response.data.postal,
        timezone: response.data.timezone
      };
    } catch (error) {
      console.error('[IPInfo] Error:', error.message);
      return { error: error.message };
    }
  }
}

module.exports = new IPInfoService();
