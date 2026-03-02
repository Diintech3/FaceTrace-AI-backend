const axios = require('axios');
const cheerio = require('cheerio');

class FreeInstagramScraper {
  async searchByUsername(username) {
    try {
      console.log('[Free Instagram] Scraping:', username);
      
      const url = `https://www.instagram.com/${username}/`;
      
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1'
        }
      });

      // Extract JSON data from HTML
      const html = response.data;
      const jsonMatch = html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s);
      
      if (jsonMatch) {
        const data = JSON.parse(jsonMatch[1]);
        
        return {
          platform: 'Instagram',
          username: username,
          fullName: data.name || username,
          bio: data.description || '',
          profileUrl: `https://www.instagram.com/${username}/`
        };
      }

      // Fallback: Basic profile link
      console.log('[Free Instagram] Limited data - profile exists');
      return {
        platform: 'Instagram',
        username: username,
        fullName: username,
        profileUrl: `https://www.instagram.com/${username}/`,
        message: 'Profile found (limited data)'
      };
      
    } catch (error) {
      console.error('[Free Instagram] ERROR:', error.message);
      return null;
    }
  }
}

module.exports = new FreeInstagramScraper();
