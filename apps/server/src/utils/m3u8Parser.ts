export type ContentType = 'movie' | 'series' | 'live';

export interface SeriesInfo {
  seriesName: string;
  season: number;
  episode: number;
  episodeTitle?: string;
}

export interface ParsedChannel {
  id: string;
  name: string;
  logo: string;
  hlsUrl: string;
  category: string;
  country?: string;
  tvgId?: string;
  groupTitle?: string;
  contentType: ContentType;
  seriesInfo?: SeriesInfo;
  year?: number;
  isDirectVideo?: boolean; // true for direct video files (mkv, mp4), false for HLS
}

export interface Series {
  id: string;
  name: string;
  year?: number;
  logo: string;
  category: string;
  seasons: Season[];
}

export interface Season {
  seasonNumber: number;
  episodes: Episode[];
}

export interface Episode {
  id: string;
  episodeNumber: number;
  name: string;
  hlsUrl: string;
}

/**
 * Parse M3U8 playlist and extract channel information
 * Supports both Xtream Codes format and standard M3U8
 * Supports both HTTP URLs and local file paths
 */
export async function parseM3U8(url: string): Promise<ParsedChannel[]> {
  try {
    console.log(`[M3U8Parser] Fetching playlist from: ${url}`);

    let text: string;

    // Check if it's a local file path (absolute, relative, or file:// protocol)
    const isLocalFile = url.startsWith('file://') ||
                        url.startsWith('/') ||
                        url.startsWith('./') ||
                        url.startsWith('../') ||
                        url.includes(':\\');

    if (isLocalFile) {
      // Local file - use fs.readFileSync
      const fs = await import('fs');
      const path = await import('path');

      let filePath = url.replace('file://', '');

      // Resolve relative paths from current working directory
      if (filePath.startsWith('./') || filePath.startsWith('../')) {
        filePath = path.resolve(process.cwd(), filePath);
      }

      text = fs.readFileSync(filePath, 'utf-8');
      console.log(`[M3U8Parser] Loaded local file: ${filePath}`);
    } else {
      // HTTP URL - use fetch
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Failed to fetch M3U8: ${response.status} ${response.statusText}`);
      }

      text = await response.text();
    }
    const channels: ParsedChannel[] = [];
    const lines = text.split('\n').map(line => line.trim());

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Look for #EXTINF lines which contain channel metadata
      if (line.startsWith('#EXTINF:')) {
        // Extract metadata attributes
        const tvgId = extractAttribute(line, 'tvg-id');
        const tvgName = extractAttribute(line, 'tvg-name');
        const tvgLogo = extractAttribute(line, 'tvg-logo');
        const groupTitle = extractAttribute(line, 'group-title');
        const tvgCountry = extractAttribute(line, 'tvg-country');

        // Extract channel name (after the last comma)
        const commaIndex = line.lastIndexOf(',');
        const channelName = commaIndex !== -1
          ? line.substring(commaIndex + 1).trim()
          : tvgName || 'Unknown Channel';

        // Next non-empty line should be the stream URL
        let streamUrl = '';
        for (let j = i + 1; j < lines.length; j++) {
          if (lines[j] && !lines[j].startsWith('#')) {
            streamUrl = lines[j];
            break;
          }
        }

        // Only add if we have a valid stream URL
        if (streamUrl && (streamUrl.startsWith('http') || streamUrl.startsWith('rtsp'))) {
          const id = generateChannelId(channelName, tvgId);
          const category = groupTitle || detectCategory(url, channelName);

          // Extract country from channel name (e.g., "DE: Channel", "UK: Channel", "[PL]")
          const countryInfo = extractCountryFromName(channelName);
          const cleanedName = countryInfo.cleanedName;

          // Try multiple sources for country code
          let country = tvgCountry || countryInfo.country;

          // If no country yet, try extracting from tvg-id (e.g., "TRT1.tr" → "TR")
          if (!country && tvgId) {
            const tvgIdMatch = tvgId.match(/\.([a-z]{2})$/i);
            if (tvgIdMatch) {
              country = tvgIdMatch[1].toUpperCase();
            }
          }

          // If no country yet, try extracting from category/groupTitle (e.g., "DE: SPORT")
          if (!country && groupTitle) {
            const categoryCountryMatch = groupTitle.match(/^([A-Z]{2}):/);
            if (categoryCountryMatch) {
              country = categoryCountryMatch[1];
            }
          }

          // Last resort: extract from URL
          if (!country) {
            country = extractCountryFromUrl(url);
          }

          // Parse content type and series info
          const contentInfo = parseContentInfo(cleanedName, category, tvgId);

          channels.push({
            id,
            name: cleanedName,
            logo: tvgLogo || generatePlaceholderLogo(cleanedName),
            hlsUrl: streamUrl,
            category,
            country,
            tvgId,
            groupTitle,
            contentType: contentInfo.contentType,
            seriesInfo: contentInfo.seriesInfo,
            year: contentInfo.year
          });
        }
      }
    }

    console.log(`[M3U8Parser] Parsed ${channels.length} channels from ${url}`);
    return channels;
  } catch (error) {
    console.error(`[M3U8Parser] Error parsing M3U8 from ${url}:`, error);
    return [];
  }
}

/**
 * Parse multiple M3U8 sources and combine them
 */
export async function parseMultipleM3U8(urls: string[]): Promise<ParsedChannel[]> {
  console.log(`[M3U8Parser] Parsing ${urls.length} playlists...`);

  const results = await Promise.allSettled(
    urls.map(url => parseM3U8(url))
  );

  const allChannels: ParsedChannel[] = [];
  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      // Concat in chunks to avoid stack overflow with large arrays
      const channels = result.value;
      const chunkSize = 1000;
      for (let i = 0; i < channels.length; i += chunkSize) {
        allChannels.push(...channels.slice(i, i + chunkSize));
      }
    } else {
      console.error(`[M3U8Parser] Failed to parse ${urls[index]}:`, result.reason);
    }
  });

  // Deduplicate channels by ID
  console.log(`[M3U8Parser] Deduplicating ${allChannels.length} channels...`);
  const uniqueChannels = deduplicateChannels(allChannels);
  console.log(`[M3U8Parser] Total unique channels: ${uniqueChannels.length}`);

  return uniqueChannels;
}

/**
 * Parse content type and series information from channel name and group title
 */
function parseContentInfo(name: string, groupTitle: string, tvgId?: string): {
  contentType: ContentType;
  seriesInfo?: SeriesInfo;
  year?: number;
} {
  const groupLower = groupTitle.toLowerCase();
  const nameLower = name.toLowerCase();

  // 1. Check tvg-id for country extension (e.g., ".tr", ".de") - indicates live TV
  if (tvgId && /\.[a-z]{2}$/i.test(tvgId)) {
    return { contentType: 'live' };
  }

  // 2. Check for live TV first (highest priority for country-coded channels)
  // Country code pattern like "DE: ", "FR: ", "ALB: ", "EX-YU: " always indicates live TV
  if (/^[A-Z][A-Z-]+:\s/.test(groupTitle)) {
    return { contentType: 'live' };
  }

  // 3. Check for special symbols used for live channels
  if (groupTitle.includes('▰') || groupTitle.includes('▱')) {
    return { contentType: 'live' };
  }

  // 4. Check for Turkish live TV categories
  const turkishLiveCategories = [
    'ulusal', 'haber', 'spor', 'muzik', 'cocuk', 'dini', 'ekonomi', 'belgesel',
    'yurt disi', 'eglence', 'yerel'
  ];
  if (turkishLiveCategories.some(cat => groupLower.includes(cat))) {
    return { contentType: 'live' };
  }

  // 3. Check group-title for series indicators (most reliable for Xtream Codes)
  // Note: "anime" alone is not enough - it should be combined with series keywords
  const seriesIndicators = ['dizi', 'dizileri', 'serien', 'series', 'séries'];
  const isAnimeSeries = groupLower.includes('anime') && (groupLower.includes('dizi') || groupLower.includes('series'));
  const isSeries = seriesIndicators.some(indicator => groupLower.includes(indicator)) || isAnimeSeries;

  // 4. Check for series pattern in name: S01E02, S01 E02, etc.
  const seriesPattern = /S(\d+)\s*E(\d+)/i;
  const seriesMatch = name.match(seriesPattern);

  if (seriesMatch || isSeries) {
    let season = 1;
    let episode = 1;
    let seriesName = name;

    if (seriesMatch) {
      season = parseInt(seriesMatch[1]);
      episode = parseInt(seriesMatch[2]);

      // Extract series name (everything before S01E02)
      seriesName = name
        .replace(seriesPattern, '')
        .replace(/\s+/g, ' ')
        .trim();
    }

    // Extract year if present
    const yearMatch = seriesName.match(/\((\d{4})\)/);
    const year = yearMatch ? parseInt(yearMatch[1]) : undefined;

    // Clean series name
    const cleanSeriesName = seriesName
      .replace(/\(\d{4}\)/, '')
      .trim();

    return {
      contentType: 'series',
      seriesInfo: {
        seriesName: cleanSeriesName,
        season,
        episode
      },
      year
    };
  }

  // 5. Check group-title for movie indicators (VOD without series pattern)
  const movieIndicators = ['film', 'movie'];  // Removed 'cinema' - it's often used for live movie channels
  const isMovie = movieIndicators.some(indicator => groupLower.includes(indicator));

  if (isMovie) {
    const yearMatch = name.match(/\((\d{4})\)/);
    const year = yearMatch ? parseInt(yearMatch[1]) : undefined;

    return {
      contentType: 'movie',
      year
    };
  }

  // 6. Check for other live TV indicators in group-title
  const liveIndicators = [
    'live', ' tv', 'channel', 'kanal', 'news', 'sport', 'paket', 'extra', 'ppv',
    'ulusal', 'yerel', 'bölgesel', 'national', 'local', 'regional', 'raw', 'türk',
    'unterhaltung', 'entertainment', 'music', 'musikk', 'documentary', 'dokumentar',
    'kids', 'femije', 'cocuk', 'fetare', 'religion', 'radio', 'premium', 'cinema',
    'amazon', 'netflix', 'event', 'general', 'haber'  // Streaming platforms with live events + general category
  ];

  // Check if it's a region/country code without colon (e.g., "EX-YU", "ARAB", "BALKAN")
  const regionCodes = ['ex-yu', 'balkan', 'arab', 'nordic'];
  const isRegion = regionCodes.some(region => groupLower === region || groupLower.startsWith(region + ' '));

  const isLive = liveIndicators.some(indicator => groupLower.includes(indicator)) || isRegion;

  if (isLive) {
    return { contentType: 'live' };
  }

  // 5. Default to movie (most Xtream Codes content without series pattern is VOD/movies)
  const yearMatch = name.match(/\((\d{4})\)/);
  const year = yearMatch ? parseInt(yearMatch[1]) : undefined;

  return {
    contentType: 'movie',
    year
  };
}

/**
 * Extract attribute value from M3U8 line
 * Example: tvg-logo="http://example.com/logo.png"
 */
function extractAttribute(line: string, attribute: string): string {
  const regex = new RegExp(`${attribute}="([^"]*)"`, 'i');
  const match = line.match(regex);
  return match ? match[1] : '';
}

