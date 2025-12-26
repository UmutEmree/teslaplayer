'use client';

import { useState } from 'react';
import { Series } from '@/lib/channels';
import { SeriesCard } from './SeriesCard';
import { SeriesDetail } from './SeriesDetail';

interface SeriesListProps {
  series: Series[];
}

export function SeriesList({ series }: SeriesListProps) {
  const [selectedSeries, setSelectedSeries] = useState<Series | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Filter series by search
  const filteredSeries = series.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (selectedSeries) {
    return (
      <SeriesDetail
        series={selectedSeries}
        onBack={() => setSelectedSeries(null)}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="bg-black/30 backdrop-blur-sm border border-white/10 rounded-lg p-4">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Dizi ara..."
          className="w-full bg-black/50 border border-white/20 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-tesla-red transition-colors"
        />
        <div className="mt-2 text-sm text-gray-400">
          {filteredSeries.length} dizi bulundu
        </div>
      </div>

      {/* Series Grid */}
      {filteredSeries.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredSeries.map((series) => (
            <SeriesCard
              key={series.id}
              series={series}
              onClick={() => setSelectedSeries(series)}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="text-gray-500 text-lg mb-2">Dizi bulunamadı</div>
          <p className="text-gray-600 text-sm">
            Farklı anahtar kelimeler deneyin
          </p>
        </div>
      )}
    </div>
  );
}
