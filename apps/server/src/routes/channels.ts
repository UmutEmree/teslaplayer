import { Router, Request, Response } from 'express';
import { config } from '../config';

export const channelsRouter = Router();

// Get all channels
channelsRouter.get('/', (req: Request, res: Response) => {
  const channels = config.channels.map(c => ({
    id: c.id,
    name: c.name,
    logo: c.logo
  }));
  res.json(channels);
});

// Get single channel
channelsRouter.get('/:id', (req: Request, res: Response) => {
  const channel = config.channels.find(c => c.id === req.params.id);

  if (!channel) {
    return res.status(404).json({ error: 'Channel not found' });
  }

  res.json({
    id: channel.id,
    name: channel.name,
    logo: channel.logo
  });
});
