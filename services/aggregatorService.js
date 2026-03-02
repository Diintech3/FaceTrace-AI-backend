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
const googleVisionService = require('./googleVisionService');
const clarifaiService = require('./clarifaiService');
const facePlusPlusService = require('./facePlusPlusService');
const facebookService = require('./facebookService');
const twitterService = require('./twitterService');
const instagramService = require('./instagramService');
const enhancedDataExtractor = require('./enhancedDataExtractor');
const advancedInvestigationService = require('./advancedInvestigationService');
const additionalDataSources = require('./additionalDataSources');
const openRouterService = require('./openRouterService');
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

  async searchByImage(imagePath) {
    try {
      const filename = imagePath.split('\\').pop();
      console.log('[Image Search] Searching by image:', filename);
      
      // Use OpenRouter AI to analyze image
      const aiAnalysis = await openRouterService.analyzeImage(imagePath);
      
      // Use Google Vision API for face detection (fallback to Clarifai if fails)
      let visionResult = await googleVisionService.detectFaces(imagePath);
      
      if (!visionResult) {
        console.log('[Image Search] Google Vision failed, trying Clarifai...');
        visionResult = await clarifaiService.detectFaces(imagePath);
      }

      console.log('[Image Search] Faces detected:', visionResult?.faceCount || 0);
      
      // Face++ detection
      console.log('[Face++] Detecting face in uploaded image...');
      const facePPResult = await facePlusPlusService.detectFace(imagePath);
      console.log('[Face++] Detection result:', facePPResult.success ? 'Success' : 'Failed');
      
      // Get social media profiles from reverse image search
      let profiles = await googleVisionService.reverseImageSearch(imagePath);
      
      if (profiles.length === 0) {
        console.log('[Image Search] Google reverse search failed, trying Clarifai...');
        const clarifaiProfiles = await clarifaiService.reverseImageSearch(imagePath);
        profiles = [...profiles, ...clarifaiProfiles];
      }
      
      // Try to extract username/name from AI analysis with better patterns
      let extractedUsername = null;
      let extractedName = null;
      
      if (aiAnalysis && aiAnalysis.success) {
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
      
      // If username found, search social media platforms
      if (extractedUsername) {
        console.log('[Image Search] Searching social media for:', extractedUsername);
        const socialResults = await this.searchAllPlatforms(extractedUsername);
        if (socialResults && socialResults.profiles) {
          profiles = [...profiles, ...socialResults.profiles];
          console.log('[Image Search] Added', socialResults.profiles.length, 'social media profiles');
          
          // Face matching with found profiles (optional enhancement)
          if (facePPResult.success && profiles.length > 0) {
            console.log('[Face++] Starting face matching with profiles...');
            try {
              const faceMatches = await facePlusPlusService.matchWithProfiles(imagePath, profiles);
              if (faceMatches.success && faceMatches.matches.length > 0) {
                console.log('[Face++] Found', faceMatches.totalMatches, 'face matches');
                // Add face match scores but keep all profiles
                profiles = faceMatches.matches;
              } else {
                console.log('[Face++] No face matches, keeping all profiles');
              }
            } catch (e) {
              console.error('[Face++] Matching error:', e.message);
              console.log('[Face++] Keeping profiles without face matching');
            }
          }
        }
      }
      
      console.log('[Image Search] Total profiles found:', profiles.length);
      
      return {
        message: `Face detection: ${visionResult?.faceCount || 0} face(s) found`,
        imagePath: imagePath,
        faceDetected: visionResult?.faceCount > 0,
        faceCount: visionResult?.faceCount || 0,
        facePlusPlus: facePPResult,
        aiAnalysis: aiAnalysis,
        extractedUsername: extractedUsername,
        extractedName: extractedName,
        profiles: profiles,
        totalFound: profiles.length,
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
