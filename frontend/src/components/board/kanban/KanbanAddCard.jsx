import React, { useState, useRef } from 'react';
import { Plus, X, Paperclip, FileText, Loader2, ImageIcon } from 'lucide-react';
import { createKanbanCard, generateId } from '../../../utils/boardHelpers';
import { formatFileSize } from '../../../utils/fileIcons';
import { uploadFiles } from '../../../utils/fileUpload';

export default function KanbanAddCard({ columnId, isAdding, onAdd, onCancel }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [pendingFiles, setPendingFiles] = useState([]); // { file, previewUrl }
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const reset = () => {
    // Revoke all local preview URLs
    pendingFiles.forEach((pf) => {
      if (pf.previewUrl) URL.revokeObjectURL(pf.previewUrl);
    });
    setTitle('');
    setDescription('');
    setLinkUrl('');
    setPendingFiles([]);
    onCancel();
  };

  const handleFilesSelected = (e) => {
    const newFiles = Array.from(e.target.files || []);
    e.target.value = '';
    const entries = newFiles.map((file) => {
      const isImage = file.type.startsWith('image/');
      return {
        file,
        previewUrl: isImage ? URL.createObjectURL(file) : null,
      };
    });
    setPendingFiles((prev) => [...prev, ...entries]);
  };

  const removePendingFile = (idx) => {
    setPendingFiles((prev) => {
      const entry = prev[idx];
      if (entry?.previewUrl) URL.revokeObjectURL(entry.previewUrl);
      return prev.filter((_, i) => i !== idx);
    });
  };

  const handleSubmit = async () => {
    if (!title.trim() || uploading) return;
    const card = createKanbanCard(title.trim());
    card.title = title.trim();
    card.content = description.trim();
    card.linkUrl = linkUrl.trim();

    if (pendingFiles.length > 0) {
      setUploading(true);
      const rawFiles = pendingFiles.map((pf) => pf.file);
      const results = await uploadFiles(rawFiles);
      setUploading(false);

      // Revoke local previews
      pendingFiles.forEach((pf) => {
        if (pf.previewUrl) URL.revokeObjectURL(pf.previewUrl);
      });

      card.files = results.map((r) => ({
        id: r.id,
        fileId: r.id,
        name: r.name,
        size: r.size,
        type: r.mimeType,
        dataUrl: r.url,
      }));
    } else {
      card.files = [];
    }

    onAdd(columnId, card);
    setTitle('');
    setDescription('');
    setLinkUrl('');
    setPendingFiles([]);
    onCancel();
  };

  if (!isAdding) {
    return (
      <button
        onClick={() => onCancel(columnId)}
        className="w-full px-3 py-2 text-sm text-gray-500 hover:bg-gray-200 rounded-lg flex items-center space-x-1"
      >
        <Plus className="w-4 h-4" />
        <span>Add a card</span>
      </button>
    );
  }

  return (
    <div className="space-y-2 bg-white rounded-lg border p-3">
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Card title (e.g., your name & student ID)..."
        className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        autoFocus
      />
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Description or comments..."
        className="w-full px-3 py-2 border rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
        rows={2}
      />
      <input
        type="text"
        value={linkUrl}
        onChange={(e) => setLinkUrl(e.target.value)}
        placeholder="Link URL (optional)..."
        className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />
      <div>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFilesSelected}
          className="hidden"
          accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.zip,.rar,.jpg,.jpeg,.png,.gif"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center space-x-1 text-sm text-gray-500 hover:text-indigo-600 px-2 py-1 rounded hover:bg-gray-50"
        >
          <Paperclip className="w-4 h-4" />
          <span>Add content</span>
        </button>
        {pendingFiles.length > 0 && (
          <div className="mt-1 space-y-1">
            {pendingFiles.map((pf, idx) => (
              <div key={idx}>
                {/* Image preview thumbnail */}
                {pf.previewUrl && (
                  <div className="mb-1">
                    <img
                      src={pf.previewUrl}
                      alt={pf.file.name}
                      className="w-full max-h-24 object-cover rounded border"
                    />
                  </div>
                )}
                <div className="flex items-center justify-between bg-gray-50 px-2 py-1 rounded text-xs">
                  <div className="flex items-center space-x-1 min-w-0">
                    <FileText className="w-3 h-3 text-gray-400 flex-shrink-0" />
                    <span className="truncate">{pf.file.name}</span>
                    <span className="text-gray-400 flex-shrink-0">({formatFileSize(pf.file.size)})</span>
                  </div>
                  <button onClick={() => removePendingFile(idx)} className="text-gray-400 hover:text-red-500 ml-1 flex-shrink-0">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="flex space-x-2">
        <button
          onClick={handleSubmit}
          disabled={!title.trim() || uploading}
          className="px-3 py-1.5 bg-indigo-600 text-white rounded text-sm hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1"
        >
          {uploading ? <><Loader2 size={14} className="animate-spin" /> Uploading...</> : 'Add Card'}
        </button>
        <button
          onClick={reset}
          className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
