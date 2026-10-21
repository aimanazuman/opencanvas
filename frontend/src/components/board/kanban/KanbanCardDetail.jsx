import React, { useState } from 'react';
import { safeUrl } from '../../../utils/safeUrl';
import { MediaImg, MediaDownloadLink } from '../MediaFile';
import { resolveMediaUrl } from '../../../utils/media';
import { MoreVertical, Trash2, ArrowRight, Heart, Link2, Paperclip, Download, Eye } from 'lucide-react';
import { getFileTypeInfo, formatFileSize } from '../../../utils/fileIcons';
import DocumentPreviewModal from '../DocumentPreviewModal';
import { ClassroomDialog, ClassroomButton, ClassroomField } from '../../classroom';

// Static class strings. 44 px on phones, 32 px on desktop.
const ICON_BTN = 'btn-motion flex h-11 w-11 flex-shrink-0 items-center justify-center rounded text-ink-2 hover:bg-surface-hover md:h-8 md:w-8';
// Colour and hover classes are added per item, so no two colour utilities compete on one element.
const MENU_ITEM = 'btn-motion flex min-h-[44px] w-full items-center gap-2 px-3 text-left text-sm md:min-h-[32px]';

function isImageFile(file) {
  if (file.type?.startsWith('image/')) return true;
  const ext = file.name?.split('.').pop()?.toLowerCase();
  return ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(ext);
}

