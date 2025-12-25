import { EventEmitter } from 'events';
import { FFmpegService } from './FFmpegService';
import { WebSocketRelay } from './WebSocketRelay';
import { config } from '../config';

interface StreamSession {
  id: string;
  channelId: string;
  ffmpeg: FFmpegService;
  wsRelay: WebSocketRelay;
  viewerCount: number;
  createdAt: Date;
}

export class StreamManager extends EventEmitter {
  private sessions: Map<string, StreamSession> = new Map();
  private portOffset: number = 0;

  async startStream(channelId: string): Promise<{ wsPort: number; viewerCount: number }> {
    // Check if stream already exists
    if (this.sessions.has(channelId)) {
      const session = this.sessions.get(channelId)!;
      session.viewerCount++;
      console.log(`[StreamManager] Viewer joined ${channelId}, count: ${session.viewerCount}`);
      return {
        wsPort: session.wsRelay.port,
        viewerCount: session.viewerCount
      };
    }

    // Find channel
    const channel = config.channels.find(c => c.id === channelId);
    if (!channel) {
      throw new Error(`Channel not found: ${channelId}`);
    }

    // Calculate WebSocket port
    const wsPort = config.wsBasePort + this.portOffset;
    this.portOffset++;

    console.log(`[StreamManager] Starting stream for ${channelId} on port ${wsPort}`);

    // Create WebSocket relay
    const wsRelay = new WebSocketRelay(wsPort);
    await wsRelay.start();

    // Create FFmpeg service
    const ffmpeg = new FFmpegService(channel.hlsUrl);

    // Pipe FFmpeg output to WebSocket
    ffmpeg.on('data', (data: Buffer) => {
      wsRelay.broadcast(data);
    });

    ffmpeg.on('close', () => {
      console.log(`[StreamManager] FFmpeg closed for ${channelId}`);
      this.cleanupSession(channelId);
    });

    ffmpeg.on('error', (error) => {
      console.error(`[StreamManager] FFmpeg error for ${channelId}:`, error);
    });

    // Start FFmpeg
    ffmpeg.start();

    // Create session
    const session: StreamSession = {
      id: `${channelId}-${Date.now()}`,
      channelId,
      ffmpeg,
      wsRelay,
      viewerCount: 1,
      createdAt: new Date()
    };

    this.sessions.set(channelId, session);

    return {
      wsPort,
      viewerCount: session.viewerCount
    };
  }

  async stopStream(channelId: string): Promise<void> {
    const session = this.sessions.get(channelId);
    if (!session) {
      console.log(`[StreamManager] No session found for ${channelId}`);
      return;
    }

    session.viewerCount--;
    console.log(`[StreamManager] Viewer left ${channelId}, count: ${session.viewerCount}`);

    // Cleanup if no viewers
    if (session.viewerCount <= 0) {
      this.cleanupSession(channelId);
    }
  }

  private cleanupSession(channelId: string): void {
    const session = this.sessions.get(channelId);
    if (!session) return;

    console.log(`[StreamManager] Cleaning up session for ${channelId}`);

    session.ffmpeg.stop();
    session.wsRelay.stop();
    this.sessions.delete(channelId);
  }

  getStatus(channelId: string): { active: boolean; viewerCount: number; wsPort?: number } {
    const session = this.sessions.get(channelId);
    if (!session) {
      return { active: false, viewerCount: 0 };
    }
    return {
      active: true,
      viewerCount: session.viewerCount,
      wsPort: session.wsRelay.port
    };
  }

  getAllSessions(): Array<{ channelId: string; viewerCount: number; wsPort: number; createdAt: Date }> {
    return Array.from(this.sessions.values()).map(s => ({
      channelId: s.channelId,
      viewerCount: s.viewerCount,
      wsPort: s.wsRelay.port,
      createdAt: s.createdAt
    }));
  }
}
