'use client';

import Link from 'next/link';
import { Channel } from '@/lib/channels';

interface ChannelCardProps {
  channel: Channel;
}

export function ChannelCard({ channel }: ChannelCardProps) {
  return (
    <Link href={`/watch/${channel.id}`}>
      <div className="group relative bg-tesla-gray/50 rounded-xl overflow-hidden border border-white/10 hover:border-tesla-red/50 transition-all duration-300 hover:scale-[1.02]">
        {/* Thumbnail/Logo Area */}
        <div className="aspect-video bg-gradient-to-br from-tesla-dark to-tesla-gray flex items-center justify-center">
          <div className="text-4xl font-bold text-white/20 group-hover:text-tesla-red/40 transition-colors">
            {channel.name.charAt(0)}
          </div>
        </div>

        {/* Live Badge */}
        <div className="absolute top-3 left-3">
          <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-tesla-red text-white text-xs font-medium rounded">
            <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
            CANLI
          </span>
        </div>

        {/* Play Button Overlay */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="w-16 h-16 bg-tesla-red rounded-full flex items-center justify-center shadow-lg">
            <svg
              className="w-8 h-8 text-white ml-1"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>

        {/* Channel Info */}
        <div className="p-4">
          <h3 className="font-semibold text-white group-hover:text-tesla-red transition-colors">
            {channel.name}
          </h3>
          <p className="text-sm text-gray-400 mt-1">Canli yayin</p>
        </div>
      </div>
    </Link>
  );
}
