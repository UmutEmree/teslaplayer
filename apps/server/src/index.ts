import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { config, initializeChannels } from './config';
import { streamRouter } from './routes/stream';
import { channelsRouter } from './routes/channels';
import { contentRouter } from './routes/content';
import { StreamManager } from './services/StreamManager';

const app = express();
export const httpServer = createServer(app);

// Middleware - CORS with Vercel support
app.use(cors({
  origin: (origin, callback) => {
    // Allow no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);

    // Allow localhost for development
    if (origin.includes('localhost')) return callback(null, true);

    // Allow all Vercel deployments (preview + production)
    if (origin.includes('vercel.app')) return callback(null, true);

    // Allow configured origins
    if (config.corsOrigins.includes(origin)) return callback(null, true);

    // Reject others
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));
app.use(express.json());

// Initialize stream manager and set HTTP server for WebSocket
export const streamManager = new StreamManager();
streamManager.setHttpServer(httpServer);

// Routes
app.use('/api/stream', streamRouter);
app.use('/api/channels', channelsRouter);
app.use('/api/content', contentRouter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Initialize and start server
async function startServer() {
  try {
    // Load channels from M3U8 playlists
    await initializeChannels();

    // Start HTTP server
    httpServer.listen(config.port, () => {
      console.log(`Tesla Player Server running on port ${config.port}`);
      console.log(`WebSocket enabled on same port (wss://)`);
      console.log(`CORS: All Vercel domains allowed`);
      console.log(`Channels available: ${config.channels.length}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
