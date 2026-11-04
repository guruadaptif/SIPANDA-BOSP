/**
 * Utility helper to handle Google Drive URLs and image links without requiring Google Drive API.
 * Converts Google Drive share links, file IDs, or raw URLs into high-resolution embeddable images.
 */

export function formatDriveImageUrl(input?: string): string {
  if (!input || typeof input !== 'string') return '';
  const trimmed = input.trim();
  if (!trimmed) return '';

  // If already a base64 data URL, blob, or local static asset path
  if (trimmed.startsWith('data:image/') || trimmed.startsWith('blob:') || trimmed.startsWith('/')) {
    return trimmed;
  }

  // Pattern 1: https://drive.google.com/file/d/FILE_ID/view...
  const matchFileD = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (matchFileD && matchFileD[1]) {
    return `https://drive.google.com/thumbnail?id=${matchFileD[1]}&sz=w1000`;
  }

  // Pattern 2: https://drive.google.com/open?id=FILE_ID or https://drive.google.com/uc?id=FILE_ID
  const matchId = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (matchId && matchId[1]) {
    return `https://drive.google.com/thumbnail?id=${matchId[1]}&sz=w1000`;
  }

  // Pattern 3: Bare Google Drive file ID (25-50 characters)
  if (/^[a-zA-Z0-9_-]{25,50}$/.test(trimmed)) {
    return `https://drive.google.com/thumbnail?id=${trimmed}&sz=w1000`;
  }

  return trimmed;
}

/**
 * Extracts a Google Drive Folder ID or builds a direct link to open the folder in Google Drive.
 */
export function getDriveFolderUrl(folderInput?: string): string {
  if (!folderInput || typeof folderInput !== 'string') return '';
  const trimmed = folderInput.trim();
  if (!trimmed) return '';

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }

  // If bare folder ID
  return `https://drive.google.com/drive/folders/${trimmed}`;
}
