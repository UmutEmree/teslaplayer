'use client';

import { useState } from 'react';
import { Channel, Series } from '@/lib/channels';
import { ChannelGrid } from '../channels/ChannelGrid';
import { SeriesList } from './SeriesList';

interface ContentTabsProps {
  movies: Channel[];
  series: Series[];
  liveChannels: Channel[];
}

type Tab = 'movies' | 'series' | 'live';

export function ContentTabs({ movies, series, liveChannels }: ContentTabsProps) {
  const [activeTab, setActiveTab] = useState<Tab>('movies');

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
            <span className="text-sm bg-white/10 px-2 py-0.5 rounded-full">{movies.length}</span>
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
            <span className="text-sm bg-white/10 px-2 py-0.5 rounded-full">{series.length}</span>
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
            <span className="text-sm bg-white/10 px-2 py-0.5 rounded-full">{liveChannels.length}</span>
          </div>
        </button>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'movies' && (
          <div>
            {movies.length > 0 ? (
              <ChannelGrid channels={movies} />
            ) : (
              <div className="text-center py-12 text-gray-400">
                <p>Henüz film bulunamadı</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'series' && (
          <div>
            {series.length > 0 ? (
              <SeriesList series={series} />
            ) : (
              <div className="text-center py-12 text-gray-400">
                <p>Henüz dizi bulunamadı</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'live' && (
          <div>
            {liveChannels.length > 0 ? (
              <ChannelGrid channels={liveChannels} />
            ) : (
              <div className="text-center py-12 text-gray-400">
                <p>Henüz canlı kanal bulunamadı</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
