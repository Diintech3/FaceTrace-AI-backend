// Free Phone Lookup Alternatives

const freePhoneLookupServices = {
  
  // 1. Web Scraping TrueCaller (Free but risky)
  scrapeTrueCaller: async (phone) => {
    // Risk: IP ban, rate limiting
    return "Use with caution - may get blocked";
  },

  // 2. NumVerify API (Free tier: 1000 requests/month)
  numVerify: {
    url: "http://apilayer.net/api/validate",
    freeLimit: "1000 requests/month",
    cost: "FREE"
  },

  // 3. Abstract Phone Validation (Free: 100 requests/month)
  abstractAPI: {
    url: "https://phonevalidation.abstractapi.com/v1/",
    freeLimit: "100 requests/month", 
    cost: "FREE"
  },

  // 4. Twilio Lookup (Pay per use - $0.005 per lookup)
  twilioLookup: {
    url: "https://lookups.twilio.com/v1/PhoneNumbers/",
    cost: "$0.005 per lookup"
  },

  // 5. Social Media Phone Extraction (FREE)
  socialMediaExtraction: {
    method: "Extract from Instagram/Facebook bios",
    cost: "FREE",
    accuracy: "Low"
  }
};

module.exports = freePhoneLookupServices;