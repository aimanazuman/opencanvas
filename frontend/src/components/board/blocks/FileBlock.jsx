import React, { useRef, useState, useEffect } from 'react';
import { Download, Trash2, Upload, Eye, Loader2 } from 'lucide-react';
import { getFileTypeInfo, isPreviewable } from '../../../utils/fileIcons';
import DocumentPreviewModal from '../DocumentPreviewModal';
import { uploadFile } from '../../../utils/fileUpload';

export default function FileBlock({ block, canEdit, onUpdate, onDelete }) {
  const fileInputRef = useRef();
  const [showPreview, setShowPreview] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [localPreview, setLocalPreview] = useState(null);

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

  const formatSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  };

  if (!block.fileName) {
    return (
      <div className="group relative">
        <div
          className={`border-2 border-dashed border-gray-300 rounded-lg p-6 text-center ${canEdit ? 'cursor-pointer hover:border-indigo-400 hover:bg-indigo-50' : ''}`}
          onClick={() => canEdit && fileInputRef.current?.click()}
        >
          <Upload className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500">{canEdit ? 'Click to upload a file' : 'No file attached'}</p>
        </div>
        {canEdit && (
          <>
            <input ref={fileInputRef} type="file" onChange={handleFileSelect} className="hidden" />
            <button onClick={onDelete} className="absolute top-2 right-2 p-1 bg-white border rounded shadow-sm hover:bg-red-50 opacity-0 group-hover:opacity-100 transition">
              <Trash2 className="w-3.5 h-3.5 text-red-400" />
            </button>
          </>
        )}
      </div>
    );
  }

  const typeInfo = getFileTypeInfo(block.fileName);
  const canPreview = isPreviewable(block.fileName);

  return (
    <div className="group relative flex items-center space-x-3 p-3 bg-gray-50 rounded-lg border">
      <div className={`${typeInfo.bg} p-2 rounded-lg`}>
        <div className="w-6 h-6 flex items-center justify-center">
          {uploading ? (
            <Loader2 className="w-4 h-4 text-indigo-500 animate-spin" />
          ) : (
            <span className={`text-xs font-bold ${typeInfo.color}`}>{typeInfo.label}</span>
          )}
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-900 truncate">{block.fileName}</p>
        <p className="text-sm text-gray-500">
          {block.fileSize}
          {uploading && <span className="text-indigo-500 ml-2">Uploading...</span>}
        </p>
      </div>
      <div className="flex space-x-1">
        {canPreview && block.fileUrl && (
          <button
            onClick={() => setShowPreview(true)}
            className="p-1.5 hover:bg-blue-50 rounded"
            title="Preview document"
          >
            <Eye className="w-4 h-4 text-blue-500" />
          </button>
        )}
        {block.fileUrl && (
          <a
            href={block.fileUrl}
            download={block.fileName}
            className="p-1.5 hover:bg-gray-200 rounded"
            title="Download"
          >
            <Download className="w-4 h-4 text-gray-500" />
          </a>
        )}
        {canEdit && (
          <button onClick={onDelete} className="p-1.5 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition" title="Delete">
            <Trash2 className="w-4 h-4 text-red-400" />
          </button>
        )}
      </div>
      {showPreview && (
        <DocumentPreviewModal
          fileUrl={block.fileUrl}
          fileName={block.fileName}
          onClose={() => setShowPreview(false)}
        />
      )}
    </div>
  );
}
