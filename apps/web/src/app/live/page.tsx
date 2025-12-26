'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Channel, getLiveChannels } from '@/lib/channels';
import Link from 'next/link';

// Country code to flag emoji mapping
const getCountryFlag = (countryCode: string): string => {
  const flagMap: Record<string, string> = {
    'TR': '🇹🇷',
    'US': '🇺🇸',
    'GB': '🇬🇧',
    'DE': '🇩🇪',
    'FR': '🇫🇷',
    'IT': '🇮🇹',
    'ES': '🇪🇸',
    'NL': '🇳🇱',
    'BE': '🇧🇪',
    'RU': '🇷🇺',
    'UA': '🇺🇦',
    'PL': '🇵🇱',
    'GR': '🇬🇷',
    'SE': '🇸🇪',
    'NO': '🇳🇴',
    'DK': '🇩🇰',
    'FI': '🇫🇮',
    'PT': '🇵🇹',
    'RO': '🇷🇴',
    'BG': '🇧🇬',
    'HR': '🇭🇷',
    'RS': '🇷🇸',
    'CZ': '🇨🇿',
    'SK': '🇸🇰',
    'HU': '🇭🇺',
    'AT': '🇦🇹',
    'CH': '🇨🇭',
    'AR': '🇦🇷',
    'BR': '🇧🇷',
    'MX': '🇲🇽',
    'CA': '🇨🇦',
    'AU': '🇦🇺',
    'NZ': '🇳🇿',
    'JP': '🇯🇵',
    'KR': '🇰🇷',
    'CN': '🇨🇳',
    'IN': '🇮🇳',
    'SA': '🇸🇦',
    'AE': '🇦🇪',
    'IL': '🇮🇱',
    'EG': '🇪🇬',
    'ZA': '🇿🇦',
  };
  return flagMap[countryCode.toUpperCase()] || '🌍';
};

