import React, { useState } from 'react';
import { Megaphone, Trash2, AlertTriangle } from 'lucide-react';

const PRIORITY_STYLES = {
  normal: {
    border: 'border-blue-200',
    bg: 'bg-blue-50',
    icon: 'text-blue-600',
    title: 'text-blue-800',
    badge: 'bg-blue-100 text-blue-700',
  },
  urgent: {
    border: 'border-red-300',
    bg: 'bg-red-50',
    icon: 'text-red-600',
    title: 'text-red-800',
    badge: 'bg-red-100 text-red-700',
  },
};

export default function AnnouncementBlock({ block, canEdit, onUpdate, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(block.title || '');
  const [content, setContent] = useState(block.content || '');
  const [priority, setPriority] = useState(block.priority || 'normal');

  const style = PRIORITY_STYLES[block.priority] || PRIORITY_STYLES.normal;

  const handleSave = () => {
    onUpdate({ title, content, priority });
    setEditing(false);
  };

  if (editing && canEdit) {
    return (
      <div className={`border ${style.border} rounded-lg p-4 ${style.bg}`}>
        <div className="space-y-3">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Announcement title"
            className="w-full px-3 py-2 border rounded text-sm font-medium"
            autoFocus
          />
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Announcement content..."
            className="w-full px-3 py-2 border rounded text-sm resize-none"
            rows={3}
          />
          <div className="flex items-center gap-3">
            <label className="text-xs font-medium text-gray-600">Priority:</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="px-2 py-1 border rounded text-sm"
            >
              <option value="normal">Normal</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
            >
              Save
            </button>
            <button
              onClick={() => { setTitle(block.title || ''); setContent(block.content || ''); setPriority(block.priority || 'normal'); setEditing(false); }}
              className="px-3 py-1 bg-gray-200 text-gray-700 rounded text-sm hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`border ${style.border} rounded-lg p-4 ${style.bg}`}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          {block.priority === 'urgent' ? (
            <AlertTriangle size={18} className={style.icon} />
          ) : (
            <Megaphone size={18} className={style.icon} />
          )}
          <span className={`text-xs font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${style.badge}`}>
            {block.priority === 'urgent' ? 'Urgent' : 'Announcement'}
          </span>
        </div>
        {canEdit && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => setEditing(true)}
              className="text-gray-400 hover:text-gray-600 text-xs px-2 py-1"
            >
              Edit
            </button>
            <button onClick={onDelete} className="text-gray-400 hover:text-red-500" title="Remove">
              <Trash2 size={16} />
            </button>
          </div>
        )}
      </div>
      <h4 className={`font-semibold ${style.title} mb-1`}>
        {block.title || 'Untitled Announcement'}
      </h4>
      <p className="text-sm text-gray-700 whitespace-pre-wrap">
        {block.content || (canEdit ? 'Click Edit to add content...' : '')}
      </p>
      {block.createdAt && (
        <p className="text-xs text-gray-400 mt-2">
          {new Date(block.createdAt).toLocaleDateString()}
        </p>
      )}
    </div>
  );
}
