'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Series } from '@/lib/channels';

interface SeriesDetailProps {
  series: Series;
  onBack: () => void;
}

export function SeriesDetail({ series, onBack }: SeriesDetailProps) {
  const router = useRouter();
  const [selectedSeason, setSelectedSeason] = useState(series.seasons[0]?.seasonNumber || 1);

  const currentSeason = series.seasons.find(s => s.seasonNumber === selectedSeason);

  const handleEpisodeClick = (episodeId: string) => {
    router.push(`/watch/${episodeId}`);
  };

  return (
    <div className="space-y-6">
      {/* Back Button & Header */}
      <div className="bg-black/30 backdrop-blur-sm border border-white/10 rounded-lg p-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-400 hover:text-white mb-4 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span>Geri</span>
        </button>

        <div className="flex items-start gap-6">
          {/* Series Poster */}
          <div className="w-32 h-48 bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg flex items-center justify-center flex-shrink-0">
            {series.logo ? (
              <img
                src={series.logo}
                alt={series.name}
                className="w-full h-full object-cover rounded-lg"
              />
            ) : (
              <div className="text-4xl font-bold text-white/20">
                {series.name.charAt(0)}
              </div>
            )}
          </div>

          {/* Series Info */}
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-white mb-2">
              {series.name}
            </h1>
            {series.year && (
              <p className="text-gray-400 mb-2">{series.year}</p>
            )}
            {series.category && (
              <span className="inline-block bg-tesla-red/20 text-tesla-red px-3 py-1 rounded-full text-sm">
                {series.category}
              </span>
            )}

            <div className="mt-4 flex gap-6 text-sm text-gray-400">
              <span>{series.seasons.length} Sezon</span>
              <span>{series.seasons.reduce((sum, s) => sum + s.episodes.length, 0)} Bölüm</span>
            </div>
          </div>
        </div>
      </div>

      {/* Season Selector */}
      <div className="bg-black/30 backdrop-blur-sm border border-white/10 rounded-lg p-4">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {series.seasons.map((season) => (
            <button
              key={season.seasonNumber}
              onClick={() => setSelectedSeason(season.seasonNumber)}
              className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-all ${
                selectedSeason === season.seasonNumber
                  ? 'bg-tesla-red text-white'
                  : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
              }`}
            >
              Sezon {season.seasonNumber}
              <span className="ml-2 text-xs opacity-75">
                ({season.episodes.length})
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Episodes List */}
      {currentSeason && (
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-white mb-4">
            Sezon {currentSeason.seasonNumber} Bölümleri
          </h2>

          <div className="grid gap-2">
            {currentSeason.episodes.map((episode) => (
              <button
                key={episode.id}
                onClick={() => handleEpisodeClick(episode.id)}
                className="group bg-black/30 hover:bg-black/50 border border-white/10 hover:border-tesla-red rounded-lg p-4 transition-all text-left"
              >
                <div className="flex items-center gap-4">
                  {/* Episode Number */}
                  <div className="w-16 h-16 bg-gradient-to-br from-tesla-red/20 to-red-900/20 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:from-tesla-red/30 group-hover:to-red-900/30 transition-all">
                    <span className="text-2xl font-bold text-tesla-red">
                      {episode.episodeNumber}
                    </span>
                  </div>

                  {/* Episode Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-medium group-hover:text-tesla-red transition-colors truncate">
                      Bölüm {episode.episodeNumber}
                    </h3>
                    <p className="text-gray-400 text-sm truncate">
                      {episode.name}
                    </p>
                  </div>

                  {/* Play Icon */}
                  <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <svg className="w-8 h-8 text-tesla-red" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
