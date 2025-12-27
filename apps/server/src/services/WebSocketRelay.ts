import { WebSocketServer, WebSocket } from 'ws';
import { EventEmitter } from 'events';
import { Server as HTTPServer } from 'http';

const STREAM_MAGIC_BYTES = 'jsmp';

// Throttle settings for smooth playback
const TARGET_BITRATE = 2200 * 1024; // 2200 kbps (video + audio + overhead)
const SEND_INTERVAL_MS = 40;        // Send every 40ms (25fps)
const BYTES_PER_INTERVAL = Math.floor((TARGET_BITRATE / 8) * (SEND_INTERVAL_MS / 1000));

export class WebSocketRelay extends EventEmitter {
  private wss: WebSocketServer | null = null;
  private clients: Set<WebSocket> = new Set();
  public path: string;
  private width: number;
  private height: number;

  // Throttling buffer
  private buffer: Buffer[] = [];
  private bufferSize = 0;
  private sendInterval: NodeJS.Timeout | null = null;
  private maxBufferSize = 5 * 1024 * 1024; // 5MB max buffer

  constructor(path: string, width = 1280, height = 720) {
    super();
    this.path = path;
    this.width = width;
    this.height = height;
  }

  start(httpServer: HTTPServer): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.wss = new WebSocketServer({
          server: httpServer,
          path: this.path
        });

        this.wss.on('connection', (ws: WebSocket) => {
          console.log(`[WebSocket] Client connected on path ${this.path}`);
          this.clients.add(ws);

          // Send JSMpeg header
          const header = Buffer.alloc(8);
          header.write(STREAM_MAGIC_BYTES);
          header.writeUInt16BE(this.width, 4);
          header.writeUInt16BE(this.height, 6);
          ws.send(header);

          this.emit('viewer:connect', this.clients.size);

          ws.on('close', () => {
            console.log(`[WebSocket] Client disconnected from path ${this.path}`);
            this.clients.delete(ws);
            this.emit('viewer:disconnect', this.clients.size);
          });

          ws.on('error', (error) => {
            console.error('[WebSocket] Client error:', error);
            this.clients.delete(ws);
          });
        });

        this.wss.on('error', (error) => {
          console.error('[WebSocket] Server error:', error);
          reject(error);
        });

        console.log(`[WebSocket] Server ready on path ${this.path}`);

        // Start the throttled send loop
        this.startSendLoop();

        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }

  private startSendLoop(): void {
    if (this.sendInterval) return;

    this.sendInterval = setInterval(() => {
      this.sendFromBuffer();
    }, SEND_INTERVAL_MS);
  }

  private sendFromBuffer(): void {
    if (this.buffer.length === 0 || this.clients.size === 0) return;

    let bytesToSend = BYTES_PER_INTERVAL;
    const chunks: Buffer[] = [];

    while (bytesToSend > 0 && this.buffer.length > 0) {
      const chunk = this.buffer[0];

      if (chunk.length <= bytesToSend) {
        // Send entire chunk
        chunks.push(chunk);
        bytesToSend -= chunk.length;
        this.bufferSize -= chunk.length;
        this.buffer.shift();
      } else {
        // Send partial chunk
        chunks.push(chunk.subarray(0, bytesToSend));
        this.buffer[0] = chunk.subarray(bytesToSend);
        this.bufferSize -= bytesToSend;
        bytesToSend = 0;
      }
    }

    if (chunks.length > 0) {
      const data = Buffer.concat(chunks);
      this.sendToClients(data);
    }
  }

  private sendToClients(data: Buffer): void {
    for (const client of this.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    }
  }

  broadcast(data: Buffer): void {
    // Add to buffer instead of sending immediately
    if (this.bufferSize + data.length > this.maxBufferSize) {
      // Buffer full - drop oldest data
      while (this.bufferSize + data.length > this.maxBufferSize && this.buffer.length > 0) {
        const dropped = this.buffer.shift();
        if (dropped) this.bufferSize -= dropped.length;
      }
    }

    this.buffer.push(data);
    this.bufferSize += data.length;
  }

  stop(): void {
    if (this.sendInterval) {
      clearInterval(this.sendInterval);
      this.sendInterval = null;
    }

    this.buffer = [];
    this.bufferSize = 0;

    for (const client of this.clients) {
      client.close();
    }
    this.clients.clear();

    if (this.wss) {
      this.wss.close();
      this.wss = null;
    }
    console.log(`[WebSocket] Server stopped on path ${this.path}`);
  }

  getViewerCount(): number {
    return this.clients.size;
  }
}
