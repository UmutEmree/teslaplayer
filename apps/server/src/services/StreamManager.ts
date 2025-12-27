import { EventEmitter } from 'events';
import { FFmpegService } from './FFmpegService';
import { WebSocketRelay } from './WebSocketRelay';
import { config } from '../config';
import { httpServer } from '../index';

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

  // Simple hash function for URL to create unique session keys
  private hashUrl(url: string): string {
    let hash = 0;
    for (let i = 0; i < url.length; i++) {
      const char = url.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  }

  async startStream(channelId: string, directUrl?: string): Promise<{ wsPath: string; viewerCount: number }> {
    // Use a unique session key - for VOD with URL, include a hash of the URL
    const sessionKey = directUrl ? `vod_${this.hashUrl(directUrl)}` : channelId;

    // Check if stream already exists
    if (this.sessions.has(sessionKey)) {
      const session = this.sessions.get(sessionKey)!;
      session.viewerCount++;
      console.log(`[StreamManager] Viewer joined ${sessionKey}, count: ${session.viewerCount}`);
      return {
        wsPath: session.wsRelay.path,
        viewerCount: session.viewerCount
      };
    }

    let streamUrl: string;

    // If directUrl is provided, use it (for VOD content)
    if (directUrl) {
      streamUrl = directUrl;
      console.log(`[StreamManager] Using direct URL for VOD: ${directUrl}`);
    } else {
      // Find channel from config (for live TV)
      const channel = config.channels.find(c => c.id === channelId);
      if (!channel) {
        throw new Error(`Channel not found: ${channelId}`);
      }
      streamUrl = channel.hlsUrl;
    }

    // WebSocket path for this stream
    const wsPath = `/stream/${sessionKey}`;

    console.log(`[StreamManager] Starting stream for ${sessionKey} on path ${wsPath}`);

    // Create WebSocket relay
    const wsRelay = new WebSocketRelay(wsPath);
    await wsRelay.start(httpServer);

    // Create FFmpeg service
    const ffmpeg = new FFmpegService(streamUrl);

    // Pipe FFmpeg output to WebSocket
    ffmpeg.on('data', (data: Buffer) => {
      wsRelay.broadcast(data);
    });

    ffmpeg.on('close', () => {
      console.log(`[StreamManager] FFmpeg closed for ${sessionKey}`);
      this.cleanupSession(sessionKey);
    });

    ffmpeg.on('error', (error) => {
      console.error(`[StreamManager] FFmpeg error for ${sessionKey}:`, error);
    });

    // Start FFmpeg
    ffmpeg.start();

    // Create session
    const session: StreamSession = {
      id: `${sessionKey}-${Date.now()}`,
      channelId: sessionKey,
      ffmpeg,
      wsRelay,
      viewerCount: 1,
      createdAt: new Date()
    };

    this.sessions.set(sessionKey, session);

    return {
      wsPath,
      viewerCount: session.viewerCount
    };
  }

  async stopStream(channelId: string, directUrl?: string): Promise<void> {
    const sessionKey = directUrl ? `vod_${this.hashUrl(directUrl)}` : channelId;
    const session = this.sessions.get(sessionKey);
    if (!session) {
      console.log(`[StreamManager] No session found for ${sessionKey}`);
      return;
    }

    session.viewerCount--;
    console.log(`[StreamManager] Viewer left ${sessionKey}, count: ${session.viewerCount}`);

    // Cleanup if no viewers
    if (session.viewerCount <= 0) {
      this.cleanupSession(sessionKey);
    }
  }

  private cleanupSession(sessionKey: string): void {
    const session = this.sessions.get(sessionKey);
    if (!session) return;

    console.log(`[StreamManager] Cleaning up session for ${sessionKey}`);

    session.ffmpeg.stop();
    session.wsRelay.stop();
    this.sessions.delete(sessionKey);
  }

  getStatus(channelId: string, directUrl?: string): { active: boolean; viewerCount: number; wsPath?: string } {
    const sessionKey = directUrl ? `vod_${this.hashUrl(directUrl)}` : channelId;
    const session = this.sessions.get(sessionKey);
    if (!session) {
      return { active: false, viewerCount: 0 };
    }
    return {
      active: true,
      viewerCount: session.viewerCount,
      wsPath: session.wsRelay.path
    };
  }

  getAllSessions(): Array<{ channelId: string; viewerCount: number; wsPath: string; createdAt: Date }> {
    return Array.from(this.sessions.values()).map(s => ({
      channelId: s.channelId,
      viewerCount: s.viewerCount,
      wsPath: s.wsRelay.path,
      createdAt: s.createdAt
    }));
  }
}
