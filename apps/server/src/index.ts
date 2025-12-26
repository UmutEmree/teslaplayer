import express from 'express';
import cors from 'cors';
import { config } from './config';
import { streamRouter } from './routes/stream';
import { channelsRouter } from './routes/channels';
import { StreamManager } from './services/StreamManager';

const app = express();

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
