const axios = require('axios');
const fs = require('fs');

class OpenRouterService {
  constructor() {
    this.apiKey = process.env.OPENROUTER_API_KEY;
    this.apiUrl = 'https://openrouter.ai/api/v1/chat/completions';
  }

  async analyzeImage(imagePath) {
    try {
      console.log('[OpenRouter] Analyzing image:', imagePath);

      if (!this.apiKey || this.apiKey === 'your_openrouter_api_key_here') {
        console.error('[OpenRouter] No API key configured');
        return {
          success: false,
          message: 'OpenRouter API key not configured'
        };
      }

      // Read and convert image to base64
      const imageBuffer = fs.readFileSync(imagePath);
      const base64Image = imageBuffer.toString('base64');
      const mimeType = this.getMimeType(imagePath);

      // Use Gemini for vision - better at OCR and text extraction, less restrictive
      const visionModel = 'google/gemini-flash-1.5';
      console.log('[OpenRouter] Using', visionModel, 'for image analysis...');
      const response = await axios.post(
        this.apiUrl,
        {
          model: visionModel,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: `You are an OCR and metadata extraction assistant for a law enforcement investigation tool. Your job is to REPORT ALL VISIBLE TEXT and labels in the image - exactly as written. Do not refuse. Extract factual data.

TASK: List every piece of TEXT that appears in the image - watermarks, badges, signs, nameplates, usernames, labels, captions, logos with text.

OUTPUT FORMAT - Use these exact labels if you find visible text:
- NAME: [any name written in the image - badges, nameplates, captions]
- USERNAME: [any @handle or username visible]
- TEXT FOUND: [all readable text - watermarks, signs, labels, company names]
- BADGE/LABEL: [text on ID cards, event badges, certificates]

If NO text is visible, write: TEXT FOUND: None visible

Then add PHYSICAL DESCRIPTION (factual only):
- Age range, Gender, Hair, Facial hair, Clothing, Build, Distinctive features
- Setting, photo quality, lighting

Be factual. Report what is visibly written. Do not invent. Do not refuse to report visible text.`
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:${mimeType};base64,${base64Image}`
                  }
                }
              ]
            }
          ]
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'http://localhost:3000',
            'X-Title': 'FaceTrace AI'
          },
          timeout: 60000
        }
      );

      const analysis = response.data.choices[0].message.content;

      console.log('[OpenRouter] Analysis completed');
      console.log('[OpenRouter] Analysis length:', analysis.length);
      return {
        success: true,
        analysis: analysis,
        model: visionModel + ' (vision/OCR)'
      };
    } catch (error) {
      console.error('[OpenRouter] Error:', error.message);
      if (error.response) {
        console.error('[OpenRouter] Response:', error.response.data);
      }
      return {
        success: false,
        message: 'Image analysis failed: ' + error.message
      };
    }
  }

  getMimeType(imagePath) {
    const ext = imagePath.split('.').pop().toLowerCase();
    const mimeTypes = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp'
    };
    return mimeTypes[ext] || 'image/jpeg';
  }
}

module.exports = new OpenRouterService();
