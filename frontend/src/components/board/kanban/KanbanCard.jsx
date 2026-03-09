import React from 'react';
import { Paperclip, Link2, Heart, MessageCircle } from 'lucide-react';

function isImageFile(file) {
  if (file.type?.startsWith('image/')) return true;
  const ext = file.name?.split('.').pop()?.toLowerCase();
  return ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(ext);
}

export default function KanbanCard({ card, user, onClick }) {
  const likes = card.likes || [];
  const isLiked = user && likes.some(l => l.userId === user.id);
  const firstImage = (card.files || []).find(f => isImageFile(f) && f.dataUrl);

  return (
    <div
      className="bg-white rounded-lg border shadow-sm p-3 cursor-pointer hover:shadow-md transition group"
      onClick={onClick}
    >
      {firstImage && (
        <div className="mb-2 rounded overflow-hidden -mx-1 -mt-1">
          <img src={firstImage.dataUrl} alt="" className="w-full h-28 object-cover" />
        </div>
      )}
      {!firstImage && card.imageUrl && (
        <div className="mb-2 rounded overflow-hidden -mx-1 -mt-1">
          <img src={card.imageUrl} alt="" className="w-full h-28 object-cover" />
        </div>
      )}
      <p className="text-sm font-medium text-gray-900">{card.title || card.content}</p>
      {card.content && card.title && (
        <p className="text-xs text-gray-500 mt-1 line-clamp-2">{card.content}</p>
      )}
      {card.files && card.files.length > 0 && (
        <div className="flex items-center space-x-1 mt-2">
          <Paperclip className="w-3 h-3 text-gray-400" />
          <span className="text-xs text-gray-400">{card.files.length} file{card.files.length !== 1 ? 's' : ''}</span>
        </div>
      )}
      {card.linkUrl && (
        <div className="flex items-center space-x-1 mt-1">
          <Link2 className="w-3 h-3 text-blue-400" />
          <span className="text-xs text-blue-500 truncate">{card.linkUrl}</span>
        </div>
      )}
      <div className="flex items-center justify-between mt-2">
        {card.author && (
          <div className="flex items-center space-x-1">
            <div className="w-6 h-6 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white text-xs" title={card.author.name}>
              {card.author.avatar}
            </div>
            <span className="text-xs text-gray-400">{card.author.name}</span>
          </div>
        )}
        <div className="flex items-center space-x-2">
          {likes.length > 0 && (
            <span className="flex items-center text-xs text-pink-500 space-x-0.5">
              <Heart className={`w-3 h-3 ${isLiked ? 'fill-pink-500' : ''}`} />
              <span>{likes.length}</span>
            </span>
          )}
          {card.comments && card.comments.length > 0 && (
            <span className="flex items-center text-xs text-gray-400 space-x-1">
              <MessageCircle className="w-3 h-3" />
              <span>{card.comments.length}</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
