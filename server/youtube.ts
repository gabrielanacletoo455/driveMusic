import yts from 'yt-search';
import ytdl from '@distube/ytdl-core';
import { Innertube, UniversalCache } from 'youtubei.js';
import { YouTubeMatch } from '../src/types';
import { Readable, PassThrough } from 'stream';
import { execFile } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

const execFileAsync = promisify(execFile);
const YT_DLP_PATH = path.resolve(process.cwd(), 'yt-dlp');

let innertubeInstance: Innertube | null = null;

async function ensureYtDlp(): Promise<string> {
  if (fs.existsSync(YT_DLP_PATH)) {
    return YT_DLP_PATH;
  }

  console.log('[ensureYtDlp] Downloading standalone yt-dlp binary...');
  try {
    const res = await fetch('https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp');
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const arrayBuf = await res.arrayBuffer();
    fs.writeFileSync(YT_DLP_PATH, Buffer.from(arrayBuf));
    fs.chmodSync(YT_DLP_PATH, 0o755);
    console.log('[ensureYtDlp] yt-dlp downloaded and executable set.');
    return YT_DLP_PATH;
  } catch (err) {
    console.warn('[ensureYtDlp] Failed to download yt-dlp:', err);
    return 'yt-dlp';
  }
}

async function getInnertube(): Promise<Innertube> {
  if (!innertubeInstance) {
    innertubeInstance = await Innertube.create({
      cache: new UniversalCache(false),
      generate_session_locally: true,
    });
  }
  return innertubeInstance;
}

export async function searchYouTubeForTrack(
  trackName: string,
  artistName: string,
  targetDurationMs?: number
): Promise<YouTubeMatch | null> {
  const cleanTrack = trackName.replace(/[\(\[\{].*?[\)\]\}]/g, '').trim();
  const cleanArtist = artistName.split(',')[0].trim();
  
  // Try targeted search queries in order of precision
  const queries = [
    `"${cleanArtist}" "${cleanTrack}" audio`,
    `${cleanArtist} - ${cleanTrack} (Official Audio)`,
    `${cleanArtist} ${cleanTrack} official audio`,
    `${cleanArtist} ${cleanTrack}`,
  ];

  for (const query of queries) {
    try {
      const searchResults = await yts(query);
      const videos = searchResults.videos || [];

      if (videos.length > 0) {
        // Find best match considering duration if available
        let bestVideo = videos[0];

        if (targetDurationMs && targetDurationMs > 0) {
          const targetSeconds = Math.round(targetDurationMs / 1000);
          
          // Filter videos whose duration is reasonably close (within 40 seconds)
          const closeDuration = videos.find((v) => {
            const diff = Math.abs(v.seconds - targetSeconds);
            return diff < 40;
          });

          if (closeDuration) {
            bestVideo = closeDuration;
          }
        }

        return {
          videoId: bestVideo.videoId,
          title: bestVideo.title,
          url: bestVideo.url,
          author: bestVideo.author.name,
          durationSeconds: bestVideo.seconds,
          durationFormatted: bestVideo.timestamp,
          thumbnail: bestVideo.thumbnail || bestVideo.image,
          views: bestVideo.views,
        };
      }
    } catch (err) {
      console.warn(`Search error for query "${query}":`, err);
    }
  }

  return null;
}

/**
 * Strategy 1: High-speed distributed converter (Bypasses bot checks, age gates and VEVO blocks)
 */
async function extractWithFastConverter(videoId: string): Promise<{ buffer: Buffer; title: string; mimeType: string; extension: string } | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 9000);
    const startRes = await fetch(`https://loader.to/ajax/download.php?format=mp3&url=https://www.youtube.com/watch?v=${videoId}`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!startRes.ok) return null;
    const data: any = await startRes.json();
    if (!data.id || !data.progress_url) return null;

    for (let i = 0; i < 18; i++) {
      await new Promise((r) => setTimeout(r, 1200));
      const pController = new AbortController();
      const pTimeout = setTimeout(() => pController.abort(), 6000);
      const pRes = await fetch(data.progress_url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
        signal: pController.signal,
      });
      clearTimeout(pTimeout);

      if (!pRes.ok) continue;
      const pData: any = await pRes.json();

      if (pData.download_url) {
        const audioFetch = await fetch(pData.download_url, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
          signal: AbortSignal.timeout(40000),
        });

        if (audioFetch.ok) {
          const ab = await audioFetch.arrayBuffer();
          const buf = Buffer.from(ab);
          if (buf.length > 5000) {
            return {
              buffer: buf,
              title: data.title || pData.title || `YouTube Audio (${videoId})`,
              mimeType: 'audio/mpeg',
              extension: 'mp3',
            };
          }
        }
      }
    }
  } catch (err: any) {
    console.warn(`[extractWithFastConverter] failed for ${videoId}:`, err?.message || err);
  }
  return null;
}

