const axios = require('axios');

class GoogleSearchService {
  async searchByName(name) {
    try {
      const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
      const cx = process.env.GOOGLE_SEARCH_ENGINE_ID;

      console.log('[Google] Searching for:', name);
      console.log('[Google] API Key present:', !!apiKey);
      console.log('[Google] Search Engine ID:', cx);

      if (!apiKey || !cx) {
        console.log('[Google] API not configured');
        return { error: 'Google Search API not configured', results: [] };
      }

      const query = `${name} site:instagram.com OR site:facebook.com OR site:twitter.com OR site:linkedin.com`;
      const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cx}&q=${encodeURIComponent(query)}&num=5`;

      console.log('[Google] Making search request...');
      const response = await axios.get(url);
      console.log('[Google] Search response status:', response.status);

      const results = response.data.items?.map(item => ({
        title: item.title,
        link: item.link,
        snippet: item.snippet,
        platform: this.detectPlatform(item.link)
      })) || [];

      console.log('[Google] Found', results.length, 'results');
      return {
        query: name,
        totalResults: response.data.searchInformation?.totalResults,
        results: results
      };
    } catch (error) {
      console.error('[Google] Search error:', error.message);
      if (error.response) {
        console.error('[Google] Response status:', error.response.status);
        console.error('[Google] Response data:', JSON.stringify(error.response.data));
      }
      return { error: error.message, results: [] };
    }
  }

  async reverseImageSearch(imageUrl) {
    try {
      const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
      const cx = process.env.GOOGLE_SEARCH_ENGINE_ID;

      console.log('[Google] Reverse image search for:', imageUrl);
      console.log('[Google] API Key present:', !!apiKey);

      if (!apiKey || !cx) {
        console.log('[Google] API not configured');
        return { 
          error: 'Google Search API not configured',
          results: []
        };
      }

      // Search for social media profiles
      const query = 'instagram OR facebook OR twitter OR linkedin profile';
      const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cx}&q=${encodeURIComponent(query)}&num=10`;

      console.log('[Google] Making search request...');
      const response = await axios.get(url);
      console.log('[Google] Search response status:', response.status);

      const results = response.data.items?.map(item => ({
        title: item.title,
        link: item.link,
        snippet: item.snippet,
        platform: this.detectPlatform(item.link)
      })) || [];

      console.log('[Google] Found', results.length, 'results');
      return {
        results: results,
        totalResults: response.data.searchInformation?.totalResults
      };
    } catch (error) {
      console.error('[Google] Reverse image search error:', error.message);
      if (error.response) {
        console.error('[Google] Response status:', error.response.status);
        console.error('[Google] Response data:', JSON.stringify(error.response.data));
      }
      return { error: error.message, results: [] };
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

module.exports = new GoogleSearchService();
