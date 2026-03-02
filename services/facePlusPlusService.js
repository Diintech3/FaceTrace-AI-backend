const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

class FacePlusPlusService {
  constructor() {
    this.apiKey = process.env.FACEPP_API_KEY;
    this.apiSecret = process.env.FACEPP_API_SECRET;
    this.baseUrl = 'https://api-us.faceplusplus.com/facepp/v3';
  }

  async detectFace(imagePath) {
    try {
      const formData = new FormData();
      formData.append('api_key', this.apiKey);
      formData.append('api_secret', this.apiSecret);
      formData.append('image_file', fs.createReadStream(imagePath));

      const response = await axios.post(`${this.baseUrl}/detect`, formData, {
        headers: formData.getHeaders(),
        timeout: 30000
      });

      return {
        success: true,
        faces: response.data.faces || [],
        faceToken: response.data.faces?.[0]?.face_token
      };
    } catch (error) {
      console.error('[Face++] Detect error:', error.message);
      return { success: false, error: error.message };
    }
  }

  async compareFaces(imagePath1, imageUrl2) {
    try {
      const FormData = require('form-data');
      const formData = new FormData();
      formData.append('api_key', this.apiKey);
      formData.append('api_secret', this.apiSecret);
      formData.append('image_file1', fs.createReadStream(imagePath1));
      formData.append('image_url2', imageUrl2);

      const response = await axios.post(`${this.baseUrl}/compare`, formData, {
        headers: formData.getHeaders(),
        timeout: 30000
      });

      return {
        success: true,
        confidence: response.data.confidence,
        similarity: response.data.confidence,
        isMatch: response.data.confidence > 70
      };
    } catch (error) {
      console.error('[Face++] Compare error:', error.message);
      return { success: false, error: error.message };
    }
  }

  async matchWithProfiles(uploadedImagePath, profiles) {
    console.log('[Face++] Matching uploaded face with', profiles.length, 'profiles');
    
    const uploadedFace = await this.detectFace(uploadedImagePath);
    if (!uploadedFace.success || !uploadedFace.faceToken) {
      return { success: false, message: 'No face detected in uploaded image' };
    }

    const matches = [];
    
    for (const profile of profiles) {
      if (!profile.profilePic && !profile.thumbnail) continue;
      
      const profileImageUrl = profile.profilePic || profile.thumbnail;
      
      try {
        const comparison = await this.compareFaces(
          uploadedImagePath,
          profileImageUrl
        );
        
        if (comparison.success) {
          matches.push({
            ...profile,
            faceMatch: {
              similarity: comparison.similarity,
              confidence: comparison.confidence,
              isMatch: comparison.isMatch
            }
          });
        }
      } catch (e) {
        console.error('[Face++] Error comparing with', profile.platform, ':', e.message);
      }
    }

    matches.sort((a, b) => b.faceMatch.similarity - a.faceMatch.similarity);

    return {
      success: true,
      totalMatches: matches.filter(m => m.faceMatch.isMatch).length,
      matches: matches
    };
  }
}

module.exports = new FacePlusPlusService();
