const axios = require('axios');
const cheerio = require('cheerio');

class WebScraperService {
  async searchSocialMedia(query) {
    try {
      console.log('[Web Scraper] Searching for:', query);
      
      // Search on DuckDuckGo (no API key needed)
      const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query + ' site:instagram.com OR site:twitter.com OR site:linkedin.com')}`;
      
      const response = await axios.get(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      const $ = cheerio.load(response.data);
      const results = [];

      $('.result').each((i, elem) => {
        const title = $(elem).find('.result__title').text().trim();
        const link = $(elem).find('.result__url').attr('href');
        const snippet = $(elem).find('.result__snippet').text().trim();

        if (link && (link.includes('instagram.com') || link.includes('twitter.com') || link.includes('linkedin.com'))) {
          results.push({
            title: title,
            link: link,
            snippet: snippet,
            platform: this.detectPlatform(link)
          });
        }
      });

      console.log('[Web Scraper] Found', results.length, 'results');
      return results;
    } catch (error) {
      console.error('[Web Scraper] ERROR:', error.message);
      return [];
    }
  }

  detectPlatform(url) {
    if (url.includes('instagram.com')) return 'Instagram';
    if (url.includes('facebook.com')) return 'Facebook';
    if (url.includes('twitter.com') || url.includes('x.com')) return 'Twitter';
    if (url.includes('linkedin.com')) return 'LinkedIn';
    if (url.includes('youtube.com')) return 'YouTube';
    return 'Other';
  }
}

module.exports = new WebScraperService();
