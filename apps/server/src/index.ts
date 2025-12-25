import express from 'express';
import cors from 'cors';
import { config } from './config';
import { streamRouter } from './routes/stream';
import { channelsRouter } from './routes/channels';
import { StreamManager } from './services/StreamManager';

const app = express();

// Middleware
app.use(cors({
  origin: config.corsOrigins,
  credentials: true
}));
app.use(express.json());

// Initialize stream manager
export const streamManager = new StreamManager();

// Routes
app.use('/api/stream', streamRouter);
app.use('/api/channels', channelsRouter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
app.listen(config.port, () => {
  console.log(`Tesla Player Server running on port ${config.port}`);
  console.log(`WebSocket base port: ${config.wsBasePort}`);
  console.log(`CORS origins: ${config.corsOrigins.join(', ')}`);
});
