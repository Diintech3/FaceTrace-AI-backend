const axios = require('axios');
const cheerio = require('cheerio');

class EnhancedDataExtractor {
  async getInstagramData(username) {
    try {
      const url = `https://www.instagram.com/${username}/`;
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Cache-Control': 'no-cache'
        },
        timeout: 15000
      });

      const html = response.data;
      const $ = cheerio.load(html);

      // Multiple extraction methods
      let data = {
        username,
        fullName: 'N/A',
        bio: 'No bio available',
        followers: 'N/A',
        following: 'N/A',
        posts: 'N/A',
        verified: false,
        private: false,
        profilePic: '',
        email: 'N/A',
        phone: 'N/A' // Disabled due to false positives
      };

      // Method 1: JSON-LD structured data
      const jsonLd = $('script[type="application/ld+json"]').html();
      if (jsonLd) {
        try {
          const jsonData = JSON.parse(jsonLd);
          data.fullName = jsonData.name || data.fullName;
          data.bio = jsonData.description || data.bio;
        } catch (e) {}
      }

      // Method 2: Meta tags
      data.fullName = $('meta[property="og:title"]').attr('content')?.split('•')[0]?.trim() || data.fullName;
      data.bio = $('meta[name="description"]').attr('content') || data.bio;
      data.profilePic = $('meta[property="og:image"]').attr('content') || '';

      // Method 3: Page title parsing
      const title = $('title').text();
      if (title && !title.includes('Instagram')) {
        const nameMatch = title.match(/^(.+?)\\s*[•(]/);
        if (nameMatch) data.fullName = nameMatch[1].trim();
      }

      // Method 4: Script data extraction
      const scriptTags = $('script').toArray();
      for (let script of scriptTags) {
        const content = $(script).html();
        if (content && content.includes('edge_followed_by')) {
          // Extract follower count
          const followersMatch = content.match(/"edge_followed_by":\\s*{\\s*"count":\\s*(\\d+)/);
          if (followersMatch) data.followers = parseInt(followersMatch[1]).toLocaleString();

          // Extract following count
          const followingMatch = content.match(/"edge_follow":\\s*{\\s*"count":\\s*(\\d+)/);
          if (followingMatch) data.following = parseInt(followingMatch[1]).toLocaleString();

          // Extract posts count
          const postsMatch = content.match(/"edge_owner_to_timeline_media":\\s*{\\s*"count":\\s*(\\d+)/);
          if (postsMatch) data.posts = parseInt(postsMatch[1]).toLocaleString();

          // Extract verification status
          const verifiedMatch = content.match(/"is_verified":\\s*(true|false)/);
          if (verifiedMatch) data.verified = verifiedMatch[1] === 'true';

          // Extract private status
          const privateMatch = content.match(/"is_private":\\s*(true|false)/);
          if (privateMatch) data.private = privateMatch[1] === 'true';

          // Extract full name and bio from user object
          const fullNameMatch = content.match(/"full_name":\\s*"([^"]+)"/);
          if (fullNameMatch) data.fullName = fullNameMatch[1];

          const bioMatch = content.match(/"biography":\\s*"([^"]+)"/);
          if (bioMatch) data.bio = bioMatch[1];

          break;
        }
      }

      // Method 5: Text-based extraction from HTML
      const pageText = html;
      const emailMatch = pageText.match(/[\\w.-]+@[\\w.-]+\\.\\w+/);
      if (emailMatch) data.email = emailMatch[0];

      // Phone extraction disabled due to too many false positives
      // Instagram URLs and IDs often get misidentified as phone numbers

      return data;
    } catch (error) {
      console.error('[Enhanced Instagram] Error:', error.message);
      return null;
    }
  }

  async getLinkedInData(username) {
    try {
      const url = `https://www.linkedin.com/in/${username}`;
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        },
        timeout: 10000,
        validateStatus: status => status < 500
      });

      if (response.status === 999) {
        return {
          username,
          fullName: 'Profile Exists',
          headline: 'Login required for details',
          location: 'N/A',
          connections: 'N/A',
          message: 'Profile detected but blocked by LinkedIn'
        };
      }

      const $ = cheerio.load(response.data);
      const title = $('title').text();
      const description = $('meta[name="description"]').attr('content') || '';

      let fullName = 'N/A';
      let headline = 'N/A';
      
      if (title && !title.includes('Page Not Found')) {
        fullName = title.split('|')[0].trim();
      }

      if (description) {
        const headlineMatch = description.match(/^(.+?)\\s*\\|/);
        if (headlineMatch) headline = headlineMatch[1].trim();
      }

      return {
        username,
        fullName,
        headline,
        location: 'N/A',
        profilePic: $('meta[property="og:image"]').attr('content') || '',
        connections: 'N/A'
      };
    } catch (error) {
      return {
        username,
        fullName: 'Profile Likely Exists',
        headline: 'Access restricted',
        message: 'LinkedIn blocks automated access'
      };
    }
  }
}

module.exports = new EnhancedDataExtractor();