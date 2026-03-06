const advancedInstagramScraper = require('./advancedInstagramScraper');
const advancedTwitterScraper = require('./advancedTwitterScraper');
const freeLinkedInScraper = require('./freeLinkedInScraper');
const freeTwitterScraper = require('./freeTwitterScraper');
const youtubeService = require('./youtubeService');
const githubScraper = require('./githubScraper');
const redditScraper = require('./redditScraper');
const telegramScraper = require('./telegramScraper');
const tiktokScraper = require('./tiktokScraper');
const pinterestScraper = require('./pinterestScraper');
const googleSearchService = require('./googleSearchService');
const freeGoogleScraper = require('./freeGoogleScraper');
const googleVisionService = require('./googleVisionService');
const clarifaiService = require('./clarifaiService');
const facePlusPlusService = require('./facePlusPlusService');
const azureFaceService = require('./azureFaceService');
const facebookService = require('./facebookService');
const twitterService = require('./twitterService');
const instagramService = require('./instagramService');
const enhancedDataExtractor = require('./enhancedDataExtractor');
const advancedInvestigationService = require('./advancedInvestigationService');
const additionalDataSources = require('./additionalDataSources');
const openRouterService = require('./openRouterService');
const ocrService = require('./ocrService');
const aiBiodataService = require('./aiBiodataService');
const trueCallerService = require('./trueCallerService');
const trueCallerScraper = require('./trueCallerScraper');
const freePhoneAPI = require('./freePhoneAPI');
const emailAddressScraper = require('./emailAddressScraper');
const phoneNumberScraper = require('./phoneNumberScraper');
const enhancedContactExtractor = require('./enhancedContactExtractor');

class AggregatorService {
  async searchAllPlatforms(username) {
    console.log(`🔍 Searching for: ${username} across all platforms...`);

    const apiCalls = [
      youtubeService.searchByUsername(username),
      instagramService.searchByUsername(username),
      freeTwitterScraper.searchByUsername(username), // Use free scraper instead of paid API
      facebookService.searchByUsername(username),
      freeLinkedInScraper.searchByUsername(username),
      githubScraper.searchByUsername(username),
      redditScraper.searchByUsername(username),
      telegramScraper.searchByUsername(username),
      tiktokScraper.searchByUsername(username),
      pinterestScraper.searchByUsername(username)
    ];
    
    if (process.env.GOOGLE_SEARCH_API_KEY && process.env.GOOGLE_SEARCH_ENGINE_ID) {
      apiCalls.push(googleSearchService.searchByName(username));
    }

    const results = await Promise.allSettled(apiCalls);

    const profiles = [];
    
    // Enhanced data processing
    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      if (result.status === 'fulfilled' && result.value) {
        let profile = result.value;
        
        // Enhance Instagram data
        if (profile.platform === 'Instagram' && profile.found) {
          try {
            const enhancedData = await enhancedDataExtractor.getInstagramData(username);
            if (enhancedData) {
              profile = { ...profile, ...enhancedData, platform: 'Instagram' };
            }
          } catch (e) {}
        }
        
        // Enhance LinkedIn data
        if (profile.platform === 'LinkedIn' && profile.found) {
          try {
            const enhancedData = await enhancedDataExtractor.getLinkedInData(username);
            if (enhancedData) {
              profile = { ...profile, ...enhancedData, platform: 'LinkedIn' };
            }
          } catch (e) {}
        }
        
        if (profile.platform) {
          profiles.push(profile);
        } else if (profile.results && Array.isArray(profile.results)) {
          // Google Search results
          profile.results.forEach(item => {
            profiles.push({
              platform: item.platform,
              username: username,
              fullName: item.title,
              profileUrl: item.link,
              bio: item.snippet,
              message: 'Found via Google Search'
            });
          });
        }
      }
    }

    // Free Google scraper: supplement for max data (fallback when Google API 403)
    try {
      console.log('[Aggregator] Running Free Google Scraper...');
        const googleResults = await freeGoogleScraper.searchPerson(username);
        if (googleResults && googleResults.length > 0) {
          const existingUrls = new Set(profiles.map(p => p.profileUrl));
          let added = 0;
          googleResults.forEach(result => {
            if (!existingUrls.has(result.link)) {
              existingUrls.add(result.link);
              const u = freeGoogleScraper.extractUsername(result.link) || username;
              profiles.push({
                platform: result.platform,
                username: u,
                fullName: result.title,
                profileUrl: result.link,
                bio: result.snippet,
                message: 'Found via Google Scraper'
              });
              added++;
            }
          });
          if (added > 0) console.log('[Aggregator] Free Google Scraper added', added, 'profiles');
        }
    } catch (e) {
      console.error('[Aggregator] Free Google Scraper error:', e.message);
    }

    console.log('Total profiles found:', profiles.length);

    // Get advanced investigation data
    let advancedData = null;
    try {
      advancedData = await advancedInvestigationService.getDetailedProfile(username);
    } catch (error) {
      console.error('[Advanced Investigation] Error:', error.message);
    }

    // Get additional data sources
    let additionalData = null;
    if (profiles.length > 0) {
      const mainProfile = profiles.find(p => p.platform === 'Instagram') || profiles[0];
      const name = mainProfile.fullName || username;
      const location = mainProfile.location || 'Unknown';
      
      additionalData = {
        possibleEmails: await additionalDataSources.findEmailAddresses(username),
        publicRecords: await additionalDataSources.searchPublicRecords(name, location),
        businessRecords: await additionalDataSources.searchBusinessRecords(name),
        educationalBackground: await additionalDataSources.searchEducationalBackground(name),
        employmentHistory: await additionalDataSources.searchEmploymentHistory(name)
      };

      // Enhanced Contact Extraction from Social Profiles
      try {
        console.log('[Enhanced Contact] Extracting from', profiles.length, 'profiles');
        const enhancedContacts = await enhancedContactExtractor.extractFromProfiles(profiles);
        if (enhancedContacts.emails.length > 0 || enhancedContacts.phones.length > 0) {
          additionalData.enhancedContacts = enhancedContacts;
          console.log('[Enhanced Contact] ✅ Found', enhancedContacts.emails.length, 'emails,', enhancedContacts.phones.length, 'phones');
        }
      } catch (e) {
        console.error('[Enhanced Contact] Error:', e.message);
      }

      // Enhanced Email & Address Scraping with real contact extraction
      try {
        console.log('[Email/Address Scraper] Searching for:', name);
        const personalInfo = await emailAddressScraper.searchPersonalInfo(name, username, profiles);
        if (personalInfo.emails.found || personalInfo.addresses.found || personalInfo.realContacts.emails.length > 0) {
          additionalData.scrapedEmails = personalInfo.emails;
          additionalData.scrapedAddresses = personalInfo.addresses;
          additionalData.realContacts = personalInfo.realContacts;
          console.log('[Email/Address Scraper] ✅ Found', personalInfo.totalFound, 'items');
        }
      } catch (e) {
        console.error('[Email/Address Scraper] Error:', e.message);
      }

      // Enhanced Phone Number Scraping
      try {
        console.log('[Phone Scraper] Searching for:', name);
        const phoneInfo = await phoneNumberScraper.findPhoneNumbers(name);
        if (phoneInfo.found) {
          additionalData.scrapedPhones = phoneInfo;
          console.log('[Phone Scraper] ✅ Found', phoneInfo.phones.length, 'phone numbers');
        }
      } catch (e) {
        console.error('[Phone Scraper] Error:', e.message);
      }

      // TrueCaller lookup by name - Try multiple methods
      try {
        console.log('[TrueCaller] Trying scraper for:', name);
        const trueCallerData = await trueCallerScraper.searchByName(name);
        if (trueCallerData.found) {
          additionalData.trueCallerData = trueCallerData;
          console.log('[TrueCaller] ✅ Scraper found data');
        } else {
          console.log('[TrueCaller] ❌ Scraper found no data');
          // Try free phone API as fallback
          const freePhoneData = await freePhoneAPI.searchByName(name);
          if (freePhoneData.found) {
            additionalData.freePhoneData = freePhoneData;
            console.log('[Free Phone API] ✅ Found data');
          }
        }
      } catch (e) {
        console.error('[TrueCaller Scraper] Error:', e.message);
      }
    }

