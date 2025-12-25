'use client';

import { useParams, useRouter } from 'next/navigation';
import { VideoPlayer } from '@/components/player/VideoPlayer';

export default function WatchPage() {
  const params = useParams();
  const router = useRouter();
  const channelId = params.id as string;

  return (
    <main className="min-h-screen bg-black">
      {/* Back Button */}
      <button
        onClick={() => router.push('/')}
        className="fixed top-4 left-4 z-50 flex items-center gap-2 px-4 py-2 bg-black/70 hover:bg-black/90 text-white rounded-lg backdrop-blur-sm border border-white/10 transition-colors"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 19l-7-7 7-7"
          />
        </svg>
        Geri
      </button>

      {/* Video Player */}
      <VideoPlayer channelId={channelId} />
    </main>
  );
}
