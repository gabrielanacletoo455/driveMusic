import { SpotifyPlaylistInfo, SpotifyTrack } from '../src/types';

interface SpotifyWebTokenResponse {
  accessToken?: string;
  clientId?: string;
  isAnonymous?: boolean;
}

let cachedAnonymousToken: { token: string; expiresAt: number } | null = null;

async function getSpotifyAnonymousToken(): Promise<string | null> {
  const now = Date.now();
  if (cachedAnonymousToken && cachedAnonymousToken.expiresAt > now) {
    return cachedAnonymousToken.token;
  }

  try {
    const res = await fetch('https://open.spotify.com/get_access_token', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json',
      },
    });

    if (res.ok) {
      const data = (await res.json()) as SpotifyWebTokenResponse;
      if (data.accessToken) {
        // Cache for 30 minutes
        cachedAnonymousToken = {
          token: data.accessToken,
          expiresAt: now + 30 * 60 * 1000,
        };
        return data.accessToken;
      }
    }
  } catch (err) {
    console.warn('Could not get Spotify anonymous token, falling back to embed parsing:', err);
  }

  return null;
}

function formatDuration(ms: number): string {
  if (!ms || ms <= 0) return '0:00';
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function extractSpotifyIdAndType(urlOrUri: string): { id: string; type: 'playlist' | 'album' | 'track' } | null {
  const clean = urlOrUri.trim();

  // Match spotify:playlist:xxx, spotify:album:xxx, spotify:track:xxx
  const uriMatch = clean.match(/spotify:(playlist|album|track):([a-zA-Z0-9]+)/);
  if (uriMatch) {
    return { type: uriMatch[1] as any, id: uriMatch[2] };
  }

  // Match https://open.spotify.com/playlist/xxx?si=... or /album/xxx or /track/xxx
  const urlMatch = clean.match(/open\.spotify\.com\/(playlist|album|track)\/([a-zA-Z0-9]+)/);
  if (urlMatch) {
    return { type: urlMatch[1] as any, id: urlMatch[2] };
  }

  return null;
}

export async function fetchSpotifyPlaylist(urlOrId: string): Promise<SpotifyPlaylistInfo> {
  const parsed = extractSpotifyIdAndType(urlOrId);
  const type = parsed?.type || 'playlist';
  const id = parsed?.id || urlOrId.trim();

  if (!id) {
    throw new Error('ID ou link do Spotify inválido. Certifique-se de colar um link como https://open.spotify.com/playlist/...');
  }

  // Method 1: Try Spotify Anonymous Token API
  const token = await getSpotifyAnonymousToken();
  if (token) {
    try {
      if (type === 'playlist') {
        const apiUrl = `https://api.spotify.com/v1/playlists/${id}?fields=id,name,description,images,owner(display_name),tracks.items(track(id,name,artists(name),album(name,images),duration_ms,external_urls(spotify)))`;
        const res = await fetch(apiUrl, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.ok) {
          const data = await res.json();
          const rawTracks = (data.tracks?.items || [])
            .map((item: any) => item.track)
            .filter((t: any) => t && t.name);

          const tracks: SpotifyTrack[] = rawTracks.map((t: any, index: number) => {
            const artists = (t.artists || []).map((a: any) => a.name);
            const artistString = artists.join(', ') || 'Artista Desconhecido';
            return {
              id: t.id || `track-${index}`,
              name: t.name,
              artists,
              artistString,
              albumName: t.album?.name || '',
              albumCover: t.album?.images?.[0]?.url || data.images?.[0]?.url,
              durationMs: t.duration_ms || 0,
              durationFormatted: formatDuration(t.duration_ms || 0),
              spotifyUrl: t.external_urls?.spotify || `https://open.spotify.com/track/${t.id}`,
            };
          });

          return {
            id: data.id || id,
            title: data.name || 'Playlist do Spotify',
            description: data.description || '',
            coverUrl: data.images?.[0]?.url,
            ownerName: data.owner?.display_name || 'Spotify User',
            totalTracks: tracks.length,
            tracks,
          };
        }
      } else if (type === 'album') {
        const apiUrl = `https://api.spotify.com/v1/albums/${id}`;
        const res = await fetch(apiUrl, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.ok) {
          const data = await res.json();
          const rawTracks = data.tracks?.items || [];
          const tracks: SpotifyTrack[] = rawTracks.map((t: any, index: number) => {
            const artists = (t.artists || []).map((a: any) => a.name);
            const artistString = artists.join(', ') || 'Artista Desconhecido';
            return {
              id: t.id || `track-${index}`,
              name: t.name,
              artists,
              artistString,
              albumName: data.name,
              albumCover: data.images?.[0]?.url,
              durationMs: t.duration_ms || 0,
              durationFormatted: formatDuration(t.duration_ms || 0),
              spotifyUrl: t.external_urls?.spotify || `https://open.spotify.com/track/${t.id}`,
            };
          });

          return {
            id: data.id || id,
            title: data.name || 'Álbum do Spotify',
            description: `Álbum por ${data.artists?.map((a: any) => a.name).join(', ')}`,
            coverUrl: data.images?.[0]?.url,
            ownerName: data.artists?.[0]?.name || 'Spotify',
            totalTracks: tracks.length,
            tracks,
          };
        }
      } else if (type === 'track') {
        const apiUrl = `https://api.spotify.com/v1/tracks/${id}`;
        const res = await fetch(apiUrl, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.ok) {
          const t = await res.json();
          const artists = (t.artists || []).map((a: any) => a.name);
          const artistString = artists.join(', ') || 'Artista Desconhecido';
          const track: SpotifyTrack = {
            id: t.id || id,
            name: t.name,
            artists,
            artistString,
            albumName: t.album?.name || '',
            albumCover: t.album?.images?.[0]?.url,
            durationMs: t.duration_ms || 0,
            durationFormatted: formatDuration(t.duration_ms || 0),
            spotifyUrl: t.external_urls?.spotify,
          };

          return {
            id: t.id || id,
            title: `${t.name} - ${artistString}`,
            description: 'Música individual do Spotify',
            coverUrl: t.album?.images?.[0]?.url,
            ownerName: artistString,
            totalTracks: 1,
            tracks: [track],
          };
        }
      }
    } catch (err) {
      console.warn('Error fetching with anonymous Spotify token:', err);
    }
  }

  // Method 2: Embed Page fallback
  try {
    const embedUrl = `https://open.spotify.com/embed/${type}/${id}`;
    const embedRes = await fetch(embedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    if (embedRes.ok) {
      const html = await embedRes.text();
      // Look for Next data or JSON in script tags
      const nextDataMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
      if (nextDataMatch && nextDataMatch[1]) {
        const parsedJson = JSON.parse(nextDataMatch[1]);
        const entity = parsedJson.props?.pageProps?.state?.data?.entity;
        if (entity) {
          const trackList = entity.trackList || [];
          const tracks: SpotifyTrack[] = trackList.map((t: any, index: number) => {
            const artistString = t.subtitle || (Array.isArray(t.artists) ? t.artists.map((a: any) => a.name).join(', ') : 'Artista Desconhecido');
            const artists = artistString.split(',').map((s: string) => s.trim());
            return {
              id: t.id || `track-${index}`,
              name: t.title || t.name,
              artists,
              artistString,
              albumName: entity.title || '',
              albumCover: entity.coverArt?.sources?.[0]?.url,
              durationMs: t.duration || 0,
              durationFormatted: formatDuration(t.duration || 0),
              spotifyUrl: `https://open.spotify.com/track/${t.id}`,
            };
          });

          return {
            id: entity.id || id,
            title: entity.title || 'Playlist do Spotify',
            description: entity.subtitle || '',
            coverUrl: entity.coverArt?.sources?.[0]?.url,
            ownerName: entity.subtitle || 'Spotify',
            totalTracks: tracks.length,
            tracks,
          };
        }
      }
    }
  } catch (err) {
    console.error('Embed parsing failed:', err);
  }

  throw new Error('Não foi possível obter os dados da playlist. Verifique se o link está público e correto.');
}

/**
 * Support parsing custom text list (e.g. "Artista - Nome da Música")
 */
export function parseCustomTracklist(text: string, listTitle = 'Lista Personalizada'): SpotifyPlaylistInfo {
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const tracks: SpotifyTrack[] = lines.map((line, index) => {
    // Format: "1. Artist - Song" or "Artist - Song" or "Song"
    const cleaned = line.replace(/^\d+[\.\)\-]\s*/, '');
    let artistString = 'Vários Artistas';
    let name = cleaned;

    if (cleaned.includes(' - ')) {
      const parts = cleaned.split(' - ');
      artistString = parts[0].trim();
      name = parts.slice(1).join(' - ').trim();
    } else if (cleaned.includes(':')) {
      const parts = cleaned.split(':');
      artistString = parts[0].trim();
      name = parts.slice(1).join(':').trim();
    }

    const artists = artistString.split(',').map((a) => a.trim());

    return {
      id: `custom-${index}-${Date.now()}`,
      name: name,
      artists,
      artistString,
      albumName: listTitle,
      durationMs: 0,
      durationFormatted: '--:--',
    };
  });

  return {
    id: `custom-${Date.now()}`,
    title: listTitle,
    description: `${tracks.length} músicas importadas`,
    totalTracks: tracks.length,
    tracks,
  };
}
