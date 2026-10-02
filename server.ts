process.env.DISABLE_HMR = 'true';

import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { fetchSpotifyPlaylist, parseCustomTracklist } from './server/spotify';
import { searchYouTubeForTrack, getAudio } from './server/youtube';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Start HTTP listener immediately so container health check connects in < 50ms
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });

  server.on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`[Server] Port ${PORT} is busy, retrying in 1s...`);
      setTimeout(() => {
        try {
          server.close();
        } catch {}
        server.listen(PORT, '0.0.0.0');
      }, 1000);
    } else {
      console.error('[Server] Fatal server error:', err);
    }
  });

  const handleShutdown = () => {
    console.log('[Server] Gracefully closing server...');
    server.close(() => {
      process.exit(0);
    });
    setTimeout(() => process.exit(0), 3000).unref();
  };

  process.on('SIGTERM', handleShutdown);
  process.on('SIGINT', handleShutdown);

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // API ROUTES FIRST
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // Spotify Parser Route
  app.post('/api/spotify/parse', async (req, res) => {
    try {
      const { url, text, title } = req.body;

      if (url && typeof url === 'string') {
        const playlist = await fetchSpotifyPlaylist(url);
        return res.json({ success: true, playlist });
      }

      if (text && typeof text === 'string') {
        const playlist = parseCustomTracklist(text, title || 'Músicas Importadas');
        return res.json({ success: true, playlist });
      }

      return res.status(400).json({ error: 'Envie uma URL do Spotify ou texto com as músicas.' });
    } catch (err: any) {
      console.error('Error parsing Spotify playlist:', err);
      return res.status(500).json({ error: err.message || 'Erro ao processar playlist do Spotify' });
    }
  });

  // YouTube Search Route for a single track
  app.post('/api/youtube/search', async (req, res) => {
    try {
      const { trackName, artistName, durationMs } = req.body;
      if (!trackName || !artistName) {
        return res.status(400).json({ error: 'trackName e artistName são obrigatórios' });
      }

      const match = await searchYouTubeForTrack(trackName, artistName, durationMs);
      return res.json({ success: true, match });
    } catch (err: any) {
      console.error('Error searching YouTube:', err);
      return res.status(500).json({ error: err.message || 'Erro na busca do YouTube' });
    }
  });

  // YouTube Batch Search Route
  app.post('/api/youtube/batch-search', async (req, res) => {
    try {
      const { tracks } = req.body;
      if (!Array.isArray(tracks)) {
        return res.status(400).json({ error: 'tracks deve ser uma lista' });
      }

      const results: Record<string, any> = {};
      // Run searches in batches of 4 to be fast and respectful
      const batchSize = 4;
      for (let i = 0; i < tracks.length; i += batchSize) {
        const batch = tracks.slice(i, i + batchSize);
        const batchPromises = batch.map(async (t) => {
          try {
            const match = await searchYouTubeForTrack(t.name, t.artistString || t.artists?.[0] || '', t.durationMs);
            return { id: t.id, match };
          } catch {
            return { id: t.id, match: null };
          }
        });
        const batchResults = await Promise.all(batchPromises);
        batchResults.forEach((r) => {
          results[r.id] = r.match;
        });
      }

      return res.json({ success: true, results });
    } catch (err: any) {
      console.error('Error in batch search:', err);
      return res.status(500).json({ error: err.message || 'Erro na busca em lote' });
    }
  });

  // YouTube Audio Download Stream
  app.get('/api/youtube/download', async (req, res) => {
    try {
      const videoId = req.query.videoId as string;
      const customTitle = (req.query.title as string) || 'audio';
      const trackName = req.query.track as string | undefined;
      const artistName = req.query.artist as string | undefined;
      const cleanFileName = customTitle.replace(/[/\\?%*:|"<>]/g, '_').trim();

      if (!videoId) {
        return res.status(400).json({ error: 'videoId é obrigatório' });
      }

      const { stream, extension, mimeType } = await getAudio(videoId, trackName, artistName);

      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(cleanFileName)}.${extension}"`);
      res.setHeader('Content-Type', mimeType);

      stream.pipe(res);
    } catch (err: any) {
      console.error('Error downloading YouTube audio:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: err.message || 'Erro ao extrair áudio' });
      }
    }
  });

  // Stream audio file directly from Google Drive (with range/seeking support)
  app.get('/api/drive/stream', async (req, res) => {
    try {
      const fileId = req.query.fileId as string;
      const token = (req.query.token as string) || (req.headers.authorization?.replace(/^Bearer\s+/i, ''));

      if (!fileId || !token) {
        return res.status(400).send('fileId and token are required');
      }

      const driveUrl = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`;
      const fetchHeaders: Record<string, string> = {
        Authorization: `Bearer ${token}`,
      };

      if (req.headers.range) {
        fetchHeaders['Range'] = req.headers.range;
      }

      const driveRes = await fetch(driveUrl, { headers: fetchHeaders });

      if (!driveRes.ok) {
        const errText = await driveRes.text();
        return res.status(driveRes.status).send(`Drive stream error: ${errText}`);
      }

      res.status(driveRes.status);
      const contentType = driveRes.headers.get('content-type') || 'audio/mpeg';
      res.setHeader('Content-Type', contentType);
      res.setHeader('Accept-Ranges', 'bytes');

      const contentRange = driveRes.headers.get('content-range');
      if (contentRange) {
        res.setHeader('Content-Range', contentRange);
      }
      const contentLength = driveRes.headers.get('content-length');
      if (contentLength) {
        res.setHeader('Content-Length', contentLength);
      }

      if (driveRes.body) {
        const { Readable } = await import('stream');
        // @ts-ignore
        Readable.fromWeb(driveRes.body).pipe(res);
      } else {
        res.end();
      }
    } catch (err: any) {
      console.error('Error streaming drive file:', err);
      if (!res.headersSent) {
        res.status(500).send(err.message || 'Stream error');
      }
    }
  });

  // Full-chain Sync Track Directly to Google Drive
  app.post('/api/sync-track-to-drive', async (req, res) => {
    try {
      const { accessToken, folderId, videoId, trackName, artistName } = req.body;

      if (!accessToken || !folderId || !videoId || !trackName) {
        return res.status(400).json({ 
          error: 'Parâmetros ausentes: accessToken, folderId, videoId e trackName são obrigatórios' 
        });
      }

      // Step 1: Download audio data from YouTube using multi-engine extractor
      const { buffer: audioBuffer, extension, mimeType } = await getAudio(videoId, trackName, artistName);

      // Step 2: Prepare file name
      const safeArtist = (artistName || 'Artista').replace(/[/\\?%*:|"<>]/g, '').trim();
      const safeTrack = (trackName || 'Música').replace(/[/\\?%*:|"<>]/g, '').trim();
      const fileName = `${safeArtist} - ${safeTrack}.${extension}`;

      // Step 3: Upload to Google Drive via multipart REST API
      const DRIVE_UPLOAD_URL = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
      const metadata = {
        name: fileName,
        parents: [folderId],
        mimeType: mimeType,
      };

      const boundary = '-------314159265358979323846';
      const delimiter = `\r\n--${boundary}\r\n`;
      const closeDelimiter = `\r\n--${boundary}--`;

      const metadataPart = `${delimiter}Content-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}`;
      const mediaHeader = `${delimiter}Content-Type: ${mimeType}\r\n\r\n`;

      const bodyBuffer = Buffer.concat([
        Buffer.from(metadataPart, 'utf8'),
        Buffer.from(mediaHeader, 'utf8'),
        audioBuffer,
        Buffer.from(closeDelimiter, 'utf8'),
      ]);

      const driveRes = await fetch(DRIVE_UPLOAD_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': `multipart/related; boundary=${boundary}`,
          'Content-Length': bodyBuffer.length.toString(),
        },
        body: bodyBuffer,
      });

      if (!driveRes.ok) {
        const errorText = await driveRes.text();
        throw new Error(`Google Drive API upload falhou: ${errorText}`);
      }

      const driveFile = await driveRes.json();

      return res.json({
        success: true,
        file: {
          id: driveFile.id,
          name: driveFile.name || fileName,
          webViewLink: driveFile.webViewLink || `https://drive.google.com/file/d/${driveFile.id}/view`,
        },
      });
    } catch (err: any) {
      console.error('Error syncing track to Drive:', err);
      return res.status(500).json({ error: err.message || 'Erro ao sincronizar com Google Drive' });
    }
  });

  // Vite middleware setup
  let vitePromise: Promise<any> | null = null;
  if (process.env.NODE_ENV !== 'production') {
    vitePromise = createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
  }

  app.use(async (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    if (process.env.NODE_ENV !== 'production' && vitePromise) {
      try {
        const vite = await vitePromise;
        return vite.middlewares(req, res, next);
      } catch (err) {
        return next(err);
      }
    }
    next();
  });

  if (process.env.NODE_ENV === 'production') {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }
}

startServer();
