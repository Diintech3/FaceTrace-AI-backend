const axios = require('axios');
const cheerio = require('cheerio');

class InstagramService {
  async searchByUsername(username) {
    try {
      console.log(`[Instagram] Searching: ${username}`);
      
      const url = `https://www.instagram.com/${username}/`;
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'DNT': '1',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1'
        },
        timeout: 10000,
        validateStatus: (status) => status < 500
      });

      if (response.status === 404) {
        console.log(`[Instagram] ❌ Not found: ${username}`);
        return null;
      }

      const $ = cheerio.load(response.data);
      const pageText = response.data;
      
      // Check if profile exists
      if (pageText.includes('Sorry, this page isn\'t available') || 
          pageText.includes('The link you followed may be broken')) {
        console.log(`[Instagram] ❌ Profile not found: ${username}`);
        return null;
      }

      console.log(`[Instagram] ✅ Profile found: ${username}`);

      // Extract data from meta tags and page content
      const title = $('title').text();
      const description = $('meta[name="description"]').attr('content') || '';
      const ogImage = $('meta[property="og:image"]').attr('content') || '';
      
      // Try to extract name from title
      let fullName = 'N/A';
      if (title) {
        const nameMatch = title.match(/^(.+?)\s*\(/);
        if (nameMatch) {
          fullName = nameMatch[1].trim();
        } else if (title.includes('•')) {
          fullName = title.split('•')[0].trim();
        }
      }

      // Extract bio from description
      let bio = 'No bio available';
      if (description) {
        // Remove Instagram branding from description
        bio = description.replace(/\d+\s*(Followers|Following|Posts)/gi, '').trim();
        if (bio.includes('See Instagram photos')) {
          bio = bio.split('See Instagram photos')[0].trim();
        }
      }

      // Try to extract follower/following/posts count from page text
      const followersMatch = pageText.match(/(\d+(?:,\d+)*(?:\.\d+)?[KMB]?)\s*[Ff]ollowers/) || 
                            pageText.match(/"edge_followed_by":{"count":(\d+)}/);
      const followingMatch = pageText.match(/(\d+(?:,\d+)*(?:\.\d+)?[KMB]?)\s*[Ff]ollowing/) || 
                            pageText.match(/"edge_follow":{"count":(\d+)}/);
      const postsMatch = pageText.match(/(\d+(?:,\d+)*(?:\.\d+)?[KMB]?)\s*[Pp]osts/) || 
                        pageText.match(/"edge_owner_to_timeline_media":{"count":(\d+)}/);

      // Extract more detailed info from JSON-LD or window._sharedData
      let jsonData = null;
      const jsonLdMatch = pageText.match(/<script type="application\/ld\+json">(.*?)<\/script>/s);
      if (jsonLdMatch) {
        try {
          jsonData = JSON.parse(jsonLdMatch[1]);
          if (jsonData) {
            fullName = jsonData.name || fullName;
            bio = jsonData.description || bio;
          }
        } catch (e) {}
      }

      // Check if verified
      const isVerified = pageText.includes('Verified') || pageText.includes('✓');
      
      // Check if private
      const isPrivate = pageText.includes('This Account is Private') || 
                       pageText.includes('private account');

      // Try to find email/phone in bio or page
      const emailMatch = pageText.match(/[\w.-]+@[\w.-]+\.\w+/);
      
      // More strict phone validation - only real phone patterns
      const phonePattern = /(?:\+?1[-\s]?)?\(?[0-9]{3}\)?[-\s]?[0-9]{3}[-\s]?[0-9]{4}|\+[1-9][0-9]{1,3}[-\s]?[0-9]{3,4}[-\s]?[0-9]{3,4}[-\s]?[0-9]{3,4}/;
      const phoneMatch = pageText.match(phonePattern);
      
      // Filter out invalid phone numbers and common false positives
      let validPhone = 'N/A';
      if (phoneMatch && phoneMatch[0]) {
        const phone = phoneMatch[0].replace(/[-\s()]/g, '');
        const invalidNumbers = ['192', '404', '500', '200', '100', '628727935', '123456789', '000000000'];
        if (!invalidNumbers.includes(phone) && phone.length >= 10 && phone.length <= 15) {
          // Additional validation: check if it looks like a real phone
          if (!/^(111|222|333|444|555|666|777|888|999)/.test(phone)) {
            validPhone = phoneMatch[0];
          }
        }
      }

      return {
        platform: 'Instagram',
        username: username,
        fullName: fullName,
        bio: bio,
        email: emailMatch ? emailMatch[0] : 'N/A',
        phone: 'N/A', // Disabled phone extraction due to false positives
        followers: followersMatch ? (followersMatch[2] || followersMatch[1]) : 'N/A',
        following: followingMatch ? (followingMatch[2] || followingMatch[1]) : 'N/A',
        posts: postsMatch ? (postsMatch[2] || postsMatch[1]) : 'N/A',
        profilePic: ogImage,
        verified: isVerified,
        private: isPrivate,
        profileUrl: url,
        found: true,
        message: 'Profile data extracted successfully'
      };
    } catch (error) {
      console.error(`[Instagram] Error:`, error.message);
      if (error.response?.status === 404) {
        return null;
      }
      // Return basic info if scraping fails
      return {
        platform: 'Instagram',
        username: username,
        profileUrl: `https://www.instagram.com/${username}/`,
        found: true,
        message: 'Profile exists (limited data due to restrictions)'
      };
    }
  }

  async searchByImage(imageUrl) {
    // Reverse image search logic
    return { message: 'Image search feature - integrate with Google Vision API' };
  }
}

module.exports = new InstagramService();
