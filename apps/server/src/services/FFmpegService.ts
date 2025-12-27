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
      // Input options - streaming optimizations
      '-fflags', '+genpts+discardcorrupt+nobuffer',
      '-flags', 'low_delay',
      '-strict', 'experimental',
      '-analyzeduration', '1000000',
      '-probesize', '1000000',
      '-re',                // Read input at native frame rate (prevents fast playback)
      '-i', this.hlsUrl,

      // Video encoding - MPEG1 for JSMpeg (720p @ 30fps - high quality for dedicated server)
      '-c:v', 'mpeg1video',
      '-b:v', '3000k',
      '-s', '1280x720',
      '-r', '30',
      '-g', '30',           // Keyframe every 30 frames (1 sec)
      '-bf', '0',           // No B-frames for lower latency
      '-threads', '4',      // Use multiple threads
      '-vsync', 'cfr',      // Constant frame rate - prevents speed fluctuations
      '-max_muxing_queue_size', '1024',

      // Audio encoding - MP2 for JSMpeg (Stereo)
      '-c:a', 'mp2',
      '-ar', '44100',
      '-ac', '2',
      '-b:a', '128k',
      '-async', '1',        // Audio sync - prevents drift

      // Output format - MPEG-TS with flush
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
