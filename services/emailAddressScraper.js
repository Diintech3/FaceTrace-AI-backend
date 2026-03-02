const axios = require('axios');
const cheerio = require('cheerio');

class EmailAddressScraper {
  constructor() {
    this.headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      'Connection': 'keep-alive'
    };
  }

  // Email finder from multiple sources
  async findEmails(name, username) {
    const emails = new Set();
    const sources = [];

    try {
      // 1. Hunter.io scraping (free alternative)
      const hunterEmails = await this.scrapeHunter(name);
      hunterEmails.forEach(email => emails.add(email));
      if (hunterEmails.length > 0) sources.push('Hunter.io');

      // 2. That's Them scraping
      const thatThemEmails = await this.scrapeThatsThem(name);
      thatThemEmails.forEach(email => emails.add(email));
      if (thatThemEmails.length > 0) sources.push('ThatsThem');

      // 3. Whitepages scraping
      const whitepagesEmails = await this.scrapeWhitepages(name);
      whitepagesEmails.forEach(email => emails.add(email));
      if (whitepagesEmails.length > 0) sources.push('Whitepages');

      // 4. Generate common email patterns
      const generatedEmails = this.generateEmailPatterns(name, username);
      generatedEmails.forEach(email => emails.add(email));
      if (generatedEmails.length > 0) sources.push('Pattern Generation');

    } catch (error) {
      console.error('[Email Scraper] Error:', error.message);
    }

    return {
      emails: Array.from(emails),
      sources: sources,
      found: emails.size > 0
    };
  }

  // Address finder from multiple sources
  async findAddresses(name) {
    const addresses = new Set();
    const sources = [];

    try {
      // 1. Whitepages address scraping
      const whitepagesAddresses = await this.scrapeWhitepagesAddresses(name);
      whitepagesAddresses.forEach(addr => addresses.add(addr));
      if (whitepagesAddresses.length > 0) sources.push('Whitepages');

      // 2. ThatsThem address scraping
      const thatsThemAddresses = await this.scrapeThatsThemAddresses(name);
      thatsThemAddresses.forEach(addr => addresses.add(addr));
      if (thatsThemAddresses.length > 0) sources.push('ThatsThem');

      // 3. FastPeopleSearch scraping
      const fastPeopleAddresses = await this.scrapeFastPeopleSearch(name);
      fastPeopleAddresses.forEach(addr => addresses.add(addr));
      if (fastPeopleAddresses.length > 0) sources.push('FastPeopleSearch');

    } catch (error) {
      console.error('[Address Scraper] Error:', error.message);
    }

    return {
      addresses: Array.from(addresses),
      sources: sources,
      found: addresses.size > 0
    };
  }

  // Hunter.io scraping
  async scrapeHunter(name) {
    try {
      const searchUrl = `https://hunter.io/search/${encodeURIComponent(name)}`;
      const response = await axios.get(searchUrl, { 
        headers: this.headers, 
        timeout: 8000 
      });

      const $ = cheerio.load(response.data);
      const emails = [];

      $('.email, .email-address').each((i, el) => {
        const email = $(el).text().trim();
        if (this.isValidEmail(email)) {
          emails.push(email);
        }
      });

      return emails;
    } catch (error) {
      return [];
    }
  }

  // ThatsThem scraping
  async scrapeThatsThem(name) {
    try {
      const searchUrl = `https://thatsthem.com/name/${encodeURIComponent(name.replace(' ', '-'))}`;
      const response = await axios.get(searchUrl, { 
        headers: this.headers, 
        timeout: 8000 
      });

      const $ = cheerio.load(response.data);
      const emails = [];

      $('a[href^="mailto:"]').each((i, el) => {
        const email = $(el).attr('href').replace('mailto:', '');
        if (this.isValidEmail(email)) {
          emails.push(email);
        }
      });

      return emails;
    } catch (error) {
      return [];
    }
  }

  // Whitepages email scraping
  async scrapeWhitepages(name) {
    try {
      const searchUrl = `https://www.whitepages.com/name/${encodeURIComponent(name.replace(' ', '-'))}`;
      const response = await axios.get(searchUrl, { 
        headers: this.headers, 
        timeout: 8000 
      });

      const $ = cheerio.load(response.data);
      const emails = [];

      // Look for email patterns in text
      const text = $('body').text();
      const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
      const matches = text.match(emailRegex);

      if (matches) {
        matches.forEach(email => {
          if (this.isValidEmail(email)) {
            emails.push(email);
          }
        });
      }

      return emails;
    } catch (error) {
      return [];
    }
  }

  // Whitepages address scraping
  async scrapeWhitepagesAddresses(name) {
    try {
      const searchUrl = `https://www.whitepages.com/name/${encodeURIComponent(name.replace(' ', '-'))}`;
      const response = await axios.get(searchUrl, { 
        headers: this.headers, 
        timeout: 8000 
      });

      const $ = cheerio.load(response.data);
      const addresses = [];

      $('.address, .location-address').each((i, el) => {
        const address = $(el).text().trim();
        if (address && address.length > 10) {
          addresses.push(address);
        }
      });

      return addresses;
    } catch (error) {
      return [];
    }
  }

  // ThatsThem address scraping
  async scrapeThatsThemAddresses(name) {
    try {
      const searchUrl = `https://thatsthem.com/name/${encodeURIComponent(name.replace(' ', '-'))}`;
      const response = await axios.get(searchUrl, { 
        headers: this.headers, 
        timeout: 8000 
      });

      const $ = cheerio.load(response.data);
      const addresses = [];

      $('.address-line, .location').each((i, el) => {
        const address = $(el).text().trim();
        if (address && address.length > 10) {
          addresses.push(address);
        }
      });

      return addresses;
    } catch (error) {
      return [];
    }
  }

  // FastPeopleSearch scraping
  async scrapeFastPeopleSearch(name) {
    try {
      const searchUrl = `https://www.fastpeoplesearch.com/name/${encodeURIComponent(name.replace(' ', '-'))}`;
      const response = await axios.get(searchUrl, { 
        headers: this.headers, 
        timeout: 8000 
      });

      const $ = cheerio.load(response.data);
      const addresses = [];

      $('.address, .current-address, .previous-address').each((i, el) => {
        const address = $(el).text().trim();
        if (address && address.length > 10) {
          addresses.push(address);
        }
      });

      return addresses;
    } catch (error) {
      return [];
    }
  }

  // Generate common email patterns
  generateEmailPatterns(name, username) {
    const emails = [];
    const domains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com'];
    
    if (name) {
      const nameParts = name.toLowerCase().split(' ');
      const firstName = nameParts[0];
      const lastName = nameParts[1] || '';

      domains.forEach(domain => {
        if (firstName && lastName) {
          emails.push(`${firstName}.${lastName}@${domain}`);
          emails.push(`${firstName}${lastName}@${domain}`);
          emails.push(`${firstName}_${lastName}@${domain}`);
          emails.push(`${firstName[0]}${lastName}@${domain}`);
        }
        if (username) {
          emails.push(`${username}@${domain}`);
        }
      });
    }

    return emails;
  }

  // Enhanced Instagram bio scraping for contact info
  async extractContactFromBio(bio, description) {
    const contacts = { emails: [], phones: [] };
    
    const text = `${bio || ''} ${description || ''}`;
    
    // Email patterns
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const emails = text.match(emailRegex);
    if (emails) {
      emails.forEach(email => {
        if (this.isValidEmail(email)) {
          contacts.emails.push(email);
        }
      });
    }
    
    // Phone patterns
    const phonePatterns = [
      /\+?[1-9]\d{1,14}/g, // International format
      /\(?\d{3}\)?[-\s]?\d{3}[-\s]?\d{4}/g, // US format
      /\+91[\s-]?[6-9]\d{9}/g, // Indian format
      /[6-9]\d{9}/g // Indian mobile
    ];
    
    phonePatterns.forEach(pattern => {
      const phones = text.match(pattern);
      if (phones) {
        phones.forEach(phone => {
          const cleanPhone = phone.replace(/[^\d+]/g, '');
          if (cleanPhone.length >= 10) {
            contacts.phones.push(phone.trim());
          }
        });
      }
    });
    
    return contacts;
  }

  // Email validation
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) && !email.includes('example.com') && !email.includes('test.com');
  }

  // Extract real contact info from social profiles
  async extractRealContactInfo(profiles) {
    const realContacts = { emails: new Set(), phones: new Set() };
    
    for (const profile of profiles) {
      // Extract from bio/description
      const bioContacts = await this.extractContactFromBio(profile.bio, profile.description);
      bioContacts.emails.forEach(email => realContacts.emails.add(email));
      bioContacts.phones.forEach(phone => realContacts.phones.add(phone));
      
      // Extract from profile data
      if (profile.email && profile.email !== 'N/A') {
        realContacts.emails.add(profile.email);
      }
      if (profile.phone && profile.phone !== 'N/A') {
        realContacts.phones.add(profile.phone);
      }
    }
    
    return {
      emails: Array.from(realContacts.emails),
      phones: Array.from(realContacts.phones)
    };
  }

  // Combined search with real contact extraction
  async searchPersonalInfo(name, username, profiles = []) {
    console.log('[Email/Address Scraper] Searching for:', name);

    const [emailResults, addressResults] = await Promise.all([
      this.findEmails(name, username),
      this.findAddresses(name)
    ]);

    // Extract real contacts from social media profiles
    let realContacts = { emails: [], phones: [] };
    if (profiles.length > 0) {
      realContacts = await this.extractRealContactInfo(profiles);
      console.log('[Email/Address Scraper] Real contacts found:', realContacts.emails.length, 'emails,', realContacts.phones.length, 'phones');
    }

    return {
      emails: emailResults,
      addresses: addressResults,
      realContacts: realContacts,
      totalFound: emailResults.emails.length + addressResults.addresses.length + realContacts.emails.length + realContacts.phones.length,
      searchedAt: new Date()
    };
  }
}

module.exports = new EmailAddressScraper();