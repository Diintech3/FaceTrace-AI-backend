const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');

class AzureFaceService {
  constructor() {
    this.apiKey = (process.env.AZURE_FACE_API_KEY || '').trim();
    this.endpoint = (process.env.AZURE_FACE_ENDPOINT || '').trim().replace(/\/$/, '') + '/';
  }

  async detectFace(imagePath) {
    if (!this.apiKey || !this.endpoint || this.endpoint === '/') {
      console.log('[Azure Face] API credentials not configured (AZURE_FACE_API_KEY, AZURE_FACE_ENDPOINT)');
      return { success: false, message: 'Azure Face API not configured. Add AZURE_FACE_API_KEY and AZURE_FACE_ENDPOINT to .env and restart.' };
    }

    try {
      console.log('[Azure Face] Detecting face in image:', imagePath);
      
      const imageBuffer = fs.readFileSync(imagePath);
      // Basic detection only (no identification/verification - requires approval)
      const url = `${this.endpoint}face/v1.0/detect?returnFaceId=false&returnFaceLandmarks=false&detectionModel=detection_03`;

      const response = await axios.post(url, imageBuffer, {
        headers: {
          'Ocp-Apim-Subscription-Key': this.apiKey,
          'Content-Type': 'application/octet-stream'
        },
        timeout: 30000
      });

      if (response.data && response.data.length > 0) {
        console.log('[Azure Face] ✅ Face detected successfully');
        console.log('[Azure Face] Face count:', response.data.length);
        console.log('[Azure Face] Face rectangles:', response.data.map(f => f.faceRectangle));
        
        return {
          success: true,
          faceCount: response.data.length,
          faces: response.data.map(face => ({
            faceRectangle: face.faceRectangle,
            width: face.faceRectangle.width,
            height: face.faceRectangle.height,
            top: face.faceRectangle.top,
            left: face.faceRectangle.left
          })),
          detectionModel: 'detection_03',
          message: `Detected ${response.data.length} face(s) using Azure Face API`,
          note: 'Face identification/verification requires Azure approval. Apply at https://aka.ms/facerecognition'
        };
      } else {
        console.log('[Azure Face] ❌ No face detected');
        return { success: false, message: 'No face detected in image' };
      }
    } catch (error) {
      console.error('[Azure Face] Error:', error.response?.data || error.message);
      return { 
        success: false, 
        message: error.response?.data?.error?.message || error.message 
      };
    }
  }

