const axios = require('axios');
const cheerio = require('cheerio');

class PhoneNumberScraper {
  constructor() {
    this.headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5'
    };
  }

  async findPhoneNumbers(name) {
    const phones = new Set();
    const sources = [];

    try {
      // 1. Whitepages phone scraping
      const whitepagesPhones = await this.scrapeWhitepagesPhones(name);
      whitepagesPhones.forEach(phone => phones.add(phone));
      if (whitepagesPhones.length > 0) sources.push('Whitepages');

      // 2. ThatsThem phone scraping
      const thatsThemPhones = await this.scrapeThatsThemPhones(name);
      thatsThemPhones.forEach(phone => phones.add(phone));
      if (thatsThemPhones.length > 0) sources.push('ThatsThem');

      // 3. FastPeopleSearch phone scraping
      const fastPeoplePhones = await this.scrapeFastPeoplePhones(name);
      fastPeoplePhones.forEach(phone => phones.add(phone));
      if (fastPeoplePhones.length > 0) sources.push('FastPeopleSearch');

    } catch (error) {
      console.error('[Phone Scraper] Error:', error.message);
    }

    return {
      phones: Array.from(phones),
      sources: sources,
      found: phones.size > 0
    };
  }

  async scrapeWhitepagesPhones(name) {
    try {
      const searchUrl = `https://www.whitepages.com/name/${encodeURIComponent(name.replace(' ', '-'))}`;
      const response = await axios.get(searchUrl, { 
        headers: this.headers, 
        timeout: 15000 
      });

      const $ = cheerio.load(response.data);
      const phones = [];

      // Look for phone patterns
      const text = $('body').text();
      const phoneRegex = /(\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})/g;
      const matches = text.match(phoneRegex);

      if (matches) {
        matches.forEach(phone => {
          const cleanPhone = phone.replace(/[^\d+]/g, '');
          if (cleanPhone.length >= 10) {
            phones.push(this.formatPhone(cleanPhone));
          }
        });
      }

      return phones;
    } catch (error) {
      return [];
    }
  }

  async scrapeThatsThemPhones(name) {
    try {
      const searchUrl = `https://thatsthem.com/name/${encodeURIComponent(name.replace(' ', '-'))}`;
      const response = await axios.get(searchUrl, { 
        headers: this.headers, 
        timeout: 15000 
      });

      const $ = cheerio.load(response.data);
      const phones = [];

      $('.phone, .phone-number').each((i, el) => {
        const phone = $(el).text().trim();
        const cleanPhone = phone.replace(/[^\d+]/g, '');
        if (cleanPhone.length >= 10) {
          phones.push(this.formatPhone(cleanPhone));
        }
      });

      return phones;
    } catch (error) {
      return [];
    }
  }

  async scrapeFastPeoplePhones(name) {
    try {
      const searchUrl = `https://www.fastpeoplesearch.com/name/${encodeURIComponent(name.replace(' ', '-'))}`;
      const response = await axios.get(searchUrl, { 
        headers: this.headers, 
        timeout: 15000 
      });

      const $ = cheerio.load(response.data);
      const phones = [];

      $('.phone, .phone-number, .current-phone').each((i, el) => {
        const phone = $(el).text().trim();
        const cleanPhone = phone.replace(/[^\d+]/g, '');
        if (cleanPhone.length >= 10) {
          phones.push(this.formatPhone(cleanPhone));
        }
      });

      return phones;
    } catch (error) {
      return [];
    }
  }

  formatPhone(phone) {
    // Format phone number consistently
    const cleaned = phone.replace(/[^\d]/g, '');
    if (cleaned.length === 10) {
      return `+1${cleaned}`;
    } else if (cleaned.length === 11 && cleaned.startsWith('1')) {
      return `+${cleaned}`;
    }
    return phone;
  }
}

module.exports = new PhoneNumberScraper();