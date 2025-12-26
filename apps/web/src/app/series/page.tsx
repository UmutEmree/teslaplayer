'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Series, Episode, getSeries } from '@/lib/channels';
import Link from 'next/link';

type ViewMode = 'categories' | 'series' | 'seasons' | 'episodes';

export default function SeriesPage() {
  const router = useRouter();
  const [allSeries, setAllSeries] = useState<Series[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('categories');
  const [searchQuery, setSearchQuery] = useState('');

  // Navigation state
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSeries, setSelectedSeries] = useState<Series | null>(null);
  const [selectedSeasonNumber, setSelectedSeasonNumber] = useState<number | null>(null);
  const [selectedEpisode, setSelectedEpisode] = useState<Episode | null>(null);

  useEffect(() => {
    const loadSeries = async () => {
      setLoading(true);
      try {
        const data = await getSeries();
        setAllSeries(data);
      } catch (error) {
        console.error('Error loading series:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSeries();
  }, []);

  // Get unique categories
  const categories = Array.from(new Set(allSeries.map(s => s.category).filter(Boolean)));

  // Get series for selected category
  const seriesInCategory = selectedCategory
    ? allSeries.filter(s => s.category === selectedCategory)
    : [];

  // Get current season
  const currentSeason = selectedSeries && selectedSeasonNumber
    ? selectedSeries.seasons.find(s => s.seasonNumber === selectedSeasonNumber)
    : null;

  // Filter episodes by search
  const filteredEpisodes = currentSeason
    ? currentSeason.episodes.filter(ep =>
        ep.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  // Filter series by search
  const filteredSeries = seriesInCategory.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Navigation handlers
  const handleCategoryClick = (category: string) => {
    setSelectedCategory(category);
    setViewMode('series');
    setSearchQuery('');
  };

  const handleSeriesClick = (series: Series) => {
    setSelectedSeries(series);
    setViewMode('seasons');
    setSearchQuery('');
  };

  const handleSeasonClick = (seasonNumber: number) => {
    setSelectedSeasonNumber(seasonNumber);
    setViewMode('episodes');
    setSearchQuery('');
    // Auto-select first episode
    const season = selectedSeries?.seasons.find(s => s.seasonNumber === seasonNumber);
    if (season && season.episodes.length > 0) {
      setSelectedEpisode(season.episodes[0]);
    }
  };

  const handleEpisodeClick = (episode: Episode) => {
    setSelectedEpisode(episode);
  };

  const handleBack = () => {
    if (viewMode === 'episodes') {
      setViewMode('seasons');
      setSelectedSeasonNumber(null);
      setSelectedEpisode(null);
    } else if (viewMode === 'seasons') {
      setViewMode('series');
      setSelectedSeries(null);
    } else if (viewMode === 'series') {
      setViewMode('categories');
      setSelectedCategory(null);
    }
    setSearchQuery('');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-tesla-red border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-400">Diziler yükleniyor...</p>
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
              <h1 className="text-xl font-bold text-white">Diziler</h1>
            </div>
          </div>

          {/* Breadcrumb */}
          {viewMode !== 'categories' && (
            <div className="flex items-center gap-2 mt-3 text-sm">
              <button
                onClick={handleBack}
                className="text-gray-400 hover:text-white transition-colors"
              >
                ← Geri
              </button>
              <div className="flex items-center gap-2 text-gray-500">
                <span>/</span>
                {selectedCategory && <span className="text-tesla-red">{selectedCategory}</span>}
                {selectedSeries && (
                  <>
                    <span>/</span>
                    <span className="text-tesla-red">{selectedSeries.name}</span>
                  </>
                )}
                {selectedSeasonNumber && (
                  <>
                    <span>/</span>
                    <span className="text-tesla-red">Sezon {selectedSeasonNumber}</span>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </header>

      <div className="flex h-[calc(100vh-73px)]">
        {/* Sidebar */}
        <div className="w-80 border-r border-white/10 bg-black/30 flex flex-col">
          {/* Search (only show for series and episodes) */}
          {(viewMode === 'series' || viewMode === 'episodes') && (
            <div className="p-4 border-b border-white/10">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={viewMode === 'series' ? 'Dizi ara...' : 'Bölüm ara...'}
                className="w-full bg-black/50 border border-white/20 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-tesla-red transition-colors"
              />
            </div>
          )}

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {/* Categories View */}
            {viewMode === 'categories' && (
              <div className="p-4 space-y-2">
                <h3 className="text-sm font-semibold text-gray-400 mb-3">Kategoriler</h3>
                {categories.map((category) => {
                  const count = allSeries.filter(s => s.category === category).length;
                  return (
                    <button
                      key={category}
                      onClick={() => handleCategoryClick(category)}
                      className="w-full p-4 bg-white/5 hover:bg-white/10 rounded-lg text-left transition-colors group"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-white group-hover:text-tesla-red transition-colors">
                          {category}
                        </span>
                        <span className="text-gray-500 text-sm">{count}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Series View */}
            {viewMode === 'series' && (
              <div className="divide-y divide-white/5">
                {filteredSeries.length > 0 ? (
                  filteredSeries.map((series) => (
                    <button
                      key={series.id}
                      onClick={() => handleSeriesClick(series)}
                      className="w-full p-4 text-left hover:bg-white/5 transition-colors"
                    >
                      <div className="flex gap-3">
                        <div className="w-12 h-16 bg-gradient-to-br from-gray-800 to-gray-900 rounded flex items-center justify-center flex-shrink-0">
                          {series.logo ? (
                            <img
                              src={series.logo}
                              alt={series.name}
                              className="w-full h-full object-cover rounded"
                            />
                          ) : (
                            <div className="text-2xl font-bold text-white/20">
                              {series.name.charAt(0)}
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-white line-clamp-2">
                            {series.name}
                          </h3>
                          <p className="text-xs text-gray-500 mt-1">
                            {series.seasons.length} Sezon
                          </p>
                        </div>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    Dizi bulunamadı
                  </div>
                )}
              </div>
            )}

            {/* Seasons View */}
            {viewMode === 'seasons' && selectedSeries && (
              <div className="p-4 space-y-2">
                <h3 className="text-sm font-semibold text-gray-400 mb-3">Sezonlar</h3>
                {selectedSeries.seasons.map((season) => (
                  <button
                    key={season.seasonNumber}
                    onClick={() => handleSeasonClick(season.seasonNumber)}
                    className={`w-full p-4 bg-white/5 hover:bg-white/10 rounded-lg text-left transition-colors group ${
                      selectedSeasonNumber === season.seasonNumber ? 'bg-tesla-red/10 border border-tesla-red' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-white group-hover:text-tesla-red transition-colors">
                        Sezon {season.seasonNumber}
                      </span>
                      <span className="text-gray-500 text-sm">{season.episodes.length} Bölüm</span>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Episodes View */}
            {viewMode === 'episodes' && currentSeason && (
              <div className="divide-y divide-white/5">
                {filteredEpisodes.length > 0 ? (
                  filteredEpisodes.map((episode) => (
                    <button
                      key={episode.id}
                      onClick={() => handleEpisodeClick(episode)}
                      className={`w-full p-4 text-left hover:bg-white/5 transition-colors ${
                        selectedEpisode?.id === episode.id ? 'bg-tesla-red/10 border-l-2 border-tesla-red' : ''
                      }`}
                    >
                      <div className="flex gap-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-tesla-red/20 to-red-900/20 rounded flex items-center justify-center flex-shrink-0">
                          <span className="text-lg font-bold text-tesla-red">
                            {episode.episodeNumber}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className={`font-medium line-clamp-2 ${
                            selectedEpisode?.id === episode.id ? 'text-tesla-red' : 'text-white'
                          }`}>
                            Bölüm {episode.episodeNumber}
                          </h3>
                          <p className="text-xs text-gray-500 mt-1 line-clamp-1">
                            {episode.name}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    Bölüm bulunamadı
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto">
          {selectedEpisode && selectedSeries ? (
            <div className="p-8">
              <div className="max-w-4xl mx-auto space-y-6">
                {/* Episode Info */}
                <div className="bg-black/30 backdrop-blur-sm border border-white/10 rounded-lg p-6">
                  <div className="flex items-start gap-6">
                    <div className="w-48 h-72 bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg flex items-center justify-center flex-shrink-0">
                      {selectedSeries.logo ? (
                        <img
                          src={selectedSeries.logo}
                          alt={selectedSeries.name}
                          className="w-full h-full object-cover rounded-lg"
                        />
                      ) : (
                        <div className="text-6xl font-bold text-white/20">
                          {selectedSeries.name.charAt(0)}
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <h2 className="text-3xl font-bold text-white mb-2">
                        {selectedSeries.name}
                      </h2>
                      <p className="text-lg text-gray-400 mb-3">
                        Sezon {selectedSeasonNumber} - Bölüm {selectedEpisode.episodeNumber}
                      </p>
                      <p className="text-gray-300 mb-4">
                        {selectedEpisode.name}
                      </p>
                      {selectedSeries.category && (
                        <span className="inline-block bg-tesla-red/20 text-tesla-red px-3 py-1 rounded-full text-sm">
                          {selectedSeries.category}
                        </span>
                      )}
                      <div className="mt-6">
                        <button
                          onClick={() => router.push(`/watch/${selectedEpisode.id}`)}
                          className="bg-tesla-red hover:bg-red-700 text-white font-semibold px-8 py-3 rounded-lg transition-colors flex items-center gap-2"
                        >
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z" />
                          </svg>
                          <span>İzle</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              {viewMode === 'categories' && 'Bir kategori seçin'}
              {viewMode === 'series' && 'Bir dizi seçin'}
              {viewMode === 'seasons' && 'Bir sezon seçin'}
              {viewMode === 'episodes' && 'Bir bölüm seçin'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
