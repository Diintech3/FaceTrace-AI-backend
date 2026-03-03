const axios = require('axios');
const cheerio = require('cheerio');

class FreeGoogleScraper {
  constructor() {
    this.headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      'Accept-Encoding': 'gzip, deflate',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1'
    };
  }

  async searchPerson(name) {
    try {
      console.log('[Free Google] Searching for:', name);
      
      const results = [];
      
      // Search on multiple platforms
      const queries = [
        `"${name}" site:instagram.com`,
        `"${name}" site:facebook.com`,
        `"${name}" site:twitter.com`,
        `"${name}" site:linkedin.com`,
        `"${name}" site:youtube.com`
      ];

      for (const query of queries) {
        try {
          const searchResults = await this.googleSearch(query);
          results.push(...searchResults);
        } catch (e) {
          console.error('[Free Google] Query failed:', query);
        }
      }

      console.log('[Free Google] Found', results.length, 'results');
      return results;
    } catch (error) {
      console.error('[Free Google] Error:', error.message);
      return [];
    }
  }

  async googleSearch(query) {
    try {
      const url = `https://www.google.com/search?q=${encodeURIComponent(query)}&num=10`;
      
      const response = await axios.get(url, {
        headers: this.headers,
        timeout: 15000
      });

      const $ = cheerio.load(response.data);
      const results = [];

      // Extract search results
      $('.g').each((i, element) => {
        const $el = $(element);
        const title = $el.find('h3').text();
        const link = $el.find('a').attr('href');
        const snippet = $el.find('.VwiC3b').text() || $el.find('.s').text();

        if (title && link && link.startsWith('http')) {
          const platform = this.detectPlatform(link);
          if (platform) {
            results.push({
              platform: platform,
              title: title,
              link: link,
              snippet: snippet,
              source: 'Google Search'
            });
          }
        }
      });

      if (results.length > 0) return results;

      // Fallback: Google may block automated scraping. Try DuckDuckGo HTML.
      return await this.duckDuckGoSearch(query);
    } catch (error) {
      // Fallback to DuckDuckGo HTML if Google fails
      try {
        return await this.duckDuckGoSearch(query);
      } catch (e) {
        return [];
      }
    }
  }

  async duckDuckGoSearch(query) {
    const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;

    const response = await axios.get(searchUrl, {
      headers: {
        ...this.headers,
        'Accept-Encoding': 'gzip, deflate, br'
      },
      timeout: 15000,
      validateStatus: (status) => status < 500
    });

    const $ = cheerio.load(response.data);
    const results = [];

    $('.result').each((i, elem) => {
      const title = $(elem).find('.result__title').text().trim();
      const link =
        $(elem).find('.result__url').attr('href') ||
        $(elem).find('.result__a').attr('href');
      const snippet = $(elem).find('.result__snippet').text().trim();

      if (title && link && link.startsWith('http')) {
        const platform = this.detectPlatform(link);
        if (platform) {
          results.push({
            platform,
            title,
            link,
            snippet,
            source: 'DuckDuckGo HTML'
          });
        }
      }
    });

    return results;
  }

  detectPlatform(url) {
    if (url.includes('instagram.com')) return 'Instagram';
    if (url.includes('facebook.com')) return 'Facebook';
    if (url.includes('twitter.com') || url.includes('x.com')) return 'Twitter';
    if (url.includes('linkedin.com')) return 'LinkedIn';
    if (url.includes('youtube.com')) return 'YouTube';
    if (url.includes('github.com')) return 'GitHub';
    if (url.includes('tiktok.com')) return 'TikTok';
    return null;
  }

  extractUsername(url) {
    const patterns = [
      /instagram\.com\/([^\/\?]+)/,
      /facebook\.com\/([^\/\?]+)/,
      /twitter\.com\/([^\/\?]+)/,
      /x\.com\/([^\/\?]+)/,
      /linkedin\.com\/in\/([^\/\?]+)/,
      /youtube\.com\/@([^\/\?]+)/,
      /github\.com\/([^\/\?]+)/,
      /tiktok\.com\/@([^\/\?]+)/
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }
    return null;
  }
}

module.exports = new FreeGoogleScraper();
