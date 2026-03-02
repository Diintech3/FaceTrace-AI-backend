const axios = require('axios');
const cheerio = require('cheerio');

class FreeLinkedInScraper {
  async searchByUsername(username) {
    try {
      console.log(`[LinkedIn] Searching: ${username}`);
      
      const profileUrl = `https://www.linkedin.com/in/${username}`;
      
      const response = await axios.get(profileUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'DNT': '1',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none',
          'Cache-Control': 'max-age=0'
        },
        timeout: 8000,
        maxRedirects: 5,
        validateStatus: (status) => status < 500
      });

      // LinkedIn returns 999 for bot detection, but profile might exist
      if (response.status === 200 || response.status === 999) {
        console.log(`[LinkedIn] ✅ Profile found: ${username}`);
        
        let fullName = 'N/A';
        let headline = '';
        let location = '';
        let profilePic = '';
        
        // Try to extract data from HTML
        if (response.data) {
          const $ = cheerio.load(response.data);
          
          // Extract name from title
          const title = $('title').text();
          if (title && !title.includes('Page Not Found') && !title.includes('LinkedIn')) {
            const nameMatch = title.split('|')[0].trim();
            if (nameMatch && nameMatch !== 'LinkedIn') {
              fullName = nameMatch;
            }
          }
          
          // Try to extract from meta tags
          const ogTitle = $('meta[property="og:title"]').attr('content');
          if (ogTitle && ogTitle !== 'LinkedIn') {
            fullName = ogTitle.split('|')[0].trim();
          }
          
          const description = $('meta[name="description"]').attr('content') || '';
          if (description) {
            // Extract headline from description
            const headlineMatch = description.match(/^(.+?)\s*\|/);
            if (headlineMatch) {
              headline = headlineMatch[1].trim();
            }
          }
          
          // Extract profile image
          profilePic = $('meta[property="og:image"]').attr('content') || '';
          
          // Try to find location in page text
          const pageText = response.data;
          const locationMatch = pageText.match(/"geoLocationName":"([^"]+)"/);
          if (locationMatch) {
            location = locationMatch[1];
          }
        }
        
        return {
          platform: 'LinkedIn',
          username: username,
          fullName: fullName,
          headline: headline || 'Professional profile',
          location: location || 'N/A',
          profilePic: profilePic,
          profileUrl: profileUrl,
          found: true,
          message: response.status === 999 ? 'Profile exists (login required for full details)' : 'Profile data extracted'
        };
      } else if (response.status === 404) {
        console.log(`[LinkedIn] ❌ Not found: ${username}`);
        return null;
      } else {
        console.log(`[LinkedIn] ⚠️ Status ${response.status}, assuming exists: ${username}`);
        // If we get blocked (999), assume profile exists
        return {
          platform: 'LinkedIn',
          username: username,
          profileUrl: profileUrl,
          found: true,
          message: 'Profile likely exists (verification blocked)'
        };
      }
    } catch (error) {
      if (error.response?.status === 404) {
        console.log(`[LinkedIn] ❌ Not found: ${username}`);
        return null;
      }
      console.log(`[LinkedIn] ⚠️ Error, assuming exists: ${username}`);
      // On error, return profile as existing (better than missing it)
      return {
        platform: 'LinkedIn',
        username: username,
        profileUrl: `https://www.linkedin.com/in/${username}`,
        found: true,
        message: 'Profile check blocked (click to verify manually)'
      };
    }
  }
}

module.exports = new FreeLinkedInScraper();