  async identifyPerson(faceId, personGroupId = 'default') {
    if (!this.apiKey || !this.endpoint) {
      return { success: false, message: 'Azure Face API not configured' };
    }

    try {
      console.log('[Azure Face] Identifying person with faceId:', faceId);
      
      const url = `${this.endpoint}face/v1.0/identify`;
      
      const response = await axios.post(url, {
        faceIds: [faceId],
        personGroupId: personGroupId,
        maxNumOfCandidatesReturned: 5,
        confidenceThreshold: 0.5
      }, {
        headers: {
          'Ocp-Apim-Subscription-Key': this.apiKey,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });

      if (response.data && response.data.length > 0) {
        console.log('[Azure Face] ✅ Person identified');
        return {
          success: true,
          candidates: response.data[0].candidates
        };
      } else {
        return { success: false, message: 'No matching person found' };
      }
    } catch (error) {
      console.error('[Azure Face] Identify error:', error.response?.data || error.message);
      return { 
        success: false, 
        message: error.response?.data?.error?.message || error.message 
      };
    }
  }

  async findSimilarFaces(faceId, faceIds) {
    if (!this.apiKey || !this.endpoint) {
      return { success: false, message: 'Azure Face API not configured' };
    }

    try {
      console.log('[Azure Face] Finding similar faces for faceId:', faceId);
      
      const url = `${this.endpoint}face/v1.0/findsimilars`;
      
      const response = await axios.post(url, {
        faceId: faceId,
        faceIds: faceIds,
        maxNumOfCandidatesReturned: 10,
        mode: 'matchFace'
      }, {
        headers: {
          'Ocp-Apim-Subscription-Key': this.apiKey,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });

      if (response.data && response.data.length > 0) {
        console.log('[Azure Face] ✅ Found', response.data.length, 'similar faces');
        return {
          success: true,
          similarFaces: response.data
        };
      } else {
        return { success: false, message: 'No similar faces found' };
      }
    } catch (error) {
      console.error('[Azure Face] FindSimilar error:', error.response?.data || error.message);
      return { 
        success: false, 
        message: error.response?.data?.error?.message || error.message 
      };
    }
  }

  async verifyFaces(faceId1, faceId2) {
    if (!this.apiKey || !this.endpoint) {
      return { success: false, message: 'Azure Face API not configured' };
    }

    try {
      console.log('[Azure Face] Verifying faces:', faceId1, 'vs', faceId2);
      
      const url = `${this.endpoint}face/v1.0/verify`;
      
      const response = await axios.post(url, {
        faceId1: faceId1,
        faceId2: faceId2
      }, {
        headers: {
          'Ocp-Apim-Subscription-Key': this.apiKey,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });

      console.log('[Azure Face] ✅ Verification complete');
      return {
        success: true,
        isIdentical: response.data.isIdentical,
        confidence: response.data.confidence
      };
    } catch (error) {
      console.error('[Azure Face] Verify error:', error.response?.data || error.message);
      return { 
        success: false, 
        message: error.response?.data?.error?.message || error.message 
      };
    }
  }

  async matchWithProfiles(imagePath, profiles) {
    try {
      console.log('[Azure Face] Starting face matching with', profiles.length, 'profiles');
      
      // Detect face in uploaded image
      const uploadedFaceResult = await this.detectFace(imagePath);
      
      if (!uploadedFaceResult.success || !uploadedFaceResult.faceId) {
        console.log('[Azure Face] ❌ No face detected in uploaded image');
        return { success: false, message: 'No face detected in uploaded image' };
      }

      const uploadedFaceId = uploadedFaceResult.faceId;
      console.log('[Azure Face] Uploaded face ID:', uploadedFaceId);
      console.log('[Azure Face] Face attributes:', uploadedFaceResult.attributes);

      const matchedProfiles = [];
      const faceAttributes = uploadedFaceResult.attributes;

      // For each profile with profile picture, detect face and compare
      for (const profile of profiles) {
        if (!profile.profilePic || profile.profilePic.includes('data:image/svg')) {
          continue;
        }

        try {
          // Download profile picture
          const picResponse = await axios.get(profile.profilePic, {
            responseType: 'arraybuffer',
            timeout: 10000,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
          });

          // Detect face in profile picture
          const url = `${this.endpoint}face/v1.0/detect?returnFaceId=true`;
          const profileFaceResult = await axios.post(url, picResponse.data, {
            headers: {
              'Ocp-Apim-Subscription-Key': this.apiKey,
              'Content-Type': 'application/octet-stream'
            },
            timeout: 30000
          });

          if (profileFaceResult.data && profileFaceResult.data.length > 0) {
            const profileFaceId = profileFaceResult.data[0].faceId;
            
            // Verify if faces match
            const verifyResult = await this.verifyFaces(uploadedFaceId, profileFaceId);
            
            if (verifyResult.success) {
              profile.faceMatch = {
                isMatch: verifyResult.isIdentical,
                confidence: verifyResult.confidence,
                matchPercentage: (verifyResult.confidence * 100).toFixed(2) + '%'
              };
              
              if (verifyResult.isIdentical || verifyResult.confidence > 0.6) {
                console.log('[Azure Face] ✅ Match found:', profile.platform, '- Confidence:', verifyResult.confidence);
                matchedProfiles.push(profile);
              }
            }
          }
        } catch (err) {
          console.log('[Azure Face] Error processing', profile.platform, ':', err.message);
        }
      }

      console.log('[Azure Face] Total matches found:', matchedProfiles.length);

      return {
        success: true,
        totalMatches: matchedProfiles.length,
        matches: matchedProfiles.length > 0 ? matchedProfiles : profiles,
        uploadedFaceAttributes: faceAttributes,
        message: matchedProfiles.length > 0 
          ? `Found ${matchedProfiles.length} matching profiles` 
          : 'No face matches found, showing all profiles'
      };
    } catch (error) {
      console.error('[Azure Face] Matching error:', error.message);
      return {
        success: false,
        message: error.message,
        matches: profiles
      };
    }
  }
}

module.exports = new AzureFaceService();
