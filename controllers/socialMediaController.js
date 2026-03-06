const socialMediaExtractor = require('../services/socialMediaExtractor');

exports.extractFromUrl = async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ 
        success: false,
        error: 'URL is required' 
      });
    }

    try {
      new URL(url);
    } catch (e) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid URL format' 
      });
    }

    console.log('Extracting data from URL:', url);
    const data = await socialMediaExtractor.extractFromUrl(url);
    console.log('Extracted data:', JSON.stringify(data, null, 2));
    
    if (data.error) {
      return res.status(200).json({
        success: false,
        error: data.error,
        platform: data.platform,
        profileUrl: data.profileUrl
      });
    }
    
    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Extract URL Error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
};

exports.findAllProfiles = async (req, res) => {
  try {
    const { username } = req.body;

    if (!username) {
      return res.status(400).json({ 
        success: false,
        error: 'Username is required' 
      });
    }

    // Validate username (alphanumeric, underscore, dot, hyphen)
    if (!/^[a-zA-Z0-9._-]+$/.test(username)) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid username format' 
      });
    }

    const profiles = await socialMediaExtractor.findAllSocialMedia(username);
    
    res.json({
      success: true,
      username,
      totalFound: profiles.length,
      profiles
    });
  } catch (error) {
    console.error('Find Profiles Error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
};
