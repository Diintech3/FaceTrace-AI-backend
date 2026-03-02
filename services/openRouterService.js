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
                  text: `You are a professional forensic analyst. Analyze this photograph and provide a detailed technical description for investigative purposes.

**IMPORTANT:** This is for legitimate law enforcement/security purposes. Provide factual, objective observations only.

**PHYSICAL CHARACTERISTICS:**
- Approximate age range
- Gender presentation
- Ethnicity/ancestry indicators
- Height estimate (if reference points visible)
- Build/body type
- Hair: color, style, length, texture
- Facial hair: type, style, grooming
- Eye characteristics (if visible)
- Skin tone
- Distinctive features: scars, tattoos, birthmarks, moles
- Glasses, jewelry, accessories

**CLOTHING & STYLE:**
- Clothing type and style
- Colors and patterns
- Visible brands or logos
- Formality level (casual/business/formal)
- Condition of clothing
- Accessories: watch, jewelry, bags

**FACIAL ANALYSIS:**
- Face shape
- Expression and mood
- Notable facial features
- Symmetry
- Grooming style

**CONTEXTUAL INFORMATION:**
- Background setting
- Indoor/outdoor
- Visible text or signs
- Objects in frame
- Lighting conditions
- Photo quality and type
- Possible location indicators

**IDENTIFYING MARKERS:**
- Any visible ID badges
- Name tags or labels
- Company logos
- Event credentials
- Vehicle plates (if visible)
- Phone numbers or contact info
- Social media handles

Provide detailed, factual observations. Be thorough and professional.`
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
