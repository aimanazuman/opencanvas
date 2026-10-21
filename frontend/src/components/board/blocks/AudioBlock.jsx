import React, { useState, useRef, useEffect } from 'react';
import { Music, Upload, Trash2, Loader2 } from 'lucide-react';
import { uploadFile } from '../../../utils/fileUpload';
import { useMediaUrl } from '../../../utils/media';
import { ClassroomButton } from '../../classroom';

const ICON_BTN = 'btn-motion flex h-11 w-11 flex-none items-center justify-center rounded text-ink-2 hover:bg-surface-hover hover:text-danger md:h-8 md:w-8';

export default function AudioBlock({ block, canEdit, onUpdate, onDelete }) {
  const [uploading, setUploading] = useState(false);
  const [localPreview, setLocalPreview] = useState(null);
  const fileInputRef = useRef(null);
  const audioSrc = useMediaUrl(block.audioUrl); // stored reference -> short-lived signed URL

  useEffect(() => {
    return () => {
      if (localPreview) URL.revokeObjectURL(localPreview);
    };
  }, [localPreview]);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    // Show instant local preview
    const previewUrl = URL.createObjectURL(file);
    setLocalPreview(previewUrl);
    onUpdate({ audioName: file.name, audioUrl: previewUrl });

    // Upload to server in background
    setUploading(true);
    const result = await uploadFile(file);
    setUploading(false);

    if (result) {
      URL.revokeObjectURL(previewUrl);
      setLocalPreview(null);
      onUpdate({ audioName: file.name, audioUrl: result.url, fileId: result.id });
    }
  };

  if (!block.audioUrl) {
    return (
      <div className="rounded-lg border-2 border-dashed border-line-strong bg-surface p-6 text-center">
        {canEdit ? (
          <>
            <Music className="mx-auto mb-2 text-ink-3" size={32} strokeWidth={1.5} aria-hidden="true" />
            <p className="text-sm text-ink-2 mb-2">Upload an audio file</p>
            <ClassroomButton variant="primary" icon={Upload} onClick={() => fileInputRef.current?.click()}>
              Choose Audio
            </ClassroomButton>
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*"
              aria-label="Audio file"
              onChange={handleUpload}
              className="hidden"
            />
          </>
        ) : (
          <>
            <Music className="mx-auto mb-2 text-ink-3" size={32} strokeWidth={1.5} aria-hidden="true" />
            <p className="text-sm text-ink-2">No audio uploaded</p>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-line bg-surface p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex min-w-0 items-center gap-2">
          <Music size={18} strokeWidth={1.5} className="flex-shrink-0 text-orange-700" aria-hidden="true" />
          <span className="text-sm font-medium text-ink truncate">{block.audioName || 'Audio'}</span>
          {uploading && <Loader2 size={14} className="flex-shrink-0 text-accent motion-safe:animate-spin" aria-hidden="true" />}
        </div>
        {canEdit && (
          <button type="button" onClick={onDelete} className={ICON_BTN} title="Remove" aria-label="Remove">
            <Trash2 size={16} strokeWidth={1.5} aria-hidden="true" />
          </button>
        )}
      </div>
      <audio controls className="w-full" src={audioSrc || undefined}>
        Your browser does not support the audio element.
      </audio>
      {uploading && (
        <p className="text-xs text-ink-2 mt-2">Uploading to server...</p>
      )}
    </div>
  );
}
