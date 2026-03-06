const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

class FaceCheckService {
  constructor() {
    this.apiToken = process.env.Face_Search_API;
    this.site = 'https://facecheck.id';
    this.testingMode = false; // Set to true for free testing (inaccurate results)
  }

  async searchByFace(imagePath) {
    try {
      if (!this.apiToken) {
        console.log('[FaceCheck] API token not configured');
        return { error: 'FaceCheck API token not configured', results: [] };
      }

      if (this.testingMode) {
        console.log('[FaceCheck] ****** TESTING MODE - Results are inaccurate, credits NOT deducted ******');
      }

      console.log('[FaceCheck] Starting face search for:', imagePath);

      // Step 1: Upload image
      const form = new FormData();
      form.append('images', fs.createReadStream(imagePath));
      form.append('id_search', '');

      const uploadResponse = await axios.post(`${this.site}/api/upload_pic`, form, {
        headers: {
          ...form.getHeaders(),
          'accept': 'application/json',
          'Authorization': this.apiToken
        },
        timeout: 30000
      });

      if (uploadResponse.data.error) {
        console.error('[FaceCheck] Upload error:', uploadResponse.data.error);
        return { error: `${uploadResponse.data.error} (${uploadResponse.data.code})`, results: [] };
      }

      const id_search = uploadResponse.data.id_search;
      console.log('[FaceCheck] Image uploaded, id_search:', id_search);

      // Step 2: Poll for results
      const searchData = {
        id_search: id_search,
        with_progress: true,
        status_only: false,
        demo: this.testingMode
      };

      let attempts = 0;
      const maxAttempts = 60; // 60 seconds max

      while (attempts < maxAttempts) {
        const searchResponse = await axios.post(`${this.site}/api/search`, searchData, {
          headers: {
            'accept': 'application/json',
            'Authorization': this.apiToken
          },
          timeout: 30000
        });

        if (searchResponse.data.error) {
          console.error('[FaceCheck] Search error:', searchResponse.data.error);
          return { error: `${searchResponse.data.error} (${searchResponse.data.code})`, results: [] };
        }

        if (searchResponse.data.output && searchResponse.data.output.items) {
          console.log('[FaceCheck] ✅ Search complete! Found', searchResponse.data.output.items.length, 'results');
          
          // Format results
          const results = searchResponse.data.output.items.map(item => ({
            score: item.score, // 0-100 match score
            url: item.url, // Webpage URL where person was found
            thumbnail: item.base64 ? `data:image/jpeg;base64,${item.base64}` : null,
            title: item.title || 'No title',
            source: new URL(item.url).hostname
          }));

          return {
            success: true,
            totalResults: results.length,
            results: results,
            id_search: id_search
          };
        }

        console.log('[FaceCheck] Progress:', searchResponse.data.progress + '%', '-', searchResponse.data.message);
        await new Promise(resolve => setTimeout(resolve, 1000));
        attempts++;
      }

      return { error: 'Search timeout - no results after 60 seconds', results: [] };

    } catch (error) {
      console.error('[FaceCheck] Error:', error.message);
      return { error: error.message, results: [] };
    }
  }
}

module.exports = new FaceCheckService();
