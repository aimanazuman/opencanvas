import React, { useState } from 'react';
import { X, MoreVertical, Trash2, ArrowRight, Heart, Link2, Paperclip, Download, Eye } from 'lucide-react';
import { getFileTypeInfo, formatFileSize } from '../../../utils/fileIcons';
import DocumentPreviewModal from '../DocumentPreviewModal';

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

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-backdropFade" onClick={handleClose}>
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col animate-scaleIn" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between p-4 border-b">
            <h3 className="font-semibold text-gray-900">Card Details</h3>
            <div className="flex items-center space-x-1">
              {(() => {
                const isCardAuthor = user && card.author?.id === user.id;
                const canDeleteCard = canEdit || (canComment && isCardAuthor);
                const canMoveCard = canEdit;
                const showMenu = canDeleteCard || canMoveCard;
                return showMenu ? (
                  <div className="relative">
                    <button
                      onClick={() => setCardMenuOpen(!cardMenuOpen)}
                      className="p-1 hover:bg-gray-100 rounded"
                    >
                      <MoreVertical className="w-5 h-5 text-gray-500" />
                    </button>
                    {cardMenuOpen && (
                      <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-xl border py-1 z-50 w-48 animate-slideDown">
                        {canMoveCard && (
                          <button
                            onClick={() => { setShowMoveOptions(true); setCardMenuOpen(false); }}
                            className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center space-x-2"
                          >
                            <ArrowRight className="w-4 h-4" />
                            <span>Move to column</span>
                          </button>
                        )}
                        {canDeleteCard && (
                          <button
                            onClick={() => { onDeleteCard(columnId, card.id); handleClose(); }}
                            className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2"
                          >
                            <Trash2 className="w-4 h-4" />
                            <span>Delete card</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ) : null;
              })()}
              <button onClick={handleClose} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <h4 className="text-lg font-semibold text-gray-900">{card.title || card.content}</h4>

            {card.content && card.title && (
              <p className="text-gray-700">{card.content}</p>
            )}

            {card.author && (
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <div className="w-7 h-7 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white text-xs">
                  {card.author.avatar}
                </div>
                <div>
                  <span className="font-medium text-gray-700">{card.author.name}</span>
                  {card.author.studentId && (
                    <span className="ml-2 text-xs text-gray-400">({card.author.studentId})</span>
                  )}
                </div>
              </div>
            )}

            {/* Like button */}
            <div className="flex items-center space-x-3">
              <button
                onClick={() => onToggleLike(columnId, card.id)}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-sm transition ${
                  cardIsLiked
                    ? 'bg-pink-50 text-pink-600 border border-pink-200'
                    : 'bg-gray-50 text-gray-500 border border-gray-200 hover:bg-pink-50 hover:text-pink-500'
                }`}
              >
                <Heart className={`w-4 h-4 ${cardIsLiked ? 'fill-pink-500' : ''}`} />
                <span>{cardLikes.length > 0 ? cardLikes.length : 'Like'}</span>
              </button>
              {cardLikes.length > 0 && (
                <span className="text-xs text-gray-400">
                  {cardLikes.map(l => l.userName).join(', ')}
                </span>
              )}
            </div>

            {/* Link */}
            {card.linkUrl && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-center space-x-2">
                  <Link2 className="w-4 h-4 text-blue-500 flex-shrink-0" />
                  <a
                    href={card.linkUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline break-all"
                  >
                    {card.linkUrl}
                  </a>
                </div>
              </div>
            )}

            {/* Legacy Image */}
            {card.imageUrl && (
              <div className="rounded-lg overflow-hidden border">
                <img src={card.imageUrl} alt="" className="w-full" />
              </div>
            )}

            {/* Files */}
            {card.files && card.files.length > 0 && (
              <div className="space-y-2">
                <h5 className="text-sm font-medium text-gray-700 flex items-center space-x-1">
                  <Paperclip className="w-4 h-4" />
                  <span>Content ({card.files.length})</span>
                </h5>
                {card.files.map(file => {
                  const fileInfo = getFileTypeInfo(file.name);
                  const isImage = isImageFile(file);

                  if (isImage && file.dataUrl) {
                    return (
                      <div key={file.id} className="border rounded-lg overflow-hidden">
                        <img src={file.dataUrl} alt={file.name} className="w-full max-h-64 object-contain bg-gray-50" />
                        <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-t">
                          <span className="text-xs text-gray-600 truncate">{file.name}</span>
                          <a href={file.dataUrl} download={file.name} className="text-xs text-indigo-600 hover:underline flex items-center space-x-1">
                            <Download className="w-3 h-3" />
                            <span>Download</span>
                          </a>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div key={file.id} className="flex items-center justify-between bg-gray-50 border rounded-lg p-2">
                      <div className="flex items-center space-x-2 min-w-0">
                        <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${fileInfo.bg} ${fileInfo.color}`}>{fileInfo.label}</span>
                        <span className="text-sm text-gray-700 truncate">{file.name}</span>
                        {file.size && <span className="text-xs text-gray-400 flex-shrink-0">({formatFileSize(file.size)})</span>}
                      </div>
                      <div className="flex items-center space-x-1 flex-shrink-0 ml-2">
                        {file.dataUrl && (
                          <>
                            <button
                              onClick={() => setPreviewFile(file)}
                              className="p-1 text-gray-400 hover:text-indigo-600 rounded"
                              title="Preview"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <a href={file.dataUrl} download={file.name} className="p-1 text-gray-400 hover:text-indigo-600 rounded" title="Download">
                              <Download className="w-4 h-4" />
                            </a>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {card.createdAt && (
              <p className="text-xs text-gray-400">Created {formatTime(card.createdAt)}</p>
            )}

            {/* Move to column */}
            {showMoveOptions && (
              <div className="bg-gray-50 border rounded-lg p-3 space-y-2">
                <p className="text-sm font-medium text-gray-700">Move to:</p>
                {columns.filter(c => c.id !== columnId).map(col => (
                  <button
                    key={col.id}
                    onClick={() => {
                      onMoveCard(columnId, card.id, col.id);
                      handleClose();
                    }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded flex items-center space-x-2"
                  >
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: col.color }} />
                    <span>{col.title}</span>
                  </button>
                ))}
                <button onClick={() => setShowMoveOptions(false)} className="text-xs text-gray-500 hover:underline">Cancel</button>
              </div>
            )}

            {/* Comments */}
            <div className="border-t pt-4">
              <h4 className="text-sm font-medium text-gray-700 mb-3">
                Comments ({card.comments?.length || 0})
              </h4>
              <div className="space-y-3 mb-4">
                {(card.comments || []).map(comment => (
                  <div key={comment.id} className="flex space-x-2">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white text-xs flex-shrink-0">
                      {comment.user.avatar}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium">{comment.user.name}</span>
                        <span className="text-xs text-gray-400">{formatTime(comment.createdAt)}</span>
                      </div>
                      <p className="text-sm text-gray-700">{comment.text}</p>
                    </div>
                  </div>
                ))}
              </div>
              {canComment && (
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleComment(); }}
                    placeholder="Add a comment..."
                    className="flex-1 px-3 py-1.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    onClick={handleComment}
                    disabled={!commentText.trim()}
                    className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50"
                  >
                    Send
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

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
