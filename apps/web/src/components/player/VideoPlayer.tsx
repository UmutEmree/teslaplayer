'use client';

import { useEffect, useState } from 'react';
import { startStream, stopStream } from '@/lib/channels';
import { JSMpegPlayer } from './JSMpegPlayer';
import { AudioUnlocker } from './AudioUnlocker';

interface VideoPlayerProps {
  channelId: string;
}

type PlayerState = 'loading' | 'unlocking' | 'playing' | 'error';

export function VideoPlayer({ channelId }: VideoPlayerProps) {
  const [state, setState] = useState<PlayerState>('unlocking');
  const [wsPath, setWsPath] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const initStream = async () => {
    try {
      setState('loading');
      const result = await startStream(channelId);
      setWsPath(result.wsPath);
      setState('playing');
    } catch (err) {
      console.error('Failed to start stream:', err);
      setError('Yayin baslatilamadi. Lutfen tekrar deneyin.');
      setState('error');
    }
  };

  const handleAudioUnlock = () => {
    initStream();
  };

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      stopStream(channelId).catch(console.error);
    };
  }, [channelId]);

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
          <p className="text-white text-lg">Yayin baslatiyor...</p>
          <p className="text-gray-400 text-sm mt-2">FFmpeg stream hazirlaniyor</p>
        </div>
      )}

      {/* Player */}
      {state === 'playing' && wsPath && (
        <JSMpegPlayer wsPath={wsPath} channelId={channelId} />
      )}

      {/* Error State */}
      {state === 'error' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-tesla-red text-6xl mb-4">!</div>
          <p className="text-white text-lg">{error}</p>
          <button
            onClick={() => setState('unlocking')}
            className="mt-6 px-6 py-3 bg-tesla-red hover:bg-red-700 text-white rounded-lg transition-colors"
          >
            Tekrar Dene
          </button>
        </div>
      )}
    </div>
  );
}
