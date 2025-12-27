'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

interface HLSPlayerProps {
  hlsUrl: string;
  channelName: string;
  isDirectVideo?: boolean; // true for direct video files (mkv, mp4)
}

// HLS.js types
declare global {
  interface Window {
    Hls: any;
  }
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

// Convert original URL to proxy URL
function getProxyUrl(originalUrl: string, isDirectVideo = false): string {
  // If it's already a proxy URL or a relative URL to our server, use as-is
  if (originalUrl.startsWith('/api/') || originalUrl.includes('/api/stream/')) {
    return originalUrl;
  }
  // Use video-proxy for direct video files, hls-proxy for HLS streams
  const proxyType = isDirectVideo ? 'video-proxy' : 'hls-proxy';
  return `${API_URL}/api/stream/${proxyType}?url=${encodeURIComponent(originalUrl)}`;
}

// Format time as MM:SS or HH:MM:SS
function formatTime(seconds: number): string {
  if (!isFinite(seconds) || isNaN(seconds)) return '0:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function HLSPlayer({ hlsUrl, channelName, isDirectVideo = false }: HLSPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showControls, setShowControls] = useState(true);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSeeking, setIsSeeking] = useState(false);

  // Convert to proxy URL (use video-proxy for direct video files)
  const proxyUrl = getProxyUrl(hlsUrl, isDirectVideo);

  // Reset controls hide timer
  const resetControlsTimer = useCallback(() => {
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    setShowControls(true);
    if (isPlaying && !isSeeking) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
  }, [isPlaying, isSeeking]);

  useEffect(() => {
    let mounted = true;
    const video = videoRef.current;
    if (!video) return;

    console.log('[Player] Initializing for:', proxyUrl, 'isDirectVideo:', isDirectVideo);

    const attemptPlay = async () => {
      if (!video || !mounted) return;

      try {
        // Wait a bit for user interaction context
        await new Promise(resolve => setTimeout(resolve, 100));
        await video.play();
        if (mounted) {
          setIsPlaying(true);
          setIsLoading(false);
        }
      } catch (err: any) {
        console.warn('[Player] Autoplay prevented:', err.message);
        if (mounted) {
          setIsLoading(false);
          // Don't set error for autoplay issues, just wait for user click
        }
      }
    };

    // For direct video files (mkv, mp4), use the video element directly
    if (isDirectVideo) {
      console.log('[Player] Using direct video playback');
      video.src = proxyUrl;
      video.load();

      const handleCanPlay = () => {
        console.log('[Player] Direct video can play');
        attemptPlay();
      };

      const handleError = () => {
        console.error('[Player] Direct video error');
        if (mounted) {
          setError('Video yüklenemedi');
          setIsLoading(false);
        }
      };

      video.addEventListener('canplay', handleCanPlay);
      video.addEventListener('error', handleError);

      return () => {
        mounted = false;
        video.removeEventListener('canplay', handleCanPlay);
        video.removeEventListener('error', handleError);
        video.src = '';
      };
    }

    // Check for native HLS support (Safari, iOS)
    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      console.log('[HLS] Using native HLS support');
      video.src = proxyUrl;
      video.load();

      const handleCanPlay = () => {
        console.log('[HLS] Video can play');
        attemptPlay();
      };

      video.addEventListener('canplay', handleCanPlay);

      return () => {
        mounted = false;
        video.removeEventListener('canplay', handleCanPlay);
        video.src = '';
      };
    }

    // Use HLS.js for other browsers
    const loadHLS = async () => {
      // Wait for HLS.js to load
      let retries = 0;
      while (!window.Hls && retries < 20 && mounted) {
        await new Promise(resolve => setTimeout(resolve, 200));
        retries++;
      }

      if (!mounted) return;

      if (!window.Hls) {
        console.error('[HLS] HLS.js not loaded after 4 seconds');
        setError('HLS.js yüklenemedi. Sayfayı yenileyin.');
        setIsLoading(false);
        return;
      }

      if (!window.Hls.isSupported()) {
        console.error('[HLS] HLS.js not supported');
        setError('HLS desteklenmiyor');
        setIsLoading(false);
        return;
      }

      console.log('[HLS] Using HLS.js');
      const hls = new window.Hls({
        enableWorker: true,
        lowLatencyMode: false,
        backBufferLength: 30,
        maxBufferLength: 30,
        maxBufferSize: 60 * 1000 * 1000,
        maxMaxBufferLength: 60,
        debug: false,
        // Disable playlist caching to always get fresh segment URLs
        liveSyncDurationCount: 3,
        liveMaxLatencyDurationCount: 10,
        // XHR setup to add required headers for Xtream Codes
        xhrSetup: (xhr: XMLHttpRequest) => {
          xhr.withCredentials = false;
        },
      });

      hlsRef.current = hls;

      hls.on(window.Hls.Events.MANIFEST_PARSED, () => {
        if (!mounted) return;
        console.log('[HLS] Manifest loaded, attempting playback');
        attemptPlay();
      });

      hls.on(window.Hls.Events.ERROR, (_event: any, data: any) => {
        if (!mounted) return;
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
              console.error('[HLS] Fatal error, cannot recover');
              setError('Yayın yüklenirken hata oluştu');
              setIsLoading(false);
              hls.destroy();
              break;
          }
        }
      });

      try {
        hls.loadSource(proxyUrl);
        hls.attachMedia(video);
      } catch (err) {
        console.error('[HLS] Error loading source:', err);
        setError('Kaynak yüklenemedi');
        setIsLoading(false);
      }
    };

    loadHLS();

    // Event listeners
    const handlePlay = () => mounted && setIsPlaying(true);
    const handlePause = () => mounted && setIsPlaying(false);
    const handleTimeUpdate = () => {
      if (mounted && video && !isSeeking) {
        setCurrentTime(video.currentTime);
      }
    };
    const handleDurationChange = () => {
      if (mounted && video) {
        setDuration(video.duration);
      }
    };
    const handleLoadedMetadata = () => {
      if (mounted && video) {
        setDuration(video.duration);
      }
    };
    const handleError = (e: Event) => {
      console.error('[HLS] Video element error:', e);
      if (mounted) {
        setError('Video yüklenemedi');
        setIsLoading(false);
      }
    };

    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('durationchange', handleDurationChange);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('error', handleError);

    return () => {
      mounted = false;
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('durationchange', handleDurationChange);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('error', handleError);

      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [proxyUrl, isDirectVideo, isSeeking]);

  // Update volume
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  // Fullscreen change listener (with fallback for Tesla/webkit)
  useEffect(() => {
    const handleFullscreenChange = () => {
      const fullscreenElement = document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement;
      setIsFullscreen(!!fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const video = videoRef.current;
      if (!video) return;

      switch (e.key) {
        case ' ':
        case 'k':
          e.preventDefault();
          togglePlayPause();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          seekBackward();
          break;
        case 'ArrowRight':
          e.preventDefault();
          seekForward();
          break;
        case 'ArrowUp':
          e.preventDefault();
          setVolume(prev => Math.min(1, prev + 0.1));
          break;
        case 'ArrowDown':
          e.preventDefault();
          setVolume(prev => Math.max(0, prev - 0.1));
          break;
        case 'm':
          e.preventDefault();
          setIsMuted(prev => !prev);
          break;
        case 'f':
          e.preventDefault();
          toggleFullscreen();
          break;
      }
      resetControlsTimer();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [resetControlsTimer]);

  const togglePlayPause = () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      video.play().catch(err => console.error('[Player] Play failed:', err));
    } else {
      video.pause();
    }
    resetControlsTimer();
  };

  const seekBackward = () => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.max(0, video.currentTime - 10);
    resetControlsTimer();
  };

  const seekForward = () => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.min(video.duration || 0, video.currentTime + 10);
    resetControlsTimer();
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const video = videoRef.current;
    if (!video || !duration) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    video.currentTime = percent * duration;
    resetControlsTimer();
  };

  const handleProgressMouseDown = () => {
    setIsSeeking(true);
  };

  const handleProgressMouseUp = () => {
    setIsSeeking(false);
  };

  const toggleFullscreen = () => {
    const container = containerRef.current;
    const video = videoRef.current;
    if (!container) return;

    try {
      const fullscreenElement = document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement;

      if (fullscreenElement) {
        // Exit fullscreen
        if (document.exitFullscreen) {
          document.exitFullscreen();
        } else if ((document as any).webkitExitFullscreen) {
          (document as any).webkitExitFullscreen();
        } else if ((document as any).mozCancelFullScreen) {
          (document as any).mozCancelFullScreen();
        } else if ((document as any).msExitFullscreen) {
          (document as any).msExitFullscreen();
        }
      } else {
        // Enter fullscreen - try container first, then video element for Tesla
        if (container.requestFullscreen) {
          container.requestFullscreen();
        } else if ((container as any).webkitRequestFullscreen) {
          (container as any).webkitRequestFullscreen();
        } else if ((container as any).mozRequestFullScreen) {
          (container as any).mozRequestFullScreen();
        } else if ((container as any).msRequestFullscreen) {
          (container as any).msRequestFullscreen();
        } else if (video && (video as any).webkitEnterFullscreen) {
          // iOS/Tesla video-only fullscreen
          (video as any).webkitEnterFullscreen();
        }
      }
    } catch (err) {
      console.warn('[Player] Fullscreen not supported:', err);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  };

  const handleContainerClick = () => {
    resetControlsTimer();
  };

  const handleMouseMove = () => {
    resetControlsTimer();
  };

  // Touch events for Tesla touchscreen
  const handleTouchStart = () => {
    resetControlsTimer();
  };

  // Double tap to seek (for touch devices)
  const lastTapRef = useRef<{ time: number; x: number } | null>(null);
  const handleDoubleTap = (e: React.TouchEvent<HTMLDivElement>) => {
    const now = Date.now();
    const touch = e.touches[0];
    if (!touch) return;

    if (lastTapRef.current && now - lastTapRef.current.time < 300) {
      // Double tap detected
      const screenWidth = window.innerWidth;
      const tapX = touch.clientX;

      if (tapX < screenWidth / 3) {
        // Left third - seek backward
        seekBackward();
      } else if (tapX > (screenWidth * 2) / 3) {
        // Right third - seek forward
        seekForward();
      }
      lastTapRef.current = null;
    } else {
      lastTapRef.current = { time: now, x: touch.clientX };
    }
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full bg-black"
      onClick={handleContainerClick}
      onMouseMove={handleMouseMove}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleDoubleTap as any}
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        playsInline
        autoPlay
        muted={false}
        preload="auto"
        onClick={togglePlayPause}
      />

      {/* Loading State */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 pointer-events-none">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-tesla-red border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-white">Yükleniyor...</p>
            <p className="text-gray-400 text-sm mt-1">{channelName}</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80">
          <div className="text-center">
            <div className="text-tesla-red text-6xl mb-4">!</div>
            <p className="text-white text-lg">{error}</p>
            <button
              onClick={(e) => {
                e.stopPropagation();
                window.location.reload();
              }}
              className="mt-6 px-6 py-3 bg-tesla-red hover:bg-red-700 text-white rounded-lg transition-colors"
            >
              Yeniden Yükle
            </button>
          </div>
        </div>
      )}

      {/* Center Play Button (when paused) */}
      {!isPlaying && !isLoading && !error && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <button
            onClick={(e) => {
              e.stopPropagation();
              togglePlayPause();
            }}
            className="w-20 h-20 rounded-full bg-tesla-red/90 hover:bg-tesla-red flex items-center justify-center pointer-events-auto transition-colors"
          >
            <svg className="w-10 h-10 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </button>
        </div>
      )}

      {/* Controls Overlay */}
      <div
        className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent pt-20 pb-4 px-4 transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Progress Bar (only for VOD/direct video) */}
        {isDirectVideo && duration > 0 && (
          <div
            className="w-full h-1 bg-white/30 rounded-full mb-4 cursor-pointer group"
            onClick={handleProgressClick}
            onMouseDown={handleProgressMouseDown}
            onMouseUp={handleProgressMouseUp}
          >
            <div
              className="h-full bg-tesla-red rounded-full relative"
              style={{ width: `${progress}%` }}
            >
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-tesla-red rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>
        )}

        <div className="flex items-center justify-between">
          {/* Left Controls */}
          <div className="flex items-center gap-2">
            {/* Play/Pause */}
            <button
              onClick={togglePlayPause}
              className="w-10 h-10 flex items-center justify-center text-white hover:text-tesla-red transition-colors"
            >
              {isPlaying ? (
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>

            {/* Seek Backward (only for VOD) */}
            {isDirectVideo && (
              <button
                onClick={seekBackward}
                className="w-10 h-10 flex items-center justify-center text-white hover:text-tesla-red transition-colors"
                title="10 saniye geri"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z" />
                  <text x="12" y="15" textAnchor="middle" fontSize="7" fill="currentColor">10</text>
                </svg>
              </button>
            )}

            {/* Seek Forward (only for VOD) */}
            {isDirectVideo && (
              <button
                onClick={seekForward}
                className="w-10 h-10 flex items-center justify-center text-white hover:text-tesla-red transition-colors"
                title="10 saniye ileri"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 5V1l5 5-5 5V7c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6h2c0 4.42-3.58 8-8 8s-8-3.58-8-8 3.58-8 8-8z" />
                  <text x="12" y="15" textAnchor="middle" fontSize="7" fill="currentColor">10</text>
                </svg>
              </button>
            )}

            {/* Volume */}
            <div className="flex items-center gap-2 ml-2">
              <button
                onClick={() => setIsMuted(prev => !prev)}
                className="w-8 h-8 flex items-center justify-center text-white hover:text-tesla-red transition-colors"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  {isMuted || volume === 0 ? (
                    <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
                  ) : volume < 0.5 ? (
                    <path d="M18.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM5 9v6h4l5 5V4L9 9H5z" />
                  ) : (
                    <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
                  )}
                </svg>
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-20 h-1 bg-white/30 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-tesla-red"
              />
            </div>

            {/* Time Display (only for VOD) */}
            {isDirectVideo && duration > 0 && (
              <span className="text-white text-sm ml-3">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            )}
          </div>

          {/* Center - Channel Info */}
          <div className="flex items-center gap-3">
            {!isDirectVideo && (
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-tesla-red rounded-full animate-pulse" />
                <span className="text-tesla-red text-sm font-medium">CANLI</span>
              </div>
            )}
            <span className="text-white font-medium">{channelName}</span>
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-2">
            {/* Fullscreen */}
            <button
              onClick={toggleFullscreen}
              className="w-10 h-10 flex items-center justify-center text-white hover:text-tesla-red transition-colors"
              title={isFullscreen ? 'Tam ekrandan çık' : 'Tam ekran'}
            >
              {isFullscreen ? (
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
