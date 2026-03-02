const axios = require('axios');
const fs = require('fs');

class ClarifaiService {
  constructor() {
    this.apiKey = process.env.CLARIFAI_API_KEY;
    this.baseUrl = 'https://api.clarifai.com/v2';
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
        `${this.baseUrl}/models/face-detection/outputs`,
        {
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

      const regions = response.data.outputs[0].data?.regions || [];
      
      return {
        faces: regions,
        faceCount: regions.length,
        success: true
      };
    } catch (error) {
      console.error('[Clarifai] Error:', error.message);
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
        `${this.baseUrl}/models/general-image-recognition/outputs`,
        {
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

      const concepts = response.data.outputs[0].data?.concepts || [];
      console.log('[Clarifai] Found', concepts.length, 'concepts');
      
      return [];
    } catch (error) {
      console.error('[Clarifai] Reverse search error:', error.message);
      return [];
    }
  }
}

module.exports = new ClarifaiService();
