const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');
const whois = require('whois-json');
const dns = require('dns').promises;

class WebsiteIntelligenceService {
  constructor() {
    this.openRouterKey = process.env.OPENROUTER_API_KEY;
    this.groqKey = process.env.GROQ_API_KEY;
    this.apiUrl = this.groqKey 
      ? 'https://api.groq.com/openai/v1/chat/completions'
      : 'https://openrouter.ai/api/v1/chat/completions';
    this.browser = null;
  }
  
  async getBrowser() {
    // First try to connect to manually launched Chrome (port 9222)
    if (!this.browser || !this.browser.isConnected()) {
      try {
        console.log('[Browser] 🔍 Connecting to your Chrome (port 9222)...');
        this.browser = await puppeteer.connect({ 
          browserURL: 'http://localhost:9222',
          defaultViewport: null 
        });
        console.log('[Browser] ✅ Connected to YOUR Chrome browser!');
        console.log('[Browser] 📌 New tabs will open in YOUR current browser');
        return this.browser;
      } catch (e) {
        console.log('[Browser] ⚠️ Could not connect to Chrome on port 9222');
        console.log('[Browser] 💡 To use YOUR browser: Run START_CHROME.bat first');
      }
    }
    
    // Fallback: Check if we already have a browser
    if (this.browser && this.browser.isConnected()) {
      const pages = await this.browser.pages();
      console.log(`[Browser] ♻️ Reusing browser (${pages.length} tabs open)`);
      return this.browser;
    }
    
    // Last resort: Launch new browser
    console.log('[Browser] 🚀 Launching new browser...');
    this.browser = await puppeteer.launch({
      headless: false,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--start-maximized'],
      defaultViewport: null
    });
    
    console.log('[Browser] ✅ Browser ready! Will reuse for all websites.');
    return this.browser;
  }

  async analyzeWebsite(url) {
    let page = null;
    let shouldCloseBrowser = false;
    
    try {
      console.log('\n[Analysis] 🎯 Starting deep analysis:', url);
      
      const browser = await this.getBrowser();
      
      // Check if this is a new browser we launched
      if (!this.browser.isConnected() || (await browser.pages()).length === 1) {
        shouldCloseBrowser = true;
      }
      
      page = await browser.newPage();
      
      console.log('[Page] ➕ New tab created');
      
      // Set proper viewport for responsive design
      await page.setViewport({ width: 1366, height: 768 });
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      
      // Navigate
      console.log('[Page] 🌐 Loading website...');
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 }).catch(() => {});
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait longer for page to settle
      
      console.log('[Page] ✅ Website loaded');
      
      // Extract page info
      const pageInfo = await this.extractPageInfo(page);
      console.log(`[Data] 📊 Found: ${pageInfo.links} links, ${pageInfo.images} images`);
      
      // Discover internal pages
      const internalPages = await this.discoverPages(page, url);
      console.log(`[Data] 🔍 Discovered ${internalPages.length} internal pages`);
      
      // Auto-scroll and capture screenshots
      console.log('[Screenshots] 📸 Starting capture...');
      const screenshots = await this.captureScreenshots(page);
      console.log(`[Screenshots] ✅ Captured ${screenshots.length} screenshots`);
      
      // Extract data
      const links = await this.extractLinks(page);
      const contactInfo = await this.extractContactInfo(page, pageInfo.fullText);
      const socialMedia = await this.extractSocialMedia(page);
      const technologies = await this.detectTechnologies(page);
      
      console.log(`[Data] 📞 Contact: ${contactInfo.emails.length} emails, ${contactInfo.phones.length} phones`);
      
      // Get domain information
      console.log('[Domain] 🔍 Looking up domain info...');
      const domainInfo = await this.getDomainInfo(url);
      console.log(`[Domain] ✅ Domain: ${domainInfo.domain}`);
      
      // Get server information
      console.log('[Server] 🖥️ Detecting server info...');
      const serverInfo = await this.getServerInfo(page);
      console.log(`[Server] ✅ Server: ${serverInfo.server || 'Unknown'}`);
      
      // Visit internal pages
      const pageScreenshots = await this.visitInternalPages(browser, internalPages);
      const allScreenshots = [...screenshots, ...pageScreenshots];
      
      console.log(`[Screenshots] 🎉 Total: ${allScreenshots.length} screenshots`);
      
      // AI Analysis
      console.log('[AI] 🤖 Running comprehensive analysis...');
      const aiAnalysis = await this.analyzeWithAI(pageInfo, links, contactInfo, socialMedia, technologies, allScreenshots, domainInfo, serverInfo);
      
      console.log('[Analysis] ✅ Complete!\n');
      
      // Close browser after analysis
      if (shouldCloseBrowser && this.browser) {
        console.log('[Browser] 🔒 Closing browser...');
        await this.browser.close();
        this.browser = null;
        console.log('[Browser] ✅ Browser closed');
      }
      
