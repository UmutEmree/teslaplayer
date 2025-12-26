interface ParsedChannel {
  id: string;
  name: string;
  logo: string;
  hlsUrl: string;
  category: string;
  country?: string;
  tvgId?: string;
  groupTitle?: string;
}

/**
 * Parse M3U8 playlist and extract channel information
 * Supports both Xtream Codes format and standard M3U8
 */
export async function parseM3U8(url: string): Promise<ParsedChannel[]> {
  try {
    console.log(`[M3U8Parser] Fetching playlist from: ${url}`);
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch M3U8: ${response.status} ${response.statusText}`);
    }

    const text = await response.text();
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

          channels.push({
            id,
            name: channelName,
            logo: tvgLogo || generatePlaceholderLogo(channelName),
            hlsUrl: streamUrl,
            category: groupTitle || detectCategory(url, channelName),
            country: tvgCountry || extractCountryFromUrl(url),
            tvgId,
            groupTitle
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
      allChannels.push(...result.value);
    } else {
      console.error(`[M3U8Parser] Failed to parse ${urls[index]}:`, result.reason);
    }
  });

  // Deduplicate channels by ID
  const uniqueChannels = deduplicateChannels(allChannels);
  console.log(`[M3U8Parser] Total unique channels: ${uniqueChannels.length}`);

  return uniqueChannels;
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
