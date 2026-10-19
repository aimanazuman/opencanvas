import { filesApi } from '../services/api';

function uploadErrorMessage(error) {
  const data = error?.response?.data;
  const pick = (value) => (Array.isArray(value) ? value[0] : value);
  if (data) {
    const message = pick(data.file) || pick(data.detail) || pick(data.error) || pick(data.board) || pick(data.non_field_errors);
    if (typeof message === 'string') return message;
  }
  return 'The file could not be uploaded.';
}

/**
 * Upload a single file via the Files API.
 * Returns { id, url, signedUrl, name, size, type, mimeType } or null on failure.
 *
 * `url` is the stable reference to store in board content ("ocmedia:uploads/..."): it never expires. Show it with
 * useMediaUrl() / resolveMediaUrl() from utils/media.js. `signedUrl` works immediately but expires after a while.
 */
export async function uploadFile(file, boardId = null, onProgress = null) {
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('name', file.name);
    if (boardId) formData.append('board', boardId);

    const response = await filesApi.upload(formData, onProgress);
    const data = response.data;

    return {
      id: data.id,
      url: data.ref || data.url,
      signedUrl: data.url,
      name: data.name || file.name,
      size: data.file_size || file.size,
      type: data.file_type || 'other',
      mimeType: data.mime_type || file.type,
    };
  } catch (error) {
    console.error('File upload failed:', error);
    if (typeof window !== 'undefined' && typeof window.alert === 'function') {
      window.alert(`Upload failed: ${uploadErrorMessage(error)}`);
    }
    return null;
  }
}

/**
 * Upload multiple files via the Files API.
 * Returns an array of results (null entries for failed uploads are filtered out).
 */
export async function uploadFiles(files, boardId = null) {
  const results = await Promise.all(
    files.map((file) => uploadFile(file, boardId))
  );
  return results.filter(Boolean);
}
