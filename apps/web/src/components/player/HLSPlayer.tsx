'use client';

import { useEffect, useRef, useState } from 'react';

interface HLSPlayerProps {
  hlsUrl: string;
  channelName: string;
}

// HLS.js types
declare global {
  interface Window {
    Hls: any;
  }
}

export function HLSPlayer({ hlsUrl, channelName }: HLSPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showControls, setShowControls] = useState(true);
  const [volume, setVolume] = useState(1);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Check for native HLS support (Safari)
    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      console.log('[HLS] Using native HLS support');
      video.src = hlsUrl;
      video.play().catch((err) => {
        console.error('[HLS] Play error:', err);
        setError('Video oynatılamadı');
      });
      return;
    }

    // Use HLS.js for other browsers
    const loadHLS = async () => {
      // Wait for HLS.js to load
      let retries = 0;
      while (!window.Hls && retries < 10) {
        await new Promise(resolve => setTimeout(resolve, 200));
        retries++;
      }

      if (!window.Hls) {
        setError('HLS.js yüklenemedi');
        return;
      }

      if (window.Hls.isSupported()) {
        console.log('[HLS] Using HLS.js');
        const hls = new window.Hls({
          enableWorker: true,
          lowLatencyMode: true,
          backBufferLength: 90,
          maxBufferLength: 30,
          maxBufferSize: 60 * 1000 * 1000,
          maxMaxBufferLength: 60,
        });

        hls.loadSource(hlsUrl);
        hls.attachMedia(video);

        hls.on(window.Hls.Events.MANIFEST_PARSED, () => {
          console.log('[HLS] Manifest loaded, starting playback');
          video.play().catch((err) => {
            console.error('[HLS] Play error:', err);
            setError('Video oynatılamadı. Lütfen tıklayın.');
          });
        });

        hls.on(window.Hls.Events.ERROR, (_event: any, data: any) => {
          console.error('[HLS] Error:', data);
          if (data.fatal) {
            switch (data.type) {
              case window.Hls.ErrorTypes.NETWORK_ERROR:
                console.error('[HLS] Network error, trying to recover...');
                hls.startLoad();
                break;
              case window.Hls.ErrorTypes.MEDIA_ERROR:
                console.error('[HLS] Media error, trying to recover...');
                hls.recoverMediaError();
                break;
              default:
                setError('Yayın yüklenirken hata oluştu');
                hls.destroy();
                break;
            }
          }
        });

        // Cleanup
        return () => {
          hls.destroy();
        };
      } else {
        setError('HLS desteklenmiyor');
      }
    };

    loadHLS();

    // Event listeners
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);

    return () => {
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
    };
  }, [hlsUrl]);

  // Update volume
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = volume;
    }
  }, [volume]);

  // Auto-hide controls
  useEffect(() => {
    const timer = setTimeout(() => {
      if (isPlaying) setShowControls(false);
    }, 3000);
    return () => clearTimeout(timer);
  }, [isPlaying, showControls]);

  const handleVideoClick = () => {
    setShowControls(prev => !prev);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setVolume(parseFloat(e.target.value));
  };

  return (
    <div
      className="relative w-full h-full bg-black"
      onClick={handleVideoClick}
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        playsInline
        autoPlay
        muted={false}
      />

      {/* Error State */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80">
          <div className="text-center">
            <div className="text-tesla-red text-6xl mb-4">!</div>
            <p className="text-white text-lg">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-6 px-6 py-3 bg-tesla-red hover:bg-red-700 text-white rounded-lg transition-colors"
            >
              Yeniden Yükle
            </button>
          </div>
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
            <span className="text-white font-medium">{channelName}</span>
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
