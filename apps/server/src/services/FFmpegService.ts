import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import { config } from '../config';

export class FFmpegService extends EventEmitter {
  private process: ChildProcess | null = null;
  private hlsUrl: string;

  constructor(hlsUrl: string) {
    super();
    this.hlsUrl = hlsUrl;
  }

  start(): void {
    const args = [
      // Input options
      '-re',
      '-i', this.hlsUrl,

      // Video encoding - MPEG1 for JSMpeg (quality-based)
      '-c:v', 'mpeg1video',
      '-q:v', '8',
      '-s', '640x360',
      '-r', '24',

      // Audio encoding - MP2 for JSMpeg
      '-c:a', 'mp2',
      '-ar', '44100',
      '-ac', '1',
      '-b:a', '128k',

      // Output format - MPEG-TS
      '-f', 'mpegts',

      // Output to stdout
      'pipe:1'
    ];

    console.log('[FFmpeg] Starting with URL:', this.hlsUrl);

    this.process = spawn('ffmpeg', args);

    this.process.stdout?.on('data', (data: Buffer) => {
      this.emit('data', data);
    });

    this.process.stderr?.on('data', (data: Buffer) => {
      const message = data.toString();
      // Only log non-verbose messages
      if (message.includes('Error') || message.includes('error')) {
        console.error('[FFmpeg Error]', message);
        this.emit('error', new Error(message));
      }
    });

    this.process.on('close', (code) => {
      console.log('[FFmpeg] Process closed with code:', code);
      this.emit('close', code);
    });

    this.process.on('error', (error) => {
      console.error('[FFmpeg] Process error:', error);
      this.emit('error', error);
    });
  }

  stop(): void {
    if (this.process) {
      console.log('[FFmpeg] Stopping process');
      this.process.kill('SIGTERM');
      this.process = null;
    }
  }

  isRunning(): boolean {
    return this.process !== null && !this.process.killed;
  }
}
