const axios = require('axios');

class GoogleSearchService {
  constructor() {
    this.serpApiKey = process.env.Google_SERCH_API;
    this.googleApiKey = process.env.GOOGLE_SEARCH_API_KEY;
    this.cx = process.env.GOOGLE_SEARCH_ENGINE_ID;
  }

  async searchByName(name) {
    // Try SerpAPI first (better results)
    if (this.serpApiKey) {
      const serpResult = await this.searchWithSerpAPI(name);
      if (serpResult && serpResult.results.length > 0) {
        return serpResult;
      }
    }

    // Fallback to Google Custom Search
    return this.searchWithGoogleAPI(name);
  }

  async searchWithSerpAPI(name) {
    try {
      console.log('[SerpAPI] Searching for:', name);
      const query = `${name} site:instagram.com OR site:facebook.com OR site:twitter.com OR site:linkedin.com`;

      const response = await axios.get('https://serpapi.com/search', {
        params: {
          q: query,
          api_key: this.serpApiKey,
          num: 10,
          engine: 'google'
        },
        timeout: 15000
      });

      const results = response.data.organic_results?.map(item => ({
        title: item.title,
        link: item.link,
        snippet: item.snippet,
        platform: this.detectPlatform(item.link)
      })) || [];

      console.log('[SerpAPI] Found', results.length, 'results');
      return {
        query: name,
        totalResults: response.data.search_information?.total_results,
        results: results,
        source: 'SerpAPI'
      };
    } catch (error) {
      console.error('[SerpAPI] Error:', error.message);
      return null;
    }
  }

  async imageSearch(query, options = {}) {
    try {
      if (!this.serpApiKey) {
        return { error: 'SerpAPI key not configured', results: [] };
      }

      console.log('[SerpAPI Images] Searching for:', query);

      const response = await axios.get('https://serpapi.com/search', {
        params: {
          q: query,
          api_key: this.serpApiKey,
          tbm: 'isch',
          num: options.num || 20,
          engine: 'google'
        },
        timeout: 15000
      });

      const results = response.data.images_results?.map(item => ({
        title: item.title,
        link: item.link,
        thumbnail: item.thumbnail,
        source: item.source,
        original: item.original
      })) || [];

      console.log('[SerpAPI Images] Found', results.length, 'images');
      return {
        query,
        results,
        source: 'SerpAPI Images'
      };
    } catch (error) {
      console.error('[SerpAPI Images] Error:', error.message);
      return { error: error.message, results: [] };
    }
  }

  async newsSearch(query, options = {}) {
    try {
      if (!this.serpApiKey) {
        return { error: 'SerpAPI key not configured', results: [] };
      }

      console.log('[SerpAPI News] Searching for:', query);

      const response = await axios.get('https://serpapi.com/search', {
        params: {
          q: query,
          api_key: this.serpApiKey,
          tbm: 'nws',
          num: options.num || 10,
          engine: 'google'
        },
        timeout: 15000
      });

      const results = response.data.news_results?.map(item => ({
        title: item.title,
        link: item.link,
        snippet: item.snippet,
        source: item.source,
        date: item.date,
        thumbnail: item.thumbnail
      })) || [];

      console.log('[SerpAPI News] Found', results.length, 'news articles');
      return {
        query,
        results,
        source: 'SerpAPI News'
      };
    } catch (error) {
      console.error('[SerpAPI News] Error:', error.message);
      return { error: error.message, results: [] };
    }
  }

  async searchWithGoogleAPI(name) {
    try {
      console.log('[Google] Searching for:', name);
      console.log('[Google] API Key present:', !!this.googleApiKey);
      console.log('[Google] Search Engine ID:', this.cx);

      if (!this.googleApiKey || !this.cx) {
        console.log('[Google] API not configured');
        return { error: 'Google Search API not configured', results: [] };
      }

      const query = `${name} site:instagram.com OR site:facebook.com OR site:twitter.com OR site:linkedin.com`;
      const url = `https://www.googleapis.com/customsearch/v1?key=${this.googleApiKey}&cx=${this.cx}&q=${encodeURIComponent(query)}&num=5`;

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
        results: results,
        source: 'Google Custom Search'
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
