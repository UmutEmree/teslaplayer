import { WebSocketServer, WebSocket } from 'ws';
import { EventEmitter } from 'events';
import { Server as HTTPServer } from 'http';

const STREAM_MAGIC_BYTES = 'jsmp';

export class WebSocketRelay extends EventEmitter {
  private wss: WebSocketServer | null = null;
  private clients: Set<WebSocket> = new Set();
  public path: string;
  private width: number;
  private height: number;

  constructor(path: string, width = 640, height = 360) {
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
        resolve();
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
    console.log(`[WebSocket] Server stopped on path ${this.path}`);
  }

  getViewerCount(): number {
    return this.clients.size;
  }
}
