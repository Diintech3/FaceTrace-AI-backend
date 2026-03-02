const puppeteer = require('puppeteer');

class AdvancedInstagramScraper {
  async searchByUsername(username) {
    let browser;
    try {
      console.log(`[Instagram Advanced] Scraping: ${username}`);
      
      browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled']
      });

      const page = await browser.newPage();
      
      // Set realistic user agent
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      
      // Block unnecessary resources to speed up
      await page.setRequestInterception(true);
      page.on('request', (req) => {
        if(['image', 'stylesheet', 'font'].includes(req.resourceType())){
          req.abort();
        } else {
          req.continue();
        }
      });

      const url = `https://www.instagram.com/${username}/`;
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 15000 });

      // Wait for content to load
      await page.waitForTimeout(2000);

      // Extract data from page
      const profileData = await page.evaluate(() => {
        try {
          // Try to get JSON data from script tags
          const scripts = document.querySelectorAll('script[type="application/ld+json"]');
          let jsonData = null;
          
          scripts.forEach(script => {
            try {
              const data = JSON.parse(script.textContent);
              if (data['@type'] === 'ProfilePage') {
                jsonData = data;
              }
            } catch (e) {}
          });

          // Get meta tags
          const getMetaContent = (property) => {
            const meta = document.querySelector(`meta[property="${property}"]`);
            return meta ? meta.getAttribute('content') : '';
          };

          // Extract from page text
          const pageText = document.body.innerText;
          
          // Try to extract followers, following, posts
          const followersMatch = pageText.match(/(\d+(?:,\d+)*(?:\.\d+)?[KMB]?)\s*[Ff]ollowers/);
          const followingMatch = pageText.match(/(\d+(?:,\d+)*(?:\.\d+)?[KMB]?)\s*[Ff]ollowing/);
          const postsMatch = pageText.match(/(\d+(?:,\d+)*(?:\.\d+)?[KMB]?)\s*[Pp]osts/);

          // Extract bio
          const bioElement = document.querySelector('header section div');
          let bio = '';
          if (bioElement) {
            bio = bioElement.innerText || '';
          }

          // Extract name from title
          const title = document.title;
          const nameMatch = title.match(/^(.+?)\s*\(/);
          const fullName = nameMatch ? nameMatch[1].trim() : '';

          // Try to find email/phone in bio
          const emailMatch = bio.match(/[\w.-]+@[\w.-]+\.\w+/);
          const phoneMatch = bio.match(/[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,9}/);

          return {
            fullName: fullName,
            bio: bio,
            followers: followersMatch ? followersMatch[1] : null,
            following: followingMatch ? followingMatch[1] : null,
            posts: postsMatch ? postsMatch[1] : null,
            email: emailMatch ? emailMatch[0] : null,
            phone: phoneMatch ? phoneMatch[0] : null,
            profilePic: getMetaContent('og:image'),
            isVerified: pageText.includes('Verified') || pageText.includes('✓')
          };
        } catch (error) {
          console.error('Page evaluation error:', error);
          return null;
        }
      });

      await browser.close();

      if (!profileData) {
        console.log(`[Instagram Advanced] ❌ Failed to extract data: ${username}`);
        return null;
      }

      console.log(`[Instagram Advanced] ✅ Data extracted: ${username}`);

      return {
        platform: 'Instagram',
        username: username,
        fullName: profileData.fullName || 'N/A',
        bio: profileData.bio || 'No bio',
        email: profileData.email || 'N/A',
        phone: profileData.phone || 'N/A',
        followers: profileData.followers || 'N/A',
        following: profileData.following || 'N/A',
        posts: profileData.posts || 'N/A',
        profilePic: profileData.profilePic || '',
        verified: profileData.isVerified || false,
        profileUrl: url,
        found: true,
        message: 'Full data extracted via browser automation'
      };

    } catch (error) {
      if (browser) await browser.close();
      console.error(`[Instagram Advanced] Error:`, error.message);
      return null;
    }
  }
}

module.exports = new AdvancedInstagramScraper();