/**
 * Strategy 2: High-reliability local yt-dlp engine with android/ios client & MP3 extraction
 */
async function extractWithYtDlp(videoId: string): Promise<{ buffer: Buffer; title: string; mimeType: string; extension: string } | null> {
  const bin = await ensureYtDlp();
  const tempPrefix = path.join('/tmp', `yt_${videoId}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`);
  const expectedMp3 = `${tempPrefix}.mp3`;
  const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

  try {
    // Execute yt-dlp to download and convert to MP3 directly
    await execFileAsync(bin, [
      '--no-warnings',
      '--js-runtimes',
      'node',
      '--extractor-args',
      'youtube:player_client=android,ios,mweb',
      '-x',
      '--audio-format',
      'mp3',
      '--audio-quality',
      '0',
      '-o',
      `${tempPrefix}.%(ext)s`,
      videoUrl,
    ], {
      timeout: 35000,
      maxBuffer: 20 * 1024 * 1024,
    });

    if (fs.existsSync(expectedMp3)) {
      const buffer = fs.readFileSync(expectedMp3);
      // Clean up temp file
      try { fs.unlinkSync(expectedMp3); } catch {}

      if (buffer.length > 5000) {
        return {
          buffer,
          title: `YouTube Audio (${videoId})`,
          mimeType: 'audio/mpeg',
          extension: 'mp3',
        };
      }
    }
  } catch (err: any) {
    console.warn(`[extractWithYtDlp] failed for ${videoId}:`, err?.message || err);
    // Cleanup any lingering temp file if exists
    try { if (fs.existsSync(expectedMp3)) fs.unlinkSync(expectedMp3); } catch {}
  }
  return null;
}

/**
 * Strategy 2: Extract audio using youtubei.js (Innertube)
 */
async function extractWithYoutubei(videoId: string): Promise<{ buffer: Buffer; title: string; mimeType: string; extension: string } | null> {
  try {
    const yt = await getInnertube();
    const info = await yt.getInfo(videoId);
    const title = info.basic_info.title || 'audio';

    const webStream = await yt.download(videoId, {
      type: 'audio',
      quality: 'best',
      format: 'mp4',
      client: 'ANDROID',
    });

    const chunks: Uint8Array[] = [];
    const reader = webStream.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) chunks.push(value);
    }

    const buffer = Buffer.concat(chunks);
    if (buffer.length > 1000) {
      return {
        buffer,
        title,
        mimeType: 'audio/mp4',
        extension: 'm4a',
      };
    }
  } catch (err) {
    console.warn(`[extractWithYoutubei] failed for ${videoId}:`, err);
  }
  return null;
}

/**
 * Strategy 3: Extract audio via public Invidious / Piped audio instances
 */
async function extractWithPublicMirrors(videoId: string): Promise<{ buffer: Buffer; title: string; mimeType: string; extension: string } | null> {
  const mirrors = [
    `https://inv.tux.pizza/api/v1/videos/${videoId}`,
    `https://invidious.nerdvpn.de/api/v1/videos/${videoId}`,
    `https://invidious.f5.si/api/v1/videos/${videoId}`,
    `https://api.piped.privacydev.net/streams/${videoId}`,
  ];

  for (const mirrorUrl of mirrors) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);
      const res = await fetch(mirrorUrl, {
        signal: controller.signal,
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
      });
      clearTimeout(timeout);

      if (!res.ok) continue;
      const data: any = await res.json();

      let streamUrl: string | null = null;
      let title = data.title || 'audio';
      let isMp4 = true;

      // Check Invidious format
      if (Array.isArray(data.adaptiveFormats)) {
        const audioFormat = data.adaptiveFormats
          .filter((f: any) => f.type?.includes('audio') || f.container === 'm4a' || f.container === 'webm')
          .sort((a: any, b: any) => (b.bitrate || 0) - (a.bitrate || 0))[0];

        if (audioFormat && audioFormat.url) {
          streamUrl = audioFormat.url;
          isMp4 = audioFormat.container === 'm4a' || audioFormat.type?.includes('mp4');
        }
      }

      // Check Piped format
      if (!streamUrl && Array.isArray(data.audioStreams)) {
        const stream = data.audioStreams.sort((a: any, b: any) => (b.bitrate || 0) - (a.bitrate || 0))[0];
        if (stream && stream.url) {
          streamUrl = stream.url;
          isMp4 = stream.mimeType?.includes('mp4') || stream.format === 'M4A';
        }
      }

      if (streamUrl) {
        const audioFetch = await fetch(streamUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
        });

        if (audioFetch.ok) {
          const arrayBuf = await audioFetch.arrayBuffer();
          const buffer = Buffer.from(arrayBuf);
          if (buffer.length > 5000) {
            return {
              buffer,
              title,
              mimeType: isMp4 ? 'audio/mp4' : 'audio/webm',
              extension: isMp4 ? 'm4a' : 'webm',
            };
          }
        }
      }
    } catch {
      // Continue to next mirror
    }
  }

  return null;
}

