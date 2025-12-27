'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Channel, getLiveChannels } from '@/lib/channels';
import Link from 'next/link';

// Country code to flag emoji mapping
const getCountryFlag = (countryCode: string): string => {
  const flagMap: Record<string, string> = {
    'TR': '🇹🇷', 'US': '🇺🇸', 'GB': '🇬🇧', 'DE': '🇩🇪', 'FR': '🇫🇷', 'IT': '🇮🇹',
    'ES': '🇪🇸', 'NL': '🇳🇱', 'BE': '🇧🇪', 'RU': '🇷🇺', 'UA': '🇺🇦', 'PL': '🇵🇱',
    'GR': '🇬🇷', 'SE': '🇸🇪', 'NO': '🇳🇴', 'DK': '🇩🇰', 'FI': '🇫🇮', 'PT': '🇵🇹',
    'RO': '🇷🇴', 'BG': '🇧🇬', 'HR': '🇭🇷', 'RS': '🇷🇸', 'CZ': '🇨🇿', 'SK': '🇸🇰',
    'HU': '🇭🇺', 'AT': '🇦🇹', 'CH': '🇨🇭', 'AR': '🇦🇷', 'BR': '🇧🇷', 'MX': '🇲🇽',
    'CA': '🇨🇦', 'AU': '🇦🇺', 'NZ': '🇳🇿', 'JP': '🇯🇵', 'KR': '🇰🇷', 'CN': '🇨🇳',
    'IN': '🇮🇳', 'SA': '🇸🇦', 'AE': '🇦🇪', 'IL': '🇮🇱', 'EG': '🇪🇬', 'ZA': '🇿🇦',
    'UK': '🇬🇧', 'ALB': '🇦🇱'
  };
  return flagMap[countryCode?.toUpperCase()] || '🌍';
};

type ViewMode = 'countries' | 'categories' | 'channels';

