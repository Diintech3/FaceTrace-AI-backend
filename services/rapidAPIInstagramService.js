const axios = require('axios');

class RapidAPIInstagramService {
  async searchByUsername(username) {
    try {
      const apiKey = process.env.RAPIDAPI_KEY;
      
      console.log('[Instagram] Searching for:', username);
      console.log('[Instagram] API Key present:', !!apiKey);
      
      if (!apiKey) {
        console.log('[Instagram] No API key');
        return null;
      }

      // Try profile endpoint first
      const options = {
        method: 'GET',
        url: 'https://instagram-scraper-api2.p.rapidapi.com/v1/info',
        params: { username_or_id_or_url: username },
        headers: {
          'X-RapidAPI-Key': apiKey,
          'X-RapidAPI-Host': 'instagram-scraper-api2.p.rapidapi.com'
        }
      };

      console.log('[Instagram] Making API request...');
      const response = await axios.request(options);
      console.log('[Instagram] API Response status:', response.status);
      
      // Check if it's profile data or search results
      if (response.data.username) {
        // Direct profile data
        const data = response.data;
        console.log('[Instagram] Profile found:', data.username);
        
        return {
          platform: 'Instagram',
          username: data.username,
          fullName: data.full_name,
          bio: data.biography,
          followers: data.follower_count,
          following: data.following_count,
          posts: data.media_count,
          profilePic: data.hd_profile_pic_url_info?.url || data.profile_pic_url,
          isVerified: data.is_verified,
          isPrivate: data.is_private,
          profileUrl: `https://www.instagram.com/${data.username}/`
        };
      } else if (response.data.result) {
        // Profile endpoint response
        const data = response.data.result;
        console.log('[Instagram] Profile found:', data.username);
        
        return {
          platform: 'Instagram',
          username: data.username,
          fullName: data.full_name,
          bio: data.biography,
          followers: data.edge_followed_by?.count,
          following: data.edge_follow?.count,
          posts: data.edge_owner_to_timeline_media?.count,
          profilePic: data.profile_pic_url_hd || data.profile_pic_url,
          isVerified: data.is_verified,
          isPrivate: data.is_private,
          profileUrl: `https://www.instagram.com/${username}/`
        };
      } else if (response.data.users && response.data.users.length > 0) {
        // Search endpoint response - get first user
        const user = response.data.users[0].user;
        console.log('[Instagram] User found from search:', user.username);
        
        return {
          platform: 'Instagram',
          username: user.username,
          fullName: user.full_name,
          bio: user.search_social_context,
          profilePic: user.profile_pic_url,
          isVerified: user.is_verified,
          profileUrl: `https://www.instagram.com/${user.username}/`
        };
      } else {
        console.error('[Instagram] No data in response');
        return null;
      }
    } catch (error) {
      console.error('[Instagram] ERROR:', error.message);
      if (error.response) {
        console.error('[Instagram] Response status:', error.response.status);
        console.error('[Instagram] Response data:', error.response.data);
      }
      return null;
    }
  }
}

module.exports = new RapidAPIInstagramService();
