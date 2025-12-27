import { Router, Request, Response } from 'express';
import { streamManager } from '../index';

export const streamRouter = Router();

// HLS Proxy - proxies M3U8 playlists and rewrites segment URLs
streamRouter.get('/hls-proxy', async (req: Request, res: Response) => {
  try {
    const { url } = req.query;

    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'url parameter is required' });
    }

    console.log('[HLS Proxy] Fetching playlist:', url);

    // Follow redirects manually to capture final URL
    let currentUrl = url;
    let response: globalThis.Response;
    let redirectCount = 0;
    const maxRedirects = 5;

    while (redirectCount < maxRedirects) {
      response = await fetch(currentUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
        redirect: 'manual', // Don't follow automatically
      });

      if (response.status === 301 || response.status === 302 || response.status === 307 || response.status === 308) {
        const location = response.headers.get('location');
        if (!location) break;
        currentUrl = location.startsWith('http') ? location : new URL(location, currentUrl).href;
        console.log('[HLS Proxy] Following redirect to:', currentUrl);
        redirectCount++;
      } else {
        break;
      }
    }

    if (!response!.ok && response!.status !== 200) {
      console.error('[HLS Proxy] Failed to fetch:', response!.status);
      return res.status(response!.status).json({ error: 'Failed to fetch playlist' });
    }

    const contentType = response!.headers.get('content-type') || 'application/vnd.apple.mpegurl';
    let content = await response!.text();

    // Use the final URL (after redirects) as the base for relative URLs
    const finalUrl = new URL(currentUrl);
    const origin = `${finalUrl.protocol}//${finalUrl.host}`;
    console.log('[HLS Proxy] Using base URL:', origin);

    // If it's an M3U8 playlist, rewrite the segment URLs to use our proxy
    if (contentType.includes('mpegurl') || contentType.includes('m3u8') || url.includes('.m3u8') || content.includes('#EXTM3U')) {
      // Rewrite relative URLs to absolute, then to our proxy
      content = content.split('\n').map(line => {
        const trimmedLine = line.trim();

        // Skip empty lines and comments (except #EXT-X-KEY which may have URLs)
        if (!trimmedLine || (trimmedLine.startsWith('#') && !trimmedLine.includes('URI='))) {
          return line;
        }

        // Handle #EXT-X-KEY with URI
        if (trimmedLine.includes('URI="')) {
          return line.replace(/URI="([^"]+)"/, (_match, uri) => {
            const absoluteUrl = uri.startsWith('http') ? uri : `${origin}${uri.startsWith('/') ? '' : '/'}${uri}`;
            return `URI="/api/stream/segment-proxy?url=${encodeURIComponent(absoluteUrl)}"`;
          });
        }

        // Handle segment URLs (.ts, .m3u8, etc.)
        if (!trimmedLine.startsWith('#')) {
          const absoluteUrl = trimmedLine.startsWith('http')
            ? trimmedLine
            : `${origin}${trimmedLine.startsWith('/') ? '' : '/'}${trimmedLine}`;

          // For .m3u8 files (variant playlists), use hls-proxy; for .ts files, use segment-proxy
          if (trimmedLine.includes('.m3u8')) {
            return `/api/stream/hls-proxy?url=${encodeURIComponent(absoluteUrl)}`;
          } else {
            return `/api/stream/segment-proxy?url=${encodeURIComponent(absoluteUrl)}`;
          }
        }

        return line;
      }).join('\n');
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.send(content);
  } catch (error) {
    console.error('[HLS Proxy] Error:', error);
    res.status(500).json({ error: (error as Error).message });
  }
});

// Segment Proxy - proxies TS segments with proper headers
streamRouter.get('/segment-proxy', async (req: Request, res: Response) => {
  try {
    const { url } = req.query;

    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'url parameter is required' });
    }

    // Extract base URL for Referer header
    const urlObj = new URL(url);
    const referer = `${urlObj.protocol}//${urlObj.host}/`;

    // Follow redirects (Xtream servers often redirect to CDN)
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': referer,
        'Origin': referer.slice(0, -1),
        'Accept': '*/*',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      redirect: 'follow', // Follow redirects automatically for segments
    });

    if (!response.ok) {
      console.error('[Segment Proxy] Failed to fetch:', url, response.status);
      return res.status(response.status).send('Failed to fetch segment');
    }

    const contentType = response.headers.get('content-type') || 'video/mp2t';
    const buffer = await response.arrayBuffer();

    res.setHeader('Content-Type', contentType);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'no-cache');
    res.send(Buffer.from(buffer));
  } catch (error) {
    console.error('[Segment Proxy] Error:', error);
    res.status(500).json({ error: (error as Error).message });
  }
});

