const Tesseract = require('tesseract.js');

class OCRService {
  async extractText(imagePath) {
    try {
      console.log('[OCR] Extracting text from image:', imagePath);
      
      const { data: { text } } = await Tesseract.recognize(
        imagePath,
        'eng',
        {
          logger: m => {} // Silent
        }
      );

      const cleanText = text.trim();
      console.log('[OCR] Extracted text length:', cleanText.length);
      
      if (cleanText.length > 0) {
        console.log('[OCR] Text found:', cleanText.substring(0, 100));
      }

      return {
        success: true,
        text: cleanText,
        hasText: cleanText.length > 0
      };
    } catch (error) {
      console.error('[OCR] Error:', error.message);
      return {
        success: false,
        text: '',
        hasText: false
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
