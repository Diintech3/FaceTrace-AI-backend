const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

class AzureFaceRecognitionService {
  constructor() {
    this.subscriptionKey = process.env.OCP_APIM_SUBSCRIPTION_KEY || process.env['Ocp-Apim-Subscription-Key'];
    this.endpoint = 'https://api.cognitive.microsoft.com/face/v1.0';
    
    if (this.subscriptionKey) {
      console.log('[Azure Face Recognition] API Key configured:', this.subscriptionKey.substring(0, 10) + '...');
    } else {
      console.log('[Azure Face Recognition] ⚠️ API Key NOT configured');
    }
  }

  async detectFaceWithId(imagePath) {
    try {
      console.log('[Azure Face Recognition] Detecting face with ID...');
      
      if (!this.subscriptionKey) {
        console.log('[Azure Face Recognition] API key not configured');
        return { success: false, error: 'API key missing' };
      }

      const imageBuffer = fs.readFileSync(imagePath);
      
      const response = await axios.post(
        `${this.endpoint}/detect`,
        imageBuffer,
        {
          headers: {
            'Ocp-Apim-Subscription-Key': this.subscriptionKey,
            'Content-Type': 'application/octet-stream'
          },
          params: {
            returnFaceId: true,
            returnFaceLandmarks: false,
            returnFaceAttributes: 'age,gender,smile,facialHair,glasses,emotion,hair,makeup,accessories'
          },
          timeout: 30000
        }
      );

      if (response.data && response.data.length > 0) {
        console.log('[Azure Face Recognition] ✅ Face detected with ID');
        return {
          success: true,
          faceId: response.data[0].faceId,
          faceAttributes: response.data[0].faceAttributes,
          faceRectangle: response.data[0].faceRectangle
        };
      }

      return { success: false, error: 'No face detected' };
    } catch (error) {
      console.error('[Azure Face Recognition] Detection error:', error.response?.data || error.message);
      return { success: false, error: error.message };
    }
  }

  async findSimilarFaces(faceId, faceIds) {
    try {
      console.log('[Azure Face Recognition] Finding similar faces...');
      
      if (!this.subscriptionKey) {
        return { success: false, error: 'API key missing' };
      }

      const response = await axios.post(
        `${this.endpoint}/findsimilars`,
        {
          faceId: faceId,
          faceIds: faceIds,
          mode: 'matchFace'
        },
        {
          headers: {
            'Ocp-Apim-Subscription-Key': this.subscriptionKey,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );

      if (response.data && response.data.length > 0) {
        console.log('[Azure Face Recognition] ✅ Found', response.data.length, 'similar faces');
        return {
          success: true,
          matches: response.data.map(match => ({
            faceId: match.faceId,
            confidence: Math.round(match.confidence * 100) // Convert to percentage
          }))
        };
      }

      return { success: true, matches: [] };
    } catch (error) {
      console.error('[Azure Face Recognition] Find similar error:', error.response?.data || error.message);
      return { success: false, error: error.message };
    }
  }

  async verifyFaces(faceId1, faceId2) {
    try {
      console.log('[Azure Face Recognition] Verifying faces...');
      
      if (!this.subscriptionKey) {
        return { success: false, error: 'API key missing' };
      }

      const response = await axios.post(
        `${this.endpoint}/verify`,
        {
          faceId1: faceId1,
          faceId2: faceId2
        },
        {
          headers: {
            'Ocp-Apim-Subscription-Key': this.subscriptionKey,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );

      if (response.data) {
        console.log('[Azure Face Recognition] ✅ Verification complete');
        return {
          success: true,
          isIdentical: response.data.isIdentical,
          confidence: Math.round(response.data.confidence * 100)
        };
      }

      return { success: false, error: 'Verification failed' };
    } catch (error) {
      console.error('[Azure Face Recognition] Verify error:', error.response?.data || error.message);
      return { success: false, error: error.message };
    }
  }

  async searchSimilarFacesOnWeb(imagePath) {
    try {
      console.log('[Azure Face Recognition] ========== STARTING WEB FACE SEARCH ==========');
      
      // Step 1: Detect face in uploaded image
      const uploadedFace = await this.detectFaceWithId(imagePath);
      if (!uploadedFace.success) {
        console.log('[Azure Face Recognition] No face detected in uploaded image');
        return [];
      }

      console.log('[Azure Face Recognition] Uploaded face ID:', uploadedFace.faceId);
      
      // Step 2: Search for potential profiles using social media scraper
      const socialMediaFaceScraper = require('./socialMediaFaceScraper');
      
      // Generate description from face attributes
      let description = 'person';
      if (uploadedFace.faceAttributes) {
        const attrs = uploadedFace.faceAttributes;
        description = `${attrs.gender || 'person'} ${attrs.age || ''} years old`;
        if (attrs.hair && attrs.hair.hairColor && attrs.hair.hairColor.length > 0) {
          description += ` ${attrs.hair.hairColor[0].color} hair`;
        }
      }
      
      console.log('[Azure Face Recognition] Searching with description:', description);
      
      // Step 3: Get potential profiles
      const potentialProfiles = await socialMediaFaceScraper.searchPotentialUsernames(description);
      
      if (potentialProfiles.length === 0) {
        console.log('[Azure Face Recognition] No potential profiles found');
        return [];
      }

      console.log('[Azure Face Recognition] Found', potentialProfiles.length, 'potential profiles');
      
      // Step 4: Scrape profile pictures
      const profilePictures = await socialMediaFaceScraper.scrapeProfilePictures(potentialProfiles);
      
      if (profilePictures.length === 0) {
        console.log('[Azure Face Recognition] No profile pictures scraped');
        return [];
      }

      console.log('[Azure Face Recognition] Scraped', profilePictures.length, 'profile pictures');
      
      // Step 5: Compare faces using Azure Face API
      const matches = [];
      
      for (const profile of profilePictures) {
        try {
          // Download profile picture
          const response = await axios.get(profile.profilePicUrl, {
            responseType: 'arraybuffer',
            timeout: 10000
          });

          const tempPath = require('path').join(__dirname, '../uploads', `temp_${Date.now()}.jpg`);
          fs.writeFileSync(tempPath, response.data);

          // Detect face in profile picture
          const profileFace = await this.detectFaceWithId(tempPath);

          if (profileFace.success) {
            // Verify if faces match
            const verification = await this.verifyFaces(uploadedFace.faceId, profileFace.faceId);
            
            if (verification.success && verification.confidence > 50) {
              matches.push({
                platform: profile.platform,
                username: profile.username,
                profileUrl: profile.profileUrl,
                thumbnail: profile.profilePicUrl,
                url: profile.profileUrl,
                similarity: verification.confidence,
                isIdentical: verification.isIdentical,
                source: profile.platform,
                link: profile.profileUrl
              });
              
              console.log(`[Azure Face Recognition] ✅ Match found: ${profile.username} (${verification.confidence}%)`);
            }
          }

          // Cleanup
          fs.unlinkSync(tempPath);

          // Rate limiting
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
          console.error('[Azure Face Recognition] Comparison error:', error.message);
        }
      }

      // Sort by similarity
      matches.sort((a, b) => b.similarity - a.similarity);
      
      console.log('[Azure Face Recognition] ========== SEARCH COMPLETE ==========');
      console.log('[Azure Face Recognition] Total matches:', matches.length);
      
      return matches;
    } catch (error) {
      console.error('[Azure Face Recognition] Search error:', error.message);
      return [];
    }
  }
}

module.exports = new AzureFaceRecognitionService();
