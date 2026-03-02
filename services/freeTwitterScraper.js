const axios = require('axios');
const cheerio = require('cheerio');

class FreeTwitterScraper {
  async searchByUsername(username) {
    try {
      console.log('[Free Twitter] Scraping:', username);
      
      // Twitter profile check
      const url = `https://twitter.com/${username}`;
      
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9'
        },
        timeout: 10000,
        validateStatus: (status) => status < 500
      });

      if (response.status === 200) {
        const $ = cheerio.load(response.data);
        const pageText = response.data;
        
        // Check if profile exists
        if (pageText.includes('This account doesn\'t exist') || 
            pageText.includes('Account suspended')) {
          console.log('[Free Twitter] ❌ Profile not found:', username);
          return null;
        }
        
        console.log('[Free Twitter] ✅ Profile found:', username);
        
        // Try to extract basic info
        const title = $('title').text();
        const ogTitle = $('meta[property="og:title"]').attr('content');
        const ogImage = $('meta[property="og:image"]').attr('content');
        const ogDescription = $('meta[property="og:description"]').attr('content');
        
        let fullName = username;
        if (ogTitle && ogTitle.includes('(')) {
          fullName = ogTitle.split('(')[0].trim();
        } else if (title && title.includes('(')) {
          fullName = title.split('(')[0].trim();
        }
        
        return {
          platform: 'Twitter/X',
          username: username,
          fullName: fullName,
          bio: ogDescription || 'No bio available',
          profilePic: ogImage || '',
          profileUrl: `https://twitter.com/${username}`,
          found: true,
          message: 'Profile found (limited data - login required for full details)'
        };
      }
      
      console.log('[Free Twitter] ❌ Profile not found:', username);
      return null;
    } catch (error) {
      console.error('[Free Twitter] ERROR:', error.message);
      // Return basic profile info even on error
      return {
        platform: 'Twitter/X',
        username: username,
        profileUrl: `https://twitter.com/${username}`,
        found: true,
        message: 'Profile may exist (verification blocked)'
      };
    }
  }
}

module.exports = new FreeTwitterScraper();
