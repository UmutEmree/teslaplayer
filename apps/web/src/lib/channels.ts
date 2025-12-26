export type ContentType = 'movie' | 'series' | 'live';

export interface SeriesInfo {
  seriesName: string;
  season: number;
  episode: number;
  episodeTitle?: string;
}

export interface Channel {
  id: string;
  name: string;
  logo: string;
  hlsUrl: string;
  category: string;
  country?: string;
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

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export async function getChannels(): Promise<Channel[]> {
  try {
    const res = await fetch(`${API_URL}/api/channels`, {
      cache: 'no-store'
    });
    if (!res.ok) throw new Error('Failed to fetch channels');
    return res.json();
  } catch (error) {
    console.error('Error fetching channels:', error);
    // Fallback channels
    return [
      {
        id: 'showtv',
        name: 'Show TV',
        logo: '/channels/showtv.png',
        hlsUrl: 'https://rmtftbjlne.turknet.ercdn.net/bpeytmnqyp/showtv/showtv_480p.m3u8',
        category: 'Entertainment',
        contentType: 'live' as ContentType
      }
    ];
  }
}

export async function startStream(channelId: string): Promise<{ wsPath: string; viewerCount: number }> {
  const res = await fetch(`${API_URL}/api/stream/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ channelId })
  });

  if (!res.ok) {
    throw new Error('Failed to start stream');
  }

  return res.json();
}

export async function stopStream(channelId: string): Promise<void> {
  await fetch(`${API_URL}/api/stream/stop`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ channelId })
  });
}

export async function getMovies(): Promise<Channel[]> {
  try {
    const res = await fetch(`${API_URL}/api/content/movies`, {
      cache: 'no-store'
    });
    if (!res.ok) throw new Error('Failed to fetch movies');
    return res.json();
  } catch (error) {
    console.error('Error fetching movies:', error);
    return [];
  }
}

export async function getSeries(): Promise<Series[]> {
  try {
    const res = await fetch(`${API_URL}/api/content/series`, {
      cache: 'no-store'
    });
    if (!res.ok) throw new Error('Failed to fetch series');
    return res.json();
  } catch (error) {
    console.error('Error fetching series:', error);
    return [];
  }
}

export async function getLiveChannels(): Promise<Channel[]> {
  try {
    const res = await fetch(`${API_URL}/api/content/live`, {
      cache: 'no-store'
    });
    if (!res.ok) throw new Error('Failed to fetch live channels');
    return res.json();
  } catch (error) {
    console.error('Error fetching live channels:', error);
    return [];
  }
}
