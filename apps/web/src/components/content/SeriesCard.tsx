'use client';

import { Series } from '@/lib/channels';

interface SeriesCardProps {
  series: Series;
  onClick: () => void;
}

export function SeriesCard({ series, onClick }: SeriesCardProps) {
  const totalEpisodes = series.seasons.reduce((sum, season) => sum + season.episodes.length, 0);

  return (
    <button
      onClick={onClick}
      className="group relative bg-gradient-to-br from-gray-900 to-black border border-white/10 rounded-lg overflow-hidden hover:border-tesla-red hover:shadow-lg hover:shadow-tesla-red/20 transition-all duration-300"
    >
      {/* Logo/Thumbnail */}
      <div className="aspect-[2/3] bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center relative overflow-hidden">
        {series.logo ? (
          <img
            src={series.logo}
            alt={series.name}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
          />
        ) : (
          <div className="text-6xl font-bold text-white/20">
            {series.name.charAt(0)}
          </div>
        )}

        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>

      {/* Info */}
      <div className="p-4 space-y-2">
        <h3 className="font-semibold text-white text-left line-clamp-2 group-hover:text-tesla-red transition-colors">
          {series.name} {series.year && `(${series.year})`}
        </h3>

        <div className="flex items-center gap-3 text-sm text-gray-400">
          <span className="flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            {series.seasons.length} Sezon
          </span>
          <span className="flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            {totalEpisodes} Bölüm
          </span>
        </div>

        {series.category && (
          <div className="text-xs text-gray-500 text-left">
            {series.category}
          </div>
        )}
      </div>
    </button>
  );
}
