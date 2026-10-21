import React, { useState } from 'react';
import { Lock, Trash2, StickyNote } from 'lucide-react';
import { ChalkBadge, ClassroomButton } from '../../classroom';

// 44 px on phones, 32 px on desktop.
const ICON_BTN = 'btn-motion flex h-11 w-11 flex-none items-center justify-center rounded text-ink-2 hover:bg-surface-hover hover:text-danger md:h-8 md:w-8';

export default function PersonalNoteBlock({ block, canEdit, onUpdate, onDelete, currentUserId }) {
  const [editing, setEditing] = useState(false);
  const [content, setContent] = useState(block.content || '');

  // Only visible to the owner
  if (block.ownerId && currentUserId && block.ownerId !== currentUserId) {
    return null;
  }

  const handleSave = () => {
    onUpdate({ content });
    setEditing(false);
  };

  const text = block.content || (canEdit ? 'Click to add a personal note...' : 'Empty note');

  return (
    <div className="rounded-lg border border-line bg-surface p-4">
      <div className="flex items-center justify-between mb-2">
        <ChalkBadge icon={StickyNote} label="Personal Note" />
        {canEdit && (
          <button type="button" onClick={onDelete} className={ICON_BTN} title="Remove" aria-label="Remove">
            <Trash2 size={16} strokeWidth={1.5} aria-hidden="true" />
          </button>
        )}
      </div>
      {editing ? (
        <div>
          <textarea
            aria-label="Personal note"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full resize-none rounded border border-line-strong bg-surface p-2 text-sm text-ink placeholder:text-ink-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            rows={4}
            placeholder="Write your personal note..."
            autoFocus
          />
          <div className="flex gap-2 mt-2">
            <ClassroomButton variant="primary" onClick={handleSave}>
              Save
            </ClassroomButton>
            <ClassroomButton
              variant="ghost"
              onClick={() => { setContent(block.content || ''); setEditing(false); }}
            >
              Cancel
            </ClassroomButton>
          </div>
        </div>
      ) : canEdit ? (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="btn-motion -m-1 block w-full whitespace-pre-wrap rounded p-1 text-left text-sm text-ink hover:bg-surface-hover"
        >
          {text}
        </button>
      ) : (
        <div className="whitespace-pre-wrap text-sm text-ink">{text}</div>
      )}
      <p className="text-xs text-ink-2 mt-2 flex items-center gap-1">
        <Lock size={12} strokeWidth={1.5} aria-hidden="true" />
        Only visible to you
      </p>
    </div>
  );
}