/**
 * Generate unique channel ID from name and tvg-id
 */
function generateChannelId(name: string, tvgId?: string): string {
  if (tvgId) {
    return tvgId.toLowerCase().replace(/[^a-z0-9]/g, '-');
  }

  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '-')
    .substring(0, 50);
}

/**
 * Generate placeholder logo URL or return empty string
 */
function generatePlaceholderLogo(channelName: string): string {
  // Return empty string - frontend will handle placeholder display
  return '';
}

/**
 * Detect category from URL pattern or channel name
 */
function detectCategory(url: string, channelName: string): string {
  const urlLower = url.toLowerCase();
  const nameLower = channelName.toLowerCase();

  // Detect from URL
  if (urlLower.includes('action-movies')) return 'Action';
  if (urlLower.includes('adventure-movies')) return 'Adventure';
  if (urlLower.includes('animation-movies')) return 'Animation';
  if (urlLower.includes('comedy-movies')) return 'Comedy';
  if (urlLower.includes('crime-movies')) return 'Crime';
  if (urlLower.includes('documentary')) return 'Documentary';
  if (urlLower.includes('drama-movies')) return 'Drama';
  if (urlLower.includes('family-movies')) return 'Family';
  if (urlLower.includes('fantasy-movies')) return 'Fantasy';
  if (urlLower.includes('history-movies')) return 'History';
  if (urlLower.includes('horror-movies')) return 'Horror';
  if (urlLower.includes('music-movies') || urlLower.includes('/music.m3u')) return 'Music';
  if (urlLower.includes('mystery-movies')) return 'Mystery';
  if (urlLower.includes('romance-movies')) return 'Romance';
  if (urlLower.includes('science-fiction')) return 'Science Fiction';
  if (urlLower.includes('thriller-movies')) return 'Thriller';
  if (urlLower.includes('war-movies')) return 'War';
  if (urlLower.includes('western-movies')) return 'Western';
  if (urlLower.includes('tv-movies')) return 'TV Movies';
  if (urlLower.includes('trending-series')) return 'Trending TV Shows';
  if (urlLower.includes('top-movies')) return 'Top Movies';
  if (urlLower.includes('/news.m3u')) return 'News';
  if (urlLower.includes('/sports.m3u')) return 'Sports';
  if (urlLower.includes('/entertainment.m3u')) return 'Entertainment';

  // Detect from channel name
  if (nameLower.includes('news')) return 'News';
  if (nameLower.includes('sport')) return 'Sports';
  if (nameLower.includes('music')) return 'Music';
  if (nameLower.includes('movie')) return 'Movies';

  return 'General';
}

