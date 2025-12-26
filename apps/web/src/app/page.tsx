import { getChannels } from '@/lib/channels';
import { ChannelBrowser } from '@/components/channels/ChannelBrowser';

export default async function Home() {
  const channels = await getChannels();

  return (
    <main className="min-h-screen pb-16">
      {/* Header */}
      <header className="bg-black/50 backdrop-blur-sm border-b border-white/10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-tesla-red rounded-lg flex items-center justify-center">
              <svg
                viewBox="0 0 24 24"
                fill="currentColor"
                className="w-6 h-6 text-white"
              >
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Tesla Player</h1>
              <p className="text-xs text-gray-400">M3U8 Streaming Platform</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <h2 className="text-2xl font-semibold text-white mb-6">Kanallar</h2>
        <ChannelBrowser channels={channels} />
      </div>

      {/* Tesla Browser Info */}
      <div className="fixed bottom-0 left-0 right-0 bg-black/80 backdrop-blur-sm border-t border-white/10 py-3">
        <div className="container mx-auto px-4">
          <p className="text-center text-sm text-gray-400">
            Tesla tarayicisi icin optimize edilmistir
          </p>
        </div>
      </div>
    </main>
  );
}
