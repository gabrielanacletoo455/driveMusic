import { DriveFolderInfo, DriveFileItem } from '../types';
import { isMusicDuplicate } from '../utils/normalize';

const DRIVE_API_URL = 'https://www.googleapis.com/drive/v3';
const DRIVE_UPLOAD_URL = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';

/**
 * Searches for an existing folder by name (e.g. 'musicas') or creates it if it doesn't exist.
 */
export async function getOrCreateMusicFolder(
  accessToken: string,
  folderName = 'musicas'
): Promise<DriveFolderInfo> {
  const query = `name = '${folderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
  const searchUrl = `${DRIVE_API_URL}/files?q=${encodeURIComponent(query)}&fields=files(id, name, webViewLink)&spaces=drive`;

  const searchRes = await fetch(searchUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!searchRes.ok) {
    const errorText = await searchRes.text();
    throw new Error(`Erro ao buscar pasta no Google Drive: ${errorText}`);
  }

  const searchData = await searchRes.json();
  if (searchData.files && searchData.files.length > 0) {
    const folder = searchData.files[0];
    return {
      id: folder.id,
      name: folder.name,
      webViewLink: folder.webViewLink || `https://drive.google.com/drive/folders/${folder.id}`,
    };
  }

  // Folder doesn't exist, create it
  const createRes = await fetch(`${DRIVE_API_URL}/files`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      description: 'Pasta criada pelo Spotify to Drive Music Sync para armazenar suas músicas',
    }),
  });

  if (!createRes.ok) {
    const errorText = await createRes.text();
    throw new Error(`Erro ao criar pasta '${folderName}' no Google Drive: ${errorText}`);
  }

  const createdFolder = await createRes.json();
  return {
    id: createdFolder.id,
    name: createdFolder.name,
    webViewLink: createdFolder.webViewLink || `https://drive.google.com/drive/folders/${createdFolder.id}`,
  };
}

/**
 * Check if a music file already exists in the given folder using exact query.
 */
export async function checkFileExistsInFolder(
  accessToken: string,
  folderId: string,
  fileName: string
): Promise<{ id: string; webViewLink: string; name: string } | null> {
  // Clean file name for query
  const safeName = fileName.replace(/'/g, "\\'");
  const query = `'${folderId}' in parents and name = '${safeName}' and trashed = false`;
  const url = `${DRIVE_API_URL}/files?q=${encodeURIComponent(query)}&fields=files(id, name, webViewLink)&spaces=drive`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) return null;
  const data = await res.json();
  if (data.files && data.files.length > 0) {
    return data.files[0];
  }
  return null;
}

/**
 * Fetches all music files currently stored in the Google Drive folder (with pagination support).
 */
export async function fetchAllMusicFiles(
  accessToken: string,
  folderId: string
): Promise<Array<{ id: string; name: string; webViewLink: string; size?: string; createdTime?: string }>> {
  const allFiles: Array<{ id: string; name: string; webViewLink: string; size?: string; createdTime?: string }> = [];
  let pageToken: string | undefined = undefined;

  try {
    do {
      const pageParam = pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : '';
      const query = `'${folderId}' in parents and trashed = false`;
      const url = `${DRIVE_API_URL}/files?q=${encodeURIComponent(query)}&fields=nextPageToken,files(id, name, size, createdTime, webViewLink)&pageSize=100${pageParam}`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!res.ok) break;
      const data = await res.json();

      if (data.files && Array.isArray(data.files)) {
        for (const file of data.files) {
          allFiles.push({
            id: file.id,
            name: file.name,
            webViewLink: file.webViewLink || `https://drive.google.com/file/d/${file.id}/view`,
            size: file.size ? formatBytes(parseInt(file.size, 10)) : undefined,
            createdTime: file.createdTime,
          });
        }
      }

      pageToken = data.nextPageToken;
    } while (pageToken);
  } catch (err) {
    console.warn('Error fetching all music files from Google Drive:', err);
  }

  return allFiles;
}

/**
 * Intelligent duplicate checker: Uses exact matching, normalization, and fuzzy string similarity
 * to find if a track already exists in the user's Drive folder (even with minor typos, casing, or tagging differences).
 */
export function findDuplicateTrackInDrive(
  artistName: string,
  trackName: string,
  existingFiles: Array<{ id: string; name: string; webViewLink: string }>
): { match: { id: string; name: string; webViewLink: string }; score: number; reason?: string } | null {
  for (const file of existingFiles) {
    const dupCheck = isMusicDuplicate(artistName, trackName, file.name);
    if (dupCheck.isDuplicate) {
      return {
        match: file,
        score: dupCheck.score,
        reason: dupCheck.reason,
      };
    }
  }
  return null;
}

/**
 * List files inside the music folder
 */
export async function listFilesInMusicFolder(
  accessToken: string,
  folderId: string
): Promise<DriveFileItem[]> {
  const query = `'${folderId}' in parents and trashed = false`;
  const url = `${DRIVE_API_URL}/files?q=${encodeURIComponent(query)}&fields=files(id, name, size, createdTime, webViewLink, iconLink)&orderBy=createdTime desc&pageSize=100`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    return [];
  }

  const data = await res.json();
  return (data.files || []).map((f: any) => ({
    id: f.id,
    name: f.name,
    size: f.size ? formatBytes(parseInt(f.size, 10)) : undefined,
    createdTime: f.createdTime,
    webViewLink: f.webViewLink,
    iconLink: f.iconLink,
  }));
}

/**
 * Uploads an audio Blob/File directly to Google Drive in the specified folder.
 */
export async function uploadAudioToDrive(
  accessToken: string,
  folderId: string,
  fileName: string,
  audioBlob: Blob,
  mimeType = 'audio/mpeg'
): Promise<{ id: string; name: string; webViewLink: string }> {
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

  const audioArrayBuffer = await audioBlob.arrayBuffer();

  const metadataBlob = new Blob([metadataPart]);
  const mediaHeaderBlob = new Blob([mediaHeader]);
  const closeDelimiterBlob = new Blob([closeDelimiter]);

  const multipartBody = new Blob([
    metadataBlob,
    mediaHeaderBlob,
    audioArrayBuffer,
    closeDelimiterBlob,
  ]);

  const res = await fetch(DRIVE_UPLOAD_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body: multipartBody,
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Erro ao enviar arquivo para o Google Drive: ${errorText}`);
  }

  const uploadedFile = await res.json();
  return {
    id: uploadedFile.id,
    name: uploadedFile.name,
    webViewLink: uploadedFile.webViewLink || `https://drive.google.com/file/d/${uploadedFile.id}/view`,
  };
}

function formatBytes(bytes: number, decimals = 1) {
  if (!+bytes) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}
