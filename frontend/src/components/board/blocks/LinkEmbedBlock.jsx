import React, { useState } from 'react';
import { Link2, ExternalLink, Trash2, Globe } from 'lucide-react';

export default function LinkEmbedBlock({ block, canEdit, onUpdate, onDelete }) {
  const [urlInput, setUrlInput] = useState('');

  const handleSetUrl = () => {
    if (!urlInput.trim()) return;
    let url = urlInput.trim();
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
    onUpdate({ linkUrl: url, linkTitle: block.linkTitle || url });
    setUrlInput('');
  };

  if (!block.linkUrl) {
    return (
      <div className="border-2 border-dashed border-cyan-300 rounded-lg p-6 text-center bg-cyan-50">
        {canEdit ? (
          <>
            <Link2 className="mx-auto mb-2 text-cyan-400" size={32} />
            <p className="text-sm text-cyan-600 mb-2">Embed a link or website</p>
            <div className="flex gap-2 max-w-md mx-auto">
              <input
                type="text"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSetUrl()}
                placeholder="https://example.com"
                className="flex-1 px-3 py-1.5 border rounded text-sm"
              />
              <button
                onClick={handleSetUrl}
                className="px-3 py-1.5 bg-cyan-500 text-white rounded text-sm hover:bg-cyan-600"
              >
                Embed
              </button>
            </div>
          </>
        ) : (
          <>
            <Link2 className="mx-auto mb-2 text-cyan-400" size={32} />
            <p className="text-sm text-gray-500">No link set</p>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="border border-cyan-200 rounded-lg bg-cyan-50 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-cyan-200">
        <div className="flex items-center gap-2 min-w-0">
          <Globe size={16} className="text-cyan-600 shrink-0" />
          {canEdit ? (
            <input
              type="text"
              value={block.linkTitle || ''}
              onChange={(e) => onUpdate({ linkTitle: e.target.value })}
              className="text-sm font-medium text-cyan-800 bg-transparent border-none outline-none flex-1 min-w-0"
              placeholder="Link title"
            />
          ) : (
            <span className="text-sm font-medium text-cyan-800 truncate">{block.linkTitle || block.linkUrl}</span>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <a
            href={block.linkUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1 text-cyan-500 hover:text-cyan-700"
            title="Open link"
          >
            <ExternalLink size={16} />
          </a>
          {canEdit && (
            <button onClick={onDelete} className="p-1 text-gray-400 hover:text-red-500" title="Remove">
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>
      {block.embed ? (
        <iframe
          src={block.linkUrl}
          title={block.linkTitle || 'Embedded content'}
          className="w-full h-64 border-0"
          sandbox="allow-scripts allow-same-origin allow-popups"
        />
      ) : (
        <a
          href={block.linkUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block px-4 py-3 text-sm text-cyan-700 hover:bg-cyan-100 truncate"
        >
          {block.linkUrl}
        </a>
      )}
      {canEdit && (
        <div className="px-4 py-2 border-t border-cyan-200">
          <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
            <input
              type="checkbox"
              checked={block.embed || false}
              onChange={(e) => onUpdate({ embed: e.target.checked })}
              className="rounded"
            />
            Show as embedded iframe
          </label>
        </div>
      )}
    </div>
  );
}
