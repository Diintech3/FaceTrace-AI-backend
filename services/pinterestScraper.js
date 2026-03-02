const axios = require('axios');
const cheerio = require('cheerio');

class PinterestScraper {
  async searchByUsername(username) {
    try {
      console.log(`[Pinterest] Searching: ${username}`);
      
      const url = `https://www.pinterest.com/${username}/`;
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        timeout: 8000,
        validateStatus: (status) => status < 500
      });

      if (response.status === 404) return null;
      if (response.status !== 200) return null;

      console.log(`[Pinterest] ✅ Profile exists: ${username}`);

      // Try to extract more details from HTML
      let fullName = 'N/A';
      let description = 'No description';
      let profilePic = '';
      let followers = 'N/A';
      let following = 'N/A';
      let pins = 'N/A';

      if (response.data) {
        const $ = cheerio.load(response.data);
        
        // Extract name from title
        const title = $('title').text();
        if (title && !title.includes('Pinterest')) {
          const nameMatch = title.split('|')[0].trim();
          if (nameMatch) {
            fullName = nameMatch;
          }
        }
        
        // Extract from meta tags
        const ogTitle = $('meta[property="og:title"]').attr('content');
        if (ogTitle && !ogTitle.includes('Pinterest')) {
          fullName = ogTitle;
        }
        
        const ogDescription = $('meta[property="og:description"]').attr('content');
        if (ogDescription) {
          description = ogDescription;
        }
        
        // Extract profile image
        profilePic = $('meta[property="og:image"]').attr('content') || '';
        
        // Try to extract stats from page text
        const pageText = response.data;
        const followersMatch = pageText.match(/(\d+(?:,\d+)*(?:\.\d+)?[KMB]?)\s*[Ff]ollowers/);
        const followingMatch = pageText.match(/(\d+(?:,\d+)*(?:\.\d+)?[KMB]?)\s*[Ff]ollowing/);
        const pinsMatch = pageText.match(/(\d+(?:,\d+)*(?:\.\d+)?[KMB]?)\s*[Pp]ins/);
        
        if (followersMatch) followers = followersMatch[1];
        if (followingMatch) following = followingMatch[1];
        if (pinsMatch) pins = pinsMatch[1];
      }

      return {
        platform: 'Pinterest',
        username: username,
        fullName: fullName,
        description: description,
        profilePic: profilePic,
        followers: followers,
        following: following,
        pins: pins,
        profileUrl: url,
        found: true,
        message: 'Profile exists'
      };
    } catch (error) {
      console.error(`[Pinterest] Error:`, error.message);
      return null;
    }
  }
}

module.exports = new PinterestScraper();
