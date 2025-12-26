import { parseMultipleM3U8, getDefaultPlaylistUrls } from './utils/m3u8Parser';

export interface Channel {
  id: string;
  name: string;
  logo: string;
  hlsUrl: string;
  category?: string;
  country?: string;
  groupTitle?: string;
}

export const config = {
  port: parseInt(process.env.PORT || '4000'),
  wsBasePort: parseInt(process.env.WS_BASE_PORT || '8081'),
  corsOrigins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],

  // M3U8 playlist URLs (comma-separated in env var, or use defaults)
  m3u8Urls: process.env.M3U8_URLS?.split(',') || getDefaultPlaylistUrls(),

  // Enable M3U8 loading (set to 'false' to use static channels only)
  useM3U8: process.env.USE_M3U8 !== 'false',

  // Static channels (fallback or when USE_M3U8=false)
  channels: [
    {
      id: 'showtv',
      name: 'Show TV',
      logo: '/channels/showtv.png',
      hlsUrl: 'https://rmtftbjlne.turknet.ercdn.net/bpeytmnqyp/showtv/showtv_480p.m3u8',
      category: 'Entertainment',
      country: 'TR'
    }
  ] as Channel[],

  ffmpeg: {
    videoCodec: 'mpeg1video',
    audioCodec: 'mp2',
    videoBitrate: '1500k',
    audioBitrate: '128k',
    resolution: '960x540',
    frameRate: 25,
    sampleRate: 44100
  }
};

/**
 * Initialize channels from M3U8 playlists
 * Call this on server startup
 */
export async function initializeChannels(): Promise<void> {
  if (!config.useM3U8) {
    console.log('[Config] Using static channels (M3U8 loading disabled)');
    return;
  }

  console.log('[Config] Loading channels from M3U8 playlists...');
  console.log('[Config] Playlist URLs:', config.m3u8Urls.length);

  try {
    const parsedChannels = await parseMultipleM3U8(config.m3u8Urls);

    if (parsedChannels.length > 0) {
      config.channels = parsedChannels;
      console.log(`[Config] ✓ Loaded ${parsedChannels.length} channels from M3U8 playlists`);

      // Log category distribution
      const categories = new Map<string, number>();
      parsedChannels.forEach(ch => {
        const cat = ch.category || 'Unknown';
        categories.set(cat, (categories.get(cat) || 0) + 1);
      });

      console.log('[Config] Categories:', Array.from(categories.entries())
        .map(([cat, count]) => `${cat} (${count})`)
        .join(', '));
    } else {
      console.warn('[Config] ⚠ No channels loaded from M3U8, using fallback static channels');
    }
  } catch (error) {
    console.error('[Config] ✗ Failed to load M3U8 channels:', error);
    console.log('[Config] Using fallback static channels');
  }
}