      return {
        success: true,
        url,
        pageInfo,
        screenshots: allScreenshots,
        internalPages,
        links,
        contactInfo,
        socialMedia,
        technologies,
        domainInfo,
        serverInfo,
        aiAnalysis,
        totalScreenshots: allScreenshots.length,
        analyzedAt: new Date()
      };
      
    } catch (error) {
      console.error('[Analysis] ❌ Error:', error.message);
      if (page) await page.close().catch(() => {});
      
      // Close browser on error too
      if (shouldCloseBrowser && this.browser) {
        await this.browser.close().catch(() => {});
        this.browser = null;
      }
      
      return { success: false, error: error.message };
    }
  }
  
  async extractPageInfo(page) {
    return await page.evaluate(() => {
      const getAllText = () => {
        if (!document.body) return '';
        const clone = document.body.cloneNode(true);
        clone.querySelectorAll('script, style, noscript').forEach(s => s.remove());
        return (clone.innerText || clone.textContent || '').substring(0, 10000);
      };
      
      return {
        title: document.title || 'Untitled',
        url: window.location.href,
        description: document.querySelector('meta[name="description"]')?.content || '',
        keywords: document.querySelector('meta[name="keywords"]')?.content || '',
        links: document.querySelectorAll('a').length,
        images: document.querySelectorAll('img').length,
        forms: document.querySelectorAll('form').length,
        scripts: document.querySelectorAll('script').length,
        headings: {
          h1: Array.from(document.querySelectorAll('h1')).map(h => h.textContent.trim()).filter(t => t),
          h2: Array.from(document.querySelectorAll('h2')).map(h => h.textContent.trim()).filter(t => t),
          h3: Array.from(document.querySelectorAll('h3')).map(h => h.textContent.trim()).filter(t => t)
        },
        buttons: Array.from(document.querySelectorAll('button, input[type="button"], input[type="submit"]'))
          .map(b => b.textContent?.trim() || b.value).filter(t => t).slice(0, 20),
        fullText: getAllText()
      };
    }).catch(() => ({
      title: 'Error', url: '', description: '', keywords: '', links: 0, images: 0, 
      forms: 0, scripts: 0, headings: {h1:[], h2:[], h3:[]}, buttons: [], fullText: ''
    }));
  }
  
  async captureScreenshots(page) {
    const screenshots = [];
    const dir = path.join(__dirname, '../uploads/screenshots');
    await fs.mkdir(dir, { recursive: true });
    
    // Smooth auto-scroll with proper timing
    console.log('[Scroll] 📜 Auto-scrolling...');
    await page.evaluate(async () => {
      await new Promise((resolve) => {
        let count = 0;
        let lastHeight = document.body.scrollHeight;
        
        const interval = setInterval(() => {
          window.scrollBy({ top: 120, behavior: 'smooth' });
          count++;
          
          const currentHeight = document.body.scrollHeight;
          const scrollPos = window.scrollY + window.innerHeight;
          
          // Stop if reached bottom or max scrolls
          if (scrollPos >= currentHeight - 50 || count > 100) {
            // Check if new content loaded
            if (currentHeight === lastHeight || count > 100) {
              clearInterval(interval);
              resolve();
            } else {
              lastHeight = currentHeight;
            }
          }
        }, 100); // Slower for smoother scroll
      });
    });
    
    console.log('[Scroll] ✅ Complete');
    
    // Scroll to top and wait
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const pageHeight = await page.evaluate(() => document.body.scrollHeight);
    const viewportHeight = 768;
    const steps = 20; // Reduced for better performance
    
    console.log(`[Screenshots] 📸 Capturing ${steps} screenshots...`);
    
    for (let i = 0; i < steps; i++) {
      const percentage = i / (steps - 1);
      const scrollPos = Math.floor(percentage * Math.max(0, pageHeight - viewportHeight));
      
      // Scroll smoothly
      await page.evaluate((pos) => {
        window.scrollTo({ top: pos, behavior: 'smooth' });
      }, scrollPos);
      
      // Wait longer for content to settle
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const visibleContent = await page.evaluate(() => {
        const elements = document.querySelectorAll('h1, h2, h3, p, button, a');
        const visible = [];
        const seen = new Set();
        
        elements.forEach(el => {
          const rect = el.getBoundingClientRect();
          if (rect.top >= 0 && rect.top <= window.innerHeight && rect.height > 0) {
            const text = el.textContent?.trim();
            if (text && text.length > 5 && text.length < 150 && !seen.has(text)) {
              visible.push(text);
              seen.add(text);
            }
          }
        });
        return visible.slice(0, 10);
      }).catch(() => []);
      
      const filename = `screenshot_${Date.now()}_${i}.png`;
      const filepath = path.join(dir, filename);
      
      try {
        await page.screenshot({ path: filepath });
        screenshots.push({
          filename,
          path: filepath,
          url: `/screenshots/${filename}`,
          position: i + 1,
          percentage: Math.round(percentage * 100),
          scrollPosition: scrollPos,
          visibleContent,
          description: `${Math.round(percentage * 100)}% - ${visibleContent.slice(0, 2).join(' | ')}`
        });
        console.log(`[Screenshot] ✅ ${i + 1}/${steps} (${Math.round(percentage * 100)}%)`);
      } catch (e) {
        console.log(`[Screenshot] ⚠️ ${i + 1} failed`);
      }
    }
    
    // Full page screenshot - scroll to top first
    try {
      console.log('[Screenshot] 📸 Capturing full page...');
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const fullFilename = `full_${Date.now()}.png`;
      const fullPath = path.join(dir, fullFilename);
      await page.screenshot({ path: fullPath, fullPage: true });
      
      screenshots.push({
        filename: fullFilename,
        path: fullPath,
        url: `/screenshots/${fullFilename}`,
        position: 'full',
        description: 'Full page screenshot',
        visibleContent: ['Full page']
      });
      console.log('[Screenshot] ✅ Full page captured');
    } catch (e) {
      console.log('[Screenshot] ⚠️ Full page failed:', e.message);
    }
    
    return screenshots;
  }
  
  async discoverPages(page, baseUrl) {
    return await page.evaluate((base) => {
      const baseHost = new URL(base).hostname;
      const basePath = new URL(base).pathname;
      const links = Array.from(document.querySelectorAll('a[href]'));
      const discovered = new Set();
      
      links.forEach(a => {
        try {
          const url = new URL(a.href);
          // Skip if same as base URL or just hash
          if (url.hostname === baseHost && 
              url.href !== base &&
              url.pathname !== basePath &&
              !url.href.includes('#') && 
              !url.href.includes('javascript:') &&
              !url.href.match(/\.(pdf|jpg|png|gif|zip|doc|xls|ppt)$/i)) {
            discovered.add(url.href);
          }
        } catch (e) {}
      });
      
      return Array.from(discovered).slice(0, 10);
    }, baseUrl).catch(() => []);
  }
  
  async visitInternalPages(browser, pages) {
    const screenshots = [];
    const dir = path.join(__dirname, '../uploads/screenshots');
    const maxPages = Math.min(pages.length, 8);
    
    console.log(`[Internal] 🌐 Visiting ${maxPages} internal pages with full scroll capture...`);
    
    for (let i = 0; i < maxPages; i++) {
      let internalPage = null;
      try {
        console.log(`[Internal] ➡️ Page ${i + 1}/${maxPages}: ${pages[i]}`);
        
        internalPage = await browser.newPage();
        await internalPage.setViewport({ width: 1366, height: 768 });
        await internalPage.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
        
        await internalPage.goto(pages[i], { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        const pageData = await internalPage.evaluate(() => ({
          title: document.title || 'Untitled',
          h1: document.querySelector('h1')?.textContent.trim() || ''
        })).catch(() => ({ title: 'Untitled', h1: '' }));
        
        console.log(`[Internal] 📜 Auto-scrolling page ${i + 1}...`);
        
        // Auto-scroll this page
        await internalPage.evaluate(async () => {
          await new Promise((resolve) => {
            let count = 0;
            const interval = setInterval(() => {
              window.scrollBy({ top: 120, behavior: 'smooth' });
              count++;
              const scrollPos = window.scrollY + window.innerHeight;
              if (scrollPos >= document.body.scrollHeight - 50 || count > 50) {
                clearInterval(interval);
                resolve();
              }
            }, 100);
          });
        });
        
        await internalPage.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        const pageHeight = await internalPage.evaluate(() => document.body.scrollHeight);
        const viewportHeight = 768;
        const steps = 10; // 10 screenshots per internal page
        
        console.log(`[Internal] 📸 Capturing ${steps} screenshots from page ${i + 1}...`);
        
        for (let j = 0; j < steps; j++) {
          const percentage = j / (steps - 1);
          const scrollPos = Math.floor(percentage * Math.max(0, pageHeight - viewportHeight));
          
          await internalPage.evaluate((pos) => {
            window.scrollTo({ top: pos, behavior: 'smooth' });
          }, scrollPos);
          
          await new Promise(resolve => setTimeout(resolve, 800));
          
          const visibleContent = await internalPage.evaluate(() => {
            const elements = document.querySelectorAll('h1, h2, h3, p');
            const visible = [];
            elements.forEach(el => {
              const rect = el.getBoundingClientRect();
              if (rect.top >= 0 && rect.top <= window.innerHeight) {
                const text = el.textContent?.trim();
                if (text && text.length > 5 && text.length < 150) visible.push(text);
              }
            });
            return visible.slice(0, 5);
          }).catch(() => []);
          
          const filename = `page_${i}_scroll_${j}_${Date.now()}.png`;
          const filepath = path.join(dir, filename);
          
          try {
            await internalPage.screenshot({ path: filepath, fullPage: false });
            
            screenshots.push({
              filename,
              path: filepath,
              url: `/screenshots/${filename}`,
              pageUrl: pages[i],
              pageTitle: pageData.title,
              position: `page_${i + 1}_scroll_${j + 1}`,
              percentage: Math.round(percentage * 100),
              description: `${pageData.title} - ${Math.round(percentage * 100)}%`,
              visibleContent: [pageData.title, ...visibleContent].filter(t => t)
            });
            
            console.log(`[Internal] ✅ Page ${i + 1} - Screenshot ${j + 1}/${steps} (${Math.round(percentage * 100)}%)`);
          } catch (e) {
            console.log(`[Internal] ⚠️ Page ${i + 1} - Screenshot ${j + 1} failed`);
          }
        }
        
        console.log(`[Internal] ✅ Completed page ${i + 1}: ${pageData.title} (${steps} screenshots)`);
        
        await internalPage.close();
        internalPage = null;
        
      } catch (e) {
        console.log(`[Internal] ⚠️ Page ${i + 1} failed: ${e.message}`);
        if (internalPage) await internalPage.close().catch(() => {});
      }
    }
    
    console.log(`[Internal] 🎉 Total internal page screenshots: ${screenshots.length}`);
    return screenshots;
  }
  
  async extractLinks(page) {
    return await page.evaluate(() => {
      const allLinks = Array.from(document.querySelectorAll('a'));
      const categorized = { navigation: [], internal: [], external: [], social: [] };
      
      allLinks.forEach(a => {
        const href = a.href?.toLowerCase() || '';
        const text = a.textContent?.trim() || '';
        if (!href || !text) return;
        
        const linkData = { text, href: a.href };
        
        if (href.includes('facebook.com') || href.includes('twitter.com') || 
            href.includes('instagram.com') || href.includes('linkedin.com')) {
          categorized.social.push(linkData);
        } else if (href.startsWith(window.location.origin)) {
          if (a.closest('nav, header, .menu')) {
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
  }
  
  async extractContactInfo(page, fullText) {
    return await page.evaluate((text) => {
      const bodyText = text || document.body?.innerText || '';
      const bodyHTML = document.body?.innerHTML || '';
      
      // Enhanced regex patterns
      const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
      const phoneRegex = /(\+?\d{1,4}[\s.-]?)?\(?\d{2,4}\)?[\s.-]?\d{3,4}[\s.-]?\d{3,4}/g;
      const whatsappRegex = /(?:whatsapp|wa\.me)[:\\/\s]+(\+?[\d\s+-]+)/gi;
      const telegramRegex = /(?:telegram|t\.me)[:\\/\s]+([\w]+)/gi;
      
      // Extract from text
      const emails = [...new Set([...bodyText.matchAll(emailRegex)].map(m => m[0]))];
      const phones = [...new Set([...bodyText.matchAll(phoneRegex)].map(m => m[0]))];
      
      // Extract WhatsApp
      const whatsapp = [];
      let match;
      while ((match = whatsappRegex.exec(bodyText + ' ' + bodyHTML)) !== null) {
        whatsapp.push(match[1].replace(/\s/g, ''));
      }
      
      // Extract Telegram
      const telegram = [];
      while ((match = telegramRegex.exec(bodyText + ' ' + bodyHTML)) !== null) {
        telegram.push(match[1]);
      }
      
      // Extract from href attributes
      const mailtoLinks = Array.from(document.querySelectorAll('a[href^="mailto:"]'))
        .map(a => a.href.replace('mailto:', '').split('?')[0]);
      const telLinks = Array.from(document.querySelectorAll('a[href^="tel:"]'))
        .map(a => a.href.replace('tel:', '').replace(/\s/g, ''));
      
      return {
        emails: [...new Set([...emails, ...mailtoLinks])].slice(0, 20),
        phones: [...new Set([...phones, ...telLinks])].slice(0, 20),
        whatsapp: [...new Set(whatsapp)].slice(0, 10),
        telegram: [...new Set(telegram)].slice(0, 10)
      };
    }, fullText).catch(() => ({ emails: [], phones: [], whatsapp: [], telegram: [] }));
  }
  
  async extractSocialMedia(page) {
    return await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a[href]'));
      const social = { 
        facebook: [], 
        twitter: [], 
        instagram: [], 
        linkedin: [], 
        youtube: [], 
        github: [],
        whatsapp: [],
        telegram: []
      };
      
      links.forEach(link => {
        const href = link.href.toLowerCase();
        const text = link.textContent?.toLowerCase() || '';
        
        // Facebook
        if (href.includes('facebook.com/') || href.includes('fb.com/') || href.includes('fb.me/')) {
          if (!social.facebook.includes(link.href)) social.facebook.push(link.href);
        }
        // Twitter/X
        if (href.includes('twitter.com/') || href.includes('x.com/')) {
          if (!social.twitter.includes(link.href)) social.twitter.push(link.href);
        }
        // Instagram
        if (href.includes('instagram.com/') || href.includes('instagr.am/')) {
          if (!social.instagram.includes(link.href)) social.instagram.push(link.href);
        }
        // LinkedIn
        if (href.includes('linkedin.com/')) {
          if (!social.linkedin.includes(link.href)) social.linkedin.push(link.href);
        }
        // YouTube
        if (href.includes('youtube.com/') || href.includes('youtu.be/')) {
          if (!social.youtube.includes(link.href)) social.youtube.push(link.href);
        }
        // GitHub
        if (href.includes('github.com/')) {
          if (!social.github.includes(link.href)) social.github.push(link.href);
        }
        // WhatsApp
        if (href.includes('wa.me/') || href.includes('whatsapp.com/') || href.includes('api.whatsapp.com/')) {
          if (!social.whatsapp.includes(link.href)) social.whatsapp.push(link.href);
        }
        // Telegram
        if (href.includes('t.me/') || href.includes('telegram.me/')) {
          if (!social.telegram.includes(link.href)) social.telegram.push(link.href);
        }
      });
      
      // Return first link or null for each platform
      return {
        facebook: social.facebook[0] || null,
        twitter: social.twitter[0] || null,
        instagram: social.instagram[0] || null,
        linkedin: social.linkedin[0] || null,
        youtube: social.youtube[0] || null,
        github: social.github[0] || null,
        whatsapp: social.whatsapp[0] || null,
        telegram: social.telegram[0] || null,
        allLinks: social // All found links
      };
    }).catch(() => ({ 
      facebook: null, twitter: null, instagram: null, linkedin: null, 
      youtube: null, github: null, whatsapp: null, telegram: null, allLinks: {} 
    }));
  }
  
  async detectTechnologies(page) {
    return await page.evaluate(() => {
      const technologies = [];
      
      // JavaScript Frameworks
      if (window.React || document.querySelector('[data-reactroot], [data-reactid]')) technologies.push('React');
      if (window.Vue || document.querySelector('[data-v-]')) technologies.push('Vue.js');
      if (window.angular || document.querySelector('[ng-app], [data-ng-app]')) technologies.push('Angular');
      if (window.jQuery || window.$) technologies.push('jQuery');
      if (window.Shopify) technologies.push('Shopify');
      if (window.Webflow) technologies.push('Webflow');
      if (window.Wix) technologies.push('Wix');
      
      // CMS Detection
      const generator = document.querySelector('meta[name="generator"]')?.content;
      if (generator) technologies.push(generator);
      
      if (document.querySelector('link[href*="wp-content"]') || 
          document.querySelector('script[src*="wp-includes"]')) {
        technologies.push('WordPress');
      }
      
      if (document.querySelector('script[src*="drupal"]')) technologies.push('Drupal');
      if (document.querySelector('script[src*="joomla"]')) technologies.push('Joomla');
      
      // CSS Frameworks
      const scripts = Array.from(document.querySelectorAll('script[src]'));
      const links = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));
      
      scripts.forEach(script => {
        const src = script.src.toLowerCase();
        if (src.includes('bootstrap')) technologies.push('Bootstrap');
        if (src.includes('tailwind')) technologies.push('Tailwind CSS');
        if (src.includes('gsap')) technologies.push('GSAP');
        if (src.includes('swiper')) technologies.push('Swiper');
        if (src.includes('slick')) technologies.push('Slick Slider');
        if (src.includes('owl.carousel')) technologies.push('Owl Carousel');
        if (src.includes('aos')) technologies.push('AOS (Animate On Scroll)');
      });
      
      links.forEach(link => {
        const href = link.href.toLowerCase();
        if (href.includes('bootstrap')) technologies.push('Bootstrap');
        if (href.includes('tailwind')) technologies.push('Tailwind CSS');
        if (href.includes('fontawesome') || href.includes('font-awesome')) technologies.push('Font Awesome');
        if (href.includes('material-icons')) technologies.push('Material Icons');
      });
      
      // Analytics & Tracking
      if (document.querySelector('script[src*="google-analytics"]') || 
          document.querySelector('script[src*="gtag"]')) {
        technologies.push('Google Analytics');
      }
      if (document.querySelector('script[src*="facebook.net"]')) technologies.push('Facebook Pixel');
      if (document.querySelector('script[src*="hotjar"]')) technologies.push('Hotjar');
      
      // Payment Gateways
      if (document.querySelector('script[src*="stripe"]')) technologies.push('Stripe');
      if (document.querySelector('script[src*="paypal"]')) technologies.push('PayPal');
      if (document.querySelector('script[src*="razorpay"]')) technologies.push('Razorpay');
      
      // Other Libraries
      if (document.querySelector('script[src*="recaptcha"]')) technologies.push('Google reCAPTCHA');
      if (document.querySelector('script[src*="maps.googleapis"]')) technologies.push('Google Maps');
      
      return [...new Set(technologies)];
    }).catch(() => []);
  }
  
  async getDomainInfo(url) {
    try {
      const domain = new URL(url).hostname.replace('www.', '');
      console.log(`[Domain] Looking up WHOIS for ${domain}...`);
      
      const whoisData = await whois(domain).catch(() => null);
      
      // DNS Lookup
      const dnsRecords = {};
      try {
        dnsRecords.A = await dns.resolve4(domain).catch(() => []);
        dnsRecords.AAAA = await dns.resolve6(domain).catch(() => []);
        dnsRecords.MX = await dns.resolveMx(domain).catch(() => []);
        dnsRecords.NS = await dns.resolveNs(domain).catch(() => []);
        dnsRecords.TXT = await dns.resolveTxt(domain).catch(() => []);
      } catch (e) {}
      
      return {
        domain,
        whois: whoisData,
        dns: dnsRecords,
        registrar: whoisData?.registrar || 'Unknown',
        createdDate: whoisData?.createdDate || whoisData?.creationDate || 'Unknown',
        expiryDate: whoisData?.expiryDate || whoisData?.registryExpiryDate || 'Unknown',
        updatedDate: whoisData?.updatedDate || 'Unknown',
        nameServers: whoisData?.nameServers || dnsRecords.NS || [],
        registrantName: whoisData?.registrant?.name || 'Unknown',
        registrantOrg: whoisData?.registrant?.organization || 'Unknown',
        registrantEmail: whoisData?.registrant?.email || 'Unknown',
        registrantPhone: whoisData?.registrant?.phone || 'Unknown',
        registrantCountry: whoisData?.registrant?.country || 'Unknown'
      };
    } catch (error) {
      console.log('[Domain] ⚠️ WHOIS lookup failed:', error.message);
      const domain = new URL(url).hostname.replace('www.', '');
      return {
        domain,
        whois: null,
        dns: {},
        registrar: 'Unknown',
        createdDate: 'Unknown',
        expiryDate: 'Unknown',
        updatedDate: 'Unknown',
        nameServers: [],
        registrantName: 'Unknown',
        registrantOrg: 'Unknown',
        registrantEmail: 'Unknown',
        registrantPhone: 'Unknown',
        registrantCountry: 'Unknown'
      };
    }
  }
  
  async getServerInfo(page) {
    try {
      const serverInfo = await page.evaluate(() => {
        return {
          userAgent: navigator.userAgent,
          platform: navigator.platform,
          language: navigator.language,
          cookieEnabled: navigator.cookieEnabled,
          onLine: navigator.onLine
        };
      });
      
      // Get HTTP headers via a request
      const response = await page.goto(page.url(), { waitUntil: 'domcontentloaded' }).catch(() => null);
      const headers = response ? response.headers() : {};
      
      return {
        server: headers['server'] || 'Unknown',
        poweredBy: headers['x-powered-by'] || 'Unknown',
        contentType: headers['content-type'] || 'Unknown',
        cacheControl: headers['cache-control'] || 'Unknown',
        headers: headers,
        ...serverInfo
      };
    } catch (error) {
      return {
        server: 'Unknown',
        poweredBy: 'Unknown',
        contentType: 'Unknown',
        cacheControl: 'Unknown',
        headers: {}
      };
    }
  }
  
  async analyzeWithAI(pageInfo, links, contactInfo, socialMedia, technologies, screenshots, domainInfo, serverInfo) {
    try {
      // Check if any API key exists
      const apiKey = this.groqKey || this.openRouterKey;
      const usingGroq = !!this.groqKey;
      
      if (!apiKey || apiKey === 'undefined') {
        console.log('[AI] ⚠️ No API key configured, using fallback analysis');
        return {
          success: false,
          error: 'AI API key not configured',
          fallbackAnalysis: this.generateFallbackAnalysis(pageInfo, contactInfo, socialMedia, technologies, domainInfo)
        };
      }
      
      console.log(`[AI] 🤖 Using ${usingGroq ? 'Groq (Free & Fast)' : 'OpenRouter'}`);
      
      const screenshotAnalysis = screenshots
        .filter(s => s.visibleContent && s.visibleContent.length > 0)
        .slice(0, 20)
        .map((s, idx) => `Screenshot ${idx + 1} (${s.percentage || 0}%): ${s.visibleContent.slice(0, 3).join(' | ')}`)
        .join('\n');
      
      const prompt = `Analyze this website comprehensively and provide DETAILED information:

🌐 WEBSITE: ${pageInfo.title}
URL: ${pageInfo.url}
Description: ${pageInfo.description || 'N/A'}

📊 METRICS:
- Links: ${pageInfo.links} | Images: ${pageInfo.images} | Forms: ${pageInfo.forms}
- Screenshots: ${screenshots.length} | Emails: ${contactInfo.emails.length} | Phones: ${contactInfo.phones.length}

📝 MAIN HEADINGS:
${pageInfo.headings.h1.slice(0, 5).join('\n') || 'None'}

📸 SCREENSHOT CONTENT:
${screenshotAnalysis}

📞 CONTACT INFORMATION:
Emails: ${contactInfo.emails.slice(0, 10).join(', ') || 'None'}
Phones: ${contactInfo.phones.slice(0, 10).join(', ') || 'None'}
WhatsApp: ${contactInfo.whatsapp?.slice(0, 5).join(', ') || 'None'}

🔗 SOCIAL MEDIA:
${Object.entries(socialMedia).filter(([k,v]) => v).map(([k,v]) => `${k}: ${v}`).join('\n') || 'None'}

⚙️ TECHNOLOGIES DETECTED (${technologies.length}):
${technologies.join(', ') || 'None detected'}

🌍 DOMAIN INFORMATION:
Domain: ${domainInfo.domain}
Registrar: ${domainInfo.registrar}
Created: ${domainInfo.createdDate}
Expires: ${domainInfo.expiryDate}
Updated: ${domainInfo.updatedDate}
Name Servers: ${domainInfo.nameServers.join(', ')}
Registrant: ${domainInfo.registrantName} (${domainInfo.registrantOrg})
Country: ${domainInfo.registrantCountry}
Contact: ${domainInfo.registrantEmail} | ${domainInfo.registrantPhone}

🖥️ SERVER INFORMATION:
Server: ${serverInfo.server}
Powered By: ${serverInfo.poweredBy}
Content Type: ${serverInfo.contentType}

📄 CONTENT (first 3000 chars):
${pageInfo.fullText.substring(0, 3000)}

Provide COMPREHENSIVE and DETAILED JSON analysis with explanations:
{
  "executiveSummary": "Detailed 3-4 sentence overview explaining what this website is, its purpose, and key characteristics",
  
  "websiteDetails": {
    "purpose": "Detailed explanation of the website's main purpose and what it offers",
    "businessType": "Specific business category with explanation",
    "industry": "Specific industry vertical",
    "targetAudience": "Detailed description of intended audience with demographics",
    "mainServices": ["List all services/products offered with descriptions"]
  },
  
  "keyFeatures": [
    "Detailed feature 1 with explanation",
    "Detailed feature 2 with explanation",
    "Detailed feature 3 with explanation"
  ],
  
  "contentAnalysis": {
    "quality": "High/Medium/Low",
    "professionalism": "Assessment of design and content professionalism",
    "completeness": "How complete is the website information",
    "userExperience": "Assessment of UX/UI quality",
    "mobileResponsive": "Assessment based on detected technologies"
  },
  
  "trustAndCredibility": {
    "trustScore": "X/10 with detailed reasoning",
    "positiveSignals": ["Detailed list of trust indicators found"],
    "negativeSignals": ["Detailed list of red flags or concerns"],
    "securityFeatures": ["SSL, security badges, etc."],
    "contactability": "Excellent/Good/Fair/Poor with detailed reasoning"
  },
  
  "technicalAssessment": {
    "technologyStack": "Detailed analysis of detected technologies and their purpose",
    "modernization": "Assessment of how modern the tech stack is",
    "performance": "Estimated performance based on page structure and technologies",
    "seoOptimization": "Assessment of SEO elements found",
    "analytics": "Tracking and analytics tools detected"
  },
  
  "domainAnalysis": {
    "domainAge": "Calculate age from creation date and assess credibility",
    "registrarInfo": "Analysis of registrar and registration details",
    "ownershipTransparency": "Assessment of WHOIS information transparency",
    "dnsConfiguration": "Analysis of DNS setup and name servers"
  },
  
  "businessIntelligence": {
    "competitivePosition": "Analysis of market position and professionalism level",
    "targetMarket": "Geographic and demographic target market",
    "businessModel": "How does this business make money",
    "growthIndicators": "Signs of business growth or stagnation"
  },
  
  "dataQuality": {
    "completeness": "High/Medium/Low - How complete is the extracted data",
    "reliability": "Assessment of data reliability and accuracy",
    "coverage": "Percentage estimate of website coverage achieved",
    "missingData": ["List of data that couldn't be extracted"]
  },
  
  "redFlags": [
    "Detailed description of any suspicious elements",
    "Security concerns if any",
    "Inconsistencies found"
  ],
  
  "osintValue": {
    "rating": "High/Medium/Low",
    "reasoning": "Detailed explanation of OSINT value",
    "usefulData": ["List of useful data points found"],
    "investigationPotential": "Potential for further investigation"
  },
  
  "recommendations": [
    "Detailed actionable recommendation 1",
    "Detailed actionable recommendation 2",
    "Detailed actionable recommendation 3",
    "Further investigation suggestions"
  ],
  
  "overallAssessment": "Comprehensive 4-5 sentence final assessment covering legitimacy, purpose, quality, and value. Include specific details about what was found."
}

IMPORTANT: Return ONLY valid JSON. No markdown, no code blocks, no explanations outside JSON. Be DETAILED and SPECIFIC in all fields.`;

      const response = await axios.post(
        this.apiUrl,
        {
          model: usingGroq ? 'llama-3.3-70b-versatile' : 'anthropic/claude-3-haiku',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.2,
          max_tokens: 4096
        },
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            ...(usingGroq ? {} : {
              'HTTP-Referer': 'http://localhost:3000',
              'X-Title': 'FaceTrace AI'
            })
          },
          timeout: 60000
        }
      );
      
      const analysis = response.data.choices?.[0]?.message?.content;
      
      // Clean up HTML entities
      let cleanedAnalysis = analysis || 'No analysis available';
      cleanedAnalysis = cleanedAnalysis
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>');
      
      console.log('[AI] ✅ Analysis complete');
      
      return {
        success: true,
        analysis: cleanedAnalysis,
        model: usingGroq ? 'llama-3.3-70b (Groq)' : 'claude-3-haiku'
      };
    } catch (error) {
      console.error('[AI] ❌ Error:', error.message);
      
      // Check for specific error codes
      if (error.response?.status === 402) {
        console.error('[AI] 💳 Payment Required - API credits exhausted');
        return {
          success: false,
          error: 'AI API credits exhausted (402 Payment Required)',
          fallbackAnalysis: this.generateFallbackAnalysis(pageInfo, contactInfo, socialMedia, technologies, domainInfo)
        };
      }
      
      return {
        success: false,
        error: error.message,
        fallbackAnalysis: this.generateFallbackAnalysis(pageInfo, contactInfo, socialMedia, technologies, domainInfo)
      };
    }
  }
  
  generateFallbackAnalysis(pageInfo, contactInfo, socialMedia, technologies, domainInfo) {
    // Generate basic analysis without AI
    const hasContact = contactInfo.emails.length > 0 || contactInfo.phones.length > 0;
    const hasSocial = Object.values(socialMedia).some(v => v);
    const trustScore = (hasContact ? 3 : 0) + (hasSocial ? 2 : 0) + (domainInfo.registrar !== 'Unknown' ? 3 : 0) + (technologies.length > 0 ? 2 : 0);
    
    return JSON.stringify({
      executiveSummary: `${pageInfo.title} is a website with ${pageInfo.links} links and ${pageInfo.images} images. ${hasContact ? 'Contact information is available.' : 'Limited contact information.'} ${technologies.length > 0 ? `Uses ${technologies.length} technologies.` : ''}`,
      websiteDetails: {
        purpose: pageInfo.description || 'Website purpose not clearly defined in meta description',
        businessType: technologies.includes('Shopify') || technologies.includes('WooCommerce') ? 'E-commerce' : 'Informational/Service Website',
        industry: 'Not determined',
        targetAudience: 'General audience',
        mainServices: pageInfo.headings.h2.slice(0, 3)
      },
      keyFeatures: [
        `${pageInfo.links} internal and external links`,
        `${pageInfo.images} images throughout the site`,
        `${pageInfo.forms} forms for user interaction`,
        hasContact ? 'Contact information provided' : 'Limited contact options'
      ],
      contentAnalysis: {
        quality: pageInfo.fullText.length > 5000 ? 'High' : pageInfo.fullText.length > 2000 ? 'Medium' : 'Low',
        professionalism: technologies.length > 3 ? 'Professional' : 'Basic',
        completeness: hasContact && hasSocial ? 'Complete' : 'Partial',
        userExperience: technologies.includes('Bootstrap') || technologies.includes('Tailwind CSS') ? 'Modern' : 'Standard'
      },
      trustAndCredibility: {
        trustScore: `${trustScore}/10`,
        contactability: hasContact ? 'Good - Multiple contact methods available' : 'Limited - Few contact options',
        positiveSignals: [
          hasContact && 'Contact information provided',
          hasSocial && 'Social media presence',
          domainInfo.registrar !== 'Unknown' && `Registered with ${domainInfo.registrar}`,
          technologies.length > 0 && 'Modern technologies detected'
        ].filter(Boolean),
        negativeSignals: [
          !hasContact && 'No contact information',
          !hasSocial && 'No social media links',
          technologies.length === 0 && 'No modern frameworks detected'
        ].filter(Boolean)
      },
      technicalAssessment: {
        technologyStack: technologies.length > 0 ? technologies.join(', ') : 'Basic HTML/CSS',
        modernization: technologies.length > 3 ? 'Modern' : technologies.length > 0 ? 'Moderate' : 'Basic',
        performance: 'Not measured',
        seoOptimization: pageInfo.description ? 'Basic SEO present' : 'Limited SEO'
      },
      recommendations: [
        !hasContact && 'Add clear contact information',
        !hasSocial && 'Add social media links',
        pageInfo.description === '' && 'Add meta description for better SEO',
        'Consider adding more interactive elements'
      ].filter(Boolean),
      overallAssessment: `${pageInfo.title} is a ${technologies.length > 0 ? 'modern' : 'basic'} website with ${hasContact ? 'good' : 'limited'} contactability. Trust score: ${trustScore}/10. ${hasSocial ? 'Has social media presence.' : 'Could benefit from social media integration.'} ${domainInfo.registrar !== 'Unknown' ? `Domain registered with ${domainInfo.registrar}.` : ''}`,
      note: 'This is a basic automated analysis. AI-powered deep analysis is currently unavailable.'
    }, null, 2);
  }
}

module.exports = new WebsiteIntelligenceService();
