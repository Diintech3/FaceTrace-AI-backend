const vision = require('@google-cloud/vision');
const axios = require('axios');
const fs = require('fs');

class GoogleVisionService {
  constructor() {
    this.apiKey = process.env.GOOGLE_VISION_API_KEY;
  }

  async detectFaces(imagePath) {
    try {
      console.log('[Google Vision] Detecting faces in:', imagePath);
      console.log('[Google Vision] API Key present:', !!this.apiKey);

      if (!this.apiKey) {
        console.error('[Google Vision] No API key configured');
        return null;
      }

      // Check if billing is enabled by testing the API
      // If billing disabled, skip gracefully

      // Read image file
      const imageBuffer = fs.readFileSync(imagePath);
      const base64Image = imageBuffer.toString('base64');

      // Call Vision API
      const url = `https://vision.googleapis.com/v1/images:annotate?key=${this.apiKey}`;
      
      const requestBody = {
        requests: [{
          image: { content: base64Image },
          features: [
            { type: 'FACE_DETECTION', maxResults: 10 },
            { type: 'WEB_DETECTION', maxResults: 10 },
            { type: 'LABEL_DETECTION', maxResults: 10 }
          ]
        }]
      };

      console.log('[Google Vision] Making API request...');
      const response = await axios.post(url, requestBody);
      console.log('[Google Vision] Response received');

      const result = response.data.responses[0];
      
      return {
        faces: result.faceAnnotations || [],
        faceCount: result.faceAnnotations?.length || 0,
        webDetection: result.webDetection || {},
        labels: result.labelAnnotations || [],
        success: true
      };
    } catch (error) {
      console.error('[Google Vision] ERROR:', error.message);
      if (error.response) {
        console.error('[Google Vision] Response status:', error.response.status);
        if (error.response.status === 403) {
          console.error('[Google Vision] ⚠️ Billing not enabled or API access denied');
          console.error('[Google Vision] Please enable billing at: https://console.developers.google.com/billing');
        }
      }
      return null;
    }
  }

  async reverseImageSearch(imagePath) {
    try {
      console.log('[Google Vision] Reverse image search for:', imagePath);
      
      const visionResult = await this.detectFaces(imagePath);
      
      if (!visionResult || !visionResult.webDetection) {
        return [];
      }

      const profiles = [];
      const webDetection = visionResult.webDetection;

      // Extract social media profiles from web entities and pages
      if (webDetection.pagesWithMatchingImages) {
        webDetection.pagesWithMatchingImages.forEach(page => {
          if (this.isSocialMediaUrl(page.url)) {
            profiles.push({
              platform: this.detectPlatform(page.url),
              title: page.pageTitle || 'Unknown',
              profileUrl: page.url,
              score: page.score || 0
            });
          }
        });
      }

      if (webDetection.visuallySimilarImages) {
        webDetection.visuallySimilarImages.forEach(image => {
          if (this.isSocialMediaUrl(image.url)) {
            profiles.push({
              platform: this.detectPlatform(image.url),
              title: 'Visual Match',
              profileUrl: image.url,
              imageUrl: image.url
            });
          }
        });
      }

      console.log('[Google Vision] Found', profiles.length, 'social media profiles');
      return profiles;
    } catch (error) {
      console.error('[Google Vision] Reverse search error:', error.message);
      return [];
    }
  }

  isSocialMediaUrl(url) {
    return url && (
      url.includes('instagram.com') ||
      url.includes('facebook.com') ||
      url.includes('twitter.com') ||
      url.includes('x.com') ||
      url.includes('linkedin.com') ||
      url.includes('youtube.com')
    );
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

module.exports = new GoogleVisionService();
