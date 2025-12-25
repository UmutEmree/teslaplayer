import { WebSocketServer, WebSocket } from 'ws';
import { EventEmitter } from 'events';

const STREAM_MAGIC_BYTES = 'jsmp';

export class WebSocketRelay extends EventEmitter {
  private wss: WebSocketServer | null = null;
  private clients: Set<WebSocket> = new Set();
  public port: number;
  private width: number;
  private height: number;

  constructor(port: number, width = 960, height = 540) {
    super();
    this.port = port;
    this.width = width;
    this.height = height;
  }

  start(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.wss = new WebSocketServer({ port: this.port });

        this.wss.on('connection', (ws: WebSocket) => {
          console.log(`[WebSocket] Client connected on port ${this.port}`);
          this.clients.add(ws);

          // Send JSMpeg header
          const header = Buffer.alloc(8);
          header.write(STREAM_MAGIC_BYTES);
          header.writeUInt16BE(this.width, 4);
          header.writeUInt16BE(this.height, 6);
          ws.send(header);

          this.emit('viewer:connect', this.clients.size);

          ws.on('close', () => {
            console.log(`[WebSocket] Client disconnected from port ${this.port}`);
            this.clients.delete(ws);
            this.emit('viewer:disconnect', this.clients.size);
          });

          ws.on('error', (error) => {
            console.error('[WebSocket] Client error:', error);
            this.clients.delete(ws);
          });
        });

        this.wss.on('listening', () => {
          console.log(`[WebSocket] Server listening on port ${this.port}`);
          resolve();
        });

        this.wss.on('error', (error) => {
          console.error('[WebSocket] Server error:', error);
          reject(error);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  broadcast(data: Buffer): void {
    for (const client of this.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    }
  }

  stop(): void {
    for (const client of this.clients) {
      client.close();
    }
    this.clients.clear();

    if (this.wss) {
      this.wss.close();
      this.wss = null;
    }
    console.log(`[WebSocket] Server stopped on port ${this.port}`);
  }

  getViewerCount(): number {
    return this.clients.size;
  }
}
