import React, { useState } from 'react';
import { Link2, ExternalLink, Trash2, Globe, AlertTriangle } from 'lucide-react';
import { safeUrl, safeUrlWithDefaultScheme, EXTERNAL_IFRAME_SANDBOX } from '../../../utils/safeUrl';
import { ClassroomButton } from '../../classroom';

const PLACEHOLDER = 'rounded-lg border-2 border-dashed border-line-strong bg-surface p-6 text-center';
// 44 px on phones, 32 px on desktop.
const ICON_BTN = 'btn-motion flex h-11 w-11 flex-none items-center justify-center rounded hover:bg-surface-hover md:h-8 md:w-8';

export default function LinkEmbedBlock({ block, canEdit, onUpdate, onDelete }) {
  const [urlInput, setUrlInput] = useState('');

  const handleSetUrl = () => {
    if (!urlInput.trim()) return;
    const url = safeUrlWithDefaultScheme(urlInput);
    if (!url) {
      window.alert('Only http and https links can be embedded.');
      return;
    }
    onUpdate({ linkUrl: url, linkTitle: block.linkTitle || url });
    setUrlInput('');
  };

  // Board content is written by users: never trust a stored link, check it again before it is rendered.
  const linkHref = safeUrl(block.linkUrl);

  if (block.linkUrl && !linkHref) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-lg border border-line bg-surface p-4 text-sm text-ink">
        <span className="flex min-w-0 items-center gap-2">
          <AlertTriangle className="h-4 w-4 flex-shrink-0 text-danger" strokeWidth={1.5} aria-hidden="true" />
          <span>This link was blocked because it is not a normal web address.</span>
        </span>
        {canEdit && (
          <button type="button" onClick={onDelete} className={`${ICON_BTN} text-ink-2 hover:text-danger`} title="Remove" aria-label="Remove">
            <Trash2 size={16} strokeWidth={1.5} aria-hidden="true" />
          </button>
        )}
      </div>
    );
  }

  if (!block.linkUrl) {
    return (
      <div className={PLACEHOLDER}>
        {canEdit ? (
          <>
            <Link2 className="mx-auto mb-2 text-accent" size={32} strokeWidth={1.5} aria-hidden="true" />
            <p className="text-sm text-ink-2 mb-2">Embed a link or website</p>
            <div className="flex gap-2 max-w-md mx-auto">
              <input
                type="text"
                aria-label="Link address"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSetUrl()}
                placeholder="https://example.com"
                className="min-h-[44px] min-w-0 flex-1 rounded border border-line-strong bg-surface px-3 text-sm text-ink placeholder:text-ink-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent md:min-h-[32px]"
              />
              <ClassroomButton variant="primary" onClick={handleSetUrl}>
                Embed
              </ClassroomButton>
            </div>
          </>
        ) : (
          <>
            <Link2 className="mx-auto mb-2 text-ink-3" size={32} strokeWidth={1.5} aria-hidden="true" />
            <p className="text-sm text-ink-2">No link set</p>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-line bg-surface overflow-hidden">
      <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <Globe size={16} strokeWidth={1.5} className="flex-shrink-0 text-accent" aria-hidden="true" />
          {canEdit ? (
            <input
              type="text"
              aria-label="Link title"
              value={block.linkTitle || ''}
              onChange={(e) => onUpdate({ linkTitle: e.target.value })}
              className="min-w-0 flex-1 border-none bg-transparent text-sm font-medium text-ink outline-none"
              placeholder="Link title"
            />
          ) : (
            <span className="text-sm font-medium text-ink truncate">{block.linkTitle || block.linkUrl}</span>
          )}
        </div>
        <div className="flex flex-shrink-0 items-center gap-1">
          <a
            href={linkHref}
            target="_blank"
            rel="noopener noreferrer"
            className={`${ICON_BTN} text-accent`}
            title="Open link"
            aria-label="Open link"
          >
            <ExternalLink size={16} strokeWidth={1.5} aria-hidden="true" />
          </a>
          {canEdit && (
            <button type="button" onClick={onDelete} className={`${ICON_BTN} text-ink-2 hover:text-danger`} title="Remove" aria-label="Remove">
              <Trash2 size={16} strokeWidth={1.5} aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
      {block.embed ? (
        <iframe
          src={linkHref}
          loading="lazy"
          title={block.linkTitle || 'Embedded content'}
          className="w-full h-64 border-0"
          sandbox={EXTERNAL_IFRAME_SANDBOX}
        />
      ) : (
        <a
          href={linkHref}
          target="_blank"
          rel="noopener noreferrer"
          className="block truncate px-4 py-3 text-sm text-accent hover:bg-surface-hover"
        >
          {linkHref}
        </a>
      )}
      {canEdit && (
        <div className="border-t border-line px-4 py-2">
          <label className="flex items-center gap-2 text-xs text-ink-2 cursor-pointer">
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
