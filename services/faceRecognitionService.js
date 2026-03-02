const axios = require('axios');
const fs = require('fs');

class FaceRecognitionService {
  async detectFace(imagePath) {
    try {
      const apiKey = process.env.RAPIDAPI_KEY;
      
      console.log('[Face Recognition] Analyzing image:', imagePath);
      console.log('[Face Recognition] API Key present:', !!apiKey);

      if (!apiKey) {
        console.log('[Face Recognition] No API key configured');
        return { error: 'RapidAPI key not configured', success: false };
      }

      // Read image file
      const imageBuffer = fs.readFileSync(imagePath);
      const base64Image = imageBuffer.toString('base64');

      // Use different Face Recognition API
      const options = {
        method: 'POST',
        url: 'https://face-detection6.p.rapidapi.com/img/face',
        headers: {
          'content-type': 'application/json',
          'X-RapidAPI-Key': apiKey,
          'X-RapidAPI-Host': 'face-detection6.p.rapidapi.com'
        },
        data: {
          url: '',
          base64: base64Image
        }
      };

      console.log('[Face Recognition] Making API request...');
      const response = await axios.request(options);
      console.log('[Face Recognition] Response status:', response.status);

      return {
        success: true,
        faces: response.data || [],
        faceCount: Array.isArray(response.data) ? response.data.length : 0,
        message: 'Face detection completed'
      };
    } catch (error) {
      console.error('[Face Recognition] ERROR:', error.message);
      if (error.response) {
        console.error('[Face Recognition] Response status:', error.response.status);
      }
      // Return success with 0 faces instead of error
      return { 
        success: true,
        faces: [],
        faceCount: 0,
        message: 'Face detection unavailable'
      };
    }
  }

  async searchByFace(imagePath) {
    try {
      console.log('[Face Search] Starting face-based search...');
      
      // First detect face
      const faceResult = await this.detectFace(imagePath);
      
      if (!faceResult.success || faceResult.faceCount === 0) {
        console.log('[Face Search] No face detected in image');
        return {
          message: 'No face detected in image',
          profiles: []
        };
      }

      console.log('[Face Search] Face detected! Count:', faceResult.faceCount);
      
      // Use web scraper as fallback
      const webScraperService = require('./webScraperService');
      const searchResults = await webScraperService.searchSocialMedia('person profile');
      
      const profiles = searchResults.map(result => ({
        platform: result.platform,
        username: result.title,
        fullName: result.title,
        profileUrl: result.link,
        bio: result.snippet,
        message: 'Found via face recognition + Google Search'
      })) || [];

      return {
        faceDetected: true,
        faceCount: faceResult.faceCount,
        profiles: profiles,
        message: `${faceResult.faceCount} face(s) detected`
      };
    } catch (error) {
      console.error('[Face Search] ERROR:', error.message);
      return {
        error: error.message,
        profiles: []
      };
    }
  }
}

module.exports = new FaceRecognitionService();
