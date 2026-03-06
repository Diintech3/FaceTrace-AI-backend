const axios = require('axios');

class TikTokScraper {
  async searchByUsername(username) {
    try {
      console.log(`[TikTok] Searching: ${username}`);
      
      const url = `https://www.tiktok.com/@${username}`;
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        timeout: 20000,
        validateStatus: (status) => status < 500
      });

      if (response.status === 404) return null;
      if (response.status !== 200) return null;

      console.log(`[TikTok] ✅ Profile exists: ${username}`);

      return {
        platform: 'TikTok',
        username: username,
        profileUrl: url,
        found: true,
        message: 'Profile exists (login required for details)'
      };
    } catch (error) {
      console.error(`[TikTok] Error:`, error.message);
      return null;
    }
  }
}

module.exports = new TikTokScraper();
