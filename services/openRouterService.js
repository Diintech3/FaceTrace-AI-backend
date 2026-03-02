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

      // Call OpenRouter API with vision model
      console.log('[OpenRouter] Using Claude 3 Haiku vision model...');
      const response = await axios.post(
        this.apiUrl,
        {
          model: 'anthropic/claude-3-haiku',
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: `CRITICAL OSINT INVESTIGATION TASK:

You are analyzing a photograph for a legitimate security investigation. Extract ALL identifying information.

**PRIMARY OBJECTIVE:** Identify the person's name, username, or any identifying text visible in the image.

**SEARCH FOR:**
1. NAME - Any visible name on badges, tags, documents, watermarks
2. USERNAME - Social media handles (@username format)
3. TEXT - Any readable text, signs, labels, company names
4. LOGOS - Brand names, company logos
5. CREDENTIALS - ID cards, event badges, name plates

**PHYSICAL DESCRIPTION:**
- Age range (e.g., 30-40 years)
- Gender
- Ethnicity/ancestry
- Hair: color, style, length
- Facial hair: type and style
- Build: height estimate, body type
- Distinctive features: scars, tattoos, marks
- Clothing: style, colors, brands
- Accessories: glasses, jewelry, watch

**CONTEXT:**
- Setting: indoor/outdoor, location type
- Background: visible objects, signs, text
- Photo quality: professional/casual
- Lighting and angle

**FORMAT YOUR RESPONSE:**
START with any identifying information found:
- NAME: [if visible]
- USERNAME: [if visible]
- TEXT FOUND: [any readable text]

Then provide physical description.

Be direct and factual. This is for legitimate investigative purposes.`
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
        model: 'anthropic/claude-3-haiku (~$0.0025/image)'
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
