import React, { useState, useRef } from 'react';
import { FolderOpen, Upload, Trash2, Eye, Download, Loader2, FileText } from 'lucide-react';
import { getFileTypeInfo, isPreviewable } from '../../../utils/fileIcons';
import DocumentPreviewModal from '../DocumentPreviewModal';
import { uploadFiles } from '../../../utils/fileUpload';
import { resolveMediaUrl } from '../../../utils/media';
import { ChalkBadge } from '../../classroom';

// 44 px on phones, 32 px on desktop. The title attribute is the accessible name.
const ICON_BTN = 'btn-motion flex h-11 w-11 flex-none items-center justify-center rounded hover:bg-surface-hover md:h-8 md:w-8';

export default function ResourceLibraryBlock({ block, canEdit, onUpdate, onDelete }) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [title, setTitle] = useState(block.title || '');
  const [previewFile, setPreviewFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const files = block.files || [];

  const handleTitleSave = () => {
    onUpdate({ title });
    setEditingTitle(false);
  };

  const handleUpload = async (e) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length === 0) return;
    e.target.value = '';

    // Show instant local previews with temporary IDs
    const localEntries = selectedFiles.map((file) => {
      const tempId = 'temp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      return {
        id: tempId,
        name: file.name,
        size: file.size,
        url: URL.createObjectURL(file),
        addedAt: new Date().toISOString(),
        _uploading: true,
      };
    });
    onUpdate({ files: [...files, ...localEntries] });

    // Upload all to server in background
    setUploading(true);
    const results = await uploadFiles(selectedFiles);
    setUploading(false);

    // Replace local entries with server entries
    const tempIds = localEntries.map((e) => e.id);
    const currentFiles = (block.files || []).filter((f) => !tempIds.includes(f.id));

    // Revoke local object URLs
    localEntries.forEach((e) => URL.revokeObjectURL(e.url));

    const serverFiles = results.map((r) => ({
      id: r.id,
      fileId: r.id,
      name: r.name,
      size: r.size,
      url: r.url,
      addedAt: new Date().toISOString(),
    }));
    onUpdate({ files: [...currentFiles, ...serverFiles] });
  };

  // Stored references are exchanged for a short-lived signed URL just before they are used.
  const openFile = async (file, mode) => {
    const url = await resolveMediaUrl(file.url);
    if (!url) {
      window.alert('This file is not available.');
      return;
    }
    if (mode === 'preview') {
      setPreviewFile({ ...file, url });
      return;
    }
    const link = document.createElement('a');
    link.href = url;
    link.download = file.name || 'download';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const handleRemoveFile = (fileId) => {
    const file = files.find((f) => f.id === fileId);
    if (file && file.url && file.url.startsWith('blob:')) {
      URL.revokeObjectURL(file.url);
    }
    onUpdate({ files: files.filter(f => f.id !== fileId) });
  };

  const formatSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="rounded-lg border border-line bg-surface">
      <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <FolderOpen size={18} strokeWidth={1.5} className="flex-shrink-0 text-teal-700" aria-hidden="true" />
          {editingTitle && canEdit ? (
            <input
              type="text"
              aria-label="Resource library title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleTitleSave}
              onKeyDown={(e) => e.key === 'Enter' && handleTitleSave()}
              className="border-b border-line-strong bg-transparent text-sm font-semibold text-ink outline-none"
              autoFocus
            />
          ) : (
            <h4 className="text-sm font-semibold text-ink">
              {canEdit ? (
                <button
                  type="button"
                  className="btn-motion text-left hover:text-accent"
                  onClick={() => setEditingTitle(true)}
                >
                  {block.title || 'Resource Library'}
                </button>
              ) : (
                block.title || 'Resource Library'
              )}
            </h4>
          )}
          <span className="text-xs text-ink-2">({files.length} files)</span>
        </div>
        <div className="flex items-center gap-1">
          {canEdit && (
            <>
              <button
                type="button"
                onClick={() => !uploading && fileInputRef.current?.click()}
                disabled={uploading}
                className={`${ICON_BTN} text-teal-700 disabled:opacity-50`}
                title="Upload files"
                aria-label="Upload files"
              >
                {uploading
                  ? <Loader2 size={16} strokeWidth={1.5} className="motion-safe:animate-spin" aria-hidden="true" />
                  : <Upload size={16} strokeWidth={1.5} aria-hidden="true" />}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                aria-label="Upload resource files"
                onChange={handleUpload}
                className="hidden"
                disabled={uploading}
              />
            </>
          )}
          {canEdit && (
            <button
              type="button"
              onClick={onDelete}
              className={`${ICON_BTN} text-ink-2 hover:text-danger`}
              title="Remove library"
              aria-label="Remove library"
            >
              <Trash2 size={16} strokeWidth={1.5} aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      {files.length === 0 ? (
        <div className="px-4 py-6 text-center text-sm text-ink-2">
          {canEdit ? 'Click upload to add resources' : 'No resources yet'}
        </div>
      ) : (
        <ul className="divide-y divide-line">
          {files.map((file) => {
            const typeInfo = getFileTypeInfo(file.name);
            const canPreview = isPreviewable(file.name);
            const isUploading = file._uploading;
            return (
              <li key={file.id} className="flex items-center gap-3 px-4 py-2 hover:bg-surface-hover">
                {isUploading ? (
                  <Loader2 size={14} strokeWidth={1.5} className="flex-shrink-0 text-accent motion-safe:animate-spin" aria-hidden="true" />
                ) : (
                  <ChalkBadge icon={FileText} label={typeInfo.label} />
                )}
                <span className="flex-1 min-w-0 truncate text-sm text-ink">
                  {file.name}
                  {isUploading && <span className="ml-2 text-xs text-ink-2">uploading...</span>}
                </span>
                <span className="flex-shrink-0 text-xs text-ink-2">{formatSize(file.size)}</span>
                <div className="flex flex-shrink-0 items-center gap-1">
                  {canPreview && !isUploading && (
                    <button
                      type="button"
                      onClick={() => openFile(file, 'preview')}
                      className={`${ICON_BTN} text-ink-2`}
                      title="Preview"
                    >
                      <Eye size={14} strokeWidth={1.5} aria-hidden="true" />
                    </button>
                  )}
                  {file.url && !isUploading && (
                    <button
                      type="button"
                      onClick={() => openFile(file, 'download')}
                      className={`${ICON_BTN} text-ink-2`}
                      title="Download"
                    >
                      <Download size={14} strokeWidth={1.5} aria-hidden="true" />
                    </button>
                  )}
                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => handleRemoveFile(file.id)}
                      className={`${ICON_BTN} text-ink-2 hover:text-danger`}
                      title="Remove"
                    >
                      <Trash2 size={14} strokeWidth={1.5} aria-hidden="true" />
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {previewFile && (
        <DocumentPreviewModal
          fileUrl={previewFile.url}
          fileName={previewFile.name}
          onClose={() => setPreviewFile(null)}
        />
      )}
    </div>
  );
}
