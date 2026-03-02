const aggregatorService = require('../services/aggregatorService');
const fs = require('fs');

class SearchController {
  // Search by username
  async searchByUsername(req, res) {
    try {
      const { username } = req.body;

      if (!username) {
        return res.status(400).json({ error: 'Username required' });
      }

      const cleanUsername = username.trim();
      console.log('Searching for username:', cleanUsername);
      const results = await aggregatorService.searchAllPlatforms(cleanUsername);
      console.log('Search completed. Results:', results);

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
      const results = await aggregatorService.searchByImage(imagePath);
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
