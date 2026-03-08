const { Jimp } = require('jimp');
const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');

// Calculate image similarity using perceptual hash
async function calculateImageSimilarity(imagePath1, imagePath2) {
  try {
    const [img1, img2] = await Promise.all([
      Jimp.read(imagePath1),
      Jimp.read(imagePath2)
    ]);
    
    // Resize to same dimensions for comparison
    const size = 256;
    img1.resize({ w: size, h: size });
    img2.resize({ w: size, h: size });
    
    // Calculate perceptual hash distance
    const distance = Jimp.distance(img1, img2);
    const diff = Jimp.diff(img1, img2);
    
    // Convert to similarity percentage (0-100)
    const similarity = Math.round((1 - distance) * 100);
    
    return {
      similarity,
      distance,
      diffPercent: diff.percent * 100
    };
  } catch (error) {
    console.error('[Face Recognition] Error calculating similarity:', error.message);
    return { similarity: 0, distance: 1, diffPercent: 100 };
  }
}

// Extract face region from image using Azure Face API results
async function extractFaceRegion(imagePath, faceRectangle) {
  try {
    const image = await Jimp.read(imagePath);
    const { left, top, width, height } = faceRectangle;
    
    // Crop face region with some padding
    const padding = 20;
    const x = Math.max(0, left - padding);
    const y = Math.max(0, top - padding);
    const w = Math.min(image.bitmap.width - x, width + padding * 2);
    const h = Math.min(image.bitmap.height - y, height + padding * 2);
    
    const faceCrop = image.clone().crop({ x, y, w, h });
    
    // Save cropped face
    const faceImagePath = imagePath.replace(/\.(jpg|jpeg|png)$/i, '_face.$1');
    await faceCrop.write(faceImagePath);
    
    return faceImagePath;
  } catch (error) {
    console.error('[Face Recognition] Error extracting face:', error.message);
    return imagePath; // Return original if extraction fails
  }
}

// Search for similar faces in social media profiles
async function searchSimilarFaces(uploadedImagePath, potentialProfiles, faceRectangle = null) {
  try {
    console.log('[Face Recognition] Starting face search...');
    
    // Extract face region if rectangle provided
    let searchImagePath = uploadedImagePath;
    if (faceRectangle) {
      console.log('[Face Recognition] Extracting face region...');
      searchImagePath = await extractFaceRegion(uploadedImagePath, faceRectangle);
    }
    
    console.log(`[Face Recognition] Comparing with ${potentialProfiles.length} profiles...`);
    
    const matches = [];
    
    for (const profile of potentialProfiles) {
      if (!profile.profilePicture) continue;
      
      try {
        // Download profile picture
        const response = await axios.get(profile.profilePicture, {
          responseType: 'arraybuffer',
          timeout: 5000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });
        
        // Save temporarily
        const tempPath = path.join(__dirname, '../uploads', `temp_${Date.now()}.jpg`);
        await fs.writeFile(tempPath, response.data);
        
        // Compare images
        const result = await calculateImageSimilarity(searchImagePath, tempPath);
        
        // Clean up temp file
        await fs.unlink(tempPath).catch(() => {});
        
        if (result.similarity >= 50) { // 50% threshold for image similarity
          matches.push({
            ...profile,
            similarity: result.similarity,
            confidence: result.similarity >= 75 ? 'High' : result.similarity >= 60 ? 'Medium' : 'Low'
          });
          console.log(`[Face Recognition] Match found: ${profile.username} (${result.similarity}%)`);
        }
      } catch (error) {
        console.error(`[Face Recognition] Error processing ${profile.username}:`, error.message);
      }
    }
    
    // Clean up extracted face image
    if (searchImagePath !== uploadedImagePath) {
      await fs.unlink(searchImagePath).catch(() => {});
    }
    
    // Sort by similarity
    matches.sort((a, b) => b.similarity - a.similarity);
    
    console.log(`[Face Recognition] Found ${matches.length} matches`);
    return matches;
  } catch (error) {
    console.error('[Face Recognition] Search error:', error.message);
    return [];
  }
}

module.exports = {
  searchSimilarFaces
};
