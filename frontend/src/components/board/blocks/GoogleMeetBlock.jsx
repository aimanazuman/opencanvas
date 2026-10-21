import React, { useState } from 'react';
import { Video, Trash2, ExternalLink, Calendar, AlertTriangle } from 'lucide-react';
import { safeUrl, safeUrlWithDefaultScheme } from '../../../utils/safeUrl';
import { ChalkBadge, ClassroomButton } from '../../classroom';

const PLACEHOLDER = 'rounded-lg border-2 border-dashed border-line-strong bg-surface p-6 text-center';
// 44 px on phones, 32 px on desktop.
const ICON_BTN = 'btn-motion flex h-11 w-11 flex-none items-center justify-center rounded text-ink-2 hover:bg-surface-hover hover:text-danger md:h-8 md:w-8';

export default function GoogleMeetBlock({ block, canEdit, onUpdate, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [meetUrl, setMeetUrl] = useState(block.meetUrl || '');
  const [title, setTitle] = useState(block.title || '');
  const [scheduledAt, setScheduledAt] = useState(block.scheduledAt || '');

  const handleSave = () => {
    const cleanUrl = meetUrl.trim() ? safeUrlWithDefaultScheme(meetUrl) : '';
    if (cleanUrl === null) {
      window.alert('Only http and https links are allowed.');
      return;
    }
    onUpdate({ meetUrl: cleanUrl, title, scheduledAt });
    setEditing(false);
  };

  // Board content is written by users: check the stored link again before it becomes a clickable address.
  const meetHref = safeUrl(block.meetUrl);

  if (editing && canEdit) {
    return (
      <div className="rounded-lg border border-line bg-surface p-4">
        <div className="space-y-3">
          <input
            type="text"
            aria-label="Meeting title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Meeting title (e.g., Lecture Q&A Session)"
            className="w-full rounded border border-line-strong bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            autoFocus
          />
          <input
            type="text"
            aria-label="Meeting link"
            value={meetUrl}
            onChange={(e) => setMeetUrl(e.target.value)}
            placeholder="https://meet.google.com/abc-defg-hij"
            className="w-full rounded border border-line-strong bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          />
          <input
            type="datetime-local"
            aria-label="Scheduled date and time"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
            className="w-full rounded border border-line-strong bg-surface px-3 py-2 text-sm text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          />
          <div className="flex gap-2">
            <ClassroomButton variant="primary" onClick={handleSave}>
              Save
            </ClassroomButton>
            <ClassroomButton
              variant="ghost"
              onClick={() => { setMeetUrl(block.meetUrl || ''); setTitle(block.title || ''); setScheduledAt(block.scheduledAt || ''); setEditing(false); }}
            >
              Cancel
            </ClassroomButton>
          </div>
        </div>
      </div>
    );
  }

  if (!block.meetUrl) {
    return (
      <div className={PLACEHOLDER}>
        {canEdit ? (
          <>
            <Video className="mx-auto mb-2 text-green-700" size={32} strokeWidth={1.5} aria-hidden="true" />
            <p className="text-sm text-ink-2 mb-2">Add a Google Meet link</p>
            <ClassroomButton variant="primary" icon={Video} onClick={() => setEditing(true)}>
              Set Up Meeting
            </ClassroomButton>
          </>
        ) : (
          <>
            <Video className="mx-auto mb-2 text-ink-3" size={32} strokeWidth={1.5} aria-hidden="true" />
            <p className="text-sm text-ink-2">No meeting set up</p>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-line bg-surface overflow-hidden">
      <div className="flex items-center justify-between gap-2 px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-green-700">
            <Video size={16} strokeWidth={1.5} className="text-white" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h4 className="text-sm font-semibold text-ink">
              {block.title || 'Google Meet'}
            </h4>
            {block.scheduledAt && (
              <div className="mt-1">
                <ChalkBadge icon={Calendar} label={new Date(block.scheduledAt).toLocaleString()} />
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          {canEdit && (
            <ClassroomButton variant="ghost" onClick={() => setEditing(true)}>
              Edit
            </ClassroomButton>
          )}
          {canEdit && (
            <button type="button" onClick={onDelete} className={ICON_BTN} title="Remove" aria-label="Remove">
              <Trash2 size={16} strokeWidth={1.5} aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
      <div className="px-4 pb-3">
        {meetHref ? (
          <a
            href={meetHref}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-motion inline-flex min-h-[44px] items-center gap-2 rounded bg-green-700 px-4 text-sm font-medium text-white hover:bg-green-800 md:min-h-[32px]"
          >
            <Video size={16} strokeWidth={1.5} aria-hidden="true" />
            Join Meeting
            <ExternalLink size={14} strokeWidth={1.5} aria-hidden="true" />
          </a>
        ) : (
          <span className="flex items-center gap-2 text-sm text-ink">
            <AlertTriangle className="h-4 w-4 flex-shrink-0 text-danger" strokeWidth={1.5} aria-hidden="true" />
            This meeting link was blocked because it is not a normal web address.
          </span>
        )}
      </div>
    </div>
  );
}
