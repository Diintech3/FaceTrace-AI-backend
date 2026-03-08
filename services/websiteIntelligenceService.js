const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');

class WebsiteIntelligenceService {
  constructor() {
    this.apiKey = process.env.OPENROUTER_API_KEY;
    this.apiUrl = 'https://openrouter.ai/api/v1/chat/completions';
  }
  async analyzeWebsite(url) {
    let browser = null;
    
    try {
      console.log('[Website Intel] 🚀 Starting DEEP analysis for:', url);
      
      // Launch browser
      browser = await puppeteer.launch({
        headless: false,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--start-maximized',
          '--disable-blink-features=AutomationControlled'
        ],
        defaultViewport: null,
        ignoreDefaultArgs: ['--enable-automation']
      });
      
      const page = await browser.newPage();
      
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      
      await page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => false });
      });
      
      console.log('[Website Intel] 🌐 Opening website:', url);
      
      await page.goto(url, { 
        waitUntil: ['load', 'networkidle2'],
        timeout: 60000 
      });
      
      console.log('[Website Intel] ✅ Website loaded!');
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Extract comprehensive page info
      const pageInfo = await page.evaluate(() => {
        const getAllText = () => {
          const clone = document.body.cloneNode(true);
          const scripts = clone.querySelectorAll('script, style, noscript');
          scripts.forEach(s => s.remove());
          return clone.innerText || clone.textContent || '';
        };
        
        return {
          title: document.title,
          url: window.location.href,
          description: document.querySelector('meta[name="description"]')?.content || '',
          keywords: document.querySelector('meta[name="keywords"]')?.content || '',
          ogTitle: document.querySelector('meta[property="og:title"]')?.content || '',
          ogDescription: document.querySelector('meta[property="og:description"]')?.content || '',
          ogImage: document.querySelector('meta[property="og:image"]')?.content || '',
          links: Array.from(document.querySelectorAll('a')).length,
          images: Array.from(document.querySelectorAll('img')).length,
          forms: Array.from(document.querySelectorAll('form')).length,
          scripts: Array.from(document.querySelectorAll('script')).length,
          headings: {
            h1: Array.from(document.querySelectorAll('h1')).map(h => h.textContent.trim()).filter(t => t),
            h2: Array.from(document.querySelectorAll('h2')).map(h => h.textContent.trim()).filter(t => t),
            h3: Array.from(document.querySelectorAll('h3')).map(h => h.textContent.trim()).filter(t => t)
          },
          buttons: Array.from(document.querySelectorAll('button, input[type="button"], input[type="submit"]'))
            .map(b => b.textContent?.trim() || b.value).filter(t => t).slice(0, 20),
          fullText: getAllText().substring(0, 10000)
        };
      });
      
      console.log('[Website Intel] 📄 Page:', pageInfo.title);
      console.log('[Website Intel] 📊 Elements: Links:', pageInfo.links, '| Images:', pageInfo.images, '| Forms:', pageInfo.forms);
      
      // Discover all internal pages
      console.log('[Website Intel] 🔍 Discovering internal pages...');
      const internalPages = await this.discoverPages(page, url);
      
      // Auto-scroll and take screenshots
      console.log('[Website Intel] 📸 Capturing screenshots with content analysis...');
      const screenshots = await this.autoScrollAndCapture(page, url);
      
      // Extract detailed links with categories
      const links = await page.evaluate(() => {
        const allLinks = Array.from(document.querySelectorAll('a'));
        const categorized = {
          navigation: [],
          external: [],
          internal: [],
          social: []
        };
        
        allLinks.forEach(a => {
          const href = a.href?.toLowerCase() || '';
          const text = a.textContent?.trim() || '';
          if (!href || !text) return;
          
          const linkData = { text, href: a.href };
          
          if (href.includes('facebook.com') || href.includes('twitter.com') || 
              href.includes('instagram.com') || href.includes('linkedin.com')) {
            categorized.social.push(linkData);
          } else if (href.startsWith(window.location.origin)) {
            if (a.closest('nav, header, .menu, .navigation')) {
              categorized.navigation.push(linkData);
            } else {
              categorized.internal.push(linkData);
            }
          } else if (href.startsWith('http')) {
            categorized.external.push(linkData);
          }
        });
        
        return {
          navigation: categorized.navigation.slice(0, 20),
          internal: categorized.internal.slice(0, 30),
          external: categorized.external.slice(0, 20),
          social: categorized.social
        };
      }).catch(() => ({ navigation: [], internal: [], external: [], social: [] }));
      
      // Extract comprehensive contact info
      const contactInfo = await this.extractContactInfo(page, pageInfo.fullText).catch(() => ({
        emails: [],
        phones: [],
        addresses: [],
        whatsapp: [],
        telegram: []
      }));
      
      // Extract social media links
      const socialMedia = await this.extractSocialMedia(page).catch(() => ({
        facebook: null,
        twitter: null,
        instagram: null,
        linkedin: null,
        youtube: null,
        github: null
      }));
      
      // Extract technologies
      const technologies = await this.detectTechnologies(page).catch(() => []);
      
      // Visit discovered pages and capture screenshots
      console.log('[Website Intel] 🌐 Visiting discovered pages...');
      const pageScreenshots = await this.visitPages(browser, internalPages.slice(0, 5));
      
      // Merge all screenshots
      const allScreenshots = [...screenshots, ...pageScreenshots];
      
      // AI Analysis with complete data
      console.log('[Website Intel] 🤖 Running comprehensive AI analysis...');
      const aiAnalysis = await this.analyzeWithAI(pageInfo, links, contactInfo, socialMedia, technologies, allScreenshots);
      
      await browser.close();
      
      console.log('[Website Intel] Analysis complete');
      
      return {
        success: true,
        url: url,
        pageInfo,
        screenshots: allScreenshots,
        internalPages,
        links,
        contactInfo,
        socialMedia,
        technologies,
        aiAnalysis,
        totalScreenshots: allScreenshots.length,
        analyzedAt: new Date()
      };
      
    } catch (error) {
      if (browser) await browser.close();
      console.error('[Website Intel] Error:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  async autoScrollAndCapture(page, websiteUrl) {
    const screenshots = [];
    const screenshotsDir = path.join(__dirname, '../uploads/screenshots');
    
    await fs.mkdir(screenshotsDir, { recursive: true });
    
    // Auto-scroll to load all lazy content
    console.log('[Website Intel] 📜 Auto-scrolling to load lazy content...');
    
    const scrollResult = await page.evaluate(async () => {
      return new Promise((resolve) => {
        let totalHeight = 0;
        let scrollCount = 0;
        const distance = 150;
        const maxScrolls = 100;
        
        const timer = setInterval(() => {
          const scrollHeight = document.body.scrollHeight;
          window.scrollBy(0, distance);
          totalHeight += distance;
          scrollCount++;

          if(totalHeight >= scrollHeight || scrollCount >= maxScrolls){
            clearInterval(timer);
            resolve({ scrollCount, finalHeight: scrollHeight });
          }
        }, 80);
      });
    });
    
    console.log(`[Website Intel] ✅ Scrolled ${scrollResult.scrollCount} times, height: ${scrollResult.finalHeight}px`);
    
    await page.evaluate(() => window.scrollTo(0, 0));
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const pageHeight = await page.evaluate(() => document.body.scrollHeight).catch(() => 5000);
    const viewportHeight = 1080;
    const scrollSteps = 20; // Increased from 10 to 20
    
    console.log('[Website Intel] 📸 Capturing', scrollSteps, 'detailed screenshots...');
    
    for (let i = 0; i < scrollSteps; i++) {
      const percentage = i / (scrollSteps - 1);
      const scrollPosition = Math.floor(percentage * Math.max(0, pageHeight - viewportHeight));
      
      await page.evaluate((pos) => {
        window.scrollTo({ top: pos, behavior: 'smooth' });
      }, scrollPosition);
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Extract visible content at this scroll position
      const visibleContent = await page.evaluate(() => {
        const getVisibleText = () => {
          const elements = document.querySelectorAll('h1, h2, h3, p, button, a');
          const visible = [];
          elements.forEach(el => {
            const rect = el.getBoundingClientRect();
            if (rect.top >= 0 && rect.top <= window.innerHeight) {
              const text = el.textContent?.trim();
              if (text && text.length > 3) visible.push(text);
            }
          });
          return visible.slice(0, 10);
        };
        
        return {
          visibleText: getVisibleText(),
          scrollY: window.scrollY,
          viewportHeight: window.innerHeight
        };
      }).catch(() => ({ visibleText: [], scrollY: 0, viewportHeight: 0 }));
      
      const filename = `screenshot_${Date.now()}_${i}.png`;
      const filepath = path.join(screenshotsDir, filename);
      
      try {
        await page.screenshot({ path: filepath, fullPage: false });
        
        screenshots.push({
          filename,
          path: filepath,
          url: `/screenshots/${filename}`,
          position: i + 1,
          percentage: Math.round(percentage * 100),
          scrollPosition,
          visibleContent: visibleContent.visibleText,
          description: `Screenshot at ${Math.round(percentage * 100)}% - Content: ${visibleContent.visibleText.slice(0, 3).join(', ')}`
        });
        
        console.log(`[Website Intel] ✅ ${i + 1}/${scrollSteps} (${Math.round(percentage * 100)}%) - Content: ${visibleContent.visibleText.slice(0, 2).join(', ')}`);
      } catch (screenshotError) {
        console.log(`[Website Intel] ⚠️ Screenshot ${i + 1} failed:`, screenshotError.message);
      }
    }
    
    // Capture full page screenshot
    console.log('[Website Intel] 📸 Capturing full page screenshot...');
    await page.evaluate(() => window.scrollTo(0, 0));
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    try {
      const fullFilename = `full_${Date.now()}.png`;
      const fullFilepath = path.join(screenshotsDir, fullFilename);
      await page.screenshot({ path: fullFilepath, fullPage: true });
      
      screenshots.push({
        filename: fullFilename,
        path: fullFilepath,
        url: `/screenshots/${fullFilename}`,
        position: 'full',
        description: 'Complete full page screenshot'
      });
      
      console.log('[Website Intel] ✅ Full page captured!');
    } catch (fullScreenshotError) {
      console.log('[Website Intel] ⚠️ Full page screenshot failed:', fullScreenshotError.message);
    }
    
    console.log('[Website Intel] 🎉 Total screenshots:', screenshots.length);
    return screenshots;
  }
  
  async discoverPages(page, baseUrl) {
    console.log('[Website Intel] 🔍 Discovering internal pages...');
    
    const pages = await page.evaluate((base) => {
      const baseHost = new URL(base).hostname;
      const links = Array.from(document.querySelectorAll('a[href]'));
      const discovered = new Set();
      
      links.forEach(a => {
        try {
          const href = a.href;
          const url = new URL(href);
          
          if (url.hostname === baseHost && 
              !href.includes('#') && 
              !href.includes('javascript:') &&
              !href.match(/\.(pdf|jpg|png|gif|zip|doc)$/i)) {
            discovered.add(href);
          }
        } catch (e) {}
      });
      
      return Array.from(discovered).slice(0, 10);
    }, baseUrl).catch(() => []);
    
    console.log(`[Website Intel] 🔍 Found ${pages.length} internal pages`);
    return pages;
  }
  
  async visitPages(browser, pages) {
    const screenshots = [];
    const screenshotsDir = path.join(__dirname, '../uploads/screenshots');
    
    for (let i = 0; i < pages.length; i++) {
      try {
        console.log(`[Website Intel] 🌐 Visiting page ${i + 1}/${pages.length}: ${pages[i]}`);
        
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
        
        await page.goto(pages[i], { 
          waitUntil: 'networkidle2', 
          timeout: 30000 
        }).catch(() => {});
        
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const pageTitle = await page.title().catch(() => 'Untitled');
        const filename = `page_${i}_${Date.now()}.png`;
        const filepath = path.join(screenshotsDir, filename);
        
        await page.screenshot({ path: filepath, fullPage: false });
        
        screenshots.push({
          filename,
          path: filepath,
          url: `/screenshots/${filename}`,
          pageUrl: pages[i],
          pageTitle,
          position: `page_${i + 1}`,
          description: `Page: ${pageTitle}`
        });
        
        console.log(`[Website Intel] ✅ Captured: ${pageTitle}`);
        
        await page.close();
      } catch (error) {
        console.log(`[Website Intel] ⚠️ Failed to visit page ${i + 1}:`, error.message);
      }
    }
    
    return screenshots;
  }
  
  async extractContactInfo(page, fullText) {
    return await page.evaluate((text) => {
      const bodyText = text || document.body.innerText || document.body.textContent || '';
      
      // Enhanced regex patterns
      const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
      const phoneRegex = /(\+?\d{1,4}[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/g;
      const whatsappRegex = /(?:whatsapp|wa\.me)[:\/\s]+([\d\s+-]+)/gi;
      
      const emails = bodyText.match(emailRegex) || [];
      const phones = bodyText.match(phoneRegex) || [];
      const whatsapp = [];
      
      let match;
      while ((match = whatsappRegex.exec(bodyText)) !== null) {
        whatsapp.push(match[1]);
      }
      
      return {
        emails: [...new Set(emails)].slice(0, 15),
        phones: [...new Set(phones)].slice(0, 15),
        whatsapp: [...new Set(whatsapp)].slice(0, 10),
        addresses: []
      };
    }, fullText);
  }
  
  async extractSocialMedia(page) {
    return await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a'));
      const social = {
        facebook: null,
        twitter: null,
        instagram: null,
        linkedin: null,
        youtube: null,
        github: null
      };
      
      links.forEach(link => {
        const href = link.href.toLowerCase();
        if (href.includes('facebook.com/') && !social.facebook) {
          social.facebook = link.href;
        }
        if ((href.includes('twitter.com/') || href.includes('x.com/')) && !social.twitter) {
          social.twitter = link.href;
        }
        if (href.includes('instagram.com/') && !social.instagram) {
          social.instagram = link.href;
        }
        if (href.includes('linkedin.com/') && !social.linkedin) {
          social.linkedin = link.href;
        }
        if (href.includes('youtube.com/') && !social.youtube) {
          social.youtube = link.href;
        }
        if (href.includes('github.com/') && !social.github) {
          social.github = link.href;
        }
      });
      
      return social;
    });
  }
  
  async detectTechnologies(page) {
    return await page.evaluate(() => {
      const technologies = [];
      
      // Check JavaScript frameworks
      if (window.React || document.querySelector('[data-reactroot], [data-reactid]')) technologies.push('React');
      if (window.Vue || document.querySelector('[data-v-]')) technologies.push('Vue.js');
      if (window.angular || document.querySelector('[ng-app], [data-ng-app]')) technologies.push('Angular');
      if (window.jQuery || window.$) technologies.push('jQuery');
      if (window.Shopify) technologies.push('Shopify');
      if (window.Webflow) technologies.push('Webflow');
      
      // Check meta tags
      const generator = document.querySelector('meta[name="generator"]')?.content;
      if (generator) technologies.push(generator);
      
      // Check for WordPress
      if (document.body.className.includes('wordpress') || 
          document.querySelector('link[href*="wp-content"]') ||
          document.querySelector('script[src*="wp-includes"]')) {
        technologies.push('WordPress');
      }
      
      // Check for common libraries in scripts
      const scripts = Array.from(document.querySelectorAll('script[src]'));
      scripts.forEach(script => {
        const src = script.src.toLowerCase();
        if (src.includes('bootstrap')) technologies.push('Bootstrap');
        if (src.includes('tailwind')) technologies.push('Tailwind CSS');
        if (src.includes('gsap')) technologies.push('GSAP');
        if (src.includes('swiper')) technologies.push('Swiper');
      });
      
      // Check CSS frameworks
      const links = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));
      links.forEach(link => {
        const href = link.href.toLowerCase();
        if (href.includes('bootstrap')) technologies.push('Bootstrap');
        if (href.includes('tailwind')) technologies.push('Tailwind CSS');
        if (href.includes('fontawesome')) technologies.push('Font Awesome');
      });
      
      return [...new Set(technologies)];
    });
  }
  
  async analyzeWithAI(pageInfo, links, contactInfo, socialMedia, technologies, screenshots) {
    try {
      const screenshotDescriptions = screenshots
        .filter(s => s.description)
        .map(s => `- ${s.description}`)
        .join('\n');
      
      const prompt = `Analyze this website comprehensively:

**Website Information:**
- Title: ${pageInfo.title}
- URL: ${pageInfo.url}
- Description: ${pageInfo.description}
- Total Links: ${pageInfo.links}
- Total Images: ${pageInfo.images}
- Forms: ${pageInfo.forms}

**Main Headings:**
${pageInfo.headings.h1.slice(0, 5).join(', ')}

**Key Buttons/CTAs:**
${pageInfo.buttons.slice(0, 10).join(', ')}

**Contact Information:**
- Emails: ${contactInfo.emails.join(', ')}
- Phones: ${contactInfo.phones.join(', ')}
- WhatsApp: ${contactInfo.whatsapp.join(', ')}

**Social Media:**
${Object.entries(socialMedia).filter(([k,v]) => v).map(([k,v]) => `- ${k}: ${v}`).join('\n')}

**Technologies:**
${technologies.join(', ')}

**Screenshots Captured (${screenshots.length} total):**
${screenshotDescriptions}

**Content Preview:**
${pageInfo.fullText.substring(0, 3000)}

Provide detailed analysis in JSON format:
{
  "purpose": "What this website does",
  "businessType": "Type of business",
  "targetAudience": "Who is this for",
  "keyFeatures": ["feature1", "feature2"],
  "trustSignals": ["signal1", "signal2"],
  "assessment": "Overall assessment",
  "dataQuality": "Quality of extracted data",
  "recommendations": ["rec1", "rec2"]
}`;

      const payload = {
        model: 'anthropic/claude-3-haiku',
        messages: [{ role: 'user', content: prompt }]
      };

      const headers = {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'FaceTrace AI'
      };

      const response = await axios.post(this.apiUrl, payload, { headers, timeout: 40000 });
      const analysis = response.data.choices?.[0]?.message?.content;
      
      return {
        success: true,
        analysis: analysis || 'No analysis available'
      };
    } catch (error) {
      console.error('[Website Intel] AI analysis error:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = new WebsiteIntelligenceService();
