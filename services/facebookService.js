const axios = require('axios');
const cheerio = require('cheerio');
const rapidApiFacebookService = require('./rapidApiFacebookService');

class FacebookService {
  constructor() {
    this.appId = process.env.FACEBOOK_APP_ID;
    this.appSecret = process.env.FACEBOOK_APP_SECRET;
    this.accessToken = null;
  }

  async getAccessToken() {
    if (this.accessToken) return this.accessToken;
    
    if (!this.appId || !this.appSecret) {
      console.log('[Facebook] App credentials not configured');
      return null;
    }

    try {
      const response = await axios.get(
        `https://graph.facebook.com/oauth/access_token?client_id=${this.appId}&client_secret=${this.appSecret}&grant_type=client_credentials`
      );
      this.accessToken = response.data.access_token;
      console.log('[Facebook] ✅ Access token obtained');
      return this.accessToken;
    } catch (error) {
      console.error('[Facebook] Failed to get access token:', error.message);
      return null;
    }
  }

  async searchViaGraphAPI(username, token) {
    try {
      console.log('[Facebook Graph API] Searching:', username);
      
      // Try direct username lookup (works for Pages only)
      let url = `https://graph.facebook.com/v19.0/${username}?fields=id,name,username,about,picture.type(large),link,fan_count,followers_count,category,website,emails,location,phone&access_token=${token}`;
      
      let response = await axios.get(url, {
        timeout: 10000,
        validateStatus: (status) => status < 500
      });

      if (response.status === 200 && response.data.id) {
        console.log('[Facebook Graph API] ✅ Page found:', response.data.name);
        
        return {
          platform: 'Facebook',
          username: username,
          userId: response.data.id,
          fullName: response.data.name || username,
          bio: response.data.about || 'No bio available',
          profilePic: response.data.picture?.data?.url || '',
          profileUrl: response.data.link || `https://www.facebook.com/${username}`,
          category: response.data.category || 'N/A',
          website: response.data.website || 'N/A',
          email: response.data.emails?.[0] || 'N/A',
          phone: response.data.phone || 'N/A',
          location: response.data.location?.name || 'N/A',
          followers: response.data.followers_count || response.data.fan_count || 'N/A',
          verified: response.data.is_verified || false,
          found: true,
          message: 'Facebook Page data extracted via Graph API'
        };
      }
      
      // If direct lookup fails, try search API (limited results)
      console.log('[Facebook Graph API] Direct lookup failed, trying search...');
      url = `https://graph.facebook.com/v19.0/search?q=${encodeURIComponent(username)}&type=page&fields=id,name,username,picture,link,fan_count,category&access_token=${token}`;
      
      response = await axios.get(url, {
        timeout: 10000,
        validateStatus: (status) => status < 500
      });
      
      if (response.data.data && response.data.data.length > 0) {
        const page = response.data.data[0];
        console.log('[Facebook Graph API] ✅ Found via search:', page.name);
        
        return {
          platform: 'Facebook',
          username: page.username || username,
          userId: page.id,
          fullName: page.name,
          profilePic: page.picture?.data?.url || '',
          profileUrl: page.link || `https://www.facebook.com/${page.id}`,
          category: page.category || 'N/A',
          followers: page.fan_count || 'N/A',
          found: true,
          message: 'Found via Facebook search (Page only)'
        };
      }
    } catch (error) {
      if (error.response?.status === 404) {
        console.log('[Facebook Graph API] ❌ Not found');
      } else if (error.response?.data?.error) {
        console.log('[Facebook Graph API] Error:', error.response.data.error.message);
      } else {
        console.log('[Facebook Graph API] Error:', error.message);
      }
    }
    return null;
  }

  async searchByUsername(username) {
    try {
      console.log('[Facebook] Searching for:', username);
      
      // Try RapidAPI first (best for personal profiles)
      const rapidResult = await rapidApiFacebookService.searchProfile(username);
      if (rapidResult && rapidResult.found) {
        return rapidResult;
      }
      
      // Try Graph API (works for Pages only)
      const token = await this.getAccessToken();
      if (token) {
        const graphResult = await this.searchViaGraphAPI(username, token);
        if (graphResult && graphResult.found) {
          return graphResult;
        }
      }
      
      console.log('[Facebook] ⚠️ Graph API failed, trying scraping...');
      
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
      const token = await this.getAccessToken();
      if (!token) {
        return { error: 'Facebook API credentials not configured' };
      }

      const url = `https://graph.facebook.com/v19.0/${userId}?fields=id,name,username,about,picture.type(large),link,fan_count,category,website,location&access_token=${token}`;
      const response = await axios.get(url);

      return {
        platform: 'Facebook',
        userId: response.data.id,
        username: response.data.username || userId,
        fullName: response.data.name,
        bio: response.data.about || 'No bio',
        profilePic: response.data.picture?.data?.url,
        profileUrl: response.data.link,
        category: response.data.category,
        website: response.data.website,
        location: response.data.location?.name,
        followers: response.data.fan_count,
        found: true
      };
    } catch (error) {
      console.error('[Facebook] searchById error:', error.message);
      return null;
    }
  }

  async searchByEmail(email) {
    try {
      const token = await this.getAccessToken();
      if (!token) return null;

      console.log('[Facebook] Searching by email:', email);
      const url = `https://graph.facebook.com/v19.0/search?q=${encodeURIComponent(email)}&type=user&fields=id,name,picture,link&access_token=${token}`;
      
      const response = await axios.get(url);
      
      if (response.data.data && response.data.data.length > 0) {
        const user = response.data.data[0];
        console.log('[Facebook] ✅ Found user by email:', user.name);
        return {
          platform: 'Facebook',
          userId: user.id,
          fullName: user.name,
          profilePic: user.picture?.data?.url,
          profileUrl: user.link || `https://www.facebook.com/${user.id}`,
          found: true,
          message: 'Found via email search'
        };
      }
    } catch (error) {
      console.log('[Facebook] Email search error:', error.message);
    }
    return null;
  }
}

module.exports = new FacebookService();
