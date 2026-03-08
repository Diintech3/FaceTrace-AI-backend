const websiteIntelligenceService = require('../services/websiteIntelligenceService');

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
    
    console.log('[Controller] Website analysis started for:', url);
    
    const result = await websiteIntelligenceService.analyzeWebsite(url);
    
    console.log('[Controller] Website analysis completed');
    
    res.json(result);
    
  } catch (error) {
    console.error('[Controller] Website analysis error:', error);
    res.status(500).json({
      success: false,
      message: 'Website analysis failed',
      error: error.message
    });
  }
};
