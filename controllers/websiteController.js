const websiteIntelligenceService = require('../services/websiteIntelligenceService');

// Track active analyses to prevent duplicates
const activeAnalyses = new Map();

exports.analyzeWebsite = async (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({
        success: false,
        message: 'URL is required'
      });
    }
    
    // Validate URL
    try {
      new URL(url);
    } catch (e) {
      return res.status(400).json({
        success: false,
        message: 'Invalid URL format'
      });
    }
    
    // Check if analysis already in progress
    if (activeAnalyses.has(url)) {
      return res.status(429).json({
        success: false,
        message: 'Analysis already in progress for this URL'
      });
    }
    
    console.log('[Controller] Website analysis started for:', url);
    
    // Mark as active
    activeAnalyses.set(url, Date.now());
    
    try {
      const result = await websiteIntelligenceService.analyzeWebsite(url);
      console.log('[Controller] Website analysis completed');
      res.json(result);
    } finally {
      // Always remove from active analyses
      activeAnalyses.delete(url);
    }
    
  } catch (error) {
    console.error('[Controller] Website analysis error:', error);
    res.status(500).json({
      success: false,
      message: 'Website analysis failed',
      error: error.message
    });
  }
};
