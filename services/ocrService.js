const Tesseract = require('tesseract.js');

class OCRService {
  async extractText(imagePath) {
    try {
      console.log('[OCR] Extracting text from image:', imagePath);
      
      // Try multiple configurations for better accuracy
      const configs = [
        { lang: 'eng', psm: 3 },  // Fully automatic page segmentation
        { lang: 'eng', psm: 6 },  // Assume a single uniform block of text
        { lang: 'eng', psm: 11 }, // Sparse text
      ];

      let bestResult = { text: '', confidence: 0 };

      for (const config of configs) {
        try {
          const { data } = await Tesseract.recognize(
            imagePath,
            config.lang,
            {
              logger: m => {},
              tessedit_pageseg_mode: config.psm,
              tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@._-',
            }
          );

          if (data.text.trim().length > bestResult.text.length) {
            bestResult = { text: data.text.trim(), confidence: data.confidence };
          }
        } catch (e) {
          console.log(`[OCR] Config ${config.psm} failed:`, e.message);
        }
      }

      const cleanText = bestResult.text;
      console.log('[OCR] Extracted text length:', cleanText.length);
      console.log('[OCR] Confidence:', bestResult.confidence);
      
      if (cleanText.length > 0) {
        console.log('[OCR] Text found:', cleanText.substring(0, 200));
      }

      return {
        success: true,
        text: cleanText,
        hasText: cleanText.length > 0,
        confidence: bestResult.confidence
      };
    } catch (error) {
      console.error('[OCR] Error:', error.message);
      return {
        success: false,
        text: '',
        hasText: false,
        confidence: 0
      };
    }
  }

  extractNames(text) {
    // Extract potential names from text
    const names = [];
    
    // Look for capitalized words (potential names)
    const words = text.split(/\s+/);
    const capitalizedWords = words.filter(word => 
      word.length > 2 && 
      word[0] === word[0].toUpperCase() &&
      /^[A-Z][a-z]+$/.test(word)
    );

    // Group consecutive capitalized words as names
    for (let i = 0; i < capitalizedWords.length; i++) {
      if (i < capitalizedWords.length - 1) {
        names.push(`${capitalizedWords[i]} ${capitalizedWords[i + 1]}`);
      }
    }

    return names;
  }

  extractUsernames(text) {
    // Extract @usernames
    const usernameMatches = text.match(/@([a-zA-Z0-9_]{3,30})/g);
    return usernameMatches ? usernameMatches.map(u => u.replace('@', '')) : [];
  }
}

module.exports = new OCRService();
