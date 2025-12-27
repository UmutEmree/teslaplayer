'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Channel, CategoryInfo, getMovieCategories, getMoviesByCategory } from '@/lib/channels';
import Link from 'next/link';

type ViewMode = 'categories' | 'movies';

export default function MoviesPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<CategoryInfo[]>([]);
  const [movies, setMovies] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMovies, setLoadingMovies] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('categories');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedMovie, setSelectedMovie] = useState<Channel | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalMovies, setTotalMovies] = useState(0);
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
        const data = await getMovieCategories();
        setCategories(data);
      } catch (error) {
        console.error('Error loading categories:', error);
      } finally {
        setLoading(false);
      }
    };

    loadCategories();
  }, []);

  // Load movies when category is selected
  const handleCategoryClick = async (categoryName: string) => {
    setSelectedCategory(categoryName);
    setViewMode('movies');
    setLoadingMovies(true);
    setCurrentPage(1);
    setSearchQuery('');

    try {
      const data = await getMoviesByCategory(categoryName, 1, 50);
      setMovies(data.movies);
      setTotalPages(data.totalPages);
      setTotalMovies(data.total);
      if (data.movies.length > 0) {
        setSelectedMovie(data.movies[0]);
      }
    } catch (error) {
      console.error('Error loading movies:', error);
    } finally {
      setLoadingMovies(false);
    }
  };

  // Load more movies (pagination)
  const loadMoreMovies = async () => {
    if (!selectedCategory || currentPage >= totalPages) return;

    setLoadingMovies(true);
    const nextPage = currentPage + 1;

    try {
      const data = await getMoviesByCategory(selectedCategory, nextPage, 50);
      setMovies(prev => [...prev, ...data.movies]);
      setCurrentPage(nextPage);
    } catch (error) {
      console.error('Error loading more movies:', error);
    } finally {
      setLoadingMovies(false);
    }
  };

  const handleBack = () => {
    setViewMode('categories');
    setSelectedCategory(null);
    setSelectedMovie(null);
    setMovies([]);
    setSearchQuery('');
  };

  // Filter movies by search
  const filteredMovies = movies.filter(movie =>
    movie.name.toLowerCase().includes(searchQuery.toLowerCase())
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
              <h1 className="text-xl font-bold text-white">Filmler</h1>
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
                {viewMode === 'categories'
                  ? `${categories.length} kategori`
                  : `${totalMovies} film`
                }
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
                <span className="text-tesla-red">{selectedCategory}</span>
              </div>
            </div>
          )}
        </div>
      </header>

      <div className="flex h-[calc(100vh-73px)]">
        {/* Sidebar */}
        <div className="w-80 border-r border-white/10 bg-black/30 flex flex-col">
          {/* Search */}
          <div className="p-4 border-b border-white/10">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={viewMode === 'categories' ? 'Kategori ara...' : 'Film ara...'}
              className="w-full bg-black/50 border border-white/20 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-tesla-red transition-colors"
            />
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {/* Categories View */}
            {viewMode === 'categories' && (
              <div className="p-4 space-y-2">
                <h3 className="text-sm font-semibold text-gray-400 mb-3">Film Kategorileri</h3>
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

            {/* Movies View */}
            {viewMode === 'movies' && (
              <>
                {loadingMovies && movies.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="w-8 h-8 border-4 border-tesla-red border-t-transparent rounded-full animate-spin"></div>
                  </div>
                ) : (
                  <div className="divide-y divide-white/5">
                    {filteredMovies.map((movie) => (
                      <button
                        key={movie.id}
                        onClick={() => setSelectedMovie(movie)}
                        className={`w-full p-4 text-left hover:bg-white/5 transition-colors ${
                          selectedMovie?.id === movie.id ? 'bg-tesla-red/10 border-l-2 border-tesla-red' : ''
                        }`}
                      >
                        <div className="flex gap-3">
                          <div className="w-12 h-16 bg-gradient-to-br from-gray-800 to-gray-900 rounded flex items-center justify-center flex-shrink-0">
                            {movie.logo ? (
                              <img
                                src={movie.logo}
                                alt={movie.name}
                                className="w-full h-full object-cover rounded"
                              />
                            ) : (
                              <div className="text-2xl font-bold text-white/20">
                                {movie.name.charAt(0)}
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className={`font-medium line-clamp-2 ${
                              selectedMovie?.id === movie.id ? 'text-tesla-red' : 'text-white'
                            }`}>
                              {movie.name}
                            </h3>
                            {movie.year && (
                              <p className="text-xs text-gray-500 mt-1">{movie.year}</p>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}

                    {/* Load More Button */}
                    {currentPage < totalPages && (
                      <div className="p-4">
                        <button
                          onClick={loadMoreMovies}
                          disabled={loadingMovies}
                          className="w-full py-3 bg-tesla-red/20 hover:bg-tesla-red/30 text-tesla-red rounded-lg transition-colors disabled:opacity-50"
                        >
                          {loadingMovies ? 'Yükleniyor...' : `Daha Fazla Yükle (${currentPage}/${totalPages})`}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto">
          {selectedMovie ? (
            <div className="p-8">
              <div className="max-w-4xl mx-auto space-y-6">
                {/* Movie Info */}
                <div className="bg-black/30 backdrop-blur-sm border border-white/10 rounded-lg p-6">
                  <div className="flex items-start gap-6">
                    <div className="w-48 h-72 bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg flex items-center justify-center flex-shrink-0">
                      {selectedMovie.logo ? (
                        <img
                          src={selectedMovie.logo}
                          alt={selectedMovie.name}
                          className="w-full h-full object-cover rounded-lg"
                        />
                      ) : (
                        <div className="text-6xl font-bold text-white/20">
                          {selectedMovie.name.charAt(0)}
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <h2 className="text-3xl font-bold text-white mb-2">
                        {selectedMovie.name}
                      </h2>
                      {selectedMovie.year && (
                        <p className="text-gray-400 mb-3">{selectedMovie.year}</p>
                      )}
                      {selectedMovie.category && (
                        <span className="inline-block bg-tesla-red/20 text-tesla-red px-3 py-1 rounded-full text-sm">
                          {selectedMovie.category}
                        </span>
                      )}
                      <div className="mt-6">
                        <button
                          onClick={() => {
                            const canvasParam = teslaMode ? '&canvas=1' : '';
                            router.push(`/watch/${selectedMovie.id}?url=${encodeURIComponent(selectedMovie.hlsUrl)}&direct=${selectedMovie.isDirectVideo ? '1' : '0'}${canvasParam}`);
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
              {viewMode === 'categories' ? 'Bir kategori seçin' : 'Bir film seçin'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
