const axios = require('axios');
const cheerio = require('cheerio');

class AdvancedInvestigationService {
  async getDetailedProfile(username) {
    const results = {
      username,
      personalInfo: {},
      socialConnections: [],
      locationData: [],
      activityPatterns: {},
      associatedAccounts: [],
      metadata: {}
    };

    try {
      await this.extractPersonalInfo(username, results);
      await this.findSocialConnections(username, results);
      await this.analyzeLocationData(username, results);
      await this.findAssociatedAccounts(username, results);
    } catch (error) {
      console.error('[Advanced Investigation] Error:', error.message);
    }

    return results;
  }

  async extractPersonalInfo(username, results) {
    try {
      const instagramData = await this.getInstagramDetails(username);
      if (instagramData) {
        results.personalInfo = {
          ...results.personalInfo,
          fullName: instagramData.fullName,
          bio: instagramData.bio,
          profilePic: instagramData.profilePic,
          verified: instagramData.verified,
          followers: instagramData.followers,
          following: instagramData.following,
          posts: instagramData.posts
        };

        const bioInfo = this.extractBioInfo(instagramData.bio);
        results.personalInfo = { ...results.personalInfo, ...bioInfo };
      }
    } catch (error) {
      console.error('[Personal Info] Error:', error.message);
    }
  }

  async getInstagramDetails(username) {
    try {
      const url = `https://www.instagram.com/${username}/`;
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: 15000
      });

      const html = response.data;
      const $ = cheerio.load(html);

      const scriptTags = $('script').toArray();
      for (let script of scriptTags) {
        const content = $(script).html();
        if (content && content.includes('edge_followed_by')) {
          const userMatch = content.match(/"user":\s*({[^}]+})/);
          if (userMatch) {
            try {
              const userData = JSON.parse(userMatch[1]);
              return {
                fullName: userData.full_name || 'N/A',
                bio: userData.biography || 'N/A',
                profilePic: userData.profile_pic_url || '',
                verified: userData.is_verified || false,
                followers: userData.edge_followed_by?.count || 'N/A',
                following: userData.edge_follow?.count || 'N/A',
                posts: userData.edge_owner_to_timeline_media?.count || 'N/A',
                businessAccount: userData.is_business_account || false,
                category: userData.category_name || 'N/A'
              };
            } catch (e) {}
          }
        }
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  extractBioInfo(bio) {
    const info = {};
    
    if (bio && bio !== 'N/A') {
      const ageMatch = bio.match(/(\d{1,2})\s*(years?|yrs?|yo)/i);
      if (ageMatch) info.age = ageMatch[1];

      const locationMatch = bio.match(/(?:from|in|at|📍)\s*([A-Za-z\s,]+)/i);
      if (locationMatch) info.location = locationMatch[1].trim();

      const professionKeywords = ['CEO', 'Manager', 'Developer', 'Designer', 'Student', 'Teacher', 'Doctor', 'Engineer'];
      for (let keyword of professionKeywords) {
        if (bio.toLowerCase().includes(keyword.toLowerCase())) {
          info.profession = keyword;
          break;
        }
      }

      const emailMatch = bio.match(/[\w.-]+@[\w.-]+\.\w+/);
      if (emailMatch) info.email = emailMatch[0];

      const websiteMatch = bio.match(/(https?:\/\/[^\s]+)/);
      if (websiteMatch) info.website = websiteMatch[0];
    }

    return info;
  }

  async findSocialConnections(username, results) {
    try {
      const platforms = [
        { name: 'Twitter', url: `https://twitter.com/${username}` },
        { name: 'Facebook', url: `https://facebook.com/${username}` },
        { name: 'LinkedIn', url: `https://linkedin.com/in/${username}` },
        { name: 'TikTok', url: `https://tiktok.com/@${username}` },
        { name: 'Snapchat', url: `https://snapchat.com/add/${username}` }
      ];

      for (let platform of platforms) {
        try {
          const response = await axios.head(platform.url, { timeout: 5000 });
          if (response.status === 200) {
            results.socialConnections.push({
              platform: platform.name,
              url: platform.url,
              status: 'exists'
            });
          }
        } catch (error) {
          // Platform doesn't exist or blocked
        }
      }
    } catch (error) {
      console.error('[Social Connections] Error:', error.message);
    }
  }

  async analyzeLocationData(username, results) {
    try {
      results.locationData = [
        { source: 'bio', location: results.personalInfo.location || 'N/A' }
      ];
    } catch (error) {
      console.error('[Location Data] Error:', error.message);
    }
  }

  async findAssociatedAccounts(username, results) {
    try {
      const variations = [
        username + '1',
        username + '2',
        username + '_',
        username + 'official',
        'real' + username,
        username.replace(/\d+$/, '')
      ];

      for (let variation of variations) {
        try {
          const response = await axios.head(`https://www.instagram.com/${variation}/`, { timeout: 3000 });
          if (response.status === 200) {
            results.associatedAccounts.push({
              username: variation,
              platform: 'Instagram',
              relationship: 'possible_variation'
            });
          }
        } catch (error) {
          // Variation doesn't exist
        }
      }
    } catch (error) {
      console.error('[Associated Accounts] Error:', error.message);
    }
  }
}

module.exports = new AdvancedInvestigationService();