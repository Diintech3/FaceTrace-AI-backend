const axios = require('axios');
const cheerio = require('cheerio');

class TrueCallerScraper {
  constructor() {
    this.baseUrl = 'https://www.truecaller.com';
    this.headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      'Accept-Encoding': 'gzip, deflate',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1'
    };
  }

  async searchByPhone(phoneNumber) {
    try {
      console.log('[TrueCaller Scraper] Searching phone:', phoneNumber);
      
      // Clean phone number
      const cleanPhone = phoneNumber.replace(/[^\d+]/g, '');
      
      const response = await axios.get(`${this.baseUrl}/search/in/${cleanPhone}`, {
        headers: this.headers,
        timeout: 15000,
        maxRedirects: 5
      });

      const $ = cheerio.load(response.data);
      
      // Extract name
      const name = $('.name').first().text().trim() || 
                   $('h1').first().text().trim() ||
                   $('.profile-name').text().trim();
      
      // Extract location
      const location = $('.location').text().trim() || 
                      $('.address').text().trim();
      
      // Extract carrier
      const carrier = $('.carrier').text().trim() ||
                     $('.operator').text().trim();

      if (name && name !== 'Unknown') {
        return {
          found: true,
          name: name,
          phone: phoneNumber,
          location: location || 'Unknown',
          carrier: carrier || 'Unknown',
          verified: false,
          source: 'TrueCaller Scraper'
        };
      }

      return { found: false, message: 'No data found via scraping' };
    } catch (error) {
      console.error('[TrueCaller Scraper] Error:', error.message);
      return { found: false, error: 'Scraping failed: ' + error.message };
    }
  }

  async searchByName(name) {
    try {
      console.log('[TrueCaller Scraper] Searching name:', name);
      
      const searchUrl = `${this.baseUrl}/search?q=${encodeURIComponent(name)}&countryCode=IN`;
      
      const response = await axios.get(searchUrl, {
        headers: this.headers,
        timeout: 15000
      });

      const $ = cheerio.load(response.data);
      
      const results = [];
      
      // Extract search results
      $('.search-result, .result-item').each((i, element) => {
        const $el = $(element);
        const personName = $el.find('.name, .result-name').text().trim();
        const phone = $el.find('.phone, .number').text().trim();
        const location = $el.find('.location, .address').text().trim();
        
        if (personName && phone) {
          results.push({
            name: personName,
            phone: phone,
            location: location || 'Unknown',
            verified: false
          });
        }
      });

      if (results.length > 0) {
        return { found: true, results };
      }

      return { found: false, message: 'No results found via scraping' };
    } catch (error) {
      console.error('[TrueCaller Scraper] Name search error:', error.message);
      return { found: false, error: 'Name search failed: ' + error.message };
    }
  }

  // Alternative method using different approach
  async searchAlternative(query) {
    try {
      // Try different TrueCaller endpoints
      const endpoints = [
        `https://www.truecaller.com/search/in/${query}`,
        `https://www.truecaller.com/search?q=${encodeURIComponent(query)}`,
        `https://truecaller.com/search/in/${query}`
      ];

      for (const endpoint of endpoints) {
        try {
          const response = await axios.get(endpoint, {
            headers: this.headers,
            timeout: 15000
          });

          if (response.status === 200 && response.data.includes('name')) {
            const $ = cheerio.load(response.data);
            const name = $('title').text() || $('.name').text();
            
            if (name && !name.includes('Search') && !name.includes('TrueCaller')) {
              return {
                found: true,
                name: name.trim(),
                query: query,
                source: 'Alternative scraping'
              };
            }
          }
        } catch (e) {
          continue; // Try next endpoint
        }
      }

      return { found: false, message: 'All scraping methods failed' };
    } catch (error) {
      return { found: false, error: error.message };
    }
  }
}

module.exports = new TrueCallerScraper();