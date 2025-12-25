import { Router, Request, Response } from 'express';
import { streamManager } from '../index';

export const streamRouter = Router();

// Start a stream
streamRouter.post('/start', async (req: Request, res: Response) => {
  try {
    const { channelId } = req.body;

    if (!channelId) {
      return res.status(400).json({ error: 'channelId is required' });
    }

    const result = await streamManager.startStream(channelId);
    res.json(result);
  } catch (error) {
    console.error('[Stream Route] Error starting stream:', error);
    res.status(500).json({ error: (error as Error).message });
  }
});

// Stop watching a stream
streamRouter.post('/stop', async (req: Request, res: Response) => {
  try {
    const { channelId } = req.body;

    if (!channelId) {
      return res.status(400).json({ error: 'channelId is required' });
    }

    await streamManager.stopStream(channelId);
    res.json({ success: true });
  } catch (error) {
    console.error('[Stream Route] Error stopping stream:', error);
    res.status(500).json({ error: (error as Error).message });
  }
});

// Get stream status
streamRouter.get('/status/:channelId', (req: Request, res: Response) => {
  const { channelId } = req.params;
  const status = streamManager.getStatus(channelId);
  res.json(status);
});

// Get all active sessions
streamRouter.get('/sessions', (req: Request, res: Response) => {
  const sessions = streamManager.getAllSessions();
  res.json(sessions);
});
