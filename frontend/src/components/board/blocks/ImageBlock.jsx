import React, { useState, useRef, useEffect } from 'react';
import { ImageIcon, Trash2, Upload, Loader2 } from 'lucide-react';
import { uploadFile } from '../../../utils/fileUpload';

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

  const displaySrc = block.src;

  if (!displaySrc) {
    return (
      <div className="group relative">
        <div
          className={`border-2 border-dashed border-gray-300 rounded-lg p-8 text-center ${canEdit ? 'cursor-pointer hover:border-indigo-400 hover:bg-indigo-50' : ''}`}
          onClick={() => canEdit && fileInputRef.current?.click()}
        >
          <ImageIcon className="w-10 h-10 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500">{canEdit ? 'Click to upload an image' : 'No image uploaded'}</p>
          {block.caption && <p className="text-xs text-gray-400 mt-1">{block.caption}</p>}
        </div>
        {canEdit && (
          <>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
            <button onClick={onDelete} className="absolute top-2 right-2 p-1 bg-white border rounded shadow-sm hover:bg-red-50 opacity-0 group-hover:opacity-100 transition">
              <Trash2 className="w-3.5 h-3.5 text-red-400" />
            </button>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="group relative">
      <img src={displaySrc} alt={block.caption || 'Image'} className="w-full rounded-lg" />
      {uploading && (
        <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center rounded-lg">
          <div className="bg-white rounded-full p-2 shadow-lg">
            <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
          </div>
        </div>
      )}
      {canEdit ? (
        <input
          type="text"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          onBlur={handleCaptionBlur}
          placeholder="Add a caption..."
          className="w-full mt-2 text-sm text-gray-500 border-none focus:outline-none focus:ring-1 focus:ring-indigo-300 rounded px-1"
        />
      ) : (
        block.caption && <p className="text-sm text-gray-500 mt-2">{block.caption}</p>
      )}
      {canEdit && (
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition flex space-x-1">
          <button onClick={() => !uploading && fileInputRef.current?.click()} className="p-1 bg-white border rounded shadow-sm hover:bg-gray-50" title="Replace">
            <Upload className="w-3.5 h-3.5 text-gray-500" />
          </button>
          <button onClick={onDelete} className="p-1 bg-white border rounded shadow-sm hover:bg-red-50" title="Delete">
            <Trash2 className="w-3.5 h-3.5 text-red-400" />
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" disabled={uploading} />
        </div>
      )}
    </div>
  );
}
