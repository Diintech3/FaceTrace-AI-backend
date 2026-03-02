const axios = require('axios');

class TwitterService {
  async searchByUsername(username) {
    try {
      const bearerToken = process.env.TWITTER_BEARER_TOKEN;
      
      console.log('[Twitter] Searching for:', username);
      console.log('[Twitter] Bearer token present:', !!bearerToken);
      
      if (!bearerToken) {
        console.log('[Twitter] No bearer token - cannot fetch real data');
        return null;
      }

      // Clean bearer token (remove quotes if any)
      const cleanToken = bearerToken.trim().replace(/^["']|["']$/g, '');
      
      // Use Twitter API v2
      const url = `https://api.twitter.com/2/users/by/username/${username}?user.fields=created_at,description,profile_image_url,public_metrics,verified`;
      
      console.log('[Twitter] Making API request to v2 endpoint...');
      const response = await axios.get(url, {
        headers: {
          'Authorization': `Bearer ${cleanToken}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('[Twitter] API Response status:', response.status);
      const user = response.data.data;

      if (!user) {
        console.error('[Twitter] No user data in response');
        return null;
      }

      console.log('[Twitter] Profile found:', user.username);
      return {
        platform: 'Twitter/X',
        username: user.username,
        name: user.name,
        bio: user.description,
        followers: user.public_metrics?.followers_count,
        following: user.public_metrics?.following_count,
        tweets: user.public_metrics?.tweet_count,
        profilePic: user.profile_image_url,
        isVerified: user.verified,
        createdAt: user.created_at,
        profileUrl: `https://twitter.com/${username}`
      };
    } catch (error) {
      console.error('[Twitter] ERROR:', error.message);
      if (error.response) {
        console.error('[Twitter] Response status:', error.response.status);
        console.error('[Twitter] Response data:', JSON.stringify(error.response.data));
        
        // Check specific error types
        if (error.response.status === 401) {
          console.error('[Twitter] UNAUTHORIZED - Token invalid/expired. Please regenerate bearer token.');
        } else if (error.response.status === 403) {
          console.error('[Twitter] FORBIDDEN - Check app permissions in Twitter Developer Portal.');
        } else if (error.response.status === 429) {
          console.error('[Twitter] RATE LIMIT - Too many requests. Wait and retry.');
        }
      }
      return null;
    }
  }
}

module.exports = new TwitterService();
