'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  CategoryInfo,
  SeriesItem,
  SeriesDetail,
  SeriesEpisode,
  getSeriesCategories,
  getSeriesByCategory,
  getSeriesEpisodes
} from '@/lib/channels';
import Link from 'next/link';

type ViewMode = 'categories' | 'series' | 'episodes';

export default function SeriesPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<CategoryInfo[]>([]);
  const [seriesList, setSeriesList] = useState<SeriesItem[]>([]);
  const [seriesDetail, setSeriesDetail] = useState<SeriesDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingSeries, setLoadingSeries] = useState(false);
  const [loadingEpisodes, setLoadingEpisodes] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('categories');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSeries, setSelectedSeries] = useState<SeriesItem | null>(null);
  const [selectedSeason, setSelectedSeason] = useState<number>(1);
  const [selectedEpisode, setSelectedEpisode] = useState<SeriesEpisode | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalSeries, setTotalSeries] = useState(0);
  const [teslaMode, setTeslaMode] = useState(false);

  // Load Tesla mode preference from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('teslaMode');
    if (saved === 'true') {
      setTeslaMode(true);
    }
  }, []);

  // Save Tesla mode preference to localStorage
  const toggleTeslaMode = () => {
    const newValue = !teslaMode;
    setTeslaMode(newValue);
    localStorage.setItem('teslaMode', String(newValue));
  };

  // Load categories on mount
  useEffect(() => {
    const loadCategories = async () => {
      setLoading(true);
      try {
        const data = await getSeriesCategories();
        setCategories(data);
      } catch (error) {
        console.error('Error loading categories:', error);
      } finally {
        setLoading(false);
      }
    };

    loadCategories();
  }, []);

  // Load series when category is selected
  const handleCategoryClick = async (categoryName: string) => {
    setSelectedCategory(categoryName);
    setViewMode('series');
    setLoadingSeries(true);
    setCurrentPage(1);
    setSearchQuery('');

    try {
      const data = await getSeriesByCategory(categoryName, 1, 50);
      setSeriesList(data.series);
      setTotalPages(data.totalPages);
      setTotalSeries(data.total);
    } catch (error) {
      console.error('Error loading series:', error);
    } finally {
      setLoadingSeries(false);
    }
  };

  // Load episodes when series is selected
  const handleSeriesClick = async (series: SeriesItem) => {
    setSelectedSeries(series);
    setViewMode('episodes');
    setLoadingEpisodes(true);

    try {
      const detail = await getSeriesEpisodes(series.id);
      setSeriesDetail(detail);
      if (detail && detail.seasons.length > 0) {
        setSelectedSeason(detail.seasons[0].seasonNumber);
        if (detail.seasons[0].episodes.length > 0) {
          setSelectedEpisode(detail.seasons[0].episodes[0]);
        }
      }
    } catch (error) {
      console.error('Error loading episodes:', error);
    } finally {
      setLoadingEpisodes(false);
    }
  };

  // Load more series (pagination)
  const loadMoreSeries = async () => {
    if (!selectedCategory || currentPage >= totalPages) return;

    setLoadingSeries(true);
    const nextPage = currentPage + 1;

    try {
      const data = await getSeriesByCategory(selectedCategory, nextPage, 50);
      setSeriesList(prev => [...prev, ...data.series]);
      setCurrentPage(nextPage);
    } catch (error) {
      console.error('Error loading more series:', error);
    } finally {
      setLoadingSeries(false);
    }
  };

  const handleBack = () => {
    if (viewMode === 'episodes') {
      setViewMode('series');
      setSelectedSeries(null);
      setSeriesDetail(null);
      setSelectedEpisode(null);
    } else if (viewMode === 'series') {
      setViewMode('categories');
      setSelectedCategory(null);
      setSeriesList([]);
    }
    setSearchQuery('');
  };

  // Get current season's episodes
  const currentSeasonEpisodes = seriesDetail?.seasons.find(s => s.seasonNumber === selectedSeason)?.episodes || [];

  // Filter series by search
  const filteredSeries = seriesList.filter(series =>
    series.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Filter categories by search (when in categories view)
  const filteredCategories = categories.filter(cat =>
    cat.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-tesla-red border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-400">Kategoriler yükleniyor...</p>
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
            <div className="flex items-center gap-4">
              {/* Tesla Mode Toggle */}
              <button
                onClick={toggleTeslaMode}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all ${
                  teslaMode
                    ? 'bg-tesla-red border-tesla-red text-white'
                    : 'bg-gray-900 border-gray-700 text-gray-400 hover:border-gray-500'
                }`}
                title="Tesla hareket halindeyken izlemek için Canvas modunu aktif edin"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                </svg>
                <span className="text-sm font-medium">
                  {teslaMode ? 'Tesla Modu: Acik' : 'Tesla Modu'}
                </span>
              </button>
              <div className="text-sm text-gray-400">
                {viewMode === 'categories' && `${categories.length} kategori`}
                {viewMode === 'series' && `${totalSeries} dizi`}
                {viewMode === 'episodes' && seriesDetail && `${seriesDetail.seasons.length} sezon`}
              </div>
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
                <span className={viewMode === 'series' ? 'text-tesla-red' : 'text-gray-400'}>{selectedCategory}</span>
                {selectedSeries && (
                  <>
                    <span>/</span>
                    <span className="text-tesla-red">{selectedSeries.name}</span>
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
          {/* Search */}
          {viewMode !== 'episodes' && (
            <div className="p-4 border-b border-white/10">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={viewMode === 'categories' ? 'Kategori ara...' : 'Dizi ara...'}
                className="w-full bg-black/50 border border-white/20 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-tesla-red transition-colors"
              />
            </div>
          )}

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {/* Categories View */}
            {viewMode === 'categories' && (
              <div className="p-4 space-y-2">
                <h3 className="text-sm font-semibold text-gray-400 mb-3">Dizi Kategorileri</h3>
                {filteredCategories.map((category) => (
                  <button
                    key={category.name}
                    onClick={() => handleCategoryClick(category.name)}
                    className="w-full p-4 bg-white/5 hover:bg-white/10 rounded-lg text-left transition-colors group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-white group-hover:text-tesla-red transition-colors">
                        {category.name}
                      </span>
                      <span className="text-gray-500 text-sm">{category.count}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Series View */}
            {viewMode === 'series' && (
              <>
                {loadingSeries && seriesList.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="w-8 h-8 border-4 border-tesla-red border-t-transparent rounded-full animate-spin"></div>
                  </div>
                ) : (
                  <div className="divide-y divide-white/5">
                    {filteredSeries.map((series) => (
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
                            {series.year && (
                              <p className="text-xs text-gray-500 mt-1">{series.year}</p>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}

                    {/* Load More Button */}
                    {currentPage < totalPages && (
                      <div className="p-4">
                        <button
                          onClick={loadMoreSeries}
                          disabled={loadingSeries}
                          className="w-full py-3 bg-tesla-red/20 hover:bg-tesla-red/30 text-tesla-red rounded-lg transition-colors disabled:opacity-50"
                        >
                          {loadingSeries ? 'Yükleniyor...' : `Daha Fazla Yükle (${currentPage}/${totalPages})`}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {/* Episodes View */}
            {viewMode === 'episodes' && (
              <>
                {loadingEpisodes ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="w-8 h-8 border-4 border-tesla-red border-t-transparent rounded-full animate-spin"></div>
                  </div>
                ) : seriesDetail ? (
                  <div className="flex flex-col h-full">
                    {/* Season Tabs */}
                    <div className="p-4 border-b border-white/10">
                      <div className="flex flex-wrap gap-2">
                        {seriesDetail.seasons.map((season) => (
                          <button
                            key={season.seasonNumber}
                            onClick={() => {
                              setSelectedSeason(season.seasonNumber);
                              if (season.episodes.length > 0) {
                                setSelectedEpisode(season.episodes[0]);
                              }
                            }}
                            className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                              selectedSeason === season.seasonNumber
                                ? 'bg-tesla-red text-white'
                                : 'bg-white/5 text-gray-400 hover:bg-white/10'
                            }`}
                          >
                            S{season.seasonNumber}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Episode List */}
                    <div className="flex-1 overflow-y-auto divide-y divide-white/5">
                      {currentSeasonEpisodes.map((episode) => (
                        <button
                          key={episode.id}
                          onClick={() => setSelectedEpisode(episode)}
                          className={`w-full p-4 text-left hover:bg-white/5 transition-colors ${
                            selectedEpisode?.id === episode.id ? 'bg-tesla-red/10 border-l-2 border-tesla-red' : ''
                          }`}
                        >
                          <div className="flex gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-tesla-red/20 to-red-900/20 rounded flex items-center justify-center flex-shrink-0">
                              <span className="text-sm font-bold text-tesla-red">
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
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    Bölümler yüklenemedi
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto">
          {selectedEpisode && seriesDetail ? (
            <div className="p-8">
              <div className="max-w-4xl mx-auto space-y-6">
                {/* Episode Info */}
                <div className="bg-black/30 backdrop-blur-sm border border-white/10 rounded-lg p-6">
                  <div className="flex items-start gap-6">
                    <div className="w-48 h-72 bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg flex items-center justify-center flex-shrink-0">
                      {seriesDetail.cover ? (
                        <img
                          src={seriesDetail.cover}
                          alt={seriesDetail.name}
                          className="w-full h-full object-cover rounded-lg"
                        />
                      ) : (
                        <div className="text-6xl font-bold text-white/20">
                          {seriesDetail.name.charAt(0)}
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <h2 className="text-3xl font-bold text-white mb-2">
                        {seriesDetail.name}
                      </h2>
                      <p className="text-lg text-gray-400 mb-3">
                        Sezon {selectedSeason} - Bölüm {selectedEpisode.episodeNumber}
                      </p>
                      <p className="text-gray-300 mb-4">
                        {selectedEpisode.name}
                      </p>
                      {seriesDetail.plot && (
                        <p className="text-sm text-gray-500 mb-4 line-clamp-3">
                          {seriesDetail.plot}
                        </p>
                      )}
                      <div className="mt-6">
                        <button
                          onClick={() => {
                            const canvasParam = teslaMode ? '&canvas=1' : '';
                            router.push(`/watch/${selectedEpisode.id}?url=${encodeURIComponent(selectedEpisode.hlsUrl)}&direct=${selectedEpisode.isDirectVideo ? '1' : '0'}${canvasParam}`);
                          }}
                          className="bg-tesla-red hover:bg-red-700 text-white font-semibold px-8 py-3 rounded-lg transition-colors flex items-center gap-2"
                        >
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z" />
                          </svg>
                          <span>{teslaMode ? 'Tesla Modunda Izle' : 'Izle'}</span>
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
              {viewMode === 'episodes' && 'Bir bölüm seçin'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
