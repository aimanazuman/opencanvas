/**
 * File type detection, icon colors, and document preview URL generation.
 */

const FILE_TYPE_MAP = {
  // Documents
  pdf: { label: 'PDF', color: 'text-red-600', bg: 'bg-red-100', category: 'document' },
  doc: { label: 'DOC', color: 'text-blue-700', bg: 'bg-blue-100', category: 'document' },
  docx: { label: 'DOCX', color: 'text-blue-700', bg: 'bg-blue-100', category: 'document' },
  // Presentations
  ppt: { label: 'PPT', color: 'text-orange-600', bg: 'bg-orange-100', category: 'document' },
  pptx: { label: 'PPTX', color: 'text-orange-600', bg: 'bg-orange-100', category: 'document' },
  // Spreadsheets
  xls: { label: 'XLS', color: 'text-green-700', bg: 'bg-green-100', category: 'document' },
  xlsx: { label: 'XLSX', color: 'text-green-700', bg: 'bg-green-100', category: 'document' },
  csv: { label: 'CSV', color: 'text-green-700', bg: 'bg-green-100', category: 'data' },
  // Images
  png: { label: 'PNG', color: 'text-purple-600', bg: 'bg-purple-100', category: 'image' },
  jpg: { label: 'JPG', color: 'text-purple-600', bg: 'bg-purple-100', category: 'image' },
  jpeg: { label: 'JPEG', color: 'text-purple-600', bg: 'bg-purple-100', category: 'image' },
  gif: { label: 'GIF', color: 'text-purple-600', bg: 'bg-purple-100', category: 'image' },
  svg: { label: 'SVG', color: 'text-purple-600', bg: 'bg-purple-100', category: 'image' },
  // Audio
  mp3: { label: 'MP3', color: 'text-pink-600', bg: 'bg-pink-100', category: 'audio' },
  wav: { label: 'WAV', color: 'text-pink-600', bg: 'bg-pink-100', category: 'audio' },
  ogg: { label: 'OGG', color: 'text-pink-600', bg: 'bg-pink-100', category: 'audio' },
  // Video
  mp4: { label: 'MP4', color: 'text-indigo-600', bg: 'bg-indigo-100', category: 'video' },
  webm: { label: 'WEBM', color: 'text-indigo-600', bg: 'bg-indigo-100', category: 'video' },
  // Code
  js: { label: 'JS', color: 'text-yellow-600', bg: 'bg-yellow-100', category: 'code' },
  py: { label: 'PY', color: 'text-blue-600', bg: 'bg-blue-100', category: 'code' },
  java: { label: 'JAVA', color: 'text-red-500', bg: 'bg-red-100', category: 'code' },
  html: { label: 'HTML', color: 'text-orange-500', bg: 'bg-orange-100', category: 'code' },
  css: { label: 'CSS', color: 'text-blue-500', bg: 'bg-blue-100', category: 'code' },
  // Archives
  zip: { label: 'ZIP', color: 'text-gray-600', bg: 'bg-gray-200', category: 'archive' },
  rar: { label: 'RAR', color: 'text-gray-600', bg: 'bg-gray-200', category: 'archive' },
  tar: { label: 'TAR', color: 'text-gray-600', bg: 'bg-gray-200', category: 'archive' },
  gz: { label: 'GZ', color: 'text-gray-600', bg: 'bg-gray-200', category: 'archive' },
  // Text
  txt: { label: 'TXT', color: 'text-gray-600', bg: 'bg-gray-100', category: 'text' },
  md: { label: 'MD', color: 'text-gray-600', bg: 'bg-gray-100', category: 'text' },
};

const DEFAULT_FILE_TYPE = { label: 'FILE', color: 'text-gray-500', bg: 'bg-gray-100', category: 'other' };

const PREVIEWABLE_EXTENSIONS = ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'png', 'jpg', 'jpeg', 'gif', 'svg'];

/**
 * Get the file extension from a filename.
 */
export function getFileExtension(fileName) {
  if (!fileName) return '';
  const parts = fileName.split('.');
  return parts.length > 1 ? parts.pop().toLowerCase() : '';
}

/**
 * Get file type info (label, color, bg, category) for a given filename.
 */
export function getFileTypeInfo(fileName) {
  const ext = getFileExtension(fileName);
  return FILE_TYPE_MAP[ext] || DEFAULT_FILE_TYPE;
}

/**
 * Check if a file can be previewed in the document preview modal.
 */
export function isPreviewable(fileName) {
  const ext = getFileExtension(fileName);
  return PREVIEWABLE_EXTENSIONS.includes(ext);
}

/**
 * Get the preview type for a file: 'pdf', 'image', or 'office'.
 */
export function getPreviewType(fileName) {
  const ext = getFileExtension(fileName);
  if (ext === 'pdf') return 'pdf';
  if (['png', 'jpg', 'jpeg', 'gif', 'svg'].includes(ext)) return 'image';
  if (['doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx'].includes(ext)) return 'office';
  return 'unknown';
}

/**
 * Get the direct URL for previewing a file. PDFs and images use the direct URL.
 * Office docs cannot be previewed locally and will show a download card instead.
 */
export function getDocumentPreviewUrl(fileUrl) {
  if (!fileUrl) return '';
  return fileUrl;
}

/**
 * Format file size from bytes to human-readable string.
 */
export function formatFileSize(bytes) {
  if (!bytes || isNaN(bytes)) return '';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}
