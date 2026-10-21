import React, { useState } from 'react';
import { Edit3, Trash2, Check } from 'lucide-react';
import { ClassroomButton } from '../../classroom';

// Icon-only block actions: 44 px on phones, 32 px on desktop. The title attribute is the accessible name.
const ICON_BTN = 'btn-motion flex h-11 w-11 items-center justify-center rounded bg-surface border border-line text-ink-2 hover:bg-surface-hover md:h-8 md:w-8';

export default function TextBlock({ block, canEdit, onUpdate, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [content, setContent] = useState(block.content || '');

  const handleSave = () => {
    onUpdate({ content });
    setEditing(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setContent(block.content || '');
      setEditing(false);
    }
  };

  if (editing) {
    return (
      <div className="relative">
        <textarea
          aria-label="Text content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          className="w-full min-h-[120px] p-3 rounded-lg border-2 border-accent bg-surface text-ink resize-y focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          autoFocus
        />
        <div className="flex justify-end mt-2 gap-2">
          <ClassroomButton variant="ghost" onClick={() => { setContent(block.content || ''); setEditing(false); }}>
            Cancel
          </ClassroomButton>
          <ClassroomButton variant="primary" icon={Check} onClick={handleSave}>
            Save
          </ClassroomButton>
        </div>
      </div>
    );
  }

  return (
    <div className="group relative">
      <div className="whitespace-pre-wrap text-ink leading-relaxed">
        {block.content || <span className="text-ink-3 italic">Empty text block</span>}
      </div>
      {canEdit && (
        <div className="absolute top-0 right-0 flex gap-1 opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">
          <button type="button" onClick={() => setEditing(true)} className={ICON_BTN} title="Edit" aria-label="Edit">
            <Edit3 className="w-4 h-4" strokeWidth={1.5} aria-hidden="true" />
          </button>
          <button type="button" onClick={onDelete} className={`${ICON_BTN} hover:text-danger`} title="Delete" aria-label="Delete">
            <Trash2 className="w-4 h-4" strokeWidth={1.5} aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
}