// Start a stream
streamRouter.post('/start', async (req: Request, res: Response) => {
  try {
    const { channelId, url } = req.body;

    // Either channelId (for live TV) or url (for VOD) is required
    if (!channelId && !url) {
      return res.status(400).json({ error: 'channelId or url is required' });
    }

    const result = await streamManager.startStream(channelId || 'vod', url);
    res.json(result);
  } catch (error) {
    console.error('[Stream Route] Error starting stream:', error);
    res.status(500).json({ error: (error as Error).message });
  }
});

// Stop watching a stream
streamRouter.post('/stop', async (req: Request, res: Response) => {
  try {
    const { channelId, url } = req.body;

    // Either channelId (for live TV) or url (for VOD) is required
    if (!channelId && !url) {
      return res.status(400).json({ error: 'channelId or url is required' });
    }

    await streamManager.stopStream(channelId || 'vod', url);
    res.json({ success: true });
  } catch (error) {
    console.error('[Stream Route] Error stopping stream:', error);
    res.status(500).json({ error: (error as Error).message });
  }
});

// Get stream status
streamRouter.get('/status/:channelId', (req: Request, res: Response) => {
  const { channelId } = req.params;
  const status = streamManager.getStatus(channelId);
  res.json(status);
});

// Get all active sessions
streamRouter.get('/sessions', (req: Request, res: Response) => {
  const sessions = streamManager.getAllSessions();
  res.json(sessions);
});

// Video Proxy - proxies direct video files (mp4, mkv) with range support for seeking
streamRouter.get('/video-proxy', async (req: Request, res: Response) => {
  try {
    const { url } = req.query;

    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'url parameter is required' });
    }

    console.log('[Video Proxy] Streaming:', url);

    // Extract base URL for Referer header
    const urlObj = new URL(url);
    const referer = `${urlObj.protocol}//${urlObj.host}/`;

    // Build headers, including range if present
    const headers: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Referer': referer,
      'Accept': '*/*',
    };

    // Forward range header for seeking support
    if (req.headers.range) {
      headers['Range'] = req.headers.range;
    }

    // Follow redirects to get the final video URL
    let currentUrl = url;
    let redirectCount = 0;
    const maxRedirects = 10;

    let response = await fetch(currentUrl, {
      headers,
      redirect: 'manual',
    });

    while (redirectCount < maxRedirects) {
      if (response.status === 301 || response.status === 302 || response.status === 307 || response.status === 308) {
        const location = response.headers.get('location');
        if (!location) break;
        currentUrl = location.startsWith('http') ? location : new URL(location, currentUrl).href;
        console.log('[Video Proxy] Following redirect to:', currentUrl);
        redirectCount++;
        response = await fetch(currentUrl, {
          headers,
          redirect: 'manual',
        });
      } else {
        break;
      }
    }

    if (response.status !== 200 && response.status !== 206) {
      console.error('[Video Proxy] Failed to fetch:', response.status);
      return res.status(response.status).json({ error: 'Failed to fetch video' });
    }

    // Get content info
    const contentType = response.headers.get('content-type') || 'video/mp4';
    const contentLength = response.headers.get('content-length');
    const contentRange = response.headers.get('content-range');
    const acceptRanges = response.headers.get('accept-ranges');

    // Set response headers
    res.setHeader('Content-Type', contentType);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Accept-Ranges');

    if (contentLength) {
      res.setHeader('Content-Length', contentLength);
    }
    if (contentRange) {
      res.setHeader('Content-Range', contentRange);
    }
    if (acceptRanges) {
      res.setHeader('Accept-Ranges', acceptRanges);
    } else {
      res.setHeader('Accept-Ranges', 'bytes');
    }

    // Set status code (206 for partial content, 200 for full)
    res.status(response.status);

    // Stream the response body
    if (response.body) {
      const reader = response.body.getReader();

      const pump = async () => {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              res.end();
              break;
            }
            if (!res.write(Buffer.from(value))) {
              // Backpressure - wait for drain
              await new Promise(resolve => res.once('drain', resolve));
            }
          }
        } catch (err) {
          console.error('[Video Proxy] Stream error:', err);
          res.end();
        }
      };

      pump();

      // Handle client disconnect
      req.on('close', () => {
        reader.cancel();
      });
    } else {
      res.end();
    }
  } catch (error) {
    console.error('[Video Proxy] Error:', error);
    res.status(500).json({ error: (error as Error).message });
  }
});