/**
 * Extract country code from channel name
 * Supports formats: "DE: Channel Name", "UK: Channel Name", "Channel [PL]", "Channel [UK]"
 */
function extractCountryFromName(name: string): { country?: string; cleanedName: string } {
  // Pattern 1: "DE: Channel Name", "UK: Channel Name"
  const prefixMatch = name.match(/^([A-Z]{2}):\s*(.+)$/);
  if (prefixMatch) {
    return {
      country: prefixMatch[1],
      cleanedName: prefixMatch[2].trim()
    };
  }

  // Pattern 2: "Channel Name [PL]", "Channel Name [UK]"
  const suffixMatch = name.match(/^(.+?)\s*\[([A-Z]{2})\]$/);
  if (suffixMatch) {
    return {
      country: suffixMatch[2],
      cleanedName: suffixMatch[1].trim()
    };
  }

  // No country code found, return original name
  return {
    cleanedName: name
  };
}

/**
 * Extract country code from URL
 */
function extractCountryFromUrl(url: string): string | undefined {
  const urlLower = url.toLowerCase();

  // Country-specific URLs
  if (urlLower.includes('/us.m3u')) return 'US';
  if (urlLower.includes('/uk.m3u')) return 'UK';
  if (urlLower.includes('/ca.m3u')) return 'CA';
  if (urlLower.includes('/au.m3u')) return 'AU';
  if (urlLower.includes('/vn.m3u')) return 'VN';
  if (urlLower.includes('/tr.m3u')) return 'TR';
  if (urlLower.includes('/de.m3u')) return 'DE';
  if (urlLower.includes('/fr.m3u')) return 'FR';
  if (urlLower.includes('/es.m3u')) return 'ES';
  if (urlLower.includes('/it.m3u')) return 'IT';

  return undefined;
}

