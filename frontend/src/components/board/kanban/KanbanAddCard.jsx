import React, { useState, useRef } from 'react';
import { safeUrlWithDefaultScheme } from '../../../utils/safeUrl';
import { Plus, X, Paperclip, FileText, Loader2 } from 'lucide-react';
import { createKanbanCard } from '../../../utils/boardHelpers';
import { formatFileSize } from '../../../utils/fileIcons';
import { uploadFiles } from '../../../utils/fileUpload';
import { ClassroomButton } from '../../classroom';

// Inputs stay white and flat: no ruled or textured surface behind anything the user types into.
const FIELD = 'w-full rounded border border-line-strong bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent';
const REMOVE_FILE = 'ml-1 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded text-ink-2 hover:bg-danger-tint hover:text-danger';

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
    card.linkUrl = safeUrlWithDefaultScheme(linkUrl) || '';

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
      <ClassroomButton variant="ghost" icon={Plus} onClick={() => onCancel(columnId)} className="w-full justify-start">
        Add a card
      </ClassroomButton>
    );
  }

  return (
    <div className="space-y-2 rounded-lg border border-line bg-surface p-3">
      <input
        type="text"
        aria-label="Card title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Card title (e.g., your name & student ID)..."
        className={FIELD}
        autoFocus
      />
      <textarea
        aria-label="Card description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Description or comments..."
        className={`${FIELD} resize-none`}
        rows={2}
      />
      <input
        type="text"
        aria-label="Card link"
        value={linkUrl}
        onChange={(e) => setLinkUrl(e.target.value)}
        placeholder="Link URL (optional)..."
        className={FIELD}
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
        <ClassroomButton variant="ghost" icon={Paperclip} onClick={() => fileInputRef.current?.click()}>
          Add content
        </ClassroomButton>
        {pendingFiles.length > 0 && (
          <ul className="mt-1 space-y-1">
            {pendingFiles.map((pf, idx) => (
              <li key={idx}>
                {/* Image preview thumbnail */}
                {pf.previewUrl && (
                  <div className="mb-1">
                    <img
                      src={pf.previewUrl}
                      alt={pf.file.name}
                      className="max-h-24 w-full rounded border border-line object-cover"
                    />
                  </div>
                )}
                <div className="flex items-center justify-between rounded bg-surface-hover px-2 py-1 text-xs text-ink">
                  <div className="flex min-w-0 items-center gap-1">
                    <FileText className="h-3 w-3 flex-shrink-0 text-ink-2" strokeWidth={1.5} aria-hidden="true" />
                    <span className="truncate">{pf.file.name}</span>
                    <span className="flex-shrink-0 text-ink-2">({formatFileSize(pf.file.size)})</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removePendingFile(idx)}
                    className={REMOVE_FILE}
                    title="Remove file"
                    aria-label={`Remove ${pf.file.name}`}
                  >
                    <X className="h-3 w-3" strokeWidth={1.5} aria-hidden="true" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="flex gap-2">
        <ClassroomButton
          variant="primary"
          onClick={handleSubmit}
          disabled={!title.trim() || uploading}
        >
          {uploading ? <><Loader2 size={14} className="motion-safe:animate-spin" aria-hidden="true" /> Uploading...</> : 'Add Card'}
        </ClassroomButton>
        <ClassroomButton variant="ghost" onClick={reset}>
          Cancel
        </ClassroomButton>
      </div>
    </div>
  );
}
