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

      // Phone patterns - Indian and US
      const phonePatterns = [
        /\+91[\s-]?[6-9]\d{9}/g,
        /[6-9]\d{9}/g,
        /\+1[\s-]?\d{10}/g
      ];

      const seen = new Set();
      phonePatterns.forEach(pattern => {
        const phones = pageText.match(pattern) || [];
        phones.forEach(phone => {
          const p = phone.replace(/\D/g, '');
          if (p.length >= 10 && this.isValidPhone(p) && !seen.has(p)) {
            seen.add(p);
            contacts.phones.push(phone.trim());
          }
        });
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

  isValidPhone(digits) {
    if (!digits || digits.length < 10 || digits.length > 15) return false;
    const invalid = [
      '1234567890', '0000000000', '1111111111', '2222222222', '3333333333',
      '4444444444', '5555555555', '6666666666', '7777777777', '8888888888', '9999999999',
      '8666666666', '9876543210', '1231231231', '5555555555', '1000000000',
      '2000000000', '4044044044', '5005005005'
    ];
    if (invalid.includes(digits)) return false;
    const repeated = /^(\d)\1{7,}$/;
    if (repeated.test(digits)) return false;
    const seq = /^(0123456789|1234567890|9876543210)/;
    if (seq.test(digits)) return false;
    if (digits.length === 10 && digits.startsWith('0')) return false;
    return true;
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