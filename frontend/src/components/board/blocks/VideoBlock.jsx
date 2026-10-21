import React, { useState } from 'react';
import { Video, Trash2, Edit3, Check } from 'lucide-react';
import { getVideoEmbedUrl } from '../../../utils/boardHelpers';
import { safeUrl, EXTERNAL_IFRAME_SANDBOX } from '../../../utils/safeUrl';
import { ClassroomButton } from '../../classroom';

const PLACEHOLDER = 'rounded-lg border-2 border-dashed border-line-strong bg-surface text-center';
const ICON_BTN = 'btn-motion flex h-11 w-11 items-center justify-center rounded bg-surface border border-line text-ink-2 hover:bg-surface-hover md:h-8 md:w-8';

export default function VideoBlock({ block, canEdit, onUpdate, onDelete }) {
  const [editing, setEditing] = useState(!block.url);
  const [url, setUrl] = useState(block.url || '');
  // Stored values are written by users: only plain http(s) addresses may reach the iframe.
  const embedSrc = safeUrl(block.embedUrl) || safeUrl(getVideoEmbedUrl(block.url));

  const handleSave = () => {
    const embedUrl = getVideoEmbedUrl(url);
    onUpdate({ url, embedUrl });
    setEditing(false);
  };

  if (editing && canEdit) {
    return (
      <div className={`${PLACEHOLDER} p-6`}>
        <Video className="w-8 h-8 text-ink-3 mx-auto mb-3" strokeWidth={1.5} aria-hidden="true" />
        <p className="text-sm text-ink-2 text-center mb-3">Paste a YouTube or Vimeo URL</p>
        <div className="flex gap-2">
          <input
            type="text"
            aria-label="Video address"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://youtube.com/watch?v=..."
            className="min-w-0 flex-1 rounded-lg border border-line-strong bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            autoFocus
          />
          <ClassroomButton variant="primary" icon={Check} onClick={handleSave} disabled={!url}>
            Embed
          </ClassroomButton>
        </div>
        {block.url && (
          <ClassroomButton variant="ghost" onClick={() => setEditing(false)} className="mt-2">
            Cancel
          </ClassroomButton>
        )}
      </div>
    );
  }

  if (!block.embedUrl && !block.url) {
    return (
      <div className={`group relative ${PLACEHOLDER} p-8`}>
        <Video className="w-10 h-10 text-ink-3 mx-auto mb-2" strokeWidth={1.5} aria-hidden="true" />
        <p className="text-sm text-ink-2">No video embedded</p>
      </div>
    );
  }

  return (
    <div className="group relative">
      <div className="aspect-video rounded-lg overflow-hidden bg-black">
        {embedSrc ? (
          <iframe
            src={embedSrc}
            sandbox={EXTERNAL_IFRAME_SANDBOX}
            loading="lazy"
            title="Embedded video"
            className="w-full h-full"
            allowFullScreen
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-sm text-white p-4 text-center">
            This video address was blocked because it is not a normal web address.
          </div>
        )}
      </div>
      {canEdit && (
        <div className="absolute top-2 right-2 opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100 flex gap-1">
          <button type="button" onClick={() => setEditing(true)} className={ICON_BTN} title="Change URL" aria-label="Change URL">
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
