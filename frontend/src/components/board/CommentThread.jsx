import React, { useState, useId } from 'react';
import { MessageCircle, Send } from 'lucide-react';
import { ClassroomField, ClassroomButton } from '../classroom';

export default function CommentThread({ comments = [], onAddComment, canComment = true }) {
  const [text, setText] = useState('');
  const [expanded, setExpanded] = useState(false);
  const uid = useId();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    onAddComment(text.trim());
    setText('');
  };

  const formatTime = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMs / 3600000);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="mt-3 border-t border-line pt-3">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
        aria-controls={`${uid}-thread`}
        className="btn-motion flex min-h-[44px] items-center gap-1.5 text-sm text-ink-2 hover:text-ink md:min-h-[32px]"
      >
        <MessageCircle className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
        <span>{comments.length} comment{comments.length !== 1 ? 's' : ''}</span>
      </button>

      {expanded && (
        <div id={`${uid}-thread`} className="mt-3 space-y-3">
          <ul className="space-y-3">
            {comments.map((comment) => (
              <li key={comment.id} className="flex gap-2">
                <span
                  aria-hidden="true"
                  className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-accent text-xs font-medium text-white"
                >
                  {comment.user.avatar}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-ink">{comment.user.name}</span>
                    <span className="text-xs text-ink-3">{formatTime(comment.createdAt)}</span>
                  </div>
                  <p className="mt-0.5 break-words text-sm text-ink">{comment.text}</p>
                </div>
              </li>
            ))}
          </ul>

          {canComment && (
            <form onSubmit={handleSubmit} className="flex items-end gap-2">
              <ClassroomField
                id={`${uid}-input`}
                label="Add a comment"
                className="min-w-0 flex-1"
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Add a comment..."
              />
              <ClassroomButton type="submit" variant="primary" icon={Send} disabled={!text.trim()}>
                Send
              </ClassroomButton>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
