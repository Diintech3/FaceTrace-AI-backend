const axios = require('axios');

class AIBiodataService {
  constructor() {
    this.groqKey = process.env.GROQ_API_KEY;
    this.openRouterKey = process.env.OPENROUTER_API_KEY;
    
    // Prioritize Groq (FREE) over OpenRouter (PAID)
    this.apiKey = this.groqKey || this.openRouterKey;
    this.usingGroq = !!this.groqKey;
    this.apiUrl = this.usingGroq 
      ? 'https://api.groq.com/openai/v1/chat/completions'
      : 'https://openrouter.ai/api/v1/chat/completions';
  }

  async generateBiodata(profileData) {
    try {
      console.log('[AI Biodata] Starting generation...');
      console.log('[AI Biodata] Using:', this.usingGroq ? 'Groq (FREE)' : 'OpenRouter (PAID)');
      console.log('[AI Biodata] API Key present:', !!this.apiKey);
      console.log('[AI Biodata] Profiles count:', profileData.profiles?.length || 0);

      if (!this.apiKey) {
        console.error('[AI Biodata] ❌ No valid API key configured');
        return {
          success: false,
          message: 'AI API key not configured. Please add GROQ_API_KEY or OPENROUTER_API_KEY to .env'
        };
      }

      // Prepare data summary for AI
      const dataSummary = this.prepareDataSummary(profileData);
      console.log('[AI Biodata] Data summary prepared, length:', dataSummary.length);

      console.log('[AI Biodata] Calling', this.usingGroq ? 'Groq' : 'OpenRouter', 'API...');
      const response = await axios.post(
        this.apiUrl,
        {
          model: this.usingGroq ? 'llama-3.3-70b-versatile' : 'openai/gpt-3.5-turbo',
          messages: [
            {
              role: 'user',
              content: `Based on the following social media profile data, create a comprehensive biodata/profile report. Analyze and present ALL available information in a professional format.

DATA COLLECTED:
${dataSummary}

Create a detailed biodata report with these sections:
1. PERSONAL INFORMATION (Name, Username, Location, etc.)
2. PROFESSIONAL DETAILS (Occupation, Company, Skills)
3. SOCIAL MEDIA PRESENCE (All platforms found with statistics)
4. CONTACT INFORMATION (Email, Phone if available)
5. INTERESTS & ACTIVITIES (Based on bio/description)
6. ONLINE REPUTATION (Verified accounts, follower counts)
7. ADDITIONAL INSIGHTS (Any patterns or notable information)

Format it professionally with clear sections. Include ALL data points found. Be thorough and detailed.`
            }
          ],
          temperature: 0.3,
          max_tokens: 2048
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
            ...(this.usingGroq ? {} : {
              'HTTP-Referer': 'http://localhost:3000',
              'X-Title': 'FaceTrace AI'
            })
          },
          timeout: 30000
        }
      );

      const biodata = response.data.choices[0].message.content;
      console.log('[AI Biodata] ✅ Generation completed successfully');
      console.log('[AI Biodata] Response length:', biodata.length);

      return {
        success: true,
        biodata: biodata,
        model: this.usingGroq ? 'Llama 3.3 70B (Groq - FREE)' : 'GPT-3.5 Turbo (OpenRouter - PAID)'
      };
    } catch (error) {
      console.error('[AI Biodata] ❌ ERROR:', error.message);
      if (error.response) {
        console.error('[AI Biodata] Response status:', error.response.status);
        console.error('[AI Biodata] Response data:', JSON.stringify(error.response.data));
      }
      return {
        success: false,
        message: 'Biodata generation failed: ' + error.message
      };
    }
  }

  prepareDataSummary(profileData) {
    let summary = `Username: ${profileData.username}\n`;
    summary += `Total Platforms Found: ${profileData.totalFound}\n\n`;

    // Add profile data
    if (profileData.profiles && profileData.profiles.length > 0) {
      summary += 'SOCIAL MEDIA PROFILES:\n';
      profileData.profiles.forEach((profile, idx) => {
        summary += `\n${idx + 1}. ${profile.platform}:\n`;
        summary += `   - Username: ${profile.username || profile.channelName || 'N/A'}\n`;
        summary += `   - Full Name: ${profile.fullName || profile.name || 'N/A'}\n`;
        summary += `   - Bio: ${profile.bio || profile.description || 'N/A'}\n`;
        summary += `   - Email: ${profile.email || 'N/A'}\n`;
        summary += `   - Phone: ${profile.phone || 'N/A'}\n`;
        summary += `   - Location: ${profile.location || 'N/A'}\n`;
        summary += `   - Company: ${profile.company || 'N/A'}\n`;
        summary += `   - Website: ${profile.website || 'N/A'}\n`;
        summary += `   - Followers: ${profile.followers || profile.subscribers || 'N/A'}\n`;
        summary += `   - Following: ${profile.following || 'N/A'}\n`;
        summary += `   - Posts/Videos: ${profile.posts || profile.videos || 'N/A'}\n`;
        summary += `   - Verified: ${profile.verified || profile.isVerified ? 'Yes' : 'No'}\n`;
        summary += `   - Profile URL: ${profile.profileUrl}\n`;
      });
    }

    // Add additional data sources
    if (profileData.additionalDataSources) {
      summary += '\n\nADDITIONAL DATA:\n';
      
      if (profileData.additionalDataSources.possibleEmails) {
        summary += `\nPossible Emails: ${JSON.stringify(profileData.additionalDataSources.possibleEmails.possibleEmails)}\n`;
      }
      
      if (profileData.additionalDataSources.publicRecords) {
        summary += `\nPublic Records: ${JSON.stringify(profileData.additionalDataSources.publicRecords)}\n`;
      }
    }

    // Add advanced investigation data
    if (profileData.advancedInvestigation) {
      summary += '\n\nADVANCED INVESTIGATION DATA:\n';
      summary += JSON.stringify(profileData.advancedInvestigation, null, 2);
    }

    return summary;
  }
}

module.exports = new AIBiodataService();
