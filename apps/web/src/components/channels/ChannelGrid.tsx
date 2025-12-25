'use client';

import { Channel } from '@/lib/channels';
import { ChannelCard } from './ChannelCard';

interface ChannelGridProps {
  channels: Channel[];
}

export function ChannelGrid({ channels }: ChannelGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {channels.map((channel) => (
        <ChannelCard key={channel.id} channel={channel} />
      ))}
    </div>
  );
}
