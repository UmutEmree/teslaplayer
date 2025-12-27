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
      // Input options - HLS live stream (no -re, throttling is done in WebSocket relay)
      '-fflags', '+genpts+discardcorrupt',
      '-flags', 'low_delay',
      '-live_start_index', '-3',
      '-rw_timeout', '5000000',
      '-analyzeduration', '2000000',
      '-probesize', '2000000',
      '-i', this.hlsUrl,

      // Video encoding - MPEG1 for JSMpeg (match relay bitrate: 2000k)
      '-c:v', 'mpeg1video',
      '-b:v', '2000k',
      '-maxrate', '2000k',
      '-bufsize', '4000k',
      '-s', '1280x720',
      '-r', '25',
      '-g', '25',                 // Keyframe every second
      '-bf', '0',
      '-threads', '4',
      '-q:v', '4',

      // Audio encoding - MP2 for JSMpeg
      '-c:a', 'mp2',
      '-ar', '44100',
      '-ac', '2',
      '-b:a', '128k',

      // Output format - MPEG-TS
      '-f', 'mpegts',
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
