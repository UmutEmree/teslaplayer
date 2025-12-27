import {
  parseMultipleM3U8,
  getDefaultPlaylistUrls,
  ParsedChannel,
  ContentType,
  SeriesInfo,
  parseXtreamCodes,
  parseXtreamVod,
  parseXtreamSeries,
  getDefaultXtreamConfig,
  XtreamConfig
} from './utils/m3u8Parser';

export interface Channel extends ParsedChannel {}

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
      country: 'TR',
      contentType: 'live' as ContentType
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
 * Initialize channels from Xtream Codes API or M3U8 playlists
 * Call this on server startup
 */
export async function initializeChannels(): Promise<void> {
  if (!config.useM3U8) {
    console.log('[Config] Using static channels (M3U8 loading disabled)');
    return;
  }

  // Check if using Xtream Codes API (default) or M3U8 files
  const useXtreamApi = process.env.USE_XTREAM_API !== 'false';

  if (useXtreamApi) {
    console.log('[Config] Loading channels from Xtream Codes API...');

    try {
      const xtreamConfig: XtreamConfig = {
        server: process.env.XTREAM_SERVER || getDefaultXtreamConfig().server,
        username: process.env.XTREAM_USERNAME || getDefaultXtreamConfig().username,
        password: process.env.XTREAM_PASSWORD || getDefaultXtreamConfig().password
      };

      console.log(`[Config] Xtream Server: ${xtreamConfig.server}`);

      // Fetch live channels, VOD (movies), and series in parallel from Xtream Codes API
      const [liveChannels, vodChannels, seriesChannels] = await Promise.all([
        parseXtreamCodes(xtreamConfig),
        parseXtreamVod(xtreamConfig),
        parseXtreamSeries(xtreamConfig)
      ]);

      // Merge all content
      const allChannels = [...liveChannels, ...vodChannels, ...seriesChannels];

      if (allChannels.length > 0) {
        config.channels = allChannels;
        console.log(`[Config] ✓ Loaded from Xtream Codes API:`);
        console.log(`[Config]   - Live channels: ${liveChannels.length}`);
        console.log(`[Config]   - Movies (VOD): ${vodChannels.length}`);
        console.log(`[Config]   - Series: ${seriesChannels.length}`);
        console.log(`[Config]   - Total: ${allChannels.length}`);

        // Log category distribution for live channels
        const categories = new Map<string, number>();
        liveChannels.forEach(ch => {
          const cat = ch.category || 'Unknown';
          categories.set(cat, (categories.get(cat) || 0) + 1);
        });

        const sortedCategories = Array.from(categories.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10);

        console.log('[Config] Top 10 Live Categories:', sortedCategories
          .map(([cat, count]) => `${cat} (${count})`)
          .join(', '));
      } else {
        console.warn('[Config] ⚠ No channels loaded from Xtream Codes API, falling back to M3U8');
        await loadFromM3U8();
      }
    } catch (error) {
      console.error('[Config] ✗ Failed to load from Xtream Codes API:', error);
      console.log('[Config] Falling back to M3U8 loading...');
      await loadFromM3U8();
    }
  } else {
    await loadFromM3U8();
  }
}

/**
 * Load channels from M3U8 playlists (fallback method)
 */
async function loadFromM3U8(): Promise<void> {
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
