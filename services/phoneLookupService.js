const axios = require('axios');

class PhoneLookupService {
  constructor() {
    this.numverifyKey = process.env.NUMVERIFY_API_KEY;
    this.rapidApiKey = process.env.RAPIDAPI_KEY;
  }

  async comprehensiveLookup(phoneNumber) {
    console.log('[Phone Lookup] Starting comprehensive lookup for:', phoneNumber);
    
    const results = {
      phoneNumber,
      validation: null,
      ownerInfo: null,
      socialMedia: [],
      additionalData: {}
    };

    // 1. Numverify - Basic Validation
    try {
      const numverifyData = await this.numverifyLookup(phoneNumber);
      results.validation = numverifyData;
    } catch (e) {
      console.error('[Phone Lookup] Numverify failed:', e.message);
    }

    // 2. TrueCaller via RapidAPI
    try {
      const trueCallerData = await this.trueCallerLookup(phoneNumber);
      if (trueCallerData.found) {
        results.ownerInfo = trueCallerData;
      }
    } catch (e) {
      console.error('[Phone Lookup] TrueCaller failed:', e.message);
    }

    // 3. Search social media by phone number
    try {
      const socialData = await this.searchSocialMedia(phoneNumber);
      results.socialMedia = socialData;
    } catch (e) {
      console.error('[Phone Lookup] Social media search failed:', e.message);
    }

    // 4. Google Search for phone number
    try {
      const googleData = await this.googleSearchPhone(phoneNumber);
      results.additionalData.googleResults = googleData;
    } catch (e) {
      console.error('[Phone Lookup] Google search failed:', e.message);
    }

    return results;
  }

  async numverifyLookup(phoneNumber) {
    const response = await axios.get('http://apilayer.net/api/validate', {
      params: {
        access_key: this.numverifyKey,
        number: phoneNumber,
        format: 1
      },
      timeout: 10000
    });

    return {
      valid: response.data.valid,
      number: response.data.number,
      localFormat: response.data.local_format,
      internationalFormat: response.data.international_format,
      countryPrefix: response.data.country_prefix,
      countryCode: response.data.country_code,
      countryName: response.data.country_name,
      location: response.data.location,
      carrier: response.data.carrier,
      lineType: response.data.line_type
    };
  }

  async trueCallerLookup(phoneNumber) {
    const cleanPhone = phoneNumber.replace(/[^\d+]/g, '');
    
    const response = await axios.get('https://truecaller4.p.rapidapi.com/api/v1/getDetails', {
      params: { 
        phone: cleanPhone, 
        countryCode: 'IN' 
      },
      headers: {
        'X-RapidAPI-Key': this.rapidApiKey,
        'X-RapidAPI-Host': 'truecaller4.p.rapidapi.com'
      },
      timeout: 15000,
      validateStatus: (status) => status < 500
    });

    if (response.status === 404 || response.status === 403) {
      return { found: false };
    }

    if (response.data && response.data.data) {
      const result = response.data.data;
      return {
        found: true,
        name: result.name,
        location: result.address?.[0]?.city || null,
        spamScore: result.spamScore || 0,
        verified: result.verified || false
      };
    }

    return { found: false };
  }

  async searchSocialMedia(phoneNumber) {
    // Search for phone number on social media platforms
    const platforms = [];
    
    // WhatsApp check (if number exists)
    try {
      platforms.push({
        platform: 'WhatsApp',
        link: `https://wa.me/${phoneNumber.replace(/\D/g, '')}`,
        status: 'Link Available'
      });
    } catch (e) {}

    // Telegram check
    try {
      platforms.push({
        platform: 'Telegram',
        link: `https://t.me/+${phoneNumber.replace(/\D/g, '')}`,
        status: 'Link Available'
      });
    } catch (e) {}

    // Scrape public directories
    try {
      const scrapedData = await this.scrapePublicDirectories(phoneNumber);
      if (scrapedData.length > 0) {
        platforms.push(...scrapedData);
      }
    } catch (e) {}

    return platforms;
  }

  async scrapePublicDirectories(phoneNumber) {
    const results = [];
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    
    try {
      // Scrape Truecaller web (public data only)
      const truecallerUrl = `https://www.truecaller.com/search/in/${cleanPhone}`;
      const response = await axios.get(truecallerUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: 10000
      });

      // Parse HTML for public data
      const cheerio = require('cheerio');
      const $ = cheerio.load(response.data);
      
      const name = $('.name').first().text().trim();
      const location = $('.location').first().text().trim();
      
      if (name) {
        results.push({
          platform: 'Truecaller Web',
          name: name,
          location: location || 'Unknown',
          status: 'Found'
        });
      }
    } catch (e) {
      console.log('[Scraper] Truecaller web scraping failed:', e.message);
    }

    return results;
  }

  async googleSearchPhone(phoneNumber) {
    // Use SerpAPI to search for phone number
    const serpApiKey = process.env.Google_SERCH_API;
    if (!serpApiKey) return [];

    try {
      const response = await axios.get('https://serpapi.com/search', {
        params: {
          q: phoneNumber,
          api_key: serpApiKey,
          num: 5,
          engine: 'google'
        },
        timeout: 10000
      });

      return response.data.organic_results?.slice(0, 5).map(item => ({
        title: item.title,
        link: item.link,
        snippet: item.snippet
      })) || [];
    } catch (e) {
      return [];
    }
  }
}

module.exports = new PhoneLookupService();
