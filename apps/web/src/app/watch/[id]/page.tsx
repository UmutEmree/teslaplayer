'use client';

import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { VideoPlayer } from '@/components/player/VideoPlayer';

export default function WatchPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const channelId = params.id as string;
  const directUrl = searchParams.get('url');
  const isDirectVideo = searchParams.get('direct') === '1';
  const useCanvas = searchParams.get('canvas') === '1'; // Tesla driving mode

  return (
    <main className="min-h-screen bg-black">
      {/* Back Button */}
      <button
        onClick={() => router.back()}
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
      <VideoPlayer
        channelId={channelId}
        directUrl={directUrl || undefined}
        isDirectVideo={isDirectVideo}
        useCanvas={useCanvas}
      />
    </main>
  );
}
