import React, { useState } from 'react';
import { Edit3, Trash2, Check } from 'lucide-react';

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
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          className="w-full min-h-[120px] p-3 border-2 border-indigo-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y text-gray-800"
          autoFocus
        />
        <div className="flex justify-end mt-2 space-x-2">
          <button
            onClick={() => { setContent(block.content || ''); setEditing(false); }}
            className="px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-3 py-1 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700 flex items-center space-x-1"
          >
            <Check className="w-3 h-3" />
            <span>Save</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="group relative">
      <div className="whitespace-pre-wrap text-gray-800 leading-relaxed">
        {block.content || <span className="text-gray-400 italic">Empty text block</span>}
      </div>
      {canEdit && (
        <div className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition flex space-x-1">
          <button
            onClick={() => setEditing(true)}
            className="p-1 bg-white border rounded shadow-sm hover:bg-gray-50"
            title="Edit"
          >
            <Edit3 className="w-3.5 h-3.5 text-gray-500" />
          </button>
          <button
            onClick={onDelete}
            className="p-1 bg-white border rounded shadow-sm hover:bg-red-50"
            title="Delete"
          >
            <Trash2 className="w-3.5 h-3.5 text-red-400" />
          </button>
        </div>
      )}
    </div>
  );
}
