/**
 * Normalizes artist and song title strings for accurate duplicate detection.
 * Removes accents, special characters, casing differences, parenthetical annotations (e.g. "(Remastered 2021)", "[Official Audio]"),
 * feat./ft. variations, extra spaces and punctuation.
 */
export function normalizeMusicText(input: string): string {
  if (!input) return '';

  return (
    input
      // Convert to lowercase
      .toLowerCase()
      // Normalize unicode to decompose accents (e.g. "é" -> "e" + accent)
      .normalize('NFD')
      // Remove accent marks
      .replace(/[\u0300-\u036f]/g, '')
      // Remove file extensions if present (.mp3, .m4a, .webm, .opus, etc.)
      .replace(/\.(mp3|m4a|wav|flac|aac|ogg|webm|opus|mp4)$/i, '')
      // Remove parenthetical noise like (Remastered 2011), [Official Audio], (feat. ...), (Lyric Video)
      .replace(/[\(\[\{][^\)\]\}]*?(remaster|official|audio|video|lyric|clip|hd|hq|live|version|edit|explicit|clean|mix|deluxe|bonus|soundtrack|ost)[^\)\]\}]*?[\)\]\}]/gi, '')
      // Remove standard (feat. ...), (ft. ...)
      .replace(/[\(\[\{]\s*(feat|ft|featuring)\.?\s+[^\)\]\}]+[\)\]\}]/gi, '')
      // Remove " - Remastered ...", " - Single Version", etc.
      .replace(/\s*-\s*(remaster|official|audio|video|lyric|version|edit|explicit|clean|mix).*$/i, '')
      // Remove "feat. ...", "ft. ..." in the middle or end
      .replace(/\b(feat|ft|featuring)\.?\b.*$/gi, '')
      // Replace symbols, punctuation and underscores with single space
      .replace(/[^a-z0-9]/gi, ' ')
      // Collapse multiple spaces
      .replace(/\s+/g, ' ')
      .trim()
  );
}

/**
 * Calculates the Levenshtein distance between two strings
 */
export function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Computes string similarity ratio between 0.0 and 1.0 using Normalized Levenshtein Distance
 */
export function similarityScore(strA: string, strB: string): number {
  const normA = normalizeMusicText(strA);
  const normB = normalizeMusicText(strB);

  if (!normA || !normB) return 0;
  if (normA === normB) return 1;

  // Direct substring inclusion check (e.g. "Eminem Without Me" inside "Eminem Without Me Official")
  if (normA.includes(normB) || normB.includes(normA)) {
    const minLen = Math.min(normA.length, normB.length);
    const maxLen = Math.max(normA.length, normB.length);
    if (minLen / maxLen > 0.7) {
      return 0.95;
    }
  }

  const distance = levenshteinDistance(normA, normB);
  const maxLength = Math.max(normA.length, normB.length);
  return 1 - distance / maxLength;
}

/**
 * Checks if a track matches an existing Google Drive file name based on strict + fuzzy similarity
 */
export function isMusicDuplicate(
  trackArtist: string,
  trackName: string,
  existingFileName: string
): { isDuplicate: boolean; score: number; reason?: string } {
  const trackCombined = `${trackArtist} - ${trackName}`;
  const normTrack = normalizeMusicText(trackCombined);
  const normFile = normalizeMusicText(existingFileName);

  // 1. Exact normalized match
  if (normTrack === normFile) {
    return { isDuplicate: true, score: 1.0, reason: 'Correspondência exata' };
  }

  // 2. Both parts match separately (artist and title)
  const normArtist = normalizeMusicText(trackArtist);
  const normTitle = normalizeMusicText(trackName);

  if (normFile.includes(normTitle) && (normFile.includes(normArtist) || normArtist.includes(normFile.split(' ')[0]))) {
    return { isDuplicate: true, score: 0.96, reason: 'Artista e título identificados' };
  }

  // 3. Overall similarity calculation (accounting for slight typo / 1-2 character differences)
  const score = similarityScore(normTrack, normFile);
  if (score >= 0.85) {
    return { isDuplicate: true, score, reason: `Alta similaridade (${Math.round(score * 100)}%)` };
  }

  // 4. Also compare just the song titles if the artist name might be formatted differently
  const titleScore = similarityScore(normTitle, existingFileName);
  if (titleScore >= 0.92 && (normFile.includes(normArtist.split(' ')[0]) || normArtist.length < 3)) {
    return { isDuplicate: true, score: titleScore, reason: `Título correspondente (${Math.round(titleScore * 100)}%)` };
  }

  return { isDuplicate: false, score };
}
