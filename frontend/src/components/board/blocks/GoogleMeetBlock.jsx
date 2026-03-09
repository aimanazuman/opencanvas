import React, { useState } from 'react';
import { Video, Trash2, ExternalLink, Calendar } from 'lucide-react';

export default function GoogleMeetBlock({ block, canEdit, onUpdate, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [meetUrl, setMeetUrl] = useState(block.meetUrl || '');
  const [title, setTitle] = useState(block.title || '');
  const [scheduledAt, setScheduledAt] = useState(block.scheduledAt || '');

  const handleSave = () => {
    onUpdate({ meetUrl, title, scheduledAt });
    setEditing(false);
  };

  if (editing && canEdit) {
    return (
      <div className="border border-green-300 rounded-lg p-4 bg-green-50">
        <div className="space-y-3">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Meeting title (e.g., Lecture Q&A Session)"
            className="w-full px-3 py-2 border rounded text-sm"
            autoFocus
          />
          <input
            type="text"
            value={meetUrl}
            onChange={(e) => setMeetUrl(e.target.value)}
            placeholder="https://meet.google.com/abc-defg-hij"
            className="w-full px-3 py-2 border rounded text-sm"
          />
          <input
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
            className="w-full px-3 py-2 border rounded text-sm"
          />
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600"
            >
              Save
            </button>
            <button
              onClick={() => { setMeetUrl(block.meetUrl || ''); setTitle(block.title || ''); setScheduledAt(block.scheduledAt || ''); setEditing(false); }}
              className="px-3 py-1 bg-gray-200 text-gray-700 rounded text-sm hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!block.meetUrl) {
    return (
      <div className="border-2 border-dashed border-green-300 rounded-lg p-6 text-center bg-green-50">
        {canEdit ? (
          <>
            <Video className="mx-auto mb-2 text-green-500" size={32} />
            <p className="text-sm text-green-600 mb-2">Add a Google Meet link</p>
            <button
              onClick={() => setEditing(true)}
              className="px-3 py-1.5 bg-green-500 text-white rounded text-sm hover:bg-green-600"
            >
              Set Up Meeting
            </button>
          </>
        ) : (
          <>
            <Video className="mx-auto mb-2 text-green-400" size={32} />
            <p className="text-sm text-gray-500">No meeting set up</p>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="border border-green-300 rounded-lg bg-green-50 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
            <Video size={16} className="text-white" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-green-800">
              {block.title || 'Google Meet'}
            </h4>
            {block.scheduledAt && (
              <p className="text-xs text-green-600 flex items-center gap-1">
                <Calendar size={10} />
                {new Date(block.scheduledAt).toLocaleString()}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          {canEdit && (
            <button
              onClick={() => setEditing(true)}
              className="text-gray-400 hover:text-gray-600 text-xs px-2 py-1"
            >
              Edit
            </button>
          )}
          {canEdit && (
            <button onClick={onDelete} className="p-1.5 text-gray-400 hover:text-red-500 rounded" title="Remove">
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>
      <div className="px-4 pb-3">
        <a
          href={block.meetUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
        >
          <Video size={16} />
          Join Meeting
          <ExternalLink size={14} />
        </a>
      </div>
    </div>
  );
}
