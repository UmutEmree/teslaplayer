'use client';

import { useEffect, useState } from 'react';
import { getChannels, Channel } from '@/lib/channels';
import { HLSPlayer } from './HLSPlayer';
import { AudioUnlocker } from './AudioUnlocker';

interface VideoPlayerProps {
  channelId: string;
}

type PlayerState = 'loading' | 'unlocking' | 'playing' | 'error';

export function VideoPlayer({ channelId }: VideoPlayerProps) {
  const [state, setState] = useState<PlayerState>('loading');
  const [channel, setChannel] = useState<Channel | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [audioUnlocked, setAudioUnlocked] = useState(false);

  useEffect(() => {
    const loadChannel = async () => {
      try {
        setState('loading');

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
  }, [channelId, audioUnlocked]);

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
        <HLSPlayer hlsUrl={channel.hlsUrl} channelName={channel.name} />
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
