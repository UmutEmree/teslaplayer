import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Tesla Player',
  description: 'Video streaming for Tesla Browser',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr">
      <head>
        {/* HLS.js for native HLS playback */}
        <script src="https://cdn.jsdelivr.net/npm/hls.js@1" defer />
        {/* JSMpeg (backup for FFmpeg streaming) */}
        <script src="/jsmpeg.min.js" defer />
      </head>
      <body className="min-h-screen bg-tesla-dark">
        {children}
      </body>
    </html>
  );
}
