import { filesApi } from '../services/api';

const DEFAULT_UPLOAD_ERROR = 'The file could not be uploaded.';
const MAX_MESSAGE_LENGTH = 300;
const MAX_DEPTH = 4;
// Checked first, in this order. Other keys are read after them.
const PRIORITY_KEYS = ['detail', 'error', 'non_field_errors', 'file', 'board'];

// Server text is shown as plain text. Strings that look like markup (for example an HTML page from a proxy) are skipped.
function textMessage(value) {
  const text = value.trim();
  if (!text || /[<>]/.test(text)) return null;
  return text.slice(0, MAX_MESSAGE_LENGTH);
}

// DRF error bodies take several shapes: a bare string, a list of strings (ValidationError(msg) gives a top-level
// array), {field: [...]}, or {detail} / {error}. Return the first usable string.
function findMessage(value, depth = 0) {
  if (value == null || depth > MAX_DEPTH) return null;
  if (typeof value === 'string') return textMessage(value);
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findMessage(item, depth + 1);
      if (found) return found;
    }
    return null;
  }
  if (typeof value === 'object') {
    const keys = [
      ...PRIORITY_KEYS.filter((key) => Object.prototype.hasOwnProperty.call(value, key)),
      ...Object.keys(value).filter((key) => !PRIORITY_KEYS.includes(key)),
    ];
    for (const key of keys) {
      const found = findMessage(value[key], depth + 1);
      if (found) return found;
    }
  }
  return null;
}

/**
 * Message to show for a failed upload. Quota errors reach the user as the server's own text.
 * Exported for tests.
 */
export function uploadErrorMessage(error) {
  return findMessage(error?.response?.data) || DEFAULT_UPLOAD_ERROR;
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
