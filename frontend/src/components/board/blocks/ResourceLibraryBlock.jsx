import React, { useState, useRef } from 'react';
import { FolderOpen, Upload, Trash2, Eye, Download, Loader2 } from 'lucide-react';
import { getFileTypeInfo, isPreviewable } from '../../../utils/fileIcons';
import DocumentPreviewModal from '../DocumentPreviewModal';
import { uploadFiles } from '../../../utils/fileUpload';

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
    <div className="border border-teal-200 rounded-lg bg-teal-50">
      <div className="flex items-center justify-between px-4 py-3 border-b border-teal-200">
        <div className="flex items-center gap-2">
          <FolderOpen size={18} className="text-teal-600" />
          {editingTitle && canEdit ? (
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleTitleSave}
              onKeyDown={(e) => e.key === 'Enter' && handleTitleSave()}
              className="text-sm font-semibold border-b border-teal-400 bg-transparent outline-none"
              autoFocus
            />
          ) : (
            <h4
              className={`text-sm font-semibold text-teal-800 ${canEdit ? 'cursor-pointer hover:text-teal-600' : ''}`}
              onClick={() => canEdit && setEditingTitle(true)}
            >
              {block.title || 'Resource Library'}
            </h4>
          )}
          <span className="text-xs text-teal-500">({files.length} files)</span>
        </div>
        <div className="flex items-center gap-1">
          {canEdit && (
            <>
              <button
                onClick={() => !uploading && fileInputRef.current?.click()}
                disabled={uploading}
                className="p-1.5 text-teal-600 hover:bg-teal-100 rounded disabled:opacity-50"
                title="Upload files"
              >
                {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleUpload}
                className="hidden"
                disabled={uploading}
              />
            </>
          )}
          {canEdit && (
            <button onClick={onDelete} className="p-1.5 text-gray-400 hover:text-red-500 rounded" title="Remove library">
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>

      {files.length === 0 ? (
        <div className="px-4 py-6 text-center text-sm text-teal-500">
          {canEdit ? 'Click upload to add resources' : 'No resources yet'}
        </div>
      ) : (
        <ul className="divide-y divide-teal-100">
          {files.map((file) => {
            const typeInfo = getFileTypeInfo(file.name);
            const canPreview = isPreviewable(file.name);
            const isUploading = file._uploading;
            return (
              <li key={file.id} className="px-4 py-2 flex items-center gap-3 hover:bg-teal-100">
                {isUploading ? (
                  <Loader2 size={14} className="text-teal-500 animate-spin shrink-0" />
                ) : (
                  <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${typeInfo.bg} ${typeInfo.color}`}>
                    {typeInfo.label}
                  </span>
                )}
                <span className="text-sm text-gray-800 truncate flex-1">
                  {file.name}
                  {isUploading && <span className="text-xs text-teal-500 ml-2">uploading...</span>}
                </span>
                <span className="text-xs text-gray-400 shrink-0">{formatSize(file.size)}</span>
                <div className="flex items-center gap-1 shrink-0">
                  {canPreview && !isUploading && (
                    <button
                      onClick={() => setPreviewFile(file)}
                      className="p-1 text-gray-400 hover:text-blue-600"
                      title="Preview"
                    >
                      <Eye size={14} />
                    </button>
                  )}
                  {file.url && !isUploading && (
                    <a
                      href={file.url}
                      download={file.name}
                      className="p-1 text-gray-400 hover:text-green-600"
                      title="Download"
                    >
                      <Download size={14} />
                    </a>
                  )}
                  {canEdit && (
                    <button
                      onClick={() => handleRemoveFile(file.id)}
                      className="p-1 text-gray-400 hover:text-red-500"
                      title="Remove"
                    >
                      <Trash2 size={14} />
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
