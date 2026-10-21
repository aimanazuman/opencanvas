import React, { useState, useRef, useEffect } from 'react';
import { ImageIcon, Trash2, Upload, Loader2 } from 'lucide-react';
import { uploadFile } from '../../../utils/fileUpload';
import { useMediaUrl } from '../../../utils/media';
import { ClassroomButton } from '../../classroom';

const PLACEHOLDER = 'block w-full rounded-lg border-2 border-dashed border-line-strong bg-surface p-8 text-center';
const PLACEHOLDER_EDIT = `${PLACEHOLDER} btn-motion hover:bg-surface-hover`;
const ICON_BTN = 'btn-motion flex h-11 w-11 items-center justify-center rounded bg-surface border border-line text-ink-2 hover:bg-surface-hover md:h-8 md:w-8';

export default function ImageBlock({ block, canEdit, onUpdate, onDelete }) {
  const [caption, setCaption] = useState(block.caption || '');
  const [uploading, setUploading] = useState(false);
  const [localPreview, setLocalPreview] = useState(null);
  const fileInputRef = useRef();

  // Clean up object URL on unmount or when preview changes
  useEffect(() => {
    return () => {
      if (localPreview) URL.revokeObjectURL(localPreview);
    };
  }, [localPreview]);

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    // Show instant local preview
    const previewUrl = URL.createObjectURL(file);
    setLocalPreview(previewUrl);
    onUpdate({ src: previewUrl });

    // Upload to server in background
    setUploading(true);
    const result = await uploadFile(file);
    setUploading(false);

    if (result) {
      URL.revokeObjectURL(previewUrl);
      setLocalPreview(null);
      onUpdate({ src: result.url, fileId: result.id });
    }
    // If upload fails, local preview remains visible
  };

  const handleCaptionBlur = () => {
    onUpdate({ caption });
  };

  // block.src is a blob: preview while uploading, otherwise a stored reference that is exchanged for a signed URL.
  const resolvedSrc = useMediaUrl(block.src);
  const displaySrc = block.src ? resolvedSrc : null;

  if (block.src && !resolvedSrc) {
    return (
      <div className="rounded-lg border-2 border-dashed border-line-strong bg-surface p-8 text-center text-sm text-ink-2">
        {resolvedSrc === undefined ? 'Loading image...' : 'This image is not available.'}
        {canEdit && (
          <ClassroomButton variant="ghost" onClick={onDelete} title="Remove block" aria-label="Remove block" className="ml-3">
            Remove
          </ClassroomButton>
        )}
      </div>
    );
  }

  if (!displaySrc) {
    const body = (
      <>
        <ImageIcon className="mx-auto mb-2 h-10 w-10 text-ink-3" strokeWidth={1.5} aria-hidden="true" />
        <span className="block text-sm text-ink-2">{canEdit ? 'Click to upload an image' : 'No image uploaded'}</span>
        {block.caption && <span className="mt-1 block text-xs text-ink-2">{block.caption}</span>}
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
            <input ref={fileInputRef} type="file" accept="image/*" aria-label="Upload image" onChange={handleFileSelect} className="hidden" />
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

  return (
    <div className="group relative">
      <img src={displaySrc} alt={block.caption || 'Image'} loading="lazy" decoding="async" className="w-full rounded-lg" />
      {uploading && (
        <div className="absolute inset-0 bg-[var(--scrim)] flex items-center justify-center rounded-lg">
          <div className="bg-surface rounded-full p-2 shadow-pop">
            <Loader2 className="w-6 h-6 text-accent motion-safe:animate-spin" aria-hidden="true" />
            <span className="sr-only">Uploading image</span>
          </div>
        </div>
      )}
      {canEdit ? (
        <input
          type="text"
          aria-label="Image caption"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          onBlur={handleCaptionBlur}
          placeholder="Add a caption..."
          className="w-full mt-2 text-sm text-ink placeholder:text-ink-3 border-none bg-transparent focus:outline-none focus-visible:ring-1 focus-visible:ring-accent rounded px-1"
        />
      ) : (
        block.caption && <p className="text-sm text-ink-2 mt-2">{block.caption}</p>
      )}
      {canEdit && (
        <div className="absolute top-2 right-2 opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100 flex gap-1">
          <button type="button" onClick={() => !uploading && fileInputRef.current?.click()} className={ICON_BTN} title="Replace" aria-label="Replace">
            <Upload className="w-4 h-4" strokeWidth={1.5} aria-hidden="true" />
          </button>
          <button type="button" onClick={onDelete} className={`${ICON_BTN} hover:text-danger`} title="Delete" aria-label="Delete">
            <Trash2 className="w-4 h-4" strokeWidth={1.5} aria-hidden="true" />
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" aria-label="Replace image" onChange={handleFileSelect} className="hidden" disabled={uploading} />
        </div>
      )}
    </div>
  );
}
