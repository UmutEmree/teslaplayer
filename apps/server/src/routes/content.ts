import { Router } from 'express';
import { config } from '../config';
import { groupSeries } from '../utils/m3u8Parser';

const router = Router();

/**
 * Get all movies
 */
router.get('/movies', (req, res) => {
  const movies = config.channels.filter(ch => ch.contentType === 'movie');
  res.json(movies);
});

/**
 * Get all series grouped by show/season/episode
 */
router.get('/series', (req, res) => {
  const series = groupSeries(config.channels);
  res.json(series);
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

export const contentRouter = router;
