import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { 
  UserProfile, 
  DriveFolderInfo, 
  SpotifyPlaylistInfo, 
  TrackSyncItem, 
  YouTubeMatch,
  DriveFileItem
} from './types';
import { 
  initAuth, 
  googleSignIn, 
  logout 
} from './services/firebaseAuth';
import { 
  getOrCreateMusicFolder, 
  checkFileExistsInFolder,
  fetchAllMusicFiles,
  findDuplicateTrackInDrive,
  listFilesInMusicFolder
} from './services/driveService';
import { Header } from './components/Header';
import { PlaylistInput } from './components/PlaylistInput';
import { PlaylistSummary } from './components/PlaylistSummary';
import { TrackList } from './components/TrackList';
import { DriveFolderViewer } from './components/DriveFolderViewer';
import { ConfirmationModal } from './components/ConfirmationModal';
import { MusicPlayer } from './components/MusicPlayer';
import { MiniPlayer } from './components/MiniPlayer';
import { 
  Folder, 
  ExternalLink, 
  Play, 
  Sliders, 
  HardDrive,
  RefreshCw,
  Youtube,
  Headphones,
  AlertTriangle,
  Copy,
  Check
} from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [folderInfo, setFolderInfo] = useState<DriveFolderInfo | null>(null);
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);

  // Primary Navigation Tab
  const [activeTab, setActiveTab] = useState<'sync' | 'player'>('sync');

  // Google Drive Music Files & Player State
  const [driveFiles, setDriveFiles] = useState<DriveFileItem[]>([]);
  const [isLoadingDriveFiles, setIsLoadingDriveFiles] = useState(false);
  const [currentPlayingFile, setCurrentPlayingFile] = useState<DriveFileItem | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [isShuffle, setIsShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState<'off' | 'all' | 'one'>('off');

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [isLoadingPlaylist, setIsLoadingPlaylist] = useState(false);
  const [playlist, setPlaylist] = useState<SpotifyPlaylistInfo | null>(null);
  const [syncItems, setSyncItems] = useState<TrackSyncItem[]>([]);

  const [isSearchingAll, setIsSearchingAll] = useState(false);
  const [isSyncingAll, setIsSyncAll] = useState(false);
  const [concurrency, setConcurrency] = useState<number>(3);
  const [generalError, setGeneralError] = useState<string | null>(null);

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    count?: number;
    action?: () => void;
  }>({
    isOpen: false,
    title: '',
    description: '',
  });

  // Audio Engine Lifecycle
  useEffect(() => {
    const audio = new Audio();
    audioRef.current = audio;
    audio.volume = volume;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleLoadedMetadata = () => {
      setDuration(audio.duration || 0);
    };

    const handleDurationChange = () => {
      setDuration(audio.duration || 0);
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('durationchange', handleDurationChange);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('durationchange', handleDurationChange);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.pause();
      audio.src = '';
    };
  }, []);

  // Handle Track Ended Event with repeat / shuffle logic
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleEnded = () => {
      if (repeatMode === 'one') {
        audio.currentTime = 0;
        audio.play().catch(console.warn);
        return;
      }

      if (driveFiles.length === 0) return;

      if (isShuffle) {
        const randomIndex = Math.floor(Math.random() * driveFiles.length);
        handlePlayDriveFile(driveFiles[randomIndex]);
        return;
      }

      const currentIndex = driveFiles.findIndex((f) => f.id === currentPlayingFile?.id);
      if (currentIndex !== -1 && currentIndex < driveFiles.length - 1) {
        handlePlayDriveFile(driveFiles[currentIndex + 1]);
      } else if (repeatMode === 'all') {
        handlePlayDriveFile(driveFiles[0]);
      } else {
        setIsPlaying(false);
      }
    };

    audio.addEventListener('ended', handleEnded);
    return () => {
      audio.removeEventListener('ended', handleEnded);
    };
  }, [driveFiles, currentPlayingFile, repeatMode, isShuffle]);

  // Volume & Mute Sync
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  // Helper to fetch list of music files from Google Drive
  const fetchDriveMusicFiles = async (currentToken?: string | null, currentFolderId?: string | null) => {
    const t = currentToken || token;
    const fId = currentFolderId || folderInfo?.id;
    if (!t || !fId) return;

    setIsLoadingDriveFiles(true);
    try {
      const files = await listFilesInMusicFolder(t, fId);
      setDriveFiles(files);
    } catch (err) {
      console.warn('Could not fetch drive music files:', err);
    } finally {
      setIsLoadingDriveFiles(false);
    }
  };

  // 1. Initialize Auth on Mount
  useEffect(() => {
    const unsubscribe = initAuth(
      async (authedUser, accessToken) => {
        setUser(authedUser);
        setToken(accessToken);
        try {
          const folder = await getOrCreateMusicFolder(accessToken, 'musicas');
          setFolderInfo(folder);
          fetchDriveMusicFiles(accessToken, folder.id);
          if (syncItems.length > 0) {
            checkDriveDuplicatesForTracks(syncItems, accessToken, folder.id);
          }
        } catch (err) {
          console.warn('Could not initialize music folder automatically:', err);
        }
      },
      () => {
        setUser(null);
        setToken(null);
        setFolderInfo(null);
        setDriveFiles([]);
      }
    );

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [syncItems.length]);

  const [authDomainBlockedUrl, setAuthDomainBlockedUrl] = useState<string | null>(null);
  const [copiedDomain, setCopiedDomain] = useState(false);

  // Connect Google Drive
  const handleConnectGoogle = async () => {
    setIsConnecting(true);
    setGeneralError(null);
    setAuthDomainBlockedUrl(null);
    try {
      const res = await googleSignIn();
      if (res) {
        setUser(res.user);
        setToken(res.accessToken);
        const folder = await getOrCreateMusicFolder(res.accessToken, 'musicas');
        setFolderInfo(folder);
        fetchDriveMusicFiles(res.accessToken, folder.id);
        if (syncItems.length > 0) {
          checkDriveDuplicatesForTracks(syncItems, res.accessToken, folder.id);
        }
      }
    } catch (err: any) {
      console.error('Login error:', err);
      const errMsg = String(err?.message || err || '');
      if (errMsg.includes('requests-from-referer') || errMsg.includes('unauthorized-domain')) {
        setAuthDomainBlockedUrl(window.location.origin);
      } else {
        setGeneralError(errMsg || 'Falha ao conectar com o Google Drive');
      }
    } finally {
      setIsConnecting(false);
    }
  };

  // Logout
  const handleLogout = async () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }
    setIsPlaying(false);
    setCurrentPlayingFile(null);
    await logout();
    setUser(null);
    setToken(null);
    setFolderInfo(null);
    setDriveFiles([]);
  };

  // Audio Playback Controls
  const handlePlayDriveFile = (file: DriveFileItem) => {
    if (!token) {
      handleConnectGoogle();
      return;
    }

    const audio = audioRef.current;
    if (!audio) return;

    if (currentPlayingFile?.id === file.id && audio.src) {
      if (isPlaying) {
        audio.pause();
      } else {
        audio.play().catch(console.error);
      }
      return;
    }

    setCurrentPlayingFile(file);
    const streamUrl = `/api/drive/stream?fileId=${file.id}&token=${encodeURIComponent(token)}`;
    audio.src = streamUrl;
    audio.currentTime = 0;
    audio.play().catch((err) => {
      console.error('Error playing track:', err);
      setGeneralError('Não foi possível reproduzir este áudio. Verifique sua conexão com o Drive.');
    });
  };

  const handleTogglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (!currentPlayingFile && driveFiles.length > 0) {
      handlePlayDriveFile(driveFiles[0]);
      return;
    }

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play().catch((err) => {
        console.error('Play error:', err);
        if (currentPlayingFile && token) {
          audio.src = `/api/drive/stream?fileId=${currentPlayingFile.id}&token=${encodeURIComponent(token)}`;
          audio.play().catch(console.error);
        }
      });
    }
  };

  const handleNextTrack = () => {
    if (driveFiles.length === 0) return;
    if (isShuffle) {
      const randomIndex = Math.floor(Math.random() * driveFiles.length);
      handlePlayDriveFile(driveFiles[randomIndex]);
      return;
    }
    const currentIndex = driveFiles.findIndex((f) => f.id === currentPlayingFile?.id);
    if (currentIndex !== -1 && currentIndex < driveFiles.length - 1) {
      handlePlayDriveFile(driveFiles[currentIndex + 1]);
    } else {
      handlePlayDriveFile(driveFiles[0]);
    }
  };

  const handlePrevTrack = () => {
    if (driveFiles.length === 0) return;
    const audio = audioRef.current;
    if (audio && audio.currentTime > 3) {
      audio.currentTime = 0;
      return;
    }
    const currentIndex = driveFiles.findIndex((f) => f.id === currentPlayingFile?.id);
    if (currentIndex > 0) {
      handlePlayDriveFile(driveFiles[currentIndex - 1]);
    } else {
      handlePlayDriveFile(driveFiles[driveFiles.length - 1]);
    }
  };

  const handleSeek = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const handleVolumeChange = (vol: number) => {
    setVolume(vol);
    if (vol > 0 && isMuted) setIsMuted(false);
  };

  const handleToggleMute = () => {
    setIsMuted((prev) => !prev);
  };

  const handleToggleShuffle = () => {
    setIsShuffle((prev) => !prev);
  };

  const handleCycleRepeat = () => {
    setRepeatMode((prev) => {
      if (prev === 'off') return 'all';
      if (prev === 'all') return 'one';
      return 'off';
    });
  };

  // Helper to cross-reference loaded tracks against existing Google Drive files (exact + fuzzy similarity)
  const checkDriveDuplicatesForTracks = async (
    itemsToCheck: TrackSyncItem[],
    currentToken?: string | null,
    currentFolderId?: string | null
  ) => {
    const t = currentToken || token;
    const fId = currentFolderId || folderInfo?.id;
    if (!t || !fId || itemsToCheck.length === 0) return;

    try {
      const existingFiles = await fetchAllMusicFiles(t, fId);
      if (existingFiles.length === 0) return;

      setSyncItems((prev) =>
        prev.map((item) => {
          // If already completed or explicitly in drive, keep it
          if (item.status === 'completed' || item.status === 'already_in_drive') {
            return item;
          }

          const dup = findDuplicateTrackInDrive(
            item.track.artistString,
            item.track.name,
            existingFiles
          );

          if (dup) {
            return {
              ...item,
              status: 'already_in_drive',
              driveFileId: dup.match.id,
              driveFileLink: dup.match.webViewLink,
              driveFileName: dup.match.name,
              duplicateReason: dup.reason,
              selected: false, // Uncheck by default so user doesn't re-upload duplicated songs
            };
          }

          return item;
        })
      );
    } catch (err) {
      console.warn('Error checking duplicates in Google Drive:', err);
    }
  };

  // 2. Import Spotify Playlist
  const handleImportUrl = async (url: string) => {
    setIsLoadingPlaylist(true);
    setGeneralError(null);
    try {
      const res = await fetch('/api/spotify/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Erro ao carregar playlist');
      }

      setPlaylist(data.playlist);
      const items: TrackSyncItem[] = data.playlist.tracks.map((t: any) => ({
        id: t.id,
        track: t,
        status: 'idle',
        progress: 0,
        selected: true,
      }));
      setSyncItems(items);

      // Instantly check for existing tracks in Drive if user is connected
      if (token && folderInfo?.id) {
        checkDriveDuplicatesForTracks(items, token, folderInfo.id);
      }
    } catch (err: any) {
      setGeneralError(err.message || 'Falha ao carregar playlist do Spotify');
    } finally {
      setIsLoadingPlaylist(false);
    }
  };

  // Import custom text list
  const handleImportText = async (text: string, title: string) => {
    setIsLoadingPlaylist(true);
    setGeneralError(null);
    try {
      const res = await fetch('/api/spotify/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, title }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Erro ao importar músicas');
      }

      setPlaylist(data.playlist);
      const items: TrackSyncItem[] = data.playlist.tracks.map((t: any) => ({
        id: t.id,
        track: t,
        status: 'idle',
        progress: 0,
        selected: true,
      }));
      setSyncItems(items);

      // Instantly check for existing tracks in Drive if user is connected
      if (token && folderInfo?.id) {
        checkDriveDuplicatesForTracks(items, token, folderInfo.id);
      }
    } catch (err: any) {
      setGeneralError(err.message || 'Falha ao importar texto');
    } finally {
      setIsLoadingPlaylist(false);
    }
  };

  // 3. Search YouTube for single track
  const handleSearchYouTube = async (item: TrackSyncItem) => {
    setSyncItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, status: 'searching' } : i))
    );

    try {
      const res = await fetch('/api/youtube/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trackName: item.track.name,
          artistName: item.track.artistString,
          durationMs: item.track.durationMs,
        }),
      });

      const data = await res.json();
      if (res.ok && data.match) {
        setSyncItems((prev) =>
          prev.map((i) =>
            i.id === item.id
              ? {
                  ...i,
                  ytMatch: data.match,
                  status: i.status === 'completed' ? 'completed' : 'found',
                }
              : i
          )
        );
      } else {
        setSyncItems((prev) =>
          prev.map((i) =>
            i.id === item.id
              ? {
                  ...i,
                  status: 'not_found',
                  statusMessage: 'Vídeo não encontrado no YouTube',
                }
              : i
          )
        );
      }
    } catch (err: any) {
      setSyncItems((prev) =>
        prev.map((i) =>
          i.id === item.id
            ? {
                ...i,
                status: 'error',
                statusMessage: 'Erro na busca do YouTube',
                error: err.message,
              }
            : i
        )
      );
    }
  };

  // Search YouTube for all tracks
  const handleSearchAllYouTube = async () => {
    if (syncItems.length === 0) return;
    setIsSearchingAll(true);

    // Set all to searching
    setSyncItems((prev) =>
      prev.map((i) => ({ ...i, status: i.status === 'completed' ? 'completed' : 'searching' }))
    );

    try {
      const payloadTracks = syncItems.map((i) => ({
        id: i.id,
        name: i.track.name,
        artistString: i.track.artistString,
        durationMs: i.track.durationMs,
      }));

      const res = await fetch('/api/youtube/batch-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tracks: payloadTracks }),
      });

      const data = await res.json();
      if (res.ok && data.results) {
        setSyncItems((prev) =>
          prev.map((i) => {
            const match: YouTubeMatch | null = data.results[i.id];
            if (match) {
              return {
                ...i,
                ytMatch: match,
                status: i.status === 'completed' ? 'completed' : 'found',
              };
            }
            return {
              ...i,
              status: 'not_found',
              statusMessage: 'Não encontrado no YouTube',
            };
          })
        );
      }
    } catch (err: any) {
      console.error('Batch search error:', err);
    } finally {
      setIsSearchingAll(false);
    }
  };

  // 4. Sync a single track to Google Drive
  const syncSingleTrack = async (item: TrackSyncItem, currentToken: string, currentFolderId: string) => {
    let currentYtMatch = item.ytMatch;

    // Step A: Search on YouTube if not already matched
    if (!currentYtMatch) {
      setSyncItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, status: 'searching' } : i))
      );

      const searchRes = await fetch('/api/youtube/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trackName: item.track.name,
          artistName: item.track.artistString,
          durationMs: item.track.durationMs,
        }),
      });
      const searchData = await searchRes.json();
      if (!searchRes.ok || !searchData.match) {
        setSyncItems((prev) =>
          prev.map((i) =>
            i.id === item.id
              ? { ...i, status: 'not_found', statusMessage: 'Não encontrado no YouTube' }
              : i
          )
        );
        return false;
      }
      currentYtMatch = searchData.match;
      setSyncItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, ytMatch: currentYtMatch } : i))
      );
    }

    // Step B: Intelligent duplicate check in Google Drive folder (Exact + Fuzzy name matching)
    let duplicateMatch: { id: string; name: string; webViewLink: string } | null = null;
    let duplicateReason = '';

    try {
      const allFiles = await fetchAllMusicFiles(currentToken, currentFolderId);
      const dup = findDuplicateTrackInDrive(item.track.artistString, item.track.name, allFiles);
      if (dup) {
        duplicateMatch = dup.match;
        duplicateReason = dup.reason || 'Já existe no Drive';
      }
    } catch {
      // Fallback to exact query check if bulk listing encounters issues
      const expectedNamePattern = `${item.track.artistString} - ${item.track.name}`;
      const exactExists = await checkFileExistsInFolder(currentToken, currentFolderId, `${expectedNamePattern}.mp3`) ||
                          await checkFileExistsInFolder(currentToken, currentFolderId, `${expectedNamePattern}.m4a`);
      if (exactExists) {
        duplicateMatch = exactExists;
        duplicateReason = 'Correspondência exata';
      }
    }

    if (duplicateMatch) {
      setSyncItems((prev) =>
        prev.map((i) =>
          i.id === item.id
            ? {
                ...i,
                status: 'already_in_drive',
                driveFileId: duplicateMatch!.id,
                driveFileLink: duplicateMatch!.webViewLink,
                driveFileName: duplicateMatch!.name,
                duplicateReason: duplicateReason,
                selected: false,
              }
            : i
        )
      );
      return true;
    }

    // Step C: Download audio & Upload directly to Google Drive via server route
    setSyncItems((prev) =>
      prev.map((i) =>
        i.id === item.id ? { ...i, status: 'downloading', statusMessage: 'Baixando áudio do YouTube...' } : i
      )
    );

    // Progress update to uploading
    setTimeout(() => {
      setSyncItems((prev) =>
        prev.map((i) =>
          i.id === item.id && i.status === 'downloading'
            ? { ...i, status: 'uploading', statusMessage: 'Enviando para a pasta musicas...' }
            : i
        )
      );
    }, 1500);

    const syncRes = await fetch('/api/sync-track-to-drive', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        accessToken: currentToken,
        folderId: currentFolderId,
        videoId: currentYtMatch!.videoId,
        trackName: item.track.name,
        artistName: item.track.artistString,
      }),
    });

    const syncData = await syncRes.json();
    if (!syncRes.ok || !syncData.success) {
      throw new Error(syncData.error || 'Falha ao salvar no Google Drive');
    }

    setSyncItems((prev) =>
      prev.map((i) =>
        i.id === item.id
          ? {
              ...i,
              status: 'completed',
              driveFileId: syncData.file.id,
              driveFileLink: syncData.file.webViewLink,
              driveFileName: syncData.file.name,
            }
          : i
      )
    );

    return true;
  };

  // Handle single track sync button click
  const handleSyncToDrive = async (item: TrackSyncItem) => {
    let currentToken = token;
    let currentFolder = folderInfo;

    if (!currentToken || !user) {
      try {
        const res = await googleSignIn();
        if (!res) return;
        setUser(res.user);
        setToken(res.accessToken);
        currentToken = res.accessToken;
        currentFolder = await getOrCreateMusicFolder(res.accessToken, 'musicas');
        setFolderInfo(currentFolder);
      } catch (err: any) {
        setGeneralError(err.message || 'Erro ao conectar Google Drive');
        return;
      }
    }

    if (!currentFolder) {
      currentFolder = await getOrCreateMusicFolder(currentToken, 'musicas');
      setFolderInfo(currentFolder);
    }

    try {
      await syncSingleTrack(item, currentToken, currentFolder.id);
    } catch (err: any) {
      setSyncItems((prev) =>
        prev.map((i) =>
          i.id === item.id
            ? { ...i, status: 'error', statusMessage: err.message || 'Erro ao salvar' }
            : i
        )
      );
    }
  };

  // Handle batch sync all selected tracks
  const handleSyncAllToDrive = async () => {
    const selectedTracks = syncItems.filter(
      (i) => i.selected && i.status !== 'completed' && i.status !== 'already_in_drive'
    );

    if (selectedTracks.length === 0) {
      alert('Selecione pelo menos uma música para sincronizar.');
      return;
    }

    // Ask user confirmation before mutating/uploading to Google Drive
    setConfirmModal({
      isOpen: true,
      title: 'Confirmar Sincronização com o Google Drive',
      description: `O aplicativo irá processar e baixar ${selectedTracks.length} músicas com paralelismo (${concurrency} downloads simultâneos) e salvá-las na pasta "musicas" do seu Google Drive.`,
      count: selectedTracks.length,
      action: async () => {
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        await executeBatchSync(selectedTracks);
      },
    });
  };

  const executeBatchSync = async (selectedTracks: TrackSyncItem[]) => {
    let currentToken = token;
    let currentFolder = folderInfo;

    if (!currentToken || !user) {
      try {
        const res = await googleSignIn();
        if (!res) return;
        setUser(res.user);
        setToken(res.accessToken);
        currentToken = res.accessToken;
        currentFolder = await getOrCreateMusicFolder(res.accessToken, 'musicas');
        setFolderInfo(currentFolder);
      } catch (err: any) {
        setGeneralError(err.message || 'Erro ao autenticar com Google');
        return;
      }
    }

    if (!currentFolder) {
      currentFolder = await getOrCreateMusicFolder(currentToken, 'musicas');
      setFolderInfo(currentFolder);
    }

    setIsSyncAll(true);
    let successCount = 0;
    let nextTrackIndex = 0;

    // Concurrency Worker Pool: Run up to `concurrency` (e.g. 3, 4, or 5) tracks simultaneously
    const workerCount = Math.min(Math.max(1, concurrency), selectedTracks.length);
    const workers = Array.from({ length: workerCount }, async () => {
      while (nextTrackIndex < selectedTracks.length) {
        const currentIndex = nextTrackIndex++;
        const item = selectedTracks[currentIndex];

        try {
          const ok = await syncSingleTrack(item, currentToken, currentFolder.id);
          if (ok) successCount++;
        } catch (err: any) {
          console.error(`Error syncing track "${item.track.name}":`, err);
          setSyncItems((prev) =>
            prev.map((i) =>
              i.id === item.id
                ? { ...i, status: 'error', statusMessage: err.message || 'Falha ao sincronizar' }
                : i
            )
          );
        }
      }
    });

    await Promise.all(workers);
    setIsSyncAll(false);

    if (successCount > 0) {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });
      // Refresh drive files list so the player is immediately updated
      fetchDriveMusicFiles(currentToken, currentFolder.id);
    }
  };

  // Selection handlers
  const handleToggleSelect = (id: string) => {
    setSyncItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, selected: !i.selected } : i))
    );
  };

  const handleToggleSelectAll = () => {
    const allSelected = syncItems.every((i) => i.selected);
    setSyncItems((prev) => prev.map((i) => ({ ...i, selected: !allSelected })));
  };

  const allSelected = syncItems.length > 0 && syncItems.every((i) => i.selected);
  const selectedCount = syncItems.filter((i) => i.selected).length;

  const completedTracksCount = syncItems.filter((i) => i.status === 'completed' || i.status === 'already_in_drive').length;

  return (
    <div className="min-h-screen bg-[#050505] text-[#F0F0F0] font-sans flex flex-col selection:bg-[#1DB954] selection:text-black">
      {/* Header */}
      <Header
        user={user}
        folderInfo={folderInfo}
        isConnecting={isConnecting}
        activeTab={activeTab}
        tracksInDriveCount={driveFiles.length}
        isPlayingMusic={isPlaying}
        onTabChange={setActiveTab}
        onConnect={handleConnectGoogle}
        onLogout={handleLogout}
        onOpenFolderModal={() => setIsFolderModalOpen(true)}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        {/* Referrer/Domain blocked guidance banner */}
        {authDomainBlockedUrl && (
          <div className="bg-[#1c1408] border border-amber-500/40 text-amber-200 p-5 sm:p-6 rounded-3xl shadow-xl space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-base text-amber-300">
                    Bloqueio de Referenciador HTTP no Google Cloud / Firebase
                  </h4>
                  <p className="text-xs text-amber-200/80 font-mono mt-0.5">
                    A Chave de API ainda está rejeitando requisições originadas deste domínio.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setAuthDomainBlockedUrl(null)}
                className="text-amber-400 hover:text-white font-bold text-xl leading-none px-2 py-1"
                title="Fechar aviso"
              >
                ×
              </button>
            </div>

            <div className="bg-[#120d05] border border-amber-500/20 rounded-2xl p-4 space-y-3 text-xs font-mono">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-500/20 pb-3">
                <span className="text-neutral-400">URL / Domínio deste app:</span>
                <div className="flex items-center gap-2">
                  <code className="bg-black/60 px-3 py-1.5 rounded-xl text-amber-300 border border-amber-500/30 select-all">
                    {authDomainBlockedUrl}
                  </code>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(authDomainBlockedUrl);
                      setCopiedDomain(true);
                      setTimeout(() => setCopiedDomain(false), 3000);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/40 transition-colors"
                  >
                    {copiedDomain ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedDomain ? 'Copiado!' : 'Copiar'}</span>
                  </button>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-500/20 pb-3">
                <span className="text-neutral-400">Chave exata do projeto:</span>
                <code className="bg-black/60 px-3 py-1 rounded-lg text-emerald-400 border border-emerald-500/30">
                  AIzaSyDs1cxd...a9TsyU
                </code>
              </div>

              <div className="space-y-2 pt-1 text-neutral-300 leading-relaxed">
                <p className="font-bold text-amber-300">Principais motivos para continuar dando o erro:</p>
                <ol className="list-decimal list-inside space-y-2 text-neutral-300 pl-1">
                  <li>
                    <strong>Propagação do Google Cloud (Demora de 3 a 7 minutos):</strong> O Google Cloud leva alguns minutos para propagar alterações nas chaves de API em todos os servidores. Aguarde 2-3 minutos e teste novamente.
                  </li>
                  <li>
                    <strong>Selecione &quot;Nenhuma&quot; em Restrições de Aplicativo:</strong> No console do Google Cloud, em <em>Restrições de aplicativo</em>, marque temporariamente <strong>&quot;Nenhuma&quot; (None)</strong> e clique em <strong>Salvar</strong>. Isso elimina qualquer problema de digitação ou formatação de URL (*.run.app).
                  </li>
                  <li>
                    <strong>Confirme a Chave Correta:</strong> Se houver mais de uma chave em <a href="https://console.cloud.google.com/apis/credentials?project=images-cbc42" target="_blank" rel="noopener noreferrer" className="text-amber-400 underline font-bold inline-flex items-center gap-1">Credenciais do Google Cloud <ExternalLink className="w-3 h-3 inline" /></a>, verifique se a chave editada termina exatamente em <code className="text-amber-300 bg-black/40 px-1 py-0.5 rounded">...a9TsyU</code>.
                  </li>
                  <li>
                    <strong>Restrições de API:</strong> Se a seção <em>&quot;Restrições de API&quot;</em> estiver marcada como &quot;Restringir chave&quot;, certifique-se de que <strong>Identity Toolkit API</strong> e <strong>Google Identity Services API</strong> estão ativadas e permitidas.
                  </li>
                </ol>
              </div>

              <div className="pt-3 border-t border-amber-500/20 flex flex-wrap items-center gap-3">
                <button
                  onClick={handleConnectGoogle}
                  disabled={isConnecting}
                  className="px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-bold text-xs flex items-center gap-2 transition-all shadow-md cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isConnecting ? 'animate-spin' : ''}`} />
                  <span>{isConnecting ? 'Tentando conectar...' : 'Testar Conexão Novamente'}</span>
                </button>
                <span className="text-[11px] text-neutral-400">
                  Dica: Se acabou de salvar no Google Cloud, recarregue a página com <kbd className="bg-black/50 px-1.5 py-0.5 rounded text-amber-200">Ctrl + Shift + R</kbd> ou teste em uma janela anônima.
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Error notification banner if any */}
        {generalError && (
          <div className="bg-[#1c1212] border border-rose-900/60 text-rose-300 p-4 rounded-2xl flex items-center justify-between text-xs sm:text-sm font-mono shadow-md">
            <span>{generalError}</span>
            <button
              onClick={() => setGeneralError(null)}
              className="text-rose-400 hover:text-white font-bold ml-3 text-lg leading-none"
            >
              ×
            </button>
          </div>
        )}

        {/* Tab 1: Sync Dashboard */}
        {activeTab === 'sync' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Bento Top Row: Source Input (8 cols) + Destination Google Drive Info (4 cols) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
              {/* Spotify Source Bento Box */}
              <div className="lg:col-span-8">
                <PlaylistInput
                  isLoading={isLoadingPlaylist}
                  onImportUrl={handleImportUrl}
                  onImportText={handleImportText}
                />
              </div>

              {/* Destination Google Drive Bento Box */}
              <div className="lg:col-span-4 bg-[#121212] rounded-3xl border border-[#282828] p-6 sm:p-7 flex flex-col justify-between shadow-[0_8px_30px_rgb(0,0,0,0.4)]">
                <div>
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-xs uppercase tracking-widest text-[#888888] font-bold">
                        Destination
                      </p>
                      <h3 className="text-xl font-black text-[#F0F0F0] mt-1">
                        Google Drive
                      </h3>
                      <p className="text-xs text-[#666] font-mono mt-1">
                        /My Drive/{folderInfo?.name || 'musicas'}
                      </p>
                    </div>

                    <div className="w-12 h-12 bg-[#4285F4]/15 border border-[#4285F4]/30 rounded-2xl flex items-center justify-center text-[#4285F4] shrink-0">
                      <svg className="w-6 h-6 fill-[#4285F4]" viewBox="0 0 24 24">
                        <path d="M7.74 3.522l-.005-.01h8.534l.006.012 5.485 9.54H2.24l5.5-9.542zm1.616 11.238l-2.731 4.743L3.896 14.76l2.731-4.743 2.73 4.743zm2.643-4.582l2.732 4.743h-5.463l2.731-4.743zm5.006 4.582h5.461l-2.731 4.742h-5.461l2.731-4.742z"/>
                      </svg>
                    </div>
                  </div>

                  {/* Status or Connection prompt */}
                  <div className="mt-4 pt-4 border-t border-[#222]">
                    {user ? (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-xs font-mono">
                          <span className="text-[#888]">Status da Pasta:</span>
                          <span className="text-[#1DB954] font-bold">Pronta / Conectada</span>
                        </div>

                        <div className="w-full bg-[#1c1c1c] h-2 rounded-full overflow-hidden border border-[#2a2a2a]">
                          <div 
                            className="bg-[#4285F4] h-full rounded-full transition-all duration-500 shadow-[0_0_8px_#4285F4]"
                            style={{ width: syncItems.length > 0 ? `${Math.min(100, Math.max(15, (completedTracksCount / syncItems.length) * 100))}%` : '40%' }}
                          />
                        </div>

                        <div className="flex justify-between items-center text-[11px] font-mono text-[#666]">
                          <span>{driveFiles.length} faixas salvas</span>
                          <button
                            onClick={() => setIsFolderModalOpen(true)}
                            className="text-[#4285F4] hover:text-[#7bb0ff] underline flex items-center gap-1"
                          >
                            <Folder className="w-3 h-3" /> Ver pasta
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <p className="text-xs text-[#888] font-mono leading-relaxed">
                          Conecte sua conta para criar e gerenciar a pasta &quot;musicas&quot;.
                        </p>
                        <button
                          onClick={handleConnectGoogle}
                          disabled={isConnecting}
                          className="w-full py-2.5 bg-[#1e1e1e] hover:bg-[#282828] text-[#F0F0F0] text-xs font-mono font-bold rounded-xl border border-[#333] transition-all flex items-center justify-center gap-2"
                        >
                          <HardDrive className="w-3.5 h-3.5 text-[#4285F4]" />
                          <span>{isConnecting ? 'Autenticando...' : 'Conectar Conta Google'}</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {folderInfo?.webViewLink && (
                  <div className="pt-3">
                    <a
                      href={folderInfo.webViewLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-2 px-3 bg-[#181818] hover:bg-[#222] text-[#888] hover:text-[#fff] text-[11px] font-mono rounded-xl border border-[#282828] transition-all flex items-center justify-between"
                    >
                      <span>Abrir Google Drive Web</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Bento Middle Row: Stats & Fast Actions (when playlist is loaded or default showcase) */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              {/* Bento Tile: Success Rate */}
              <div className="md:col-span-4 bg-[#121212] rounded-3xl border border-[#282828] p-6 sm:p-8 flex flex-col justify-center shadow-[0_8px_30px_rgb(0,0,0,0.4)]">
                <p className="text-xs uppercase tracking-widest text-[#888888] font-bold">
                  Taxa de Correspondência YT
                </p>
                <div className="flex items-end gap-2 mt-2">
                  <span className="text-5xl sm:text-6xl font-black text-[#F0F0F0]">99</span>
                  <span className="text-2xl font-bold text-[#1DB954] mb-2 font-mono">%</span>
                </div>
                <p className="text-xs text-[#666] font-mono mt-2">
                  Pesquisa semântica por Artista, Nome e Duração exata.
                </p>
              </div>

              {/* Bento Tile: Big Action Start Syncing */}
              <div 
                onClick={syncItems.length > 0 ? handleSyncAllToDrive : undefined}
                className={`md:col-span-5 bg-[#1DB954] rounded-3xl p-6 sm:p-8 flex flex-col justify-between text-black transition-all shadow-[0_10px_40px_rgba(29,185,84,0.35)] ${
                  syncItems.length > 0 ? 'cursor-pointer hover:bg-[#1ed760] hover:scale-[1.01]' : 'opacity-90'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-mono font-bold uppercase tracking-widest bg-black/15 px-2.5 py-0.5 rounded-full">
                      ONE-CLICK SYNC
                    </span>
                    <h3 className="text-2xl sm:text-3xl font-black leading-tight mt-2">
                      START<br />SYNCING
                    </h3>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-black text-[#1DB954] flex items-center justify-center shadow-md">
                    <Play className="w-6 h-6 fill-current ml-0.5" />
                  </div>
                </div>

                <div className="flex justify-between items-end mt-4 pt-4 border-t border-black/10">
                  <div className="flex flex-col">
                    <p className="text-xs font-bold uppercase opacity-70 font-mono">Fila Atual</p>
                    <p className="text-lg font-black font-mono">
                      {syncItems.length > 0 ? `${selectedCount} Selecionadas` : 'Aguardando Playlist'}
                    </p>
                  </div>
                  {syncItems.length > 0 && (
                    <span className="text-xs font-mono font-black underline">
                      {isSyncingAll ? 'Processando...' : 'Iniciar →'}
                    </span>
                  )}
                </div>
              </div>

              {/* Bento Tile: Auto-Config & Engine Specs */}
              <div className="md:col-span-3 bg-[#121212] rounded-3xl border border-[#282828] p-6 flex flex-col justify-between shadow-[0_8px_30px_rgb(0,0,0,0.4)]">
                <div>
                  <div className="flex items-center justify-between border-b border-[#222] pb-3 mb-4">
                    <h4 className="text-xs uppercase tracking-widest text-[#888888] font-bold flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5 text-[#1DB954]" /> Auto-Config
                    </h4>
                    <span className="w-2 h-2 rounded-full bg-[#1DB954] animate-ping" />
                  </div>

                  <div className="space-y-3 font-mono text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-[#888]">Áudio 320kbps</span>
                      <span className="text-[#1DB954] font-bold">HQ Audio</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[#888]">Metadata Tagging</span>
                      <span className="text-[#F0F0F0]">Auto ID3</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[#888]">Drive Subpasta</span>
                      <span className="text-[#4285F4]">/musicas</span>
                    </div>
                  </div>
                </div>

                {/* Server Load Indicator */}
                <div className="mt-4 pt-4 border-t border-[#222]">
                  <p className="text-[10px] uppercase font-mono font-bold text-[#666] mb-2">
                    Sync Engine Load
                  </p>
                  <div className="grid grid-cols-8 gap-1">
                    <div className="h-3 bg-[#1DB954] rounded-xs"></div>
                    <div className="h-3 bg-[#1DB954] rounded-xs"></div>
                    <div className="h-3 bg-[#1DB954] rounded-xs"></div>
                    <div className="h-3 bg-[#1DB954] rounded-xs"></div>
                    <div className="h-3 bg-[#1DB954] rounded-xs"></div>
                    <div className="h-3 bg-[#1DB954] rounded-xs"></div>
                    <div className="h-3 bg-[#333] rounded-xs"></div>
                    <div className="h-3 bg-[#333] rounded-xs"></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Summary and Track Listing if playlist is loaded */}
            {playlist && syncItems.length > 0 ? (
              <div className="space-y-6 animate-in fade-in duration-300">
                <PlaylistSummary
                  playlist={playlist}
                  items={syncItems}
                  isSearchingAll={isSearchingAll}
                  isSyncingAll={isSyncingAll}
                  concurrency={concurrency}
                  onConcurrencyChange={setConcurrency}
                  onSearchAllYouTube={handleSearchAllYouTube}
                  onSyncAllToDrive={handleSyncAllToDrive}
                  onToggleSelectAll={handleToggleSelectAll}
                  allSelected={allSelected}
                  selectedCount={selectedCount}
                />

                <TrackList
                  items={syncItems}
                  isProcessing={isSearchingAll || isSyncingAll}
                  onToggleSelect={handleToggleSelect}
                  onSearchYouTube={handleSearchYouTube}
                  onSyncToDrive={handleSyncToDrive}
                />
              </div>
            ) : (
              /* Empty state prompt with quick suggestions */
              <div className="bg-[#121212] rounded-3xl border border-[#282828] p-8 sm:p-12 text-center space-y-4 shadow-[0_8px_30px_rgb(0,0,0,0.4)]">
                <div className="w-14 h-14 rounded-3xl bg-[#1a1a1a] border border-[#333] text-[#1DB954] flex items-center justify-center mx-auto shadow-inner">
                  <Youtube className="w-7 h-7" />
                </div>
                <h3 className="text-lg sm:text-xl font-black text-[#F0F0F0]">
                  Nenhuma playlist carregada no momento
                </h3>
                <p className="text-xs sm:text-sm text-[#777] max-w-lg mx-auto font-mono">
                  Cole o link de uma playlist do Spotify acima ou selecione um dos exemplos rápidos para carregar a fila de sincronização.
                </p>
                {driveFiles.length > 0 && (
                  <div className="pt-2">
                    <button
                      onClick={() => setActiveTab('player')}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[#1DB954] hover:bg-[#1ed760] text-black text-xs font-mono font-bold transition-all shadow-[0_4px_20px_rgba(29,185,84,0.3)]"
                    >
                      <Headphones className="w-4 h-4" />
                      <span>Ouvir {driveFiles.length} músicas na sua pasta</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Music Player Interface */}
        {activeTab === 'player' && (
          <div className="animate-in fade-in duration-300">
            <MusicPlayer
              files={driveFiles}
              isLoading={isLoadingDriveFiles}
              currentFile={currentPlayingFile}
              isPlaying={isPlaying}
              currentTime={currentTime}
              duration={duration}
              volume={volume}
              isMuted={isMuted}
              isShuffle={isShuffle}
              repeatMode={repeatMode}
              accessToken={token}
              folderInfo={folderInfo}
              onPlayFile={handlePlayDriveFile}
              onTogglePlay={handleTogglePlay}
              onNext={handleNextTrack}
              onPrev={handlePrevTrack}
              onSeek={handleSeek}
              onVolumeChange={handleVolumeChange}
              onToggleMute={handleToggleMute}
              onToggleShuffle={handleToggleShuffle}
              onCycleRepeat={handleCycleRepeat}
              onRefreshFiles={() => fetchDriveMusicFiles(token, folderInfo?.id)}
              onConnectDrive={handleConnectGoogle}
            />
          </div>
        )}
      </main>

      {/* Persistent Mini Player when browsing in Sync mode and a song is playing/selected */}
      {activeTab === 'sync' && currentPlayingFile && (
        <MiniPlayer
          currentFile={currentPlayingFile}
          isPlaying={isPlaying}
          currentTime={currentTime}
          duration={duration}
          volume={volume}
          isMuted={isMuted}
          onTogglePlay={handleTogglePlay}
          onNext={handleNextTrack}
          onPrev={handlePrevTrack}
          onSeek={handleSeek}
          onVolumeChange={handleVolumeChange}
          onToggleMute={handleToggleMute}
          onExpandPlayer={() => setActiveTab('player')}
          onClosePlayer={() => {
            if (audioRef.current) {
              audioRef.current.pause();
            }
            setIsPlaying(false);
            setCurrentPlayingFile(null);
          }}
        />
      )}

      {/* Bento Footer */}
      <footer className={`border-t border-[#1a1a1a] bg-[#070707] py-6 px-4 sm:px-6 lg:px-8 mt-12 text-[11px] text-[#555] font-mono ${
        activeTab === 'sync' && currentPlayingFile ? 'pb-24 sm:pb-28' : ''
      }`}>
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-3">
          <p>SYS_VER: 2.4.0 // BENTO_GRID // REGION: SA-EAST-1</p>
          <p>INTEGRATIONS: SPOTIFY_V2 • YT_SEARCH • GOOGLE_DRIVE_OAUTH • HQ_AUDIO_STREAM</p>
        </div>
      </footer>

      {/* Google Drive Folder Content Modal */}
      <DriveFolderViewer
        accessToken={token}
        folderInfo={folderInfo}
        isOpen={isFolderModalOpen}
        onClose={() => setIsFolderModalOpen(false)}
        onOpenPlayer={() => setActiveTab('player')}
        onPlayTrack={(file) => {
          handlePlayDriveFile(file);
          setActiveTab('player');
        }}
      />

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        description={confirmModal.description}
        count={confirmModal.count}
        onConfirm={() => {
          if (confirmModal.action) confirmModal.action();
        }}
        onCancel={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
