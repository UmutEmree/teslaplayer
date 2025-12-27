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
      // Input options - HLS live stream with realtime pacing
      '-re',                      // Read input at realtime (native frame rate)
      '-fflags', '+genpts+discardcorrupt',
      '-flags', 'low_delay',
      '-live_start_index', '-3',  // Start from 3rd most recent segment
      '-rw_timeout', '5000000',   // 5 second timeout
      '-analyzeduration', '3000000',
      '-probesize', '3000000',
      '-i', this.hlsUrl,

      // Video encoding - MPEG1 for JSMpeg
      '-c:v', 'mpeg1video',
      '-b:v', '2000k',
      '-s', '1280x720',
      '-r', '25',
      '-g', '50',                 // Keyframe every 2 seconds
      '-bf', '0',
      '-threads', '2',
      '-q:v', '3',                // Quality level (lower = better)
      '-vsync', 'cfr',            // Constant frame rate output
      '-max_muxing_queue_size', '512',

      // Audio encoding - MP2 for JSMpeg
      '-c:a', 'mp2',
      '-ar', '44100',
      '-ac', '2',
      '-b:a', '128k',

      // Output format - MPEG-TS realtime
      '-f', 'mpegts',
      '-mpegts_flags', '+resend_headers',
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