/**
 * Remove duplicate channels based on ID
 */
function deduplicateChannels(channels: ParsedChannel[]): ParsedChannel[] {
  const seen = new Set<string>();
  const unique: ParsedChannel[] = [];

  for (const channel of channels) {
    if (!seen.has(channel.id)) {
      seen.add(channel.id);
      unique.push(channel);
    }
  }

  return unique;
}

/**
 * Group series episodes into hierarchical structure
 */
export function groupSeries(channels: ParsedChannel[]): Series[] {
  const seriesMap = new Map<string, Series>();

  channels
    .filter(ch => ch.contentType === 'series' && ch.seriesInfo)
    .forEach(ch => {
      const { seriesInfo } = ch;
      if (!seriesInfo) return;

      const seriesKey = `${seriesInfo.seriesName}-${ch.year || ''}`;

      // Get or create series
      let series = seriesMap.get(seriesKey);
      if (!series) {
        series = {
          id: generateChannelId(seriesInfo.seriesName),
          name: seriesInfo.seriesName,
          year: ch.year,
          logo: ch.logo,
          category: ch.category,
          seasons: []
        };
        seriesMap.set(seriesKey, series);
      }

      // Get or create season
      let season = series.seasons.find(s => s.seasonNumber === seriesInfo.season);
      if (!season) {
        season = {
          seasonNumber: seriesInfo.season,
          episodes: []
        };
        series.seasons.push(season);
      }

      // Add episode
      season.episodes.push({
        id: ch.id,
        episodeNumber: seriesInfo.episode,
        name: ch.name,
        hlsUrl: ch.hlsUrl
      });
    });

  // Sort seasons and episodes
  Array.from(seriesMap.values()).forEach(series => {
    series.seasons.sort((a, b) => a.seasonNumber - b.seasonNumber);
    series.seasons.forEach(season => {
      season.episodes.sort((a, b) => a.episodeNumber - b.episodeNumber);
    });
  });

  return Array.from(seriesMap.values());
}

