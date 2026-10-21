import React, { useRef, useState, useEffect } from 'react';
import { Download, Trash2, Upload, Eye, Loader2, FileText } from 'lucide-react';
import { getFileTypeInfo, isPreviewable } from '../../../utils/fileIcons';
import DocumentPreviewModal from '../DocumentPreviewModal';
import { uploadFile } from '../../../utils/fileUpload';
import { useMediaUrl } from '../../../utils/media';
import { ChalkBadge } from '../../classroom';

const PLACEHOLDER = 'block w-full rounded-lg border-2 border-dashed border-line-strong bg-surface p-6 text-center';
const PLACEHOLDER_EDIT = `${PLACEHOLDER} btn-motion hover:bg-surface-hover`;
// 44 px on phones, 32 px on desktop. The title or aria-label is the accessible name.
const ICON_BTN = 'btn-motion flex h-11 w-11 flex-none items-center justify-center rounded text-ink-2 hover:bg-surface-hover md:h-8 md:w-8';

export default function FileBlock({ block, canEdit, onUpdate, onDelete }) {
  const fileInputRef = useRef();
  const [showPreview, setShowPreview] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [localPreview, setLocalPreview] = useState(null);
  const fileHref = useMediaUrl(block.fileUrl); // stored reference -> short-lived signed URL

  useEffect(() => {
    return () => {
      if (localPreview) URL.revokeObjectURL(localPreview);
    };
  }, [localPreview]);

  const formatSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    // Show instant local preview
    const previewUrl = URL.createObjectURL(file);
    setLocalPreview(previewUrl);
    onUpdate({
      fileName: file.name,
      fileSize: formatSize(file.size),
      fileUrl: previewUrl,
    });

    // Upload to server in background
    setUploading(true);
    const result = await uploadFile(file);
    setUploading(false);

    if (result) {
      URL.revokeObjectURL(previewUrl);
      setLocalPreview(null);
      onUpdate({
        fileName: file.name,
        fileSize: formatSize(file.size),
        fileUrl: result.url,
        fileId: result.id,
      });
    }
  };

  if (!block.fileName) {
    const body = (
      <>
        <Upload className="w-8 h-8 text-ink-3 mx-auto mb-2" strokeWidth={1.5} aria-hidden="true" />
        <span className="block text-sm text-ink-2">{canEdit ? 'Click to upload a file' : 'No file attached'}</span>
      </>
    );
    return (
      <div className="group relative">
        {canEdit ? (
          <button type="button" className={PLACEHOLDER_EDIT} onClick={() => fileInputRef.current?.click()}>
            {body}
          </button>
        ) : (
          <div className={PLACEHOLDER}>{body}</div>
        )}
        {canEdit && (
          <>
            <input ref={fileInputRef} type="file" aria-label="Upload file" onChange={handleFileSelect} className="hidden" />
            <button
              type="button"
              onClick={onDelete}
              title="Delete"
              aria-label="Delete"
              className={`${ICON_BTN} absolute top-2 right-2 opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100 hover:text-danger`}
            >
              <Trash2 className="w-4 h-4" strokeWidth={1.5} aria-hidden="true" />
            </button>
          </>
        )}
      </div>
    );
  }

  const typeInfo = getFileTypeInfo(block.fileName);
  const canPreview = isPreviewable(block.fileName);

  return (
    <div className="group relative flex items-center gap-3 rounded-lg border border-line bg-surface p-3">
      <div className="flex-shrink-0">
        {uploading ? (
          <Loader2 className="w-4 h-4 text-accent motion-safe:animate-spin" aria-hidden="true" />
        ) : (
          <ChalkBadge icon={FileText} label={typeInfo.label} />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <span className="block truncate font-medium text-ink">{block.fileName}</span>
        <span className="block text-sm text-ink-2">
          {block.fileSize}
          {uploading && <span className="ml-2 text-accent">Uploading...</span>}
        </span>
      </div>
      <div className="flex gap-1">
        {canPreview && fileHref && (
          <button
            type="button"
            onClick={() => setShowPreview(true)}
            className={ICON_BTN}
            title="Preview document"
            aria-label="Preview document"
          >
            <Eye className="w-4 h-4" strokeWidth={1.5} aria-hidden="true" />
          </button>
        )}
        {fileHref && (
          <a
            href={fileHref}
            download={block.fileName}
            className={ICON_BTN}
            title="Download"
            aria-label="Download"
          >
            <Download className="w-4 h-4" strokeWidth={1.5} aria-hidden="true" />
          </a>
        )}
        {canEdit && (
          <button
            type="button"
            onClick={onDelete}
            className={`${ICON_BTN} opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100 hover:text-danger`}
            title="Delete"
            aria-label="Delete"
          >
            <Trash2 className="w-4 h-4" strokeWidth={1.5} aria-hidden="true" />
          </button>
        )}
      </div>
      {showPreview && (
        <DocumentPreviewModal
          fileUrl={fileHref}
          fileName={block.fileName}
          onClose={() => setShowPreview(false)}
        />
      )}
    </div>
  );
}
