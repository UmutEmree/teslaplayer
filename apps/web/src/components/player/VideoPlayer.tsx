'use client';

import { useEffect, useState, useRef } from 'react';
import { getChannels, Channel, startStream, stopStream } from '@/lib/channels';
import { HLSPlayer } from './HLSPlayer';
import { JSMpegPlayer } from './JSMpegPlayer';
import { AudioUnlocker } from './AudioUnlocker';

interface VideoPlayerProps {
  channelId: string;
  directUrl?: string; // Optional direct URL for VOD/series
  isDirectVideo?: boolean; // true for direct video files (mkv, mp4), false for HLS
  useCanvas?: boolean; // Tesla driving mode - use canvas rendering instead of video element
}

type PlayerState = 'loading' | 'unlocking' | 'playing' | 'error';

export function VideoPlayer({ channelId, directUrl, isDirectVideo, useCanvas = false }: VideoPlayerProps) {
  const [state, setState] = useState<PlayerState>('loading');
  const [channel, setChannel] = useState<Channel | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const [wsPath, setWsPath] = useState<string | null>(null);
  const streamStartedRef = useRef(false);

  // Start canvas stream (JSMpeg mode) - works for both live TV and VOD
  useEffect(() => {
    if (!useCanvas) return;
    if (streamStartedRef.current) return;

    const initCanvasStream = async () => {
      try {
        // For VOD, use directUrl; for live TV, use channelId
        if (directUrl) {
          console.log('[VideoPlayer] Starting canvas stream for VOD:', directUrl);
          streamStartedRef.current = true;
          const result = await startStream(undefined, directUrl);
          console.log('[VideoPlayer] VOD stream started, wsPath:', result.wsPath);
          setWsPath(result.wsPath);
        } else if (channelId) {
          console.log('[VideoPlayer] Starting canvas stream for live:', channelId);
          streamStartedRef.current = true;
          const result = await startStream(channelId);
          console.log('[VideoPlayer] Live stream started, wsPath:', result.wsPath);
          setWsPath(result.wsPath);
        }
      } catch (err) {
        console.error('[VideoPlayer] Failed to start stream:', err);
        setError('Canvas stream başlatılamadı');
        setState('error');
      }
    };

    initCanvasStream();

    // Cleanup: stop stream when component unmounts
    return () => {
      if (streamStartedRef.current) {
        if (directUrl) {
          console.log('[VideoPlayer] Stopping canvas stream for VOD:', directUrl);
          stopStream(undefined, directUrl);
        } else if (channelId) {
          console.log('[VideoPlayer] Stopping canvas stream for live:', channelId);
          stopStream(channelId);
        }
        streamStartedRef.current = false;
      }
    };
  }, [useCanvas, channelId, directUrl]);

  useEffect(() => {
    const loadChannel = async () => {
      try {
        setState('loading');

        // If directUrl is provided, use it directly (for VOD/series)
        if (directUrl) {
          setChannel({
            id: channelId,
            name: 'Video',
            logo: '',
            hlsUrl: directUrl,
            category: '',
            contentType: 'movie'
          });

          if (audioUnlocked) {
            setState('playing');
          } else {
            setState('unlocking');
          }
          return;
        }

        // Get channel data from API
        const channels = await getChannels();
        const foundChannel = channels.find(c => c.id === channelId);

        if (!foundChannel) {
          setError('Kanal bulunamadı');
          setState('error');
          return;
        }

        setChannel(foundChannel);

        // Check if audio unlock is needed
        if (audioUnlocked) {
          setState('playing');
        } else {
          setState('unlocking');
        }
      } catch (err) {
        console.error('Failed to load channel:', err);
        setError('Kanal yüklenemedi. Lütfen tekrar deneyin.');
        setState('error');
      }
    };

    loadChannel();
  }, [channelId, directUrl, audioUnlocked]);

  const handleAudioUnlock = () => {
    setAudioUnlocked(true);
    setState('playing');
  };

  return (
    <div className="relative w-full h-screen bg-black">
      {/* Audio Unlock Screen */}
      {state === 'unlocking' && (
        <AudioUnlocker onUnlock={handleAudioUnlock} />
      )}

      {/* Loading State */}
      {state === 'loading' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="w-16 h-16 border-4 border-tesla-red border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-white text-lg">Kanal yükleniyor...</p>
        </div>
      )}

      {/* Player */}
      {state === 'playing' && channel && (
        useCanvas && wsPath ? (
          <JSMpegPlayer wsPath={wsPath} channelId={channelId} />
        ) : (
          <HLSPlayer hlsUrl={channel.hlsUrl} channelName={channel.name} isDirectVideo={isDirectVideo} />
        )
      )}

      {/* Error State */}
      {state === 'error' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-tesla-red text-6xl mb-4">!</div>
          <p className="text-white text-lg">{error}</p>
          <button
            onClick={() => setState('loading')}
            className="mt-6 px-6 py-3 bg-tesla-red hover:bg-red-700 text-white rounded-lg transition-colors"
          >
            Tekrar Dene
          </button>
        </div>
      )}
    </div>
  );
}
