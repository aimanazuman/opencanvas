import React, { useState, useId } from 'react';
import { Megaphone, Trash2, AlertTriangle } from 'lucide-react';
import { ChalkBadge, ClassroomButton } from '../../classroom';

// Priority is text plus icon. Urgent uses the warning tone (no red label, no tinted panel).
const PRIORITY = {
  normal: { label: 'Announcement', icon: Megaphone, tone: 'neutral' },
  urgent: { label: 'Urgent', icon: AlertTriangle, tone: 'warning' },
};

const BOX = 'rounded-lg border border-line bg-surface p-4';

export default function AnnouncementBlock({ block, canEdit, onUpdate, onDelete }) {
  const uid = useId();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(block.title || '');
  const [content, setContent] = useState(block.content || '');
  const [priority, setPriority] = useState(block.priority || 'normal');

  const isUrgent = block.priority === 'urgent';
  const badge = isUrgent ? PRIORITY.urgent : PRIORITY.normal;

  const handleSave = () => {
    onUpdate({ title, content, priority });
    setEditing(false);
  };

  if (editing && canEdit) {
    return (
      <div className={`${BOX} space-y-3`}>
        <input
          type="text"
          aria-label="Announcement title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Announcement title"
          className="w-full rounded border border-line-strong bg-surface px-3 py-2 text-sm font-medium text-ink placeholder:text-ink-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          autoFocus
        />
        <textarea
          aria-label="Announcement content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Announcement content..."
          className="w-full resize-none rounded border border-line-strong bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          rows={3}
        />
        <div className="flex items-center gap-3">
          <label htmlFor={`${uid}-priority`} className="text-xs font-medium text-ink-2">Priority:</label>
          <select
            id={`${uid}-priority`}
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="rounded border border-line-strong bg-surface px-2 py-1 text-sm text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <option value="normal">Normal</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>
        <div className="flex gap-2">
          <ClassroomButton variant="primary" onClick={handleSave}>
            Save
          </ClassroomButton>
          <ClassroomButton
            variant="ghost"
            onClick={() => { setTitle(block.title || ''); setContent(block.content || ''); setPriority(block.priority || 'normal'); setEditing(false); }}
          >
            Cancel
          </ClassroomButton>
        </div>
      </div>
    );
  }

  return (
    <div className={BOX}>
      <div className="mb-2 flex items-start justify-between gap-2">
        <ChalkBadge icon={badge.icon} label={badge.label} tone={badge.tone} />
        {canEdit && (
          <div className="flex items-center gap-1">
            <ClassroomButton variant="ghost" onClick={() => setEditing(true)}>
              Edit
            </ClassroomButton>
            <ClassroomButton
              variant="ghost"
              icon={Trash2}
              onClick={onDelete}
              title="Remove"
              aria-label="Remove"
              className="hover:text-danger"
            />
          </div>
        )}
      </div>
      <h4 className="mb-1 font-semibold text-ink">
        {block.title || 'Untitled Announcement'}
      </h4>
      <p className="whitespace-pre-wrap text-sm text-ink">
        {block.content || (canEdit ? 'Click Edit to add content...' : '')}
      </p>
      {block.createdAt && (
        <p className="mt-2 text-xs text-ink-2">
          {new Date(block.createdAt).toLocaleDateString()}
        </p>
      )}
    </div>
  );
}
