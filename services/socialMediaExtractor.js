const axios = require('axios');
const cheerio = require('cheerio');

class SocialMediaExtractor {
  constructor() {
    this.headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1'
    };
  }

  detectPlatform(url) {
    if (url.includes('instagram.com')) return 'instagram';
    if (url.includes('facebook.com') || url.includes('fb.com')) return 'facebook';
    if (url.includes('twitter.com') || url.includes('x.com')) return 'twitter';
    if (url.includes('linkedin.com')) return 'linkedin';
    if (url.includes('github.com')) return 'github';
    if (url.includes('tiktok.com')) return 'tiktok';
    if (url.includes('youtube.com')) return 'youtube';
    return 'unknown';
  }

  async extractInstagram(url) {
    try {
      const usernameMatch = url.match(/instagram\.com\/([^\/\?]+)/);
      const username = usernameMatch ? usernameMatch[1] : '';

      if (!username) throw new Error('Invalid Instagram URL');

      const apiUrl = `https://www.instagram.com/api/v1/users/web_profile_info/?username=${username}`;
      
      const response = await axios.get(apiUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'X-Ig-App-Id': '936619743392459',
          'Accept': '*/*',
          'Accept-Language': 'en-US,en;q=0.9',
          'Referer': `https://www.instagram.com/${username}/`,
          'Sec-Fetch-Dest': 'empty',
          'Sec-Fetch-Mode': 'cors',
          'Sec-Fetch-Site': 'same-origin'
        },
        timeout: 15000,
        validateStatus: (status) => status < 500
      });

      if (response.status === 404) {
        throw new Error('Instagram user not found');
      }

      if (response.status === 429) {
        throw new Error('Instagram rate limit exceeded. Try again later.');
      }

      if (!response.data?.data?.user) {
        throw new Error('Unable to fetch Instagram data');
      }

      const user = response.data.data.user;

      // Extract posts data
      const posts = user.edge_owner_to_timeline_media?.edges?.map(post => {
        const node = post.node;
        return {
          postId: node.id,
          shortcode: node.shortcode,
          url: `https://www.instagram.com/p/${node.shortcode}/`,
          displayUrl: node.display_url,
          isVideo: node.is_video,
          videoViewCount: node.video_view_count || 0,
          likes: node.edge_liked_by?.count || 0,
          comments: node.edge_media_to_comment?.count || 0,
          caption: node.edge_media_to_caption?.edges?.[0]?.node?.text || '',
          timestamp: node.taken_at_timestamp,
          date: new Date(node.taken_at_timestamp * 1000).toLocaleString(),
          dimensions: {
            height: node.dimensions?.height || 0,
            width: node.dimensions?.width || 0
          },
          location: node.location?.name || null,
          accessibility_caption: node.accessibility_caption || null,
          commentsDisabled: node.comments_disabled || false
        };
      }) || [];

      // Calculate analytics
      const analytics = posts.length > 0 ? {
        totalLikes: posts.reduce((sum, p) => sum + p.likes, 0),
        totalComments: posts.reduce((sum, p) => sum + p.comments, 0),
        totalVideos: posts.filter(p => p.isVideo).length,
        totalPhotos: posts.filter(p => !p.isVideo).length,
        avgLikes: Math.round(posts.reduce((sum, p) => sum + p.likes, 0) / posts.length),
        avgComments: Math.round(posts.reduce((sum, p) => sum + p.comments, 0) / posts.length),
        engagementRate: ((posts.reduce((sum, p) => sum + p.likes + p.comments, 0) / posts.length) / (user.edge_followed_by?.count || 1) * 100).toFixed(2) + '%'
      } : null;

      return {
        platform: 'Instagram',
        userId: user.id,
        username: user.username || username,
        name: user.full_name || '',
        fullName: user.full_name || '',
        bio: user.biography || '',
        biography: user.biography || '',
        website: user.external_url || '',
        externalUrl: user.external_url || '',
        externalUrlLinkshimmed: user.external_url_linkshimmed || null,
        followers: user.edge_followed_by?.count || 0,
        following: user.edge_follow?.count || 0,
        posts: user.edge_owner_to_timeline_media?.count || 0,
        totalPosts: user.edge_owner_to_timeline_media?.count || 0,
        isPrivate: user.is_private || false,
        isVerified: user.is_verified || false,
        isBusinessAccount: user.is_business_account || false,
        isProfessionalAccount: user.is_professional_account || false,
        categoryName: user.category_name || null,
        businessCategoryName: user.business_category_name || null,
        profilePic: user.profile_pic_url_hd || user.profile_pic_url || '',
        profilePicUrl: user.profile_pic_url || '',
        profilePicUrlHD: user.profile_pic_url_hd || '',
        image: user.profile_pic_url_hd || user.profile_pic_url || '',
        hasChannel: user.has_channel || false,
        hasClips: user.has_clips || false,
        highlightReelCount: user.highlight_reel_count || 0,
        fbid: user.fbid || null,
        profileUrl: url,
        postsData: posts,
        analytics: analytics
      };
    } catch (error) {
      if (error.code === 'ECONNABORTED') {
        throw new Error('Instagram request timeout');
      }
      throw new Error(`Instagram extraction failed: ${error.message}`);
    }
  }

  async extractFacebook(url) {
    try {
      const response = await axios.get(url, { headers: this.headers, timeout: 10000 });
      const $ = cheerio.load(response.data);

      const name = $('meta[property="og:title"]').attr('content') || '';
      const bio = $('meta[property="og:description"]').attr('content') || '';
      const image = $('meta[property="og:image"]').attr('content') || '';
      const type = $('meta[property="og:type"]').attr('content') || '';
      const username = url.split('/').filter(Boolean).pop();

      return {
        platform: 'Facebook',
        username: username,
        name: name,
        fullName: name,
        bio: bio,
        biography: bio,
        description: bio,
        profileUrl: url,
        image: image,
        profilePic: image,
        type: type
      };
    } catch (error) {
      throw new Error(`Facebook extraction failed: ${error.message}`);
    }
  }

  async extractTwitter(url) {
    try {
      const response = await axios.get(url, { headers: this.headers, timeout: 10000 });
      const $ = cheerio.load(response.data);

      const name = $('meta[property="og:title"]').attr('content') || '';
      const bio = $('meta[property="og:description"]').attr('content') || '';
      const image = $('meta[property="og:image"]').attr('content') || '';
      const username = url.split('/').filter(Boolean).pop();

      return {
        platform: 'Twitter',
        username: username,
        name: name,
        fullName: name,
        bio: bio,
        biography: bio,
        description: bio,
        profileUrl: url,
        image: image,
        profilePic: image,
        avatarUrl: image
      };
    } catch (error) {
      throw new Error(`Twitter extraction failed: ${error.message}`);
    }
  }

  async extractLinkedIn(url) {
    try {
      const response = await axios.get(url, { headers: this.headers, timeout: 10000 });
      const $ = cheerio.load(response.data);

      const name = $('meta[property="og:title"]').attr('content') || '';
      const bio = $('meta[property="og:description"]').attr('content') || '';
      const image = $('meta[property="og:image"]').attr('content') || '';
      const username = url.split('/in/').pop()?.split('/')[0] || '';

      return {
        platform: 'LinkedIn',
        username: username,
        name: name,
        fullName: name,
        bio: bio,
        biography: bio,
        headline: bio,
        profileUrl: url,
        image: image,
        profilePic: image
      };
    } catch (error) {
      throw new Error(`LinkedIn extraction failed: ${error.message}`);
    }
  }

  async extractGitHub(url) {
    try {
      const response = await axios.get(url, { headers: this.headers, timeout: 10000 });
      const $ = cheerio.load(response.data);

      const username = url.split('/').filter(Boolean).pop();
      const name = $('span[itemprop="name"]').text().trim() || $('h1.vcard-names').text().trim() || '';
      const bio = $('div[data-bio-text]').text().trim() || $('div.user-profile-bio').text().trim() || '';
      const image = $('img[alt*="avatar"]').attr('src') || $('img.avatar').attr('src') || '';
      const location = $('span[itemprop="homeLocation"]').text().trim() || '';
      const website = $('a[itemprop="url"]').attr('href') || '';
      const company = $('span[itemprop="worksFor"]').text().trim() || '';
      const email = $('a[href^="mailto:"]').attr('href')?.replace('mailto:', '') || '';
      const twitter = $('a[href*="twitter.com"]').attr('href') || '';

      return {
        platform: 'GitHub',
        username: username,
        name: name,
        fullName: name,
        bio: bio,
        biography: bio,
        followers: $('a[href*="followers"] span').text().trim() || '0',
        following: $('a[href*="following"] span').text().trim() || '0',
        publicRepos: $('span[data-view-component="true"]').first().text().trim() || '0',
        totalRepos: $('span[data-view-component="true"]').first().text().trim() || '0',
        location: location,
        website: website,
        company: company,
        email: email,
        twitter: twitter,
        profileUrl: url,
        image: image,
        profilePic: image,
        avatarUrl: image
      };
    } catch (error) {
      throw new Error(`GitHub extraction failed: ${error.message}`);
    }
  }

  async extractYouTube(url) {
    try {
      const response = await axios.get(url, { headers: this.headers, timeout: 10000 });
      const $ = cheerio.load(response.data);
      const html = response.data;

      const name = $('meta[property="og:title"]').attr('content') || $('meta[name="title"]').attr('content') || '';
      const bio = $('meta[property="og:description"]').attr('content') || $('meta[name="description"]').attr('content') || '';
      const image = $('meta[property="og:image"]').attr('content') || '';

      let subscribers = '';
      let username = '';
      const scriptTags = $('script[type="application/ld+json"]');
      scriptTags.each((i, elem) => {
        try {
          const jsonData = JSON.parse($(elem).html());
          if (jsonData.interactionStatistic) {
            subscribers = jsonData.interactionStatistic.userInteractionCount || '';
          }
          if (jsonData.url) {
            username = jsonData.url.split('/').pop().replace('@', '');
          }
        } catch (e) {}
      });

      const channelIdMatch = html.match(/"channelId":"([^"]+)"/);
      const subscriberMatch = html.match(/"subscriberCountText":{"simpleText":"([^"]+)"}/);
      const videoCountMatch = html.match(/"videosCountText":{"runs":\[{"text":"([^"]+)"}/);
      const viewCountMatch = html.match(/"viewCountText":{"simpleText":"([^"]+)"/);
      
      if (subscriberMatch) subscribers = subscriberMatch[1];
      const videos = videoCountMatch ? videoCountMatch[1] : '';
      const views = viewCountMatch ? viewCountMatch[1] : '';
      const channelId = channelIdMatch ? channelIdMatch[1] : '';

      if (!username) {
        const urlMatch = url.match(/\/@([^\/\?]+)/) || url.match(/\/channel\/([^\/\?]+)/);
        username = urlMatch ? urlMatch[1] : '';
      }

      return {
        platform: 'YouTube',
        channelId: channelId,
        username: username,
        channelName: name,
        name: name,
        fullName: name,
        bio: bio,
        description: bio,
        subscribers: subscribers,
        videos: videos,
        totalVideos: videos,
        views: views,
        totalViews: views,
        profileUrl: url,
        channelUrl: url,
        image: image,
        profilePic: image,
        thumbnail: image
      };
    } catch (error) {
      throw new Error(`YouTube extraction failed: ${error.message}`);
    }
  }

  async extractFromUrl(url) {
    const platform = this.detectPlatform(url);
    
    try {
      switch (platform) {
        case 'instagram':
          return await this.extractInstagram(url);
        case 'facebook':
          return await this.extractFacebook(url);
        case 'twitter':
          return await this.extractTwitter(url);
        case 'linkedin':
          return await this.extractLinkedIn(url);
        case 'github':
          return await this.extractGitHub(url);
        case 'youtube':
          return await this.extractYouTube(url);
        default:
          return await this.extractGeneric(url);
      }
    } catch (error) {
      return {
        platform: platform,
        error: error.message,
        profileUrl: url
      };
    }
  }

  async extractGeneric(url) {
    try {
      const response = await axios.get(url, { headers: this.headers, timeout: 10000 });
      const $ = cheerio.load(response.data);

      return {
        platform: 'Unknown',
        title: $('title').text() || $('meta[property="og:title"]').attr('content') || '',
        description: $('meta[name="description"]').attr('content') || $('meta[property="og:description"]').attr('content') || '',
        image: $('meta[property="og:image"]').attr('content') || '',
        profileUrl: url
      };
    } catch (error) {
      throw new Error(`Generic extraction failed: ${error.message}`);
    }
  }

  async findAllSocialMedia(username) {
    const platforms = [
      { name: 'Instagram', url: `https://www.instagram.com/${username}/` },
      { name: 'Facebook', url: `https://www.facebook.com/${username}` },
      { name: 'Twitter', url: `https://twitter.com/${username}` },
      { name: 'LinkedIn', url: `https://www.linkedin.com/in/${username}` },
      { name: 'GitHub', url: `https://github.com/${username}` },
      { name: 'TikTok', url: `https://www.tiktok.com/@${username}` },
      { name: 'YouTube', url: `https://www.youtube.com/@${username}` }
    ];

    const results = await Promise.allSettled(
      platforms.map(async (platform) => {
        try {
          const response = await axios.head(platform.url, { 
            headers: this.headers, 
            timeout: 5000,
            maxRedirects: 5
          });
          
          if (response.status === 200) {
            const data = await this.extractFromUrl(platform.url);
            return { ...data, found: true };
          }
        } catch (error) {
          return { platform: platform.name, found: false, url: platform.url };
        }
      })
    );

    return results
      .filter(result => result.status === 'fulfilled')
      .map(result => result.value)
      .filter(data => data.found);
  }
}

module.exports = new SocialMediaExtractor();
