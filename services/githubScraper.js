const axios = require('axios');

class GitHubScraper {
  async searchByUsername(username) {
    try {
      console.log(`[GitHub] Searching: ${username}`);
      
      const response = await axios.get(`https://api.github.com/users/${username}`, {
        headers: {
          'User-Agent': 'FaceTrace-AI',
          'Accept': 'application/vnd.github.v3+json'
        },
        timeout: 15000,
        validateStatus: (status) => status < 500
      });

      if (response.status === 404) return null;
      if (response.status !== 200) return null;

      const data = response.data;
      console.log(`[GitHub] ✅ Found: ${username}`);

      return {
        platform: 'GitHub',
        username: data.login,
        fullName: data.name || 'N/A',
        profileUrl: data.html_url,
        profilePic: data.avatar_url,
        bio: data.bio || 'No bio',
        location: data.location || 'N/A',
        email: data.email || 'N/A',
        company: data.company || 'N/A',
        website: data.blog || 'N/A',
        followers: data.followers,
        following: data.following,
        publicRepos: data.public_repos,
        createdAt: data.created_at,
        found: true,
        message: 'Developer profile found'
      };
    } catch (error) {
      console.error(`[GitHub] Error:`, error.message);
      return null;
    }
  }
}

module.exports = new GitHubScraper();
