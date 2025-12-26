'use client';

import { useState, useMemo } from 'react';
import { Channel } from '@/lib/channels';
import { ChannelGrid } from './ChannelGrid';

interface ChannelBrowserProps {
  channels: Channel[];
}

export function ChannelBrowser({ channels }: ChannelBrowserProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedCountry, setSelectedCountry] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Extract unique categories
  const categories = useMemo(() => {
    const cats = new Set(channels.map(ch => ch.category || 'Other'));
    return ['all', ...Array.from(cats).sort()];
  }, [channels]);

  // Extract unique countries
  const countries = useMemo(() => {
    const ctrs = new Set(
      channels
        .map(ch => ch.country)
        .filter((c): c is string => !!c)
    );
    return ['all', ...Array.from(ctrs).sort()];
  }, [channels]);

  // Filter channels based on selected filters
  const filteredChannels = useMemo(() => {
    return channels.filter(channel => {
      // Category filter
      if (selectedCategory !== 'all' && channel.category !== selectedCategory) {
        return false;
      }

      // Country filter
      if (selectedCountry !== 'all' && channel.country !== selectedCountry) {
        return false;
      }

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return channel.name.toLowerCase().includes(query);
      }

      return true;
    });
  }, [channels, selectedCategory, selectedCountry, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-black/30 backdrop-blur-sm border border-white/10 rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">Ara</label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Kanal ara..."
              className="w-full bg-black/50 border border-white/20 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-tesla-red transition-colors"
            />
          </div>

          {/* Category Filter */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">Kategori</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full bg-black/50 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-tesla-red transition-colors"
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>
                  {cat === 'all' ? 'Tümü' : cat}
                </option>
              ))}
            </select>
          </div>

          {/* Country Filter */}
          {countries.length > 1 && (
            <div>
              <label className="block text-sm text-gray-400 mb-2">Ülke</label>
              <select
                value={selectedCountry}
                onChange={(e) => setSelectedCountry(e.target.value)}
                className="w-full bg-black/50 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-tesla-red transition-colors"
              >
                {countries.map(country => (
                  <option key={country} value={country}>
                    {country === 'all' ? 'Tümü' : country}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Results count */}
        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="text-gray-400">
            {filteredChannels.length} kanal bulundu
          </span>
          {(selectedCategory !== 'all' || selectedCountry !== 'all' || searchQuery) && (
            <button
              onClick={() => {
                setSelectedCategory('all');
                setSelectedCountry('all');
                setSearchQuery('');
              }}
              className="text-tesla-red hover:text-red-400 transition-colors"
            >
              Filtreleri Temizle
            </button>
          )}
        </div>
      </div>

      {/* Channel Grid */}
      {filteredChannels.length > 0 ? (
        <ChannelGrid channels={filteredChannels} />
      ) : (
        <div className="text-center py-12">
          <div className="text-gray-500 text-lg mb-2">Kanal bulunamadı</div>
          <p className="text-gray-600 text-sm">
            Farklı filtreler deneyin veya aramayı temizleyin
          </p>
        </div>
      )}
    </div>
  );
}