export default function LivePage() {
  const router = useRouter();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<string>('all');

  useEffect(() => {
    const loadChannels = async () => {
      setLoading(true);
      try {
        const data = await getLiveChannels();
        setChannels(data);
        if (data.length > 0) {
          setSelectedChannel(data[0]);
        }
      } catch (error) {
        console.error('Error loading live channels:', error);
      } finally {
        setLoading(false);
      }
    };

    loadChannels();
  }, []);

  // Get unique countries and sort by channel count
  const countriesMap = new Map<string, number>();
  channels.forEach(c => {
    if (c.country) {
      countriesMap.set(c.country, (countriesMap.get(c.country) || 0) + 1);
    }
  });

  const countries = ['all', ...Array.from(countriesMap.keys()).sort((a, b) => {
    // Sort by channel count (descending)
    return (countriesMap.get(b) || 0) - (countriesMap.get(a) || 0);
  })];

  // Filter channels
  const filteredChannels = channels.filter(channel => {
    const matchesSearch = channel.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCountry = selectedCountry === 'all' || channel.country === selectedCountry;
    return matchesSearch && matchesCountry;
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-tesla-red border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-400">Kanallar yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-black/50 backdrop-blur-sm border-b border-white/10 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/">
                <button className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  <span>Ana Sayfa</span>
                </button>
              </Link>
              <div className="h-6 w-px bg-white/10"></div>
              <h1 className="text-xl font-bold text-white">Canlı TV</h1>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-gray-400">
                {filteredChannels.length} kanal
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className="flex h-[calc(100vh-73px)]">
        {/* Sidebar - Kanal Listesi */}
        <div className="w-80 border-r border-white/10 bg-black/30 flex flex-col">
          {/* Search & Filter */}
          <div className="p-4 border-b border-white/10 space-y-3">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Kanal ara..."
              className="w-full bg-black/50 border border-white/20 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-tesla-red transition-colors"
            />

            <select
              value={selectedCountry}
              onChange={(e) => setSelectedCountry(e.target.value)}
              className="w-full bg-black/50 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-tesla-red transition-colors"
            >
              <option value="all">🌍 Tüm Ülkeler ({channels.length})</option>
              {countries.filter(c => c !== 'all').map((country) => (
                <option key={country} value={country}>
                  {getCountryFlag(country)} {country} ({countriesMap.get(country)})
                </option>
              ))}
            </select>
          </div>

          {/* Channel List */}
          <div className="flex-1 overflow-y-auto">
            {filteredChannels.length > 0 ? (
              <div className="divide-y divide-white/5">
                {filteredChannels.map((channel) => (
                  <button
                    key={channel.id}
                    onClick={() => setSelectedChannel(channel)}
                    className={`w-full p-4 text-left hover:bg-white/5 transition-colors ${
                      selectedChannel?.id === channel.id ? 'bg-tesla-red/10 border-l-2 border-tesla-red' : ''
                    }`}
                  >
                    <div className="flex gap-3 items-center">
                      <div className="w-12 h-12 bg-gradient-to-br from-gray-800 to-gray-900 rounded flex items-center justify-center flex-shrink-0 relative">
                        {channel.logo ? (
                          <img
                            src={channel.logo}
                            alt={channel.name}
                            className="w-full h-full object-cover rounded"
                          />
                        ) : (
                          <div className="text-xl font-bold text-white/20">
                            {channel.name.charAt(0)}
                          </div>
                        )}
                        {/* Live indicator */}
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-black animate-pulse"></div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className={`font-medium line-clamp-1 ${
                          selectedChannel?.id === channel.id ? 'text-tesla-red' : 'text-white'
                        }`}>
                          {channel.name}
                        </h3>
                        {channel.country && (
                          <p className="text-xs text-gray-500 mt-1">
                            {getCountryFlag(channel.country)} {channel.country}
                          </p>
                        )}
                        {channel.category && (
                          <p className="text-xs text-gray-600 mt-0.5">{channel.category}</p>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                Kanal bulunamadı
              </div>
            )}
          </div>
        </div>

        {/* Main Content - Kanal Detayı */}
        <div className="flex-1 overflow-y-auto">
          {selectedChannel ? (
            <div className="p-8">
              <div className="max-w-4xl mx-auto space-y-6">
                {/* Channel Info */}
                <div className="bg-black/30 backdrop-blur-sm border border-white/10 rounded-lg p-6">
                  <div className="flex items-start gap-6">
                    <div className="w-32 h-32 bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg flex items-center justify-center flex-shrink-0 relative">
                      {selectedChannel.logo ? (
                        <img
                          src={selectedChannel.logo}
                          alt={selectedChannel.name}
                          className="w-full h-full object-cover rounded-lg"
                        />
                      ) : (
                        <div className="text-5xl font-bold text-white/20">
                          {selectedChannel.name.charAt(0)}
                        </div>
                      )}
                      {/* Live badge */}
                      <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
                        <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>
                        CANLI
                      </div>
                    </div>
                    <div className="flex-1">
                      <h2 className="text-3xl font-bold text-white mb-2">
                        {selectedChannel.name}
                      </h2>
                      <div className="flex flex-wrap gap-2 mb-4">
                        {selectedChannel.category && (
                          <span className="inline-block bg-tesla-red/20 text-tesla-red px-3 py-1 rounded-full text-sm">
                            {selectedChannel.category}
                          </span>
                        )}
                        {selectedChannel.country && (
                          <span className="inline-block bg-white/10 text-gray-300 px-3 py-1 rounded-full text-sm">
                            {getCountryFlag(selectedChannel.country)} {selectedChannel.country}
                          </span>
                        )}
                      </div>
                      <div className="mt-6">
                        <button
                          onClick={() => router.push(`/watch/${selectedChannel.id}`)}
                          className="bg-tesla-red hover:bg-red-700 text-white font-semibold px-8 py-3 rounded-lg transition-colors flex items-center gap-2"
                        >
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z" />
                          </svg>
                          <span>Canlı İzle</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Additional Info */}
                <div className="bg-black/30 backdrop-blur-sm border border-white/10 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-white mb-3">Canlı Yayın</h3>
                  <p className="text-gray-400">
                    Bu kanal şu anda canlı yayında. Yayını kesintisiz izlemek için yukarıdaki "Canlı İzle" butonuna tıklayın.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              Bir kanal seçin
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