/**
 * Strategy 4: Extract with @distube/ytdl-core using mobile player clients
 */
async function extractWithDistubeYtdl(videoId: string): Promise<{ buffer: Buffer; title: string; mimeType: string; extension: string } | null> {
  const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
  try {
    const info = await ytdl.getInfo(videoUrl, {
      playerClients: ['ANDROID', 'IOS', 'WEB_EMBEDDED'],
      requestOptions: {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
          'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
        },
      },
    });

    const audioFormats = ytdl.filterFormats(info.formats, 'audioonly');
    let chosenFormat = audioFormats.find((f) => f.container === 'mp4' || f.container === 'webm');
    if (!chosenFormat && audioFormats.length > 0) {
      chosenFormat = audioFormats[0];
    }

    const stream = ytdl(videoUrl, {
      filter: 'audioonly',
      quality: 'highestaudio',
      playerClients: ['ANDROID', 'IOS', 'WEB_EMBEDDED'],
      highWaterMark: 1 << 25,
      requestOptions: {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
        },
      },
    });

    const isMp4 = chosenFormat?.container === 'mp4' || chosenFormat?.mimeType?.includes('audio/mp4');
    const buffer = await streamToBuffer(stream);

    if (buffer.length > 1000) {
      return {
        buffer,
        title: info.videoDetails.title,
        mimeType: isMp4 ? 'audio/mp4' : 'audio/mpeg',
        extension: isMp4 ? 'm4a' : 'mp3',
      };
    }
  } catch (err) {
    console.warn(`[extractWithDistubeYtdl] failed for ${videoId}:`, err);
  }
  return null;
}

/**
 * Gets the audio for a given YouTube video ID or URL with resilient multi-tier fallback
 */
export async function getAudio(
  videoIdOrUrl: string,
  trackName?: string,
  artistName?: string
): Promise<{ buffer: Buffer; stream: Readable; title: string; mimeType: string; extension: string }> {
  const videoId = videoIdOrUrl.replace('https://www.youtube.com/watch?v=', '').replace('https://youtu.be/', '').split('&')[0];

  // Strategy 1: High-speed distributed converter (Bypasses bot checks, age gates and VEVO blocks)
  let result = await extractWithFastConverter(videoId);

  // Strategy 2: High-reliability local yt-dlp native extraction
  if (!result) {
    result = await extractWithYtDlp(videoId);
  }

  // Strategy 3: Youtubei.js (Innertube)
  if (!result) {
    result = await extractWithYoutubei(videoId);
  }

  // Strategy 4: Search alternative YouTube uploads if track metadata is available and primary ID is restricted
  if (!result && trackName) {
    try {
      const cleanArtist = (artistName || '').split(',')[0].trim();
      const cleanTrack = trackName.replace(/[\(\[\{].*?[\)\]\}]/g, '').trim();
      const queries = [
        `${cleanArtist} ${cleanTrack} audio`,
        `${cleanArtist} ${cleanTrack} lyrics`,
        `${cleanArtist} ${cleanTrack}`,
      ];

      for (const q of queries) {
        if (result) break;
        const search = await yts(q);
        const altVideos = (search.videos || []).filter((v) => v.videoId !== videoId).slice(0, 3);

        for (const alt of altVideos) {
          console.log(`[getAudio] Trying alternative video: ${alt.videoId} (${alt.title})`);
          result = await extractWithFastConverter(alt.videoId);
          if (!result) {
            result = await extractWithYtDlp(alt.videoId);
          }
          if (result) break;
        }
      }
    } catch (altErr) {
      console.warn('[getAudio] Alternative search fallback error:', altErr);
    }
  }

  // Strategy 5: Public Invidious / Piped Mirrors
  if (!result) {
    result = await extractWithPublicMirrors(videoId);
  }

  // Strategy 6: Distube ytdl-core with Android/iOS clients
  if (!result) {
    result = await extractWithDistubeYtdl(videoId);
  }

  if (!result || result.buffer.length === 0) {
    throw new Error('Não foi possível extrair o áudio do YouTube após tentativas com múltiplos motores e links alternativos.');
  }

  const stream = new PassThrough();
  stream.end(result.buffer);

  return {
    buffer: result.buffer,
    stream,
    title: result.title,
    mimeType: result.mimeType,
    extension: result.extension,
  };
}

/**
 * Legacy compatibility helper
 */
export async function getAudioStream(videoIdOrUrl: string) {
  return getAudio(videoIdOrUrl);
}

/**
 * Collect stream into a Buffer
 */
export async function streamToBuffer(readableStream: Readable): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    readableStream.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    readableStream.on('end', () => resolve(Buffer.concat(chunks)));
    readableStream.on('error', (err) => reject(err));
  });
}

