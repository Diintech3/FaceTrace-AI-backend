const axios = require('axios');

class RapidApiFacebookService {
  constructor() {
    this.apiKey = process.env.RAPIDAPI_KEY;
    this.baseUrl = 'https://facebook-scraper-api2.p.rapidapi.com';
  }

  async searchProfile(username) {
    if (!this.apiKey) {
      console.log('[RapidAPI Facebook] API key not configured');
      return null;
    }

    try {
      console.log('[RapidAPI Facebook] Searching:', username);
      
      const response = await axios.get(`${this.baseUrl}/facebook-profile`, {
        params: { username: username },
        headers: {
          'X-RapidAPI-Key': this.apiKey,
          'X-RapidAPI-Host': 'facebook-scraper-api2.p.rapidapi.com'
        },
        timeout: 15000
      });

      if (response.data && response.data.id) {
        console.log('[RapidAPI Facebook] ✅ Profile found:', response.data.name);
        
        return {
          platform: 'Facebook',
          username: username,
          userId: response.data.id,
          fullName: response.data.name || username,
          bio: response.data.about || response.data.bio || 'No bio',
          profilePic: response.data.profile_picture || response.data.picture || '',
          profileUrl: response.data.link || `https://www.facebook.com/${username}`,
          followers: response.data.followers || response.data.follower_count || 'N/A',
          friends: response.data.friends_count || 'N/A',
          location: response.data.location || response.data.city || 'N/A',
          work: response.data.work?.[0]?.employer?.name || 'N/A',
          education: response.data.education?.[0]?.school?.name || 'N/A',
          verified: response.data.is_verified || false,
          found: true,
          message: 'Profile data extracted via RapidAPI'
        };
      }
    } catch (error) {
      if (error.response?.status === 404) {
        console.log('[RapidAPI Facebook] ❌ Profile not found');
      } else if (error.response?.status === 429) {
        console.log('[RapidAPI Facebook] ⚠️ Rate limit exceeded');
      } else {
        console.log('[RapidAPI Facebook] Error:', error.message);
      }
    }
    return null;
  }
}

module.exports = new RapidApiFacebookService();
