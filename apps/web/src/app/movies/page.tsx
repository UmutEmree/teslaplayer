'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Channel, getMovies } from '@/lib/channels';
import Link from 'next/link';

export default function MoviesPage() {
  const router = useRouter();
  const [movies, setMovies] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMovie, setSelectedMovie] = useState<Channel | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    const loadMovies = async () => {
      setLoading(true);
      try {
        const data = await getMovies();
        setMovies(data);
        if (data.length > 0) {
          setSelectedMovie(data[0]);
        }
      } catch (error) {
        console.error('Error loading movies:', error);
      } finally {
        setLoading(false);
      }
    };

    loadMovies();
  }, []);

  // Get unique categories
  const categories = ['all', ...Array.from(new Set(movies.map(m => m.category).filter(Boolean)))];

  // Filter movies
  const filteredMovies = movies.filter(movie => {
    const matchesSearch = movie.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || movie.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-tesla-red border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-400">Filmler yükleniyor...</p>
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
            <div className="text-sm text-gray-400">
              {filteredMovies.length} film
            </div>
          </div>
        </div>
      </header>

      <div className="flex h-[calc(100vh-73px)]">
        {/* Sidebar - Film Listesi */}
        <div className="w-80 border-r border-white/10 bg-black/30 flex flex-col">
          {/* Search & Filter */}
          <div className="p-4 border-b border-white/10 space-y-3">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Film ara..."
              className="w-full bg-black/50 border border-white/20 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-tesla-red transition-colors"
            />

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full bg-black/50 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-tesla-red transition-colors"
            >
              <option value="all">Tüm Kategoriler</option>
              {categories.filter(c => c !== 'all').map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          {/* Movie List */}
          <div className="flex-1 overflow-y-auto">
            {filteredMovies.length > 0 ? (
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
                        {movie.category && (
                          <p className="text-xs text-gray-600 mt-1">{movie.category}</p>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                Film bulunamadı
              </div>
            )}
          </div>
        </div>

        {/* Main Content - Film Detayı */}
        <div className="flex-1 overflow-y-auto">
          {selectedMovie ? (
            <div className="p-8">
              <div className="max-w-4xl mx-auto space-y-6">
                {/* Film Info */}
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
                          onClick={() => router.push(`/watch/${selectedMovie.id}`)}
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
              Bir film seçin
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
