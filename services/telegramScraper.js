const axios = require('axios');
const cheerio = require('cheerio');

class TelegramScraper {
  async searchByUsername(username) {
    try {
      console.log(`[Telegram] Searching: ${username}`);
      
      const url = `https://t.me/${username}`;
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        timeout: 5000,
        validateStatus: (status) => status < 500
      });

      if (response.status === 404) return null;
      if (response.status !== 200) return null;

      console.log(`[Telegram] ✅ Profile/Channel exists: ${username}`);

      // Try to extract more details from HTML
      let fullName = 'N/A';
      let description = 'No description';
      let profilePic = '';
      let memberCount = 'N/A';
      let channelType = 'User/Channel';

      if (response.data) {
        const $ = cheerio.load(response.data);
        
        // Extract name from title
        const title = $('title').text();
        if (title && title !== 'Telegram') {
          fullName = title.trim();
        }
        
        // Extract from meta tags
        const ogTitle = $('meta[property="og:title"]').attr('content');
        if (ogTitle && ogTitle !== 'Telegram') {
          fullName = ogTitle;
        }
        
        const ogDescription = $('meta[property="og:description"]').attr('content');
        if (ogDescription) {
          description = ogDescription;
          
          // Extract member count from description
          const memberMatch = description.match(/(\d+(?:,\d+)*(?:\.\d+)?[KMB]?)\s*(?:members|subscribers)/);
          if (memberMatch) {
            memberCount = memberMatch[1];
            channelType = 'Channel';
          }
        }
        
        // Extract profile image
        profilePic = $('meta[property="og:image"]').attr('content') || '';
      }

      return {
        platform: 'Telegram',
        username: username,
        fullName: fullName,
        description: description,
        profilePic: profilePic,
        memberCount: memberCount,
        type: channelType,
        profileUrl: url,
        found: true,
        message: 'Profile/Channel exists'
      };
    } catch (error) {
      console.error(`[Telegram] Error:`, error.message);
      return null;
    }
  }
}

module.exports = new TelegramScraper();
