const aggregatorService = require('../services/aggregatorService');
const googleSearchService = require('../services/googleSearchService');
const numverifyService = require('../services/numverifyService');
const ipinfoService = require('../services/ipinfoService');
const fs = require('fs');

class SearchController {
  async searchByUsername(req, res) {
    try {
      const { username } = req.body;

      if (!username) {
        return res.status(400).json({ error: 'Username required' });
      }

      let cleanUsername = username.trim();
      
      // Check if email is provided instead of username
      if (cleanUsername.includes('@') && cleanUsername.includes('.')) {
        return res.status(400).json({ 
          error: 'Please provide username, not email address',
          message: 'Email addresses cannot be used for social media search. Please provide Instagram/Twitter/Facebook username instead.'
        });
      }
      
      // Auto-extract username if URL is provided
      if (cleanUsername.includes('instagram.com') || cleanUsername.includes('facebook.com') || 
          cleanUsername.includes('twitter.com') || cleanUsername.includes('linkedin.com') ||
          cleanUsername.includes('youtube.com') || cleanUsername.includes('github.com')) {
        console.log('URL detected, extracting username from:', cleanUsername);
        cleanUsername = extractUsername(cleanUsername);
        console.log('Extracted username:', cleanUsername);
      }
      
      console.log('Searching for username:', cleanUsername);
      const results = await aggregatorService.searchAllPlatforms(cleanUsername);
      
      // Filter out fake/unverified profiles
      if (results.profiles) {
        results.profiles = results.profiles.filter(profile => {
          // Keep only profiles with real data
          return profile.found === true || 
                 profile.followers > 0 || 
                 profile.subscribers > 0 ||
                 profile.posts > 0 ||
                 profile.videos > 0 ||
                 (profile.bio && profile.bio !== 'No bio available' && profile.bio !== 'No description');
        });
        results.totalFound = results.profiles.length;
      }
      
      console.log('Search completed. Real profiles found:', results.totalFound);

      res.json({
        success: true,
        data: results
      });
    } catch (error) {
      console.error('Search error:', error);
      res.status(500).json({ error: 'Search failed', message: error.message });
    }
  }

  // Search by image
  async searchByImage(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'Image file required' });
      }

      console.log('[Controller] Image search started for:', req.file.filename);
      const imagePath = req.file.path;
      
      // Get optional username hint from request
      const usernameHint = req.body.username || null;
      if (usernameHint) {
        console.log('[Controller] Username hint provided:', usernameHint);
      }
      
      const results = await aggregatorService.searchByImage(imagePath, usernameHint);
      console.log('[Controller] Image search completed:', results);

      // Delete image after processing
      fs.unlinkSync(imagePath);
      console.log('[Controller] Image deleted:', imagePath);

      res.json({
        success: true,
        data: results
      });
    } catch (error) {
      console.error('[Controller] Image search error:', error);
      // Delete image even on error
      if (req.file && req.file.path) {
        try { fs.unlinkSync(req.file.path); } catch (e) {}
      }
      res.status(500).json({ error: 'Image search failed', message: error.message });
    }
  }

  // Search by profile URL
  async searchByUrl(req, res) {
    try {
      const { url } = req.body;

      if (!url) {
        return res.status(400).json({ error: 'Profile URL required' });
      }

      console.log('Searching by URL:', url);
      const username = extractUsername(url).trim();
      console.log('Extracted username:', username);
      const results = await aggregatorService.searchAllPlatforms(username);

      res.json({
        success: true,
        data: results
      });
    } catch (error) {
      console.error('URL search error:', error);
      res.status(500).json({ error: 'URL search failed', message: error.message });
    }
  }

  // Image search using SerpAPI
  async imageSearch(req, res) {
    try {
      const { query, num } = req.body;

      if (!query) {
        return res.status(400).json({ error: 'Search query required' });
      }

      console.log('[Image Search] Query:', query);
      const results = await googleSearchService.imageSearch(query, { num });

      res.json({
        success: true,
        data: results
      });
    } catch (error) {
      console.error('[Image Search] Error:', error);
      res.status(500).json({ error: 'Image search failed', message: error.message });
    }
  }

  // News search using SerpAPI
  async newsSearch(req, res) {
    try {
      const { query, num } = req.body;

      if (!query) {
        return res.status(400).json({ error: 'Search query required' });
      }

      console.log('[News Search] Query:', query);
      const results = await googleSearchService.newsSearch(query, { num });

      res.json({
        success: true,
        data: results
      });
    } catch (error) {
      console.error('[News Search] Error:', error);
      res.status(500).json({ error: 'News search failed', message: error.message });
    }
  }

  async validatePhone(req, res) {
    try {
      const { phone } = req.body;

      if (!phone) {
        return res.status(400).json({ error: 'Phone number required' });
      }

      console.log('[Phone Validation] Number:', phone);
      
      // Use comprehensive phone lookup service
      const phoneLookupService = require('../services/phoneLookupService');
      const comprehensiveData = await phoneLookupService.comprehensiveLookup(phone);
      
      // Format response for frontend
      const results = {
        ...comprehensiveData.validation,
        ownerName: comprehensiveData.ownerInfo?.name || null,
        ownerLocation: comprehensiveData.ownerInfo?.location || null,
        spamScore: comprehensiveData.ownerInfo?.spamScore || 0,
        verified: comprehensiveData.ownerInfo?.verified || false,
        truecallerFound: comprehensiveData.ownerInfo?.found || false,
        socialMedia: comprehensiveData.socialMedia || [],
        googleResults: comprehensiveData.additionalData?.googleResults || [],
        scrapedData: comprehensiveData.socialMedia?.filter(s => s.name) || []
      };

      res.json({
        success: true,
        data: results
      });
    } catch (error) {
      console.error('[Phone Validation] Error:', error);
      res.status(500).json({ error: 'Phone validation failed', message: error.message });
    }
  }

  // IP lookup using IPInfo
  async lookupIP(req, res) {
    try {
      const { ip } = req.body;

      if (!ip) {
        return res.status(400).json({ error: 'IP address required' });
      }

      console.log('[IP Lookup] IP:', ip);
      const results = await ipinfoService.lookupIP(ip);

      res.json({
        success: true,
        data: results
      });
    } catch (error) {
      console.error('[IP Lookup] Error:', error);
      res.status(500).json({ error: 'IP lookup failed', message: error.message });
    }
  }
}

function extractUsername(url) {
  const patterns = [
    /instagram\.com\/([^\/\?]+)/,
    /facebook\.com\/([^\/\?]+)/,
    /twitter\.com\/([^\/\?]+)/,
    /linkedin\.com\/in\/([^\/\?]+)/,
    /youtube\.com\/@([^\/\?]+)/
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }

  return url;
}

module.exports = new SearchController();
