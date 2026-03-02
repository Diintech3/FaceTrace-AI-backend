const axios = require('axios');
const cheerio = require('cheerio');

class EnhancedContactExtractor {
  constructor() {
    this.headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
    };
  }

  // Extract contact info from Instagram profile page
  async scrapeInstagramContacts(username) {
    try {
      const url = `https://www.instagram.com/${username}/`;
      const response = await axios.get(url, { 
        headers: this.headers, 
        timeout: 10000 
      });

      const $ = cheerio.load(response.data);
      const contacts = { emails: [], phones: [], websites: [] };

      // Extract from page text
      const pageText = $('body').text();
      
      // Email patterns
      const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
      const emails = pageText.match(emailRegex);
      if (emails) {
        emails.forEach(email => {
          if (this.isValidEmail(email)) {
            contacts.emails.push(email);
          }
        });
      }

      // Phone patterns
      const phonePatterns = [
        /\+91[\s-]?[6-9]\d{9}/g,
        /[6-9]\d{9}/g,
        /\+1[\s-]?\d{10}/g
      ];

      phonePatterns.forEach(pattern => {
        const phones = pageText.match(pattern);
        if (phones) {
          phones.forEach(phone => contacts.phones.push(phone.trim()));
        }
      });

      // Website links
      $('a[href^="http"]').each((i, el) => {
        const href = $(el).attr('href');
        if (href && !href.includes('instagram.com') && !href.includes('facebook.com')) {
          contacts.websites.push(href);
        }
      });

      return contacts;
    } catch (error) {
      return { emails: [], phones: [], websites: [] };
    }
  }

  // Extract from YouTube about page
  async scrapeYouTubeContacts(channelId) {
    try {
      const url = `https://www.youtube.com/channel/${channelId}/about`;
      const response = await axios.get(url, { 
        headers: this.headers, 
        timeout: 10000 
      });

      const $ = cheerio.load(response.data);
      const contacts = { emails: [], phones: [] };

      const pageText = $('body').text();
      
      // Email extraction
      const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
      const emails = pageText.match(emailRegex);
      if (emails) {
        emails.forEach(email => {
          if (this.isValidEmail(email)) {
            contacts.emails.push(email);
          }
        });
      }

      return contacts;
    } catch (error) {
      return { emails: [], phones: [] };
    }
  }

  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) && 
           !email.includes('example.com') && 
           !email.includes('test.com') &&
           !email.includes('noreply');
  }

  // Main extraction method
  async extractFromProfiles(profiles) {
    const allContacts = { emails: new Set(), phones: new Set(), websites: new Set() };

    for (const profile of profiles) {
      try {
        let contacts = { emails: [], phones: [], websites: [] };

        if (profile.platform === 'Instagram' && profile.username) {
          contacts = await this.scrapeInstagramContacts(profile.username);
        } else if (profile.platform === 'YouTube' && profile.channelId) {
          contacts = await this.scrapeYouTubeContacts(profile.channelId);
        }

        // Add to main collection
        contacts.emails.forEach(email => allContacts.emails.add(email));
        contacts.phones.forEach(phone => allContacts.phones.add(phone));
        contacts.websites.forEach(website => allContacts.websites.add(website));

      } catch (error) {
        continue;
      }
    }

    return {
      emails: Array.from(allContacts.emails),
      phones: Array.from(allContacts.phones),
      websites: Array.from(allContacts.websites)
    };
  }
}

module.exports = new EnhancedContactExtractor();