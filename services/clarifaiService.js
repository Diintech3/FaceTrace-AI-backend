const axios = require('axios');
const fs = require('fs');

class ClarifaiService {
  constructor() {
    this.apiKey = process.env.CLARIFAI_API_KEY;
    this.baseUrl = 'https://api.clarifai.com/v2';
    this.userId = 'clarifai';
    this.appId = 'main';
  }

  async detectFaces(imagePath) {
    try {
      if (!this.apiKey) {
        console.log('[Clarifai] No API key, skipping');
        return null;
      }

      console.log('[Clarifai] Detecting faces in:', imagePath);
      
      const imageBuffer = fs.readFileSync(imagePath);
      const base64Image = imageBuffer.toString('base64');

      const response = await axios.post(
        `${this.baseUrl}/users/${this.userId}/apps/${this.appId}/models/face-detection/outputs`,
        {
          user_app_id: {
            user_id: this.userId,
            app_id: this.appId
          },
          inputs: [{
            data: {
              image: { base64: base64Image }
            }
          }]
        },
        {
          headers: {
            'Authorization': `Key ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );

      if (response.data.status?.code !== 10000) {
        console.log('[Clarifai] API Error:', response.data.status?.description);
        return null;
      }

      const regions = response.data.outputs?.[0]?.data?.regions || [];
      console.log('[Clarifai] ✅ Detected', regions.length, 'faces');
      
      return {
        faces: regions,
        faceCount: regions.length,
        success: true
      };
    } catch (error) {
      console.error('[Clarifai] Error:', error.response?.data || error.message);
      return null;
    }
  }

  async reverseImageSearch(imagePath) {
    try {
      if (!this.apiKey) return [];

      console.log('[Clarifai] Reverse image search for:', imagePath);
      
      const imageBuffer = fs.readFileSync(imagePath);
      const base64Image = imageBuffer.toString('base64');

      const response = await axios.post(
        `${this.baseUrl}/users/${this.userId}/apps/${this.appId}/models/general-image-recognition/outputs`,
        {
          user_app_id: {
            user_id: this.userId,
            app_id: this.appId
          },
          inputs: [{
            data: {
              image: { base64: base64Image }
            }
          }]
        },
        {
          headers: {
            'Authorization': `Key ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );

      if (response.data.status?.code !== 10000) {
        console.log('[Clarifai] API Error:', response.data.status?.description);
        return [];
      }

      const concepts = response.data.outputs?.[0]?.data?.concepts || [];
      console.log('[Clarifai] ✅ Found', concepts.length, 'concepts');
      
      return [];
    } catch (error) {
      console.error('[Clarifai] Reverse search error:', error.response?.data || error.message);
      return [];
    }
  }
}

module.exports = new ClarifaiService();
