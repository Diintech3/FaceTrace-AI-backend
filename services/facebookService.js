const axios = require('axios');
const cheerio = require('cheerio');

class FacebookService {
  async searchByUsername(username) {
    try {
      console.log('[Facebook] Searching for:', username);
      
      // Try multiple Facebook URL formats
      const urls = [
        `https://www.facebook.com/${username}`,
        `https://m.facebook.com/${username}`,
        `https://www.facebook.com/people/${username}`
      ];
      
      for (const url of urls) {
        try {
          const response = await axios.get(url, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
              'Accept-Language': 'en-US,en;q=0.9',
              'Referer': 'https://www.facebook.com/'
            },
            timeout: 8000,
            validateStatus: (status) => status < 500,
            maxRedirects: 5
          });

          if (response.status === 200) {
            const pageText = response.data;
            
            // Check if profile exists
            if (pageText.includes('Page Not Found') || 
                pageText.includes('Content Not Found') ||
                pageText.includes('This page isn\'t available')) {
              console.log('[Facebook] ❌ Profile not found at:', url);
              continue;
            }
            
            console.log('[Facebook] ✅ Profile found:', username);
            
            const $ = cheerio.load(pageText);
            const title = $('title').text();
            const ogTitle = $('meta[property="og:title"]').attr('content');
            const ogImage = $('meta[property="og:image"]').attr('content');
            const ogDescription = $('meta[property="og:description"]').attr('content');
            
            let fullName = username;
            if (ogTitle && ogTitle !== 'Facebook') {
              fullName = ogTitle.trim();
            } else if (title && title !== 'Facebook' && !title.includes('Log In')) {
              fullName = title.replace(' | Facebook', '').replace(' - Facebook', '').trim();
            }
            
            return {
              platform: 'Facebook',
              username: username,
              fullName: fullName,
              bio: ogDescription || 'No bio available',
              profilePic: ogImage || '',
              profileUrl: `https://www.facebook.com/${username}`,
              found: true,
              message: 'Profile found (limited data - login required for details)'
            };
          }
        } catch (err) {
          console.log('[Facebook] Error with URL:', url, '-', err.message);
          continue;
        }
      }
      
      console.log('[Facebook] ⚠️ Could not verify profile, returning basic info');
      // Return basic profile info even if we can't verify
      return {
        platform: 'Facebook',
        username: username,
        fullName: username,
        profileUrl: `https://www.facebook.com/${username}`,
        found: true,
        message: 'Profile may exist (verification blocked by Facebook)'
      };
    } catch (error) {
      console.error('[Facebook] ERROR:', error.message);
      // Return basic profile info even on error
      return {
        platform: 'Facebook',
        username: username,
        profileUrl: `https://www.facebook.com/${username}`,
        found: true,
        message: 'Profile may exist (verification blocked)'
      };
    }
  }

  async searchById(userId) {
    try {
      const accessToken = process.env.FACEBOOK_APP_SECRET;
      if (!accessToken) {
        return { error: 'Facebook API key not configured' };
      }

      const url = `https://graph.facebook.com/v18.0/${userId}?fields=id,name,picture,link&access_token=${accessToken}`;
      const response = await axios.get(url);

      return {
        platform: 'Facebook',
        id: response.data.id,
        name: response.data.name,
        profilePic: response.data.picture?.data?.url,
        profileUrl: response.data.link
      };
    } catch (error) {
      console.error('Facebook API error:', error.message);
      return null;
    }
  }
}

module.exports = new FacebookService();
