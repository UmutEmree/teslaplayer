'use client';

import { useCallback } from 'react';

interface AudioUnlockerProps {
  onUnlock: () => void;
}

export function AudioUnlocker({ onUnlock }: AudioUnlockerProps) {
  const handleClick = useCallback(() => {
    // Try to unlock Web Audio API
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContext) {
        const audioCtx = new AudioContext();
        const oscillator = audioCtx.createOscillator();
        oscillator.frequency.value = 0;
        oscillator.connect(audioCtx.destination);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.001);
        audioCtx.close();
      }
    } catch (e) {
      console.warn('Failed to unlock audio context:', e);
    }

    onUnlock();
  }, [onUnlock]);

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-gradient-to-b from-tesla-dark to-black">
      <div className="text-center max-w-lg px-6">
        {/* Play Icon */}
        <div className="mb-8">
          <div className="w-32 h-32 mx-auto bg-tesla-red/20 rounded-full flex items-center justify-center animate-pulse-slow">
            <div className="w-24 h-24 bg-tesla-red rounded-full flex items-center justify-center">
              <svg
                className="w-12 h-12 text-white ml-2"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Title */}
        <h2 className="text-3xl font-bold text-white mb-4">
          Yayini Baslatmak Icin Dokunun
        </h2>

        {/* Description */}
        <p className="text-gray-400 mb-8">
          Tesla tarayicisi ses icin kullanici etkilesimi gerektiriyor.
        </p>

        {/* Tesla Audio Tips */}
        <div className="bg-white/5 rounded-xl p-4 mb-8 text-left border border-white/10">
          <h3 className="text-sm font-semibold text-tesla-red mb-3 flex items-center gap-2">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
            </svg>
            Ses Calismiyorsa
          </h3>
          <ul className="text-sm text-gray-400 space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-tesla-red">1.</span>
              <span>Ayarlar &gt; Bluetooth - Bluetooth baglantisini kapatın</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-tesla-red">2.</span>
              <span>Veya bir radyo istasyonu secip durdurun</span>
            </li>
          </ul>
        </div>

        {/* Start Button */}
        <button
          onClick={handleClick}
          className="w-full py-4 px-8 bg-tesla-red hover:bg-red-700 text-white text-xl font-semibold rounded-xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-tesla-red/30"
        >
          Yayini Baslat
        </button>
      </div>
    </div>
  );
}
