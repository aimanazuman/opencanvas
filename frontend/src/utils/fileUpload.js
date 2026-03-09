import { filesApi } from '../services/api';

/**
 * Upload a single file via the Files API.
 * Returns { id, url, name, size, type, mimeType } or null on failure.
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
      url: data.url,
      name: data.name || file.name,
      size: data.file_size || file.size,
      type: data.file_type || 'other',
      mimeType: data.mime_type || file.type,
    };
  } catch (error) {
    console.error('File upload failed:', error);
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
