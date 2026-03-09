import React, { useState } from 'react';
import { Video, Trash2, Edit3, Check } from 'lucide-react';
import { getVideoEmbedUrl } from '../../../utils/boardHelpers';

export default function VideoBlock({ block, canEdit, onUpdate, onDelete }) {
  const [editing, setEditing] = useState(!block.url);
  const [url, setUrl] = useState(block.url || '');

  const handleSave = () => {
    const embedUrl = getVideoEmbedUrl(url);
    onUpdate({ url, embedUrl });
    setEditing(false);
  };

  if (editing && canEdit) {
    return (
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
        <Video className="w-8 h-8 text-gray-300 mx-auto mb-3" />
        <p className="text-sm text-gray-500 text-center mb-3">Paste a YouTube or Vimeo URL</p>
        <div className="flex space-x-2">
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://youtube.com/watch?v=..."
            className="flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            autoFocus
          />
          <button
            onClick={handleSave}
            disabled={!url}
            className="px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50 flex items-center space-x-1"
          >
            <Check className="w-3 h-3" />
            <span>Embed</span>
          </button>
        </div>
        {block.url && (
          <button onClick={() => setEditing(false)} className="mt-2 text-sm text-gray-500 hover:underline">
            Cancel
          </button>
        )}
      </div>
    );
  }

  if (!block.embedUrl && !block.url) {
    return (
      <div className="group relative border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
        <Video className="w-10 h-10 text-gray-300 mx-auto mb-2" />
        <p className="text-sm text-gray-500">No video embedded</p>
      </div>
    );
  }

  return (
    <div className="group relative">
      <div className="aspect-video rounded-lg overflow-hidden bg-black">
        <iframe
          src={block.embedUrl || getVideoEmbedUrl(block.url)}
          title="Embedded video"
          className="w-full h-full"
          allowFullScreen
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        />
      </div>
      {canEdit && (
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition flex space-x-1">
          <button onClick={() => setEditing(true)} className="p-1 bg-white border rounded shadow-sm hover:bg-gray-50" title="Change URL">
            <Edit3 className="w-3.5 h-3.5 text-gray-500" />
          </button>
          <button onClick={onDelete} className="p-1 bg-white border rounded shadow-sm hover:bg-red-50" title="Delete">
            <Trash2 className="w-3.5 h-3.5 text-red-400" />
          </button>
        </div>
      )}
    </div>
  );
}
