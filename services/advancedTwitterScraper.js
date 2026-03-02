const puppeteer = require('puppeteer');

class AdvancedTwitterScraper {
  async searchByUsername(username) {
    let browser;
    try {
      console.log(`[Twitter Advanced] Scraping: ${username}`);
      
      browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });

      const page = await browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
      
      const url = `https://twitter.com/${username}`;
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 15000 });
      await page.waitForTimeout(3000);

      const profileData = await page.evaluate(() => {
        try {
          const pageText = document.body.innerText;
          
          // Check if profile exists
          if (pageText.includes("This account doesn't exist")) {
            return null;
          }

          // Extract name
          const nameElement = document.querySelector('[data-testid="UserName"]');
          const fullName = nameElement ? nameElement.innerText.split('\n')[0] : '';

          // Extract bio
          const bioElement = document.querySelector('[data-testid="UserDescription"]');
          const bio = bioElement ? bioElement.innerText : '';

          // Extract location
          const locationElement = document.querySelector('[data-testid="UserLocation"]');
          const location = locationElement ? locationElement.innerText : '';

          // Extract website
          const websiteElement = document.querySelector('[data-testid="UserUrl"]');
          const website = websiteElement ? websiteElement.innerText : '';

          // Extract followers/following
          const followersMatch = pageText.match(/(\d+(?:,\d+)*(?:\.\d+)?[KMB]?)\s*Followers/);
          const followingMatch = pageText.match(/(\d+(?:,\d+)*(?:\.\d+)?[KMB]?)\s*Following/);

          // Try to find email/phone in bio
          const emailMatch = bio.match(/[\w.-]+@[\w.-]+\.\w+/);
          const phoneMatch = bio.match(/[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,9}/);

          // Get profile pic
          const profilePicElement = document.querySelector('[data-testid="UserAvatar-Container-unknown"] img');
          const profilePic = profilePicElement ? profilePicElement.src : '';

          return {
            fullName,
            bio,
            location,
            website,
            email: emailMatch ? emailMatch[0] : null,
            phone: phoneMatch ? phoneMatch[0] : null,
            followers: followersMatch ? followersMatch[1] : null,
            following: followingMatch ? followingMatch[1] : null,
            profilePic,
            isVerified: pageText.includes('Verified account')
          };
        } catch (error) {
          console.error('Twitter evaluation error:', error);
          return null;
        }
      });

      await browser.close();

      if (!profileData) {
        console.log(`[Twitter Advanced] ❌ Not found: ${username}`);
        return null;
      }

      console.log(`[Twitter Advanced] ✅ Data extracted: ${username}`);

      return {
        platform: 'Twitter/X',
        username: username,
        fullName: profileData.fullName || 'N/A',
        bio: profileData.bio || 'No bio',
        location: profileData.location || 'N/A',
        website: profileData.website || 'N/A',
        email: profileData.email || 'N/A',
        phone: profileData.phone || 'N/A',
        followers: profileData.followers || 'N/A',
        following: profileData.following || 'N/A',
        profilePic: profileData.profilePic || '',
        verified: profileData.isVerified || false,
        profileUrl: url,
        found: true,
        message: 'Full data extracted via browser automation'
      };

    } catch (error) {
      if (browser) await browser.close();
      console.error(`[Twitter Advanced] Error:`, error.message);
      return null;
    }
  }
}

module.exports = new AdvancedTwitterScraper();
