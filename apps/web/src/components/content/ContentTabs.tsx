'use client';

import { useState, useEffect } from 'react';
import { Channel, Series, getMovies, getSeries, getLiveChannels } from '@/lib/channels';
import { ChannelGrid } from '../channels/ChannelGrid';
import { SeriesList } from './SeriesList';

type Tab = 'movies' | 'series' | 'live';

export function ContentTabs() {
  const [activeTab, setActiveTab] = useState<Tab>('movies');
  const [movies, setMovies] = useState<Channel[] | null>(null);
  const [series, setSeries] = useState<Series[] | null>(null);
  const [liveChannels, setLiveChannels] = useState<Channel[] | null>(null);
  const [loading, setLoading] = useState(false);

  // Lazy load data when tab changes
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        if (activeTab === 'movies' && !movies) {
          const data = await getMovies();
          setMovies(data);
        } else if (activeTab === 'series' && !series) {
          const data = await getSeries();
          setSeries(data);
        } else if (activeTab === 'live' && !liveChannels) {
          const data = await getLiveChannels();
          setLiveChannels(data);
        }
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [activeTab, movies, series, liveChannels]);

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex gap-2 bg-black/30 backdrop-blur-sm border border-white/10 rounded-lg p-2">
        <button
          onClick={() => setActiveTab('movies')}
          className={`flex-1 px-6 py-3 rounded-lg font-medium transition-all ${
            activeTab === 'movies'
              ? 'bg-tesla-red text-white'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
            </svg>
            <span>Filmler</span>
            {movies && <span className="text-sm bg-white/10 px-2 py-0.5 rounded-full">{movies.length}</span>}
          </div>
        </button>

        <button
          onClick={() => setActiveTab('series')}
          className={`flex-1 px-6 py-3 rounded-lg font-medium transition-all ${
            activeTab === 'series'
              ? 'bg-tesla-red text-white'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <span>Diziler</span>
            {series && <span className="text-sm bg-white/10 px-2 py-0.5 rounded-full">{series.length}</span>}
          </div>
        </button>

        <button
          onClick={() => setActiveTab('live')}
          className={`flex-1 px-6 py-3 rounded-lg font-medium transition-all ${
            activeTab === 'live'
              ? 'bg-tesla-red text-white'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <span>Canlı TV</span>
            {liveChannels && <span className="text-sm bg-white/10 px-2 py-0.5 rounded-full">{liveChannels.length}</span>}
          </div>
        </button>
      </div>

      {/* Tab Content */}
      <div>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 border-4 border-tesla-red border-t-transparent rounded-full animate-spin"></div>
              <p className="text-gray-400">Yükleniyor...</p>
            </div>
          </div>
        ) : (
          <>
            {activeTab === 'movies' && (
              <div>
                {movies && movies.length > 0 ? (
                  <ChannelGrid channels={movies} />
                ) : movies ? (
                  <div className="text-center py-12 text-gray-400">
                    <p>Henüz film bulunamadı</p>
                  </div>
                ) : null}
              </div>
            )}

            {activeTab === 'series' && (
              <div>
                {series && series.length > 0 ? (
                  <SeriesList series={series} />
                ) : series ? (
                  <div className="text-center py-12 text-gray-400">
                    <p>Henüz dizi bulunamadı</p>
                  </div>
                ) : null}
              </div>
            )}

            {activeTab === 'live' && (
              <div>
                {liveChannels && liveChannels.length > 0 ? (
                  <ChannelGrid channels={liveChannels} />
                ) : liveChannels ? (
                  <div className="text-center py-12 text-gray-400">
                    <p>Henüz canlı kanal bulunamadı</p>
                  </div>
                ) : null}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
