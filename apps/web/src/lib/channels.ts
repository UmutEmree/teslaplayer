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

export async function startStream(channelId?: string, url?: string): Promise<{ wsPath: string; viewerCount: number }> {
  const res = await fetch(`${API_URL}/api/stream/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ channelId, url })
  });

  if (!res.ok) {
    throw new Error('Failed to start stream');
  }

  return res.json();
}

export async function stopStream(channelId?: string, url?: string): Promise<void> {
  await fetch(`${API_URL}/api/stream/stop`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ channelId, url })
  });
}

export interface CategoryInfo {
  name: string;
  count: number;
}

export interface PaginatedMovies {
  movies: Channel[];
  total: number;
  page: number;
  totalPages: number;
}

export interface SeriesItem {
  id: string;
  name: string;
  logo: string;
  category: string;
  year?: number;
}

export interface PaginatedSeries {
  series: SeriesItem[];
  total: number;
  page: number;
  totalPages: number;
}

export async function getMovieCategories(): Promise<CategoryInfo[]> {
  try {
    const res = await fetch(`${API_URL}/api/content/movies/categories`, {
      cache: 'no-store'
    });
    if (!res.ok) throw new Error('Failed to fetch movie categories');
    return res.json();
  } catch (error) {
    console.error('Error fetching movie categories:', error);
    return [];
  }
}

export async function getMoviesByCategory(categoryName: string, page = 1, limit = 50): Promise<PaginatedMovies> {
  try {
    const res = await fetch(
      `${API_URL}/api/content/movies/category/${encodeURIComponent(categoryName)}?page=${page}&limit=${limit}`,
      { cache: 'no-store' }
    );
    if (!res.ok) throw new Error('Failed to fetch movies');
    return res.json();
  } catch (error) {
    console.error('Error fetching movies by category:', error);
    return { movies: [], total: 0, page: 1, totalPages: 0 };
  }
}

export async function getSeriesCategories(): Promise<CategoryInfo[]> {
  try {
    const res = await fetch(`${API_URL}/api/content/series/categories`, {
      cache: 'no-store'
    });
    if (!res.ok) throw new Error('Failed to fetch series categories');
    return res.json();
  } catch (error) {
    console.error('Error fetching series categories:', error);
    return [];
  }
}

export async function getSeriesByCategory(categoryName: string, page = 1, limit = 50): Promise<PaginatedSeries> {
  try {
    const res = await fetch(
      `${API_URL}/api/content/series/category/${encodeURIComponent(categoryName)}?page=${page}&limit=${limit}`,
      { cache: 'no-store' }
    );
    if (!res.ok) throw new Error('Failed to fetch series');
    return res.json();
  } catch (error) {
    console.error('Error fetching series by category:', error);
    return { series: [], total: 0, page: 1, totalPages: 0 };
  }
}

// Deprecated - use getMovieCategories and getMoviesByCategory instead
export async function getMovies(): Promise<Channel[]> {
  console.warn('getMovies is deprecated, use getMovieCategories and getMoviesByCategory');
  return [];
}

// Deprecated - use getSeriesCategories and getSeriesByCategory instead
export async function getSeries(): Promise<Series[]> {
  console.warn('getSeries is deprecated, use getSeriesCategories and getSeriesByCategory');
  return [];
}

export interface SeriesEpisode {
  id: string;
  episodeNumber: number;
  name: string;
  hlsUrl: string;
  isDirectVideo?: boolean; // true for direct video files (mkv, mp4), false for HLS
}

export interface SeriesSeason {
  seasonNumber: number;
  episodes: SeriesEpisode[];
}

export interface SeriesDetail {
  id: string;
  name: string;
  cover: string;
  plot: string;
  seasons: SeriesSeason[];
}

export async function getSeriesEpisodes(seriesId: string): Promise<SeriesDetail | null> {
  try {
    const res = await fetch(`${API_URL}/api/content/series/${seriesId}/episodes`, {
      cache: 'no-store'
    });
    if (!res.ok) return null;
    return res.json();
  } catch (error) {
    console.error('Error fetching series episodes:', error);
    return null;
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
