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
          const contentInfo = parseContentInfo(cleanedName, category);

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
 * Parse content type and series information from channel name
 */
function parseContentInfo(name: string, groupTitle: string): {
  contentType: ContentType;
  seriesInfo?: SeriesInfo;
  year?: number;
} {
  // Check for series pattern: S01E02, S01 E02, etc.
  const seriesPattern = /S(\d+)\s*E(\d+)/i;
  const seriesMatch = name.match(seriesPattern);

  if (seriesMatch) {
    const season = parseInt(seriesMatch[1]);
    const episode = parseInt(seriesMatch[2]);

    // Extract series name (everything before S01E02)
    const seriesName = name
      .replace(seriesPattern, '')
      .replace(/\s+/g, ' ')
      .trim();

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

  // Check for live TV indicators
  const liveIndicators = ['live', 'tv', 'channel', 'news', 'sport'];
  const isLive = liveIndicators.some(indicator =>
    groupTitle.toLowerCase().includes(indicator)
  );

  if (isLive) {
    return { contentType: 'live' };
  }

  // Default to movie
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
 * Get predefined playlist URLs from the m3u8-xtream-playlist repo
 */
export function getDefaultPlaylistUrls(): string[] {
  return [
    // Top content
    'https://aymrgknetzpucldhpkwm.supabase.co/storage/v1/object/public/tmdb/trending-series.m3u',
    'https://aymrgknetzpucldhpkwm.supabase.co/storage/v1/object/public/tmdb/top-movies.m3u',

    // Popular genres
    'https://aymrgknetzpucldhpkwm.supabase.co/storage/v1/object/public/tmdb/action-movies.m3u',
    'https://aymrgknetzpucldhpkwm.supabase.co/storage/v1/object/public/tmdb/comedy-movies.m3u',
    'https://aymrgknetzpucldhpkwm.supabase.co/storage/v1/object/public/tmdb/horror-movies.m3u',
    'https://aymrgknetzpucldhpkwm.supabase.co/storage/v1/object/public/tmdb/science-fiction-movies.m3u',

    // Live TV categories
    'https://iptv-org.github.io/iptv/categories/entertainment.m3u',
    'https://iptv-org.github.io/iptv/categories/news.m3u',
    'https://iptv-org.github.io/iptv/categories/sports.m3u',
  ];
}