function formatTime(dateStr) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMs / 3600000);
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${Math.floor(diffMs / 86400000)}d ago`;
}

export default function KanbanCardDetail({
  selectedCard,
  columns,
  user,
  canEdit = true,
  canComment = true,
  onClose,
  onDeleteCard,
  onMoveCard,
  onToggleLike,
  onAddComment,
}) {
  const [commentText, setCommentText] = useState('');
  const [cardMenuOpen, setCardMenuOpen] = useState(false);
  const [showMoveOptions, setShowMoveOptions] = useState(false);
  const [previewFile, setPreviewFile] = useState(null);

  if (!selectedCard) return null;

  const { card, columnId } = selectedCard;
  const cardLikes = card.likes || [];
  const cardIsLiked = user && cardLikes.some(l => l.userId === user.id);
  const isCardAuthor = user && card.author?.id === user.id;
  const canDeleteCard = canEdit || (canComment && isCardAuthor);
  const canMoveCard = canEdit;
  const showMenu = canDeleteCard || canMoveCard;

  const handleClose = () => {
    setCardMenuOpen(false);
    setShowMoveOptions(false);
    onClose();
  };

  const handleComment = () => {
    if (!commentText.trim()) return;
    onAddComment(columnId, card.id, commentText.trim());
    setCommentText('');
  };

  const menu = showMenu ? (
    <div className="relative">
      <button
        type="button"
        onClick={() => setCardMenuOpen(!cardMenuOpen)}
        aria-expanded={cardMenuOpen}
        aria-label="Card actions"
        className={ICON_BTN}
      >
        <MoreVertical className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
      </button>
      {cardMenuOpen && (
        <div className="absolute right-0 top-full z-50 mt-1 w-48 rounded-lg border border-line bg-surface py-1 shadow-pop">
          {canMoveCard && (
            <button
              type="button"
              onClick={() => { setShowMoveOptions(true); setCardMenuOpen(false); }}
              className={`${MENU_ITEM} text-ink hover:bg-surface-hover`}
            >
              <ArrowRight className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
              <span>Move to column</span>
            </button>
          )}
          {canDeleteCard && (
            <button
              type="button"
              onClick={() => { onDeleteCard(columnId, card.id); handleClose(); }}
              className={`${MENU_ITEM} text-danger hover:bg-danger-tint`}
            >
              <Trash2 className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
              <span>Delete card</span>
            </button>
          )}
        </div>
      )}
    </div>
  ) : null;

  return (
    <>
      <ClassroomDialog
        titleId="kanban-card-detail-title"
        title="Card Details"
        onClose={handleClose}
        size="lg"
        dismissOnScrim
        headerActions={menu}
      >
        <h3 className="break-words text-base font-semibold text-ink">{card.title || card.content}</h3>

        {card.content && card.title && (
          <p className="break-words text-ink">{card.content}</p>
        )}

        {card.author && (
          <div className="flex items-center gap-2 text-sm text-ink-2">
            <span aria-hidden="true" className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-accent text-xs text-white">
              {card.author.avatar}
            </span>
            <div>
              <span className="font-medium text-ink">{card.author.name}</span>
              {card.author.studentId && (
                <span className="ml-2 text-xs text-ink-3">({card.author.studentId})</span>
              )}
            </div>
          </div>
        )}

        {/* Like button */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => onToggleLike(columnId, card.id)}
            aria-pressed={Boolean(cardIsLiked)}
            className={`btn-motion flex min-h-[44px] items-center gap-1.5 rounded border px-3 text-sm md:min-h-[32px] ${
              cardIsLiked
                ? 'border-orange-200 bg-orange-50 text-orange-700'
                : 'border-line-strong bg-surface text-ink-2 hover:bg-surface-hover hover:text-ink'
            }`}
          >
            <Heart className={`h-4 w-4 ${cardIsLiked ? 'fill-current' : ''}`} strokeWidth={1.5} aria-hidden="true" />
            <span>{cardLikes.length > 0 ? cardLikes.length : 'Like'}</span>
          </button>
          {cardLikes.length > 0 && (
            <span className="text-xs text-ink-2">
              {cardLikes.map(l => l.userName).join(', ')}
            </span>
          )}
        </div>

        {/* Link */}
        {card.linkUrl && (
          <div className="rounded border border-accent-200 bg-accent-tint p-3">
            <div className="flex items-center gap-2">
              <Link2 className="h-4 w-4 flex-shrink-0 text-accent" strokeWidth={1.5} aria-hidden="true" />
              {safeUrl(card.linkUrl) ? (
                <a
                  href={safeUrl(card.linkUrl)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="break-all text-sm text-accent hover:underline"
                >
                  {card.linkUrl}
                </a>
              ) : (
                <span className="break-all text-sm text-ink-2" title="Only http and https links are clickable">
                  {card.linkUrl}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Legacy Image */}
        {card.imageUrl && (
          <div className="overflow-hidden rounded border border-line">
            <MediaImg src={card.imageUrl} alt="" className="w-full" />
          </div>
        )}

        {/* Files */}
        {card.files && card.files.length > 0 && (
          <div className="space-y-2">
            <h4 className="flex items-center gap-1.5 text-sm font-medium text-ink">
              <Paperclip className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
              <span>Content ({card.files.length})</span>
            </h4>
            {card.files.map(file => {
              const fileInfo = getFileTypeInfo(file.name);
              const isImage = isImageFile(file);

              if (isImage && file.dataUrl) {
                return (
                  <div key={file.id} className="overflow-hidden rounded border border-line">
                    <MediaImg src={file.dataUrl} alt={file.name} className="max-h-64 w-full bg-surface-hover object-contain" />
                    <div className="flex items-center justify-between gap-2 border-t border-line bg-surface-hover px-3 py-2">
                      <span className="truncate text-xs text-ink-2">{file.name}</span>
                      <MediaDownloadLink src={file.dataUrl} name={file.name} className="flex items-center gap-1 text-xs text-accent hover:underline">
                        <Download className="h-3 w-3" strokeWidth={1.5} aria-hidden="true" />
                        <span>Download</span>
                      </MediaDownloadLink>
                    </div>
                  </div>
                );
              }

              return (
                <div key={file.id} className="flex items-center justify-between gap-2 rounded border border-line bg-surface-hover p-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className={`flex-shrink-0 rounded-sm px-1.5 py-0.5 text-xs font-semibold ${fileInfo.bg} ${fileInfo.color}`}>{fileInfo.label}</span>
                    <span className="truncate text-sm text-ink">{file.name}</span>
                    {file.size && <span className="flex-shrink-0 text-xs text-ink-3">({formatFileSize(file.size)})</span>}
                  </div>
                  <div className="ml-2 flex flex-shrink-0 items-center gap-1">
                    {file.dataUrl && (
                      <>
                        <button
                          type="button"
                          onClick={async () => { const url = await resolveMediaUrl(file.dataUrl); if (url) setPreviewFile({ ...file, dataUrl: url }); else window.alert("This file is not available."); }}
                          className={ICON_BTN}
                          title="Preview"
                        >
                          <Eye className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
                        </button>
                        <MediaDownloadLink src={file.dataUrl} name={file.name} className={ICON_BTN} title="Download">
                          <Download className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
                        </MediaDownloadLink>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {card.createdAt && (
          <p className="text-xs text-ink-3">Created {formatTime(card.createdAt)}</p>
        )}

        {/* Move to column */}
        {showMoveOptions && (
          <div className="space-y-2 rounded border border-line bg-surface-hover p-3">
            <p className="text-sm font-medium text-ink">Move to:</p>
            {columns.filter(c => c.id !== columnId).map(col => (
              <button
                key={col.id}
                type="button"
                onClick={() => {
                  onMoveCard(columnId, card.id, col.id);
                  handleClose();
                }}
                className={`${MENU_ITEM} rounded text-ink hover:bg-surface`}
              >
                <span aria-hidden="true" className="h-3 w-3 flex-shrink-0 rounded-full" style={{ backgroundColor: col.color }} />
                <span>{col.title}</span>
              </button>
            ))}
            <button
              type="button"
              onClick={() => setShowMoveOptions(false)}
              className="btn-motion min-h-[44px] text-xs text-ink-2 hover:text-ink hover:underline md:min-h-[32px]"
            >
              Cancel
            </button>
          </div>
        )}

        {/* Comments */}
        <div className="border-t border-line pt-4">
          <h4 className="mb-3 text-sm font-medium text-ink">
            Comments ({card.comments?.length || 0})
          </h4>
          <ul className="mb-4 space-y-3">
            {(card.comments || []).map(comment => (
              <li key={comment.id} className="flex gap-2">
                <span aria-hidden="true" className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-accent text-xs text-white">
                  {comment.user.avatar}
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-ink">{comment.user.name}</span>
                    <span className="text-xs text-ink-3">{formatTime(comment.createdAt)}</span>
                  </div>
                  <p className="break-words text-sm text-ink">{comment.text}</p>
                </div>
              </li>
            ))}
          </ul>
          {canComment && (
            <div className="flex items-end gap-2">
              <ClassroomField
                id="kanban-card-comment"
                label="Add a comment"
                className="min-w-0 flex-1"
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleComment(); }}
                placeholder="Add a comment..."
              />
              <ClassroomButton variant="primary" onClick={handleComment} disabled={!commentText.trim()}>
                Send
              </ClassroomButton>
            </div>
          )}
        </div>
      </ClassroomDialog>

      {previewFile && (
        <DocumentPreviewModal
          fileUrl={previewFile.dataUrl}
          fileName={previewFile.name}
          onClose={() => setPreviewFile(null)}
        />
      )}
    </>
  );
}
