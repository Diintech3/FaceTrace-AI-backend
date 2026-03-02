const axios = require('axios');

class RedditScraper {
  async searchByUsername(username) {
    try {
      console.log(`[Reddit] Searching: ${username}`);
      
      const response = await axios.get(`https://www.reddit.com/user/${username}/about.json`, {
        headers: {
          'User-Agent': 'FaceTrace-AI/1.0'
        },
        timeout: 5000,
        validateStatus: (status) => status < 500
      });

      if (response.status === 404) return null;
      if (response.status !== 200) return null;

      const data = response.data.data;
      console.log(`[Reddit] ✅ Found: ${username}`);

      return {
        platform: 'Reddit',
        username: data.name,
        fullName: data.subreddit?.title || 'N/A',
        profileUrl: `https://www.reddit.com/user/${username}`,
        profilePic: data.icon_img || data.snoovatar_img || '',
        bio: data.subreddit?.public_description || 'No bio',
        karma: data.total_karma || 0,
        postKarma: data.link_karma || 0,
        commentKarma: data.comment_karma || 0,
        createdAt: new Date(data.created_utc * 1000).toLocaleDateString(),
        verified: data.verified || false,
        found: true,
        message: 'Reddit user found'
      };
    } catch (error) {
      console.error(`[Reddit] Error:`, error.message);
      return null;
    }
  }
}

module.exports = new RedditScraper();
