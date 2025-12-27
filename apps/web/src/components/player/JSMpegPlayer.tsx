'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

interface JSMpegPlayerProps {
  wsPath: string;
  channelId: string;
}

// JSMpeg types
declare global {
  interface Window {
    JSMpeg: {
      Player: new (url: string, options: JSMpegOptions) => JSMpegInstance;
    };
  }
}

interface JSMpegOptions {
  canvas?: HTMLCanvasElement;
  autoplay?: boolean;
  audio?: boolean;
  video?: boolean;
  pauseWhenHidden?: boolean;
  disableGl?: boolean;
  disableWebAssembly?: boolean;
  preserveDrawingBuffer?: boolean;
  progressive?: boolean;
  throttled?: boolean;
  chunkSize?: number;
  decodeFirstFrame?: boolean;
  maxAudioLag?: number;
  videoBufferSize?: number;
  audioBufferSize?: number;
  onSourceEstablished?: () => void;
  onSourceCompleted?: () => void;
  onStalled?: () => void;
}

interface JSMpegInstance {
  play: () => void;
  pause: () => void;
  stop: () => void;
  destroy: () => void;
  volume: number;
  currentTime: number;
  paused: boolean;
}

export function JSMpegPlayer({ wsPath, channelId }: JSMpegPlayerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const playerRef = useRef<JSMpegInstance | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isStalled, setIsStalled] = useState(false);
  const [volume, setVolume] = useState(1);
  const [showControls, setShowControls] = useState(true);

  // Construct WebSocket URL - use wss:// for production, ws:// for localhost
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
  const wsProtocol = apiUrl.startsWith('https') ? 'wss' : 'ws';
  const wsHost = apiUrl.replace(/^https?:\/\//, '');
  const wsUrl = `${wsProtocol}://${wsHost}${wsPath}`;

  useEffect(() => {
    let mounted = true;
    let retryCount = 0;
    const maxRetries = 3;

    const initPlayer = () => {
      if (!mounted || !canvasRef.current) return;

      // Wait for JSMpeg to load
      if (!window.JSMpeg) {
        if (retryCount < maxRetries) {
          retryCount++;
          setTimeout(initPlayer, 500);
        }
        return;
      }

      try {
        console.log('[JSMpeg] Connecting to:', wsUrl);

        playerRef.current = new window.JSMpeg.Player(wsUrl, {
          canvas: canvasRef.current,
          autoplay: true,
          audio: true,
          video: true,
          pauseWhenHidden: false,
          disableGl: false,
          preserveDrawingBuffer: false,
          progressive: true,
          throttled: true,
          chunkSize: 2 * 1024 * 1024,
          maxAudioLag: 0.5,
          videoBufferSize: 4 * 1024 * 1024,
          audioBufferSize: 256 * 1024,
          onSourceEstablished: () => {
            console.log('[JSMpeg] Source established');
            if (mounted) {
              setIsConnected(true);
              setIsStalled(false);
            }
          },
          onStalled: () => {
            console.log('[JSMpeg] Stream stalled');
            if (mounted) {
              setIsStalled(true);
            }
          }
        });

        // Set initial volume
        if (playerRef.current) {
          playerRef.current.volume = volume;
        }
      } catch (error) {
        console.error('[JSMpeg] Error initializing player:', error);
      }
    };

    initPlayer();

    // Auto-hide controls after 3 seconds
    const hideTimer = setTimeout(() => {
      setShowControls(false);
    }, 3000);

    return () => {
      mounted = false;
      clearTimeout(hideTimer);
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch (e) {
          console.warn('[JSMpeg] Error during cleanup:', e);
        }
        playerRef.current = null;
      }
    };
  }, [wsUrl]);

  // Update volume
  useEffect(() => {
    if (playerRef.current) {
      playerRef.current.volume = volume;
    }
  }, [volume]);

  const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setVolume(parseFloat(e.target.value));
  }, []);

  const handleCanvasClick = useCallback(() => {
    setShowControls(prev => !prev);
  }, []);

  return (
    <div
      className="relative w-full h-full bg-black"
      onClick={handleCanvasClick}
    >
      {/* Video Canvas */}
      <canvas
        ref={canvasRef}
        className="w-full h-full object-contain player-canvas"
      />

      {/* Connection Status */}
      {!isConnected && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-tesla-red border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-white">Baglanıyor...</p>
            <p className="text-gray-400 text-sm mt-1">{wsUrl}</p>
          </div>
        </div>
      )}

      {/* Stalled Indicator */}
      {isStalled && isConnected && (
        <div className="absolute top-4 right-4 flex items-center gap-2 px-3 py-1.5 bg-yellow-500/20 text-yellow-500 rounded-lg text-sm">
          <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
          Tamponlanıyor...
        </div>
      )}

      {/* Controls Overlay */}
      <div
        className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-6 transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          {/* Channel Info */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-tesla-red rounded-full animate-pulse" />
              <span className="text-tesla-red text-sm font-medium">CANLI</span>
            </div>
            <span className="text-white font-medium">{channelId.toUpperCase()}</span>
          </div>

          {/* Volume Control */}
          <div className="flex items-center gap-3">
            <svg
              className="w-5 h-5 text-white"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              {volume === 0 ? (
                <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
              ) : volume < 0.5 ? (
                <path d="M18.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM5 9v6h4l5 5V4L9 9H5z" />
              ) : (
                <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
              )}
            </svg>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={volume}
              onChange={handleVolumeChange}
              className="w-24 h-1 bg-white/30 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-tesla-red"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
