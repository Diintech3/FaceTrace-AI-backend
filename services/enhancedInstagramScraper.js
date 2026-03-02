const axios = require('axios');
const cheerio = require('cheerio');

class EnhancedInstagramScraper {
  async searchByUsername(username) {
    try {
      console.log(`[Instagram] Searching: ${username}`);
      
      const url = `https://www.instagram.com/${username}/`;
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        timeout: 8000,
        validateStatus: (status) => status < 500
      });

      if (response.status === 404) return null;
      if (response.status !== 200) return null;

      const $ = cheerio.load(response.data);
      
      // Extract JSON-LD data
      let profileData = null;
      $('script[type="application/ld+json"]').each((i, elem) => {
        try {
          const json = JSON.parse($(elem).html());
          if (json['@type'] === 'ProfilePage') {
            profileData = json;
          }
        } catch (e) {}
      });

      // Extract from meta tags
      const fullName = $('meta[property="og:title"]').attr('content') || '';
      const bio = $('meta[property="og:description"]').attr('content') || '';
      const profilePic = $('meta[property="og:image"]').attr('content') || '';

      // Parse follower info from bio/description
      const followerMatch = bio.match(/(\d+(?:,\d+)*(?:\.\d+)?[KMB]?)\s*Followers/i);
      const followingMatch = bio.match(/(\d+(?:,\d+)*(?:\.\d+)?[KMB]?)\s*Following/i);
      const postsMatch = bio.match(/(\d+(?:,\d+)*(?:\.\d+)?[KMB]?)\s*Posts/i);

      console.log(`[Instagram] ✅ Found: ${username}`);

      return {
        platform: 'Instagram',
        username: username,
        fullName: fullName.replace(` (@${username})`, '').trim(),
        profileUrl: url,
        profilePic: profilePic,
        bio: bio.split(' - ')[0] || '',
        followers: followerMatch ? followerMatch[1] : 'N/A',
        following: followingMatch ? followingMatch[1] : 'N/A',
        posts: postsMatch ? postsMatch[1] : 'N/A',
        found: true,
        verified: bio.includes('Verified') || bio.includes('✓'),
        message: 'Profile found (public data)'
      };
    } catch (error) {
      console.error(`[Instagram] Error:`, error.message);
      return null;
    }
  }
}

module.exports = new EnhancedInstagramScraper();