/**
 * Xtream Codes API Configuration
 */
export interface XtreamConfig {
  server: string;
  username: string;
  password: string;
}

interface XtreamCategory {
  category_id: string;
  category_name: string;
  parent_id: number;
}

interface XtreamStream {
  num: number;
  name: string;
  stream_type: string;
  stream_id: number;
  stream_icon: string;
  epg_channel_id: string | null;
  added: string;
  category_id: string;
  custom_sid: string;
  tv_archive: number;
  direct_source: string;
  tv_archive_duration: number;
}

interface XtreamVodStream {
  num: number;
  name: string;
  stream_type: string;
  stream_id: number;
  stream_icon: string;
  rating: string;
  rating_5based: number;
  added: string;
  category_id: string;
  container_extension: string;
  custom_sid: string;
  direct_source: string;
}

interface XtreamSeriesStream {
  num: number;
  name: string;
  series_id: number;
  cover: string;
  plot: string;
  cast: string;
  director: string;
  genre: string;
  release_date: string;
  last_modified: string;
  rating: string;
  rating_5based: number;
  backdrop_path: string[];
  youtube_trailer: string;
  episode_run_time: string;
  category_id: string;
}

/**
 * Default Xtream Codes API configuration
 */
export function getDefaultXtreamConfig(): XtreamConfig {
  return {
    server: 'http://m3u.best-smarter.me',
    username: '2b9dbfe35aa1',
    password: '1a292b87b3'
  };
}

/**
 * Fetch channels from Xtream Codes API
 */
export async function parseXtreamCodes(config: XtreamConfig): Promise<ParsedChannel[]> {
  try {
    console.log(`[XtreamCodes] Fetching from: ${config.server}`);

    const baseUrl = `${config.server}/player_api.php?username=${config.username}&password=${config.password}`;

    // Fetch categories and streams in parallel
    const [categoriesRes, streamsRes] = await Promise.all([
      fetch(`${baseUrl}&action=get_live_categories`),
      fetch(`${baseUrl}&action=get_live_streams`)
    ]);

    if (!categoriesRes.ok || !streamsRes.ok) {
      throw new Error('Failed to fetch from Xtream Codes API');
    }

    const categories = await categoriesRes.json() as XtreamCategory[];
    const streams = await streamsRes.json() as XtreamStream[];

    console.log(`[XtreamCodes] Found ${categories.length} categories, ${streams.length} streams`);

    // Create category map
    const categoryMap = new Map<string, string>();
    categories.forEach(cat => {
      categoryMap.set(cat.category_id, cat.category_name);
    });

    // Convert streams to ParsedChannel format
    const channels: ParsedChannel[] = streams.map(stream => {
      const categoryName = categoryMap.get(stream.category_id) || 'General';
      const countryInfo = extractCountryFromCategory(categoryName);

      // Build stream URL - use original URL, frontend will use proxy
      const originalUrl = `${config.server}/live/${config.username}/${config.password}/${stream.stream_id}.m3u8`;
      // Store original URL - frontend will construct full proxy URL with its API base
      const proxyUrl = originalUrl;

      return {
        id: `xtream-${stream.stream_id}`,
        name: stream.name,
        logo: stream.stream_icon || '',
        hlsUrl: proxyUrl,
        category: categoryName,
        country: countryInfo.country,
        tvgId: stream.epg_channel_id || undefined,
        groupTitle: categoryName,
        contentType: 'live' as ContentType
      };
    });

    console.log(`[XtreamCodes] Parsed ${channels.length} channels`);
    return channels;
  } catch (error) {
    console.error('[XtreamCodes] Error:', error);
    return [];
  }
}

/**
 * Fetch VOD (movies) from Xtream Codes API
 */