    const searchResults = {
      username: username,
      totalFound: profiles.length,
      profiles: profiles,
      advancedInvestigation: advancedData,
      additionalDataSources: additionalData,
      searchedAt: new Date()
    };

    // Generate AI Biodata from collected data
    if (profiles.length > 0) {
      console.log('[AI Biodata] Starting biodata generation for:', username);
      try {
        const aiBiodata = await aiBiodataService.generateBiodata(searchResults);
        if (aiBiodata && aiBiodata.success) {
          console.log('[AI Biodata] ✅ Successfully generated biodata');
          searchResults.aiBiodata = aiBiodata;
        } else {
          console.log('[AI Biodata] ❌ Failed to generate biodata');
        }
      } catch (error) {
        console.error('[AI Biodata] Error:', error.message);
      }
    } else {
      console.log('[AI Biodata] Skipped - no profiles found');
    }

    return searchResults;
  }

  async searchByImage(imagePath, usernameHint = null) {
    try {
      const filename = imagePath.split('\\').pop();
      console.log('[Image Search] ========== STARTING IMAGE SEARCH ==========');
      console.log('[Image Search] Image:', filename);
      console.log('[Image Search] Username hint:', usernameHint || 'None');
      
      // Step 1: Google Reverse Image Search using SerpAPI
      console.log('[Image Search] Step 1: Google Reverse Image Search...');
      let reverseImageResults = [];
      let extractedFromReverse = { username: null, name: null };
      
      try {
        const serpApiKey = process.env.Google_SERCH_API;
        if (serpApiKey) {
          const FormData = require('form-data');
          const fs = require('fs');
          const axios = require('axios');
          
          // Try Google Lens first
          try {
            const formData = new FormData();
            formData.append('image', fs.createReadStream(imagePath));
            
            const response = await axios.post('https://serpapi.com/search', formData, {
              params: {
                engine: 'google_lens',
                api_key: serpApiKey
              },
              headers: formData.getHeaders(),
              timeout: 30000
            });
            
            console.log('[Image Search] Google Lens response received');
            
            if (response.data.visual_matches) {
              reverseImageResults = response.data.visual_matches.slice(0, 10);
              console.log('[Image Search] Found', reverseImageResults.length, 'visual matches');
            }
            
            if (response.data.knowledge_graph && response.data.knowledge_graph.title) {
              extractedFromReverse.name = response.data.knowledge_graph.title;
              console.log('[Image Search] ✅ Name from knowledge graph:', extractedFromReverse.name);
            }
          } catch (lensError) {
            console.log('[Image Search] Google Lens failed, trying image search...');
            
            // Fallback to regular image search
            const imageBase64 = fs.readFileSync(imagePath, { encoding: 'base64' });
            const response = await axios.get('https://serpapi.com/search', {
              params: {
                engine: 'google',
                q: 'person face',
                tbm: 'isch',
                api_key: serpApiKey
              },
              timeout: 15000
            });
            
            if (response.data.images_results) {
              reverseImageResults = response.data.images_results.slice(0, 5);
              console.log('[Image Search] Found', reverseImageResults.length, 'image results');
            }
          }
          
          // Extract username from links
          for (const result of reverseImageResults) {
            const link = result.link || '';
            const title = result.title || '';
            
            // Instagram
            if (link.includes('instagram.com/')) {
              const match = link.match(/instagram\.com\/([^\/\?]+)/);
              if (match && match[1] && match[1] !== 'p' && match[1] !== 'reel') {
                extractedFromReverse.username = match[1];
                console.log('[Image Search] ✅ Username from Instagram:', extractedFromReverse.username);
                break;
              }
            }
            // Facebook
            if (link.includes('facebook.com/')) {
              const match = link.match(/facebook\.com\/([^\/\?]+)/);
              if (match && match[1] && match[1] !== 'photo' && match[1] !== 'photos') {
                extractedFromReverse.username = match[1];
                console.log('[Image Search] ✅ Username from Facebook:', extractedFromReverse.username);
                break;
              }
            }
            // Twitter
            if (link.includes('twitter.com/') || link.includes('x.com/')) {
              const match = link.match(/(?:twitter|x)\.com\/([^\/\?]+)/);
              if (match && match[1] && match[1] !== 'status') {
                extractedFromReverse.username = match[1];
                console.log('[Image Search] ✅ Username from Twitter:', extractedFromReverse.username);
                break;
              }
            }
            
            // Extract name from title
            if (!extractedFromReverse.name && title && title.length > 3 && title.length < 50) {
              extractedFromReverse.name = title.split('|')[0].split('-')[0].trim();
            }
          }
        }
      } catch (e) {
        console.error('[Image Search] Reverse image search failed:', e.message);
        console.log('[Image Search] ⚠️ SerpAPI might be out of quota or unavailable');
      }
      
      // Step 2: AI Analysis using OpenRouter
      console.log('[Image Search] Step 2: AI Analysis...');
      const aiAnalysis = await openRouterService.analyzeImage(imagePath);
      if (aiAnalysis && aiAnalysis.success) {
        console.log('[Image Search] AI Analysis completed');
      }
      
      // Step 3: OCR Text Extraction
      console.log('[Image Search] Step 3: OCR Text Extraction...');
      const ocrResult = await ocrService.extractText(imagePath);
      let ocrText = '';
      if (ocrResult.success && ocrResult.hasText) {
        ocrText = ocrResult.text;
        console.log('[Image Search] OCR found text:', ocrText.substring(0, 200));
      } else {
        console.log('[Image Search] No text found in OCR');
      }
      
      // Step 4: Face Detection
      console.log('[Image Search] Step 4: Face Detection...');
      const azureFaceResult = await azureFaceService.detectFace(imagePath);
      console.log('[Image Search] Azure Face:', azureFaceResult.success ? `${azureFaceResult.faceCount} faces` : 'Failed');
      
      const facePPResult = await facePlusPlusService.detectFace(imagePath);
      console.log('[Image Search] Face++:', facePPResult.success ? 'Success' : 'Failed');
      
      // Step 5: Extract Username/Name from all sources
      console.log('[Image Search] Step 5: Extracting Username/Name...');
      let extractedUsername = usernameHint || extractedFromReverse.username;
      let extractedName = extractedFromReverse.name;
      
      // From OCR text
      if (!extractedUsername && ocrText) {
        const ocrUsernames = ocrService.extractUsernames(ocrText);
        const ocrNames = ocrService.extractNames(ocrText);
        
        if (ocrUsernames.length > 0) {
          extractedUsername = ocrUsernames[0];
          console.log('[Image Search] Username from OCR:', extractedUsername);
        }
        
        if (ocrNames.length > 0) {
          extractedName = ocrNames[0];
          console.log('[Image Search] Name from OCR:', extractedName);
        }
      }
      
      // From AI analysis
      if (!extractedUsername && aiAnalysis && aiAnalysis.success) {
        const analysisText = aiAnalysis.analysis;
        
        // Look for NAME: or USERNAME: in response
        const nameMatch = analysisText.match(/NAME:\s*([^\n]+)/i);
        const usernameMatch = analysisText.match(/USERNAME:\s*@?([^\n\s]+)/i);
        const textFoundMatch = analysisText.match(/TEXT FOUND:\s*([^\n]+)/i);
        
        if (nameMatch && nameMatch[1] && !nameMatch[1].includes('not') && !nameMatch[1].includes('None')) {
          extractedName = nameMatch[1].trim();
          console.log('[Image Search] Extracted name from AI:', extractedName);
        }
        
        if (usernameMatch && usernameMatch[1]) {
          extractedUsername = usernameMatch[1].trim();
          console.log('[Image Search] Extracted username from AI:', extractedUsername);
        }
        
        if (textFoundMatch && textFoundMatch[1] && !textFoundMatch[1].includes('None')) {
          const text = textFoundMatch[1].trim();
          // Check if it looks like a username
          if (text.length < 30 && !text.includes(' ')) {
            extractedUsername = text.replace('@', '');
            console.log('[Image Search] Extracted username from text:', extractedUsername);
          } else if (text.length < 50) {
            // Might be a name
            extractedName = text;
            console.log('[Image Search] Extracted name from text:', extractedName);
          }
        }
        
        // Look for social media handles in format @username
        if (!extractedUsername) {
          const handleMatch = analysisText.match(/@([a-zA-Z0-9_]{3,30})/i);
          if (handleMatch && handleMatch[1]) {
            extractedUsername = handleMatch[1];
            console.log('[Image Search] Found social handle:', extractedUsername);
          }
        }
      }
      
      // If name found but no username, create username from name
      if (extractedName && !extractedUsername && extractedName.length < 50) {
        extractedUsername = extractedName.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 20);
        if (extractedUsername.length >= 3) {
          console.log('[Image Search] Generated username from name:', extractedUsername);
        } else {
          extractedUsername = null;
        }
      }
      
      console.log('[Image Search] ========== EXTRACTION RESULTS ==========');
      console.log('[Image Search] Extracted Username:', extractedUsername || 'None');
      console.log('[Image Search] Extracted Name:', extractedName || 'None');
      
      let profiles = [];
      let additionalDataSources = null;
      let advancedInvestigation = null;
      let aiBiodata = null;

      // Step 6: Search social media if username found
      if (extractedUsername) {
        console.log('[Image Search] Step 6: Searching social media for:', extractedUsername);
        const socialResults = await this.searchAllPlatforms(extractedUsername);
        if (socialResults && socialResults.profiles) {
          profiles = socialResults.profiles;
          additionalDataSources = socialResults.additionalDataSources;
          advancedInvestigation = socialResults.advancedInvestigation;
          aiBiodata = socialResults.aiBiodata;
          console.log('[Image Search] Found', profiles.length, 'social media profiles');
        }
      } else if (extractedName) {
        console.log('[Image Search] Step 6: Searching with name:', extractedName);
        const socialResults = await this.searchAllPlatforms(extractedName);
        if (socialResults && socialResults.profiles) {
          profiles = socialResults.profiles;
          additionalDataSources = socialResults.additionalDataSources;
          advancedInvestigation = socialResults.advancedInvestigation;
          aiBiodata = socialResults.aiBiodata;
          console.log('[Image Search] Found', profiles.length, 'profiles');
        }
      } else {
        console.log('[Image Search] No username/name found - cannot search social media');
      }
      
      console.log('[Image Search] ========== FINAL RESULTS ==========');
      console.log('[Image Search] Total profiles found:', profiles.length);
      console.log('[Image Search] ========== SEARCH COMPLETE ==========');
      
      const faceCount = azureFaceResult.faceCount || (facePPResult.success && facePPResult.faces?.length) || 0;
      const faceDetected = azureFaceResult.success || facePPResult.success;
      const faceSource = azureFaceResult.success ? 'Azure Face API' : facePPResult.success ? 'Face++' : 'None';
      
      return {
        message: `Face detection: ${faceSource} - ${faceCount} face(s) found`,
        username: extractedUsername || extractedName || null,
        imagePath: imagePath,
        faceDetected,
        faceCount,
        azureFace: azureFaceResult,
        facePlusPlus: facePPResult,
        aiAnalysis: aiAnalysis,
        reverseImageResults: reverseImageResults,
        extractedUsername: extractedUsername,
        extractedName: extractedName,
        profiles: profiles,
        totalFound: profiles.length,
        additionalDataSources: additionalDataSources,
        advancedInvestigation: advancedInvestigation,
        aiBiodata: aiBiodata,
        searchedAt: new Date()
      };
    } catch (error) {
      console.error('[Image Search] ERROR:', error.message);
      return {
        message: 'Image search failed: ' + error.message,
        imagePath: imagePath,
        profiles: [],
        totalFound: 0,
        error: error.message
      };
    }
  }
}

module.exports = new AggregatorService();
