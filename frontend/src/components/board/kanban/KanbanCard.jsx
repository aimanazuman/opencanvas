import React from 'react';
import { MediaImg } from '../MediaFile';
import { Paperclip, Link2, Heart, MessageCircle } from 'lucide-react';

function isImageFile(file) {
  if (file.type?.startsWith('image/')) return true;
  const ext = file.name?.split('.').pop()?.toLowerCase();
  return ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(ext);
}

// The whole card is one button, so it is keyboard reachable and announced as a control.
// Hover lift only where a pointer can hover (see .lift in index.css); reduced motion removes it.
const CARD = 'lift block w-full min-w-0 rounded-lg border border-line bg-surface p-3 text-left';

export default function KanbanCard({ card, user, onClick }) {
  const likes = card.likes || [];
  const isLiked = user && likes.some(l => l.userId === user.id);
  const firstImage = (card.files || []).find(f => isImageFile(f) && f.dataUrl);
  const fileCount = card.files ? card.files.length : 0;

  return (
    <button type="button" className={CARD} onClick={onClick}>
      {firstImage && (
        <span className="-mx-1 -mt-1 mb-2 block overflow-hidden rounded">
          <MediaImg src={firstImage.dataUrl} alt="" loading="lazy" className="h-28 w-full object-cover" />
        </span>
      )}
      {!firstImage && card.imageUrl && (
        <span className="-mx-1 -mt-1 mb-2 block overflow-hidden rounded">
          <MediaImg src={card.imageUrl} alt="" loading="lazy" className="h-28 w-full object-cover" />
        </span>
      )}
      <span className="block text-sm font-medium text-ink">{card.title || card.content}</span>
      {card.content && card.title && (
        <span className="mt-1 line-clamp-2 block text-xs text-ink-2">{card.content}</span>
      )}
      {fileCount > 0 && (
        <span className="mt-2 flex items-center gap-1 text-xs text-ink-2">
          <Paperclip className="h-3 w-3" strokeWidth={1.5} aria-hidden="true" />
          <span>{fileCount} file{fileCount !== 1 ? 's' : ''}</span>
        </span>
      )}
      {card.linkUrl && (
        <span className="mt-1 flex items-center gap-1 text-xs text-accent">
          <Link2 className="h-3 w-3 flex-shrink-0" strokeWidth={1.5} aria-hidden="true" />
          <span className="truncate">{card.linkUrl}</span>
        </span>
      )}
      <span className="mt-2 flex items-center justify-between gap-2">
        {card.author ? (
          <span className="flex min-w-0 items-center gap-1">
            <span
              aria-hidden="true"
              className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-accent text-xs text-white"
            >
              {card.author.avatar}
            </span>
            <span className="truncate text-xs text-ink-2">{card.author.name}</span>
          </span>
        ) : <span />}
        <span className="flex flex-shrink-0 items-center gap-2">
          {likes.length > 0 && (
            <span className="flex items-center gap-0.5 text-xs text-orange-700">
              <Heart className={`h-3 w-3 ${isLiked ? 'fill-current' : ''}`} strokeWidth={1.5} aria-hidden="true" />
              <span>{likes.length}</span>
            </span>
          )}
          {card.comments && card.comments.length > 0 && (
            <span className="flex items-center gap-1 text-xs text-ink-2">
              <MessageCircle className="h-3 w-3" strokeWidth={1.5} aria-hidden="true" />
              <span>{card.comments.length}</span>
            </span>
          )}
        </span>
      </span>
    </button>
  );
}
