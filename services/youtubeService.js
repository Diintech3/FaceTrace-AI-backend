const axios = require('axios');

class YouTubeService {
  async searchByUsername(username) {
    try {
      const apiKey = process.env.YOUTUBE_API_KEY;
      
      console.log('[YouTube] Searching for:', username);
      console.log('[YouTube] API Key present:', !!apiKey);
      
      if (!apiKey) {
        console.log('[YouTube] No API key - cannot fetch real data');
        return null;
      }

      console.log('[YouTube] Searching channel...');
      const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${username}&key=${apiKey}`;
      const searchResponse = await axios.get(searchUrl);

      console.log('[YouTube] Search response status:', searchResponse.status);
      
      if (searchResponse.data.items.length === 0) {
        console.log('[YouTube] No channel found');
        return null;
      }

      const channelId = searchResponse.data.items[0].id.channelId;
      console.log('[YouTube] Channel ID found:', channelId);

      console.log('[YouTube] Fetching channel details...');
      const channelUrl = `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${channelId}&key=${apiKey}`;
      const channelResponse = await axios.get(channelUrl);

      const channel = channelResponse.data.items[0];
      console.log('[YouTube] Channel found:', channel.snippet.title);

      return {
        platform: 'YouTube',
        channelId: channel.id,
        channelName: channel.snippet.title,
        description: channel.snippet.description,
        subscribers: channel.statistics.subscriberCount,
        videos: channel.statistics.videoCount,
        views: channel.statistics.viewCount,
        thumbnail: channel.snippet.thumbnails.high.url,
        profileUrl: `https://www.youtube.com/channel/${channel.id}`,
        channelUrl: `https://www.youtube.com/channel/${channel.id}`
      };
    } catch (error) {
      console.error('[YouTube] ERROR:', error.message);
      if (error.response) {
        console.error('[YouTube] Response status:', error.response.status);
        console.error('[YouTube] Response data:', JSON.stringify(error.response.data));
      }
      return null;
    }
  }
}

module.exports = new YouTubeService();