export default function LivePage() {
  const router = useRouter();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('countries');
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const loadChannels = async () => {
      setLoading(true);
      try {
        const data = await getLiveChannels();
        setChannels(data);
      } catch (error) {
        console.error('Error loading live channels:', error);
      } finally {
        setLoading(false);
      }
    };

    loadChannels();
  }, []);

  // Get countries with channel counts
  const countriesMap = new Map<string, number>();
  channels.forEach(c => {
    if (c.country) {
      countriesMap.set(c.country, (countriesMap.get(c.country) || 0) + 1);
    } else {
      countriesMap.set('Diğer', (countriesMap.get('Diğer') || 0) + 1);
    }
  });

  const countries = Array.from(countriesMap.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([country]) => country);

  // Get categories for selected country
  const categoriesMap = new Map<string, number>();
  if (selectedCountry) {
    channels
      .filter(c => (c.country || 'Diğer') === selectedCountry)
      .forEach(c => {
        let category = c.category || 'Genel';

        // Strip country prefix from category name if present
        // Pattern: "TR: RADYO" -> "RADYO", "DE: SPORT" -> "SPORT"
        const prefixMatch = category.match(/^[A-Z]{2,}:\s*(.+)$/);
        if (prefixMatch) {
          category = prefixMatch[1];
        }

        categoriesMap.set(category, (categoriesMap.get(category) || 0) + 1);
      });
  }

  const categories = Array.from(categoriesMap.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([category]) => category);

  // Get channels for selected country and category
  const filteredChannels = channels.filter(c => {
    if (viewMode !== 'channels') return false;

    const matchesCountry = (c.country || 'Diğer') === selectedCountry;

    // Strip prefix from category for comparison
    let channelCategory = c.category || 'Genel';
    const prefixMatch = channelCategory.match(/^[A-Z]{2,}:\s*(.+)$/);
    if (prefixMatch) {
      channelCategory = prefixMatch[1];
    }

    const matchesCategory = channelCategory === selectedCategory;
    const matchesSearch = searchQuery === '' ||
      c.name.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesCountry && matchesCategory && matchesSearch;
  });

  const handleCountryClick = (country: string) => {
    setSelectedCountry(country);
    setViewMode('categories');
  };

  const handleCategoryClick = (category: string) => {
    setSelectedCategory(category);
    setViewMode('channels');
  };

  const handleBack = () => {
    if (viewMode === 'channels') {
      setViewMode('categories');
      setSelectedCategory(null);
      setSearchQuery('');
    } else if (viewMode === 'categories') {
      setViewMode('countries');
      setSelectedCountry(null);
    }
  };

  const handleChannelClick = (channel: Channel) => {
    router.push(`/watch/${channel.id}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-tesla-dark flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-tesla-red border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white text-lg">Canlı kanallar yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-tesla-dark text-white p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <Link href="/" className="text-gray-400 hover:text-white transition-colors">
                ← Ana Sayfa
              </Link>
              {viewMode !== 'countries' && (
                <button
                  onClick={handleBack}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  ← Geri
                </button>
              )}
            </div>
          </div>

          <h1 className="text-4xl font-bold mb-2">
            {viewMode === 'countries' && 'Canlı TV - Ülkeler'}
            {viewMode === 'categories' && `${getCountryFlag(selectedCountry || '')} ${selectedCountry} - Kategoriler`}
            {viewMode === 'channels' && `${selectedCategory}`}
          </h1>

          {/* Breadcrumb */}
          <div className="text-gray-400 text-sm">
            {viewMode === 'countries' && `${countries.length} ülke`}
            {viewMode === 'categories' && `${categories.length} kategori`}
            {viewMode === 'channels' && `${filteredChannels.length} kanal`}
          </div>
        </div>

        {/* Search (only for channels view) */}
        {viewMode === 'channels' && (
          <div className="mb-6">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Kanal ara..."
              className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:border-tesla-red text-white"
            />
          </div>
        )}

        {/* Countries Grid */}
        {viewMode === 'countries' && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {countries.map(country => (
              <button
                key={country}
                onClick={() => handleCountryClick(country)}
                className="p-6 bg-gray-900 hover:bg-gray-800 rounded-lg transition-colors text-left border border-gray-800 hover:border-tesla-red group"
              >
                <div className="text-4xl mb-2">{getCountryFlag(country)}</div>
                <div className="font-semibold text-lg mb-1 group-hover:text-tesla-red transition-colors">
                  {country}
                </div>
                <div className="text-sm text-gray-400">
                  {countriesMap.get(country)} kanal
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Categories Grid */}
        {viewMode === 'categories' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map(category => (
              <button
                key={category}
                onClick={() => handleCategoryClick(category)}
                className="p-6 bg-gray-900 hover:bg-gray-800 rounded-lg transition-colors text-left border border-gray-800 hover:border-tesla-red group"
              >
                <div className="font-semibold text-xl mb-1 group-hover:text-tesla-red transition-colors">
                  {category}
                </div>
                <div className="text-sm text-gray-400">
                  {categoriesMap.get(category)} kanal
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Channels List */}
        {viewMode === 'channels' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredChannels.map(channel => (
              <button
                key={channel.id}
                onClick={() => handleChannelClick(channel)}
                className="p-4 bg-gray-900 hover:bg-gray-800 rounded-lg transition-colors text-left border border-gray-800 hover:border-tesla-red group flex items-center gap-4"
              >
                {channel.logo && (
                  <img
                    src={channel.logo}
                    alt={channel.name}
                    className="w-16 h-16 object-contain rounded"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                )}
                <div className="flex-1">
                  <div className="font-semibold group-hover:text-tesla-red transition-colors">
                    {channel.name}
                  </div>
                  {channel.country && (
                    <div className="text-sm text-gray-400 mt-1">
                      {getCountryFlag(channel.country)} {channel.country}
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Empty State */}
        {viewMode === 'channels' && filteredChannels.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-400 text-lg">Kanal bulunamadı</p>
          </div>
        )}
      </div>
    </main>
  );
}
