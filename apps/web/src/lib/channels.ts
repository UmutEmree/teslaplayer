export interface Channel {
  id: string;
  name: string;
  logo: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export async function getChannels(): Promise<Channel[]> {
  try {
    const res = await fetch(`${API_URL}/api/channels`, {
      cache: 'no-store'
    });
    if (!res.ok) throw new Error('Failed to fetch channels');
    return res.json();
  } catch (error) {
    console.error('Error fetching channels:', error);
    // Fallback channels
    return [
      {
        id: 'showtv',
        name: 'Show TV',
        logo: '/channels/showtv.png'
      }
    ];
  }
}

export async function startStream(channelId: string): Promise<{ wsPath: string; viewerCount: number }> {
  const res = await fetch(`${API_URL}/api/stream/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ channelId })
  });

  if (!res.ok) {
    throw new Error('Failed to start stream');
  }

  return res.json();
}

export async function stopStream(channelId: string): Promise<void> {
  await fetch(`${API_URL}/api/stream/stop`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ channelId })
  });
}
