import React, { useState } from 'react';
import { Lock, Trash2, StickyNote } from 'lucide-react';

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

  return (
    <div className="border border-amber-300 rounded-lg p-4 bg-amber-50">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <StickyNote size={16} className="text-amber-600" />
          <span className="text-xs font-semibold text-amber-700 uppercase tracking-wide">Personal Note</span>
          <Lock size={12} className="text-amber-500" />
        </div>
        {canEdit && (
          <button onClick={onDelete} className="text-gray-400 hover:text-red-500" title="Remove">
            <Trash2 size={16} />
          </button>
        )}
      </div>
      {editing ? (
        <div>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full p-2 border border-amber-300 rounded text-sm bg-white resize-none"
            rows={4}
            placeholder="Write your personal note..."
            autoFocus
          />
          <div className="flex gap-2 mt-2">
            <button
              onClick={handleSave}
              className="px-3 py-1 bg-amber-500 text-white rounded text-sm hover:bg-amber-600"
            >
              Save
            </button>
            <button
              onClick={() => { setContent(block.content || ''); setEditing(false); }}
              className="px-3 py-1 bg-gray-200 text-gray-700 rounded text-sm hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div
          onClick={() => canEdit && setEditing(true)}
          className={`text-sm text-amber-900 whitespace-pre-wrap ${canEdit ? 'cursor-pointer hover:bg-amber-100 rounded p-1 -m-1' : ''}`}
        >
          {block.content || (canEdit ? 'Click to add a personal note...' : 'Empty note')}
        </div>
      )}
      <p className="text-xs text-amber-500 mt-2 flex items-center gap-1">
        <Lock size={10} />
        Only visible to you
      </p>
    </div>
  );
}
