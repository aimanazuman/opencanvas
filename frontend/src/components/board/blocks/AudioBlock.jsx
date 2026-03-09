import React, { useState, useRef, useEffect } from 'react';
import { Music, Upload, Trash2, Loader2 } from 'lucide-react';
import { uploadFile } from '../../../utils/fileUpload';

export default function AudioBlock({ block, canEdit, onUpdate, onDelete }) {
  const [uploading, setUploading] = useState(false);
  const [localPreview, setLocalPreview] = useState(null);
  const fileInputRef = useRef(null);

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
      <div className="border-2 border-dashed border-pink-300 rounded-lg p-6 text-center bg-pink-50">
        {canEdit ? (
          <>
            <Music className="mx-auto mb-2 text-pink-400" size={32} />
            <p className="text-sm text-pink-600 mb-2">Upload an audio file</p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 bg-pink-500 text-white rounded text-sm hover:bg-pink-600"
            >
              <Upload size={14} className="inline mr-1" />
              Choose Audio
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*"
              onChange={handleUpload}
              className="hidden"
            />
          </>
        ) : (
          <>
            <Music className="mx-auto mb-2 text-pink-400" size={32} />
            <p className="text-sm text-gray-500">No audio uploaded</p>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="border border-pink-200 rounded-lg p-4 bg-pink-50">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Music size={18} className="text-pink-600" />
          <span className="text-sm font-medium text-pink-800 truncate">{block.audioName || 'Audio'}</span>
          {uploading && <Loader2 size={14} className="text-pink-400 animate-spin" />}
        </div>
        {canEdit && (
          <button onClick={onDelete} className="text-gray-400 hover:text-red-500" title="Remove">
            <Trash2 size={16} />
          </button>
        )}
      </div>
      <audio controls className="w-full" src={block.audioUrl}>
        Your browser does not support the audio element.
      </audio>
      {uploading && (
        <p className="text-xs text-pink-500 mt-2">Uploading to server...</p>
      )}
    </div>
  );
}
