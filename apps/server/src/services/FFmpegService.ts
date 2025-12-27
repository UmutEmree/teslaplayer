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
      // Input options - optimized for HLS live streams
      '-fflags', '+genpts+discardcorrupt+igndts',
      '-flags', 'low_delay',
      '-avioflags', 'direct',
      '-rtbufsize', '32M',
      '-thread_queue_size', '512',
      '-analyzeduration', '2000000',
      '-probesize', '2000000',
      '-i', this.hlsUrl,

      // Video encoding - MPEG1 for JSMpeg
      '-c:v', 'mpeg1video',
      '-b:v', '2500k',
      '-maxrate', '2500k',
      '-bufsize', '5000k',
      '-s', '1280x720',
      '-r', '25',
      '-g', '25',
      '-bf', '0',
      '-threads', '4',
      '-vsync', 'passthrough',
      '-copyts',
      '-start_at_zero',
      '-max_muxing_queue_size', '2048',

      // Audio encoding - MP2 for JSMpeg
      '-c:a', 'mp2',
      '-ar', '44100',
      '-ac', '2',
      '-b:a', '128k',

      // Output format - MPEG-TS
      '-f', 'mpegts',
      '-muxdelay', '0',
      '-muxpreload', '0',
      '-flush_packets', '1',

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