export async function parseXtreamVod(config: XtreamConfig): Promise<ParsedChannel[]> {
  try {
    console.log(`[XtreamCodes] Fetching VOD from: ${config.server}`);

    const baseUrl = `${config.server}/player_api.php?username=${config.username}&password=${config.password}`;

    const [categoriesRes, streamsRes] = await Promise.all([
      fetch(`${baseUrl}&action=get_vod_categories`),
      fetch(`${baseUrl}&action=get_vod_streams`)
    ]);

    if (!categoriesRes.ok || !streamsRes.ok) {
      throw new Error('Failed to fetch VOD from Xtream Codes API');
    }

    const categories = await categoriesRes.json() as XtreamCategory[];
    const streams = await streamsRes.json() as XtreamVodStream[];

    console.log(`[XtreamCodes] Found ${categories.length} VOD categories, ${streams.length} VOD streams`);

    const categoryMap = new Map<string, string>();
    categories.forEach(cat => {
      categoryMap.set(cat.category_id, cat.category_name);
    });

    const channels: ParsedChannel[] = streams.map(stream => {
      const categoryName = categoryMap.get(stream.category_id) || 'Movies';

      // Extract year from name if present
      const yearMatch = stream.name.match(/\((\d{4})\)/);
      const year = yearMatch ? parseInt(yearMatch[1]) : undefined;

      // Build VOD URL - use container_extension for direct video (Xtream doesn't support HLS for VOD)
      const extension = stream.container_extension || 'mkv';
      const streamUrl = `${config.server}/movie/${config.username}/${config.password}/${stream.stream_id}.${extension}`;

      return {
        id: `vod-${stream.stream_id}`,
        name: stream.name,
        logo: stream.stream_icon || '',
        hlsUrl: streamUrl,
        category: categoryName,
        groupTitle: categoryName,
        contentType: 'movie' as ContentType,
        year,
        isDirectVideo: true // Flag for frontend to use video-proxy instead of hls-proxy
      };
    });

    console.log(`[XtreamCodes] Parsed ${channels.length} VOD items`);
    return channels;
  } catch (error) {
    console.error('[XtreamCodes] VOD Error:', error);
    return [];
  }
}

/**
 * Fetch Series from Xtream Codes API
 */
export async function parseXtreamSeries(config: XtreamConfig): Promise<ParsedChannel[]> {
  try {
    console.log(`[XtreamCodes] Fetching Series from: ${config.server}`);

    const baseUrl = `${config.server}/player_api.php?username=${config.username}&password=${config.password}`;

    const [categoriesRes, seriesRes] = await Promise.all([
      fetch(`${baseUrl}&action=get_series_categories`),
      fetch(`${baseUrl}&action=get_series`)
    ]);

    if (!categoriesRes.ok || !seriesRes.ok) {
      throw new Error('Failed to fetch Series from Xtream Codes API');
    }

    const categories = await categoriesRes.json() as XtreamCategory[];
    const series = await seriesRes.json() as XtreamSeriesStream[];

    console.log(`[XtreamCodes] Found ${categories.length} Series categories, ${series.length} series`);

    const categoryMap = new Map<string, string>();
    categories.forEach(cat => {
      categoryMap.set(cat.category_id, cat.category_name);
    });

    // For series, we create a placeholder entry - episodes would need to be fetched per series
    const channels: ParsedChannel[] = series.map(s => {
      const categoryName = categoryMap.get(s.category_id) || 'Series';

      // Extract year from release date
      const yearMatch = s.release_date?.match(/(\d{4})/);
      const year = yearMatch ? parseInt(yearMatch[1]) : undefined;

      return {
        id: `series-${s.series_id}`,
        name: s.name,
        logo: s.cover || '',
        hlsUrl: '', // Series need episode selection
        category: categoryName,
        groupTitle: categoryName,
        contentType: 'series' as ContentType,
        year,
        seriesInfo: {
          seriesName: s.name,
          season: 1,
          episode: 1
        }
      };
    });

    console.log(`[XtreamCodes] Parsed ${channels.length} series`);
    return channels;
  } catch (error) {
    console.error('[XtreamCodes] Series Error:', error);
    return [];
  }
}

/**
 * Extract country code from category name (e.g., "UK| GENERAL" → "UK")
 */
function extractCountryFromCategory(categoryName: string): { country?: string } {
  const match = categoryName.match(/^([A-Z]{2})\|/);
  if (match) {
    return { country: match[1] };
  }
  return {};
}

/**
 * Get predefined playlist URLs
 * Default: Local Turkish IPTV playlist
 */
export function getDefaultPlaylistUrls(): string[] {
  // Use relative path from this file to the M3U file in server root
  const path = require('path');
  const localPlaylist = path.join(__dirname, '..', '..', 'ByteFixRepairsTurkIPTV.m3u');
  return [localPlaylist];
}
