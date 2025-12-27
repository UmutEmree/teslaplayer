import { Router } from 'express';
import { config } from '../config';
import { groupSeries } from '../utils/m3u8Parser';

const router = Router();

// Cache for categories to avoid recalculating on every request
let movieCategoriesCache: { name: string; count: number }[] | null = null;
let seriesCategoriesCache: { name: string; count: number }[] | null = null;

/**
 * Get movie categories with counts (lightweight endpoint)
 */
router.get('/movies/categories', (req, res) => {
  if (!movieCategoriesCache) {
    const movies = config.channels.filter(ch => ch.contentType === 'movie');
    const categoryMap = new Map<string, number>();

    movies.forEach(movie => {
      const cat = movie.category || 'Diğer';
      categoryMap.set(cat, (categoryMap.get(cat) || 0) + 1);
    });

    movieCategoriesCache = Array.from(categoryMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }

  res.json(movieCategoriesCache);
});

/**
 * Get movies by category (lazy loading)
 */
router.get('/movies/category/:categoryName', (req, res) => {
  const { categoryName } = req.params;
  const { page = '1', limit = '50' } = req.query;

  const pageNum = parseInt(page as string);
  const limitNum = parseInt(limit as string);

  const movies = config.channels.filter(ch =>
    ch.contentType === 'movie' &&
    (ch.category === categoryName || (categoryName === 'Diğer' && !ch.category))
  );

  const startIndex = (pageNum - 1) * limitNum;
  const paginatedMovies = movies.slice(startIndex, startIndex + limitNum);

  res.json({
    movies: paginatedMovies,
    total: movies.length,
    page: pageNum,
    totalPages: Math.ceil(movies.length / limitNum)
  });
});

/**
 * Get all movies (deprecated - use categories endpoint instead)
 */
router.get('/movies', (req, res) => {
  // Return empty array to prevent loading all 74K movies
  // Frontend should use /movies/categories and /movies/category/:name instead
  res.json([]);
});

/**
 * Get series categories with counts (lightweight endpoint)
 */
router.get('/series/categories', (req, res) => {
  if (!seriesCategoriesCache) {
    const series = config.channels.filter(ch => ch.contentType === 'series');
    const categoryMap = new Map<string, number>();

    series.forEach(s => {
      const cat = s.category || 'Diğer';
      categoryMap.set(cat, (categoryMap.get(cat) || 0) + 1);
    });

    seriesCategoriesCache = Array.from(categoryMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }

  res.json(seriesCategoriesCache);
});

/**
 * Get series by category (lazy loading)
 */
router.get('/series/category/:categoryName', (req, res) => {
  const { categoryName } = req.params;
  const { page = '1', limit = '50' } = req.query;

  const pageNum = parseInt(page as string);
  const limitNum = parseInt(limit as string);

  // Get series in this category
  const seriesInCategory = config.channels.filter(ch =>
    ch.contentType === 'series' &&
    (ch.category === categoryName || (categoryName === 'Diğer' && !ch.category))
  );

  // Group into series (each unique seriesInfo.seriesName is one series)
  const seriesMap = new Map<string, typeof seriesInCategory[0]>();
  seriesInCategory.forEach(s => {
    if (s.seriesInfo?.seriesName && !seriesMap.has(s.seriesInfo.seriesName)) {
      seriesMap.set(s.seriesInfo.seriesName, s);
    }
  });

  const uniqueSeries = Array.from(seriesMap.values());
  const startIndex = (pageNum - 1) * limitNum;
  const paginatedSeries = uniqueSeries.slice(startIndex, startIndex + limitNum);

  res.json({
    series: paginatedSeries.map(s => ({
      id: s.id,
      name: s.seriesInfo?.seriesName || s.name,
      logo: s.logo,
      category: s.category,
      year: s.year
    })),
    total: uniqueSeries.length,
    page: pageNum,
    totalPages: Math.ceil(uniqueSeries.length / limitNum)
  });
});

/**
 * Get all series grouped by show/season/episode (deprecated)
 */
router.get('/series', (req, res) => {
  // Return empty array to prevent loading all data
  // Frontend should use /series/categories and /series/category/:name instead
  res.json([]);
});

/**
 * Get series episodes by series ID
 */
router.get('/series/:seriesId/episodes', async (req, res) => {
  const { seriesId } = req.params;

  // Extract numeric ID from series-XXXXX format
  const numericId = seriesId.replace('series-', '');

  try {
    // Get Xtream config
    const { getDefaultXtreamConfig } = await import('../utils/m3u8Parser');
    const xtreamConfig = {
      server: process.env.XTREAM_SERVER || getDefaultXtreamConfig().server,
      username: process.env.XTREAM_USERNAME || getDefaultXtreamConfig().username,
      password: process.env.XTREAM_PASSWORD || getDefaultXtreamConfig().password
    };

    // Fetch series info from Xtream API
    const apiUrl = `${xtreamConfig.server}/player_api.php?username=${xtreamConfig.username}&password=${xtreamConfig.password}&action=get_series_info&series_id=${numericId}`;

    const response = await fetch(apiUrl);
    if (!response.ok) {
      return res.status(404).json({ error: 'Series not found' });
    }

    const seriesInfo = await response.json() as {
      episodes?: Record<string, Array<{ id: string; episode_num: number; title?: string; container_extension?: string }>>;
      info?: { name?: string; cover?: string; plot?: string };
    };

    // Transform episodes into a usable format
    const seasons: { seasonNumber: number; episodes: { id: string; episodeNumber: number; name: string; hlsUrl: string }[] }[] = [];

    if (seriesInfo.episodes) {
      Object.entries(seriesInfo.episodes).forEach(([seasonNum, episodes]: [string, any]) => {
        const seasonEpisodes = (episodes as any[]).map((ep: any) => {
          // Use container_extension for direct video file (Xtream doesn't support HLS for series)
          const extension = ep.container_extension || 'mkv';
          return {
            id: `episode-${ep.id}`,
            episodeNumber: ep.episode_num || 1,
            name: ep.title || `Episode ${ep.episode_num}`,
            hlsUrl: `${xtreamConfig.server}/series/${xtreamConfig.username}/${xtreamConfig.password}/${ep.id}.${extension}`,
            isDirectVideo: true // Flag to indicate this is a direct video file, not HLS
          };
        });

        seasons.push({
          seasonNumber: parseInt(seasonNum),
          episodes: seasonEpisodes.sort((a, b) => a.episodeNumber - b.episodeNumber)
        });
      });
    }

    res.json({
      id: seriesId,
      name: seriesInfo.info?.name || 'Unknown Series',
      cover: seriesInfo.info?.cover || '',
      plot: seriesInfo.info?.plot || '',
      seasons: seasons.sort((a, b) => a.seasonNumber - b.seasonNumber)
    });
  } catch (error) {
    console.error('[Content] Error fetching series info:', error);
    res.status(500).json({ error: 'Failed to fetch series info' });
  }
});

/**
 * Get all live TV channels
 */
router.get('/live', (req, res) => {
  const liveChannels = config.channels.filter(ch => ch.contentType === 'live');
  res.json(liveChannels);
});

/**
 * Get content statistics
 */
router.get('/stats', (req, res) => {
  const stats = {
    total: config.channels.length,
    movies: config.channels.filter(ch => ch.contentType === 'movie').length,
    series: groupSeries(config.channels).length,
    seriesEpisodes: config.channels.filter(ch => ch.contentType === 'series').length,
    live: config.channels.filter(ch => ch.contentType === 'live').length,
  };
  res.json(stats);
});

// Clear cache when channels are reloaded
export function clearContentCache() {
  movieCategoriesCache = null;
  seriesCategoriesCache = null;
}

export const contentRouter = router;
