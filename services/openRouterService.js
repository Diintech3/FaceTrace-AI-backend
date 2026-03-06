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

      const promptText = `You are an OCR and metadata extraction assistant. Your job is to REPORT ALL VISIBLE TEXT and labels in the image - exactly as written.

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

Be factual. Report what is visibly written. Do not invent.`;

      const payload = {
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: promptText },
              {
                type: 'image_url',
                image_url: { url: `data:${mimeType};base64,${base64Image}` }
              }
            ]
          }
        ]
      };

      const headers = {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'FaceTrace AI'
      };

      const preferred = (process.env.OPENROUTER_VISION_MODEL || '').trim();
      const modelCandidates = [
        preferred,
        // Fallbacks (OpenRouter availability varies by account/region)
        'anthropic/claude-3-haiku',
        'openai/gpt-4o-mini'
      ].filter(Boolean);

      let lastErr = null;
      for (const model of modelCandidates) {
        try {
          console.log('[OpenRouter] Using model:', model);
          const response = await axios.post(
            this.apiUrl,
            { model, ...payload },
            { headers, timeout: 60000 }
          );

          const analysis = response.data.choices?.[0]?.message?.content;
          if (!analysis) {
            throw new Error('OpenRouter returned empty analysis');
          }

          console.log('[OpenRouter] Analysis completed');
          console.log('[OpenRouter] Analysis length:', analysis.length);
          return {
            success: true,
            analysis,
            model
          };
        } catch (err) {
          lastErr = err;
          const status = err.response?.status;
          const msg = err.response?.data?.error?.message || err.message;
          console.error('[OpenRouter] Model failed:', model, '-', status || '', msg);

          // If model doesn't exist, try next candidate
          if (status === 404) continue;
          // For other errors (401/403/429), don't loop forever
          continue;
        }
      }

      throw lastErr || new Error('All OpenRouter vision models failed');
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
