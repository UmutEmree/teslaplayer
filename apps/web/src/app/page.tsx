import Link from 'next/link';

export default function Home() {
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
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-white mb-8 text-center">
            İçerik Kategorileri
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Filmler */}
            <Link href="/movies">
              <div className="group relative bg-gradient-to-br from-gray-900 to-black border border-white/10 rounded-2xl overflow-hidden hover:border-tesla-red hover:shadow-2xl hover:shadow-tesla-red/20 transition-all duration-300 cursor-pointer">
                <div className="p-8 flex flex-col items-center justify-center min-h-[300px]">
                  <div className="w-24 h-24 bg-tesla-red/20 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <svg className="w-12 h-12 text-tesla-red" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2 group-hover:text-tesla-red transition-colors">
                    Filmler
                  </h3>
                  <p className="text-gray-400 text-center text-sm">
                    Binlerce film arasından seçim yapın
                  </p>
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-tesla-red/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </Link>

            {/* Diziler */}
            <Link href="/series">
              <div className="group relative bg-gradient-to-br from-gray-900 to-black border border-white/10 rounded-2xl overflow-hidden hover:border-tesla-red hover:shadow-2xl hover:shadow-tesla-red/20 transition-all duration-300 cursor-pointer">
                <div className="p-8 flex flex-col items-center justify-center min-h-[300px]">
                  <div className="w-24 h-24 bg-tesla-red/20 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <svg className="w-12 h-12 text-tesla-red" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2 group-hover:text-tesla-red transition-colors">
                    Diziler
                  </h3>
                  <p className="text-gray-400 text-center text-sm">
                    Popüler dizilerin tüm sezon ve bölümlerini izleyin
                  </p>
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-tesla-red/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </Link>

            {/* Canlı TV */}
            <Link href="/live">
              <div className="group relative bg-gradient-to-br from-gray-900 to-black border border-white/10 rounded-2xl overflow-hidden hover:border-tesla-red hover:shadow-2xl hover:shadow-tesla-red/20 transition-all duration-300 cursor-pointer">
                <div className="p-8 flex flex-col items-center justify-center min-h-[300px]">
                  <div className="w-24 h-24 bg-tesla-red/20 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <svg className="w-12 h-12 text-tesla-red" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2 group-hover:text-tesla-red transition-colors">
                    Canlı TV
                  </h3>
                  <p className="text-gray-400 text-center text-sm">
                    Canlı yayınları kesintisiz izleyin
                  </p>
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-tesla-red/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </Link>
          </div>
        </div>
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
