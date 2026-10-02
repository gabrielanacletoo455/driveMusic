export interface SpotifyTrack {
  id: string;
  name: string;
  artists: string[];
  artistString: string;
  albumName: string;
  albumCover?: string;
  durationMs: number;
  durationFormatted: string;
  spotifyUrl?: string;
}

export interface SpotifyPlaylistInfo {
  id: string;
  title: string;
  description?: string;
  coverUrl?: string;
  ownerName?: string;
  totalTracks: number;
  tracks: SpotifyTrack[];
}

export interface YouTubeMatch {
  videoId: string;
  title: string;
  url: string;
  author: string;
  durationSeconds: number;
  durationFormatted: string;
  thumbnail: string;
  views?: number;
}

export type SyncStatus = 
  | 'idle' 
  | 'searching' 
  | 'found'
  | 'not_found'
  | 'downloading' 
  | 'uploading' 
  | 'completed' 
  | 'already_in_drive'
  | 'error' 
  | 'skipped';

export interface TrackSyncItem {
  id: string;
  track: SpotifyTrack;
  ytMatch?: YouTubeMatch | null;
  status: SyncStatus;
  progress: number;
  statusMessage?: string;
  error?: string;
  driveFileId?: string;
  driveFileLink?: string;
  driveFileName?: string;
  duplicateReason?: string;
  selected: boolean;
}

export interface DriveFolderInfo {
  id: string;
  name: string;
  webViewLink?: string;
}

export interface DriveFileItem {
  id: string;
  name: string;
  size?: string;
  createdTime?: string;
  webViewLink?: string;
  iconLink?: string;
}

export interface UserProfile {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
}
