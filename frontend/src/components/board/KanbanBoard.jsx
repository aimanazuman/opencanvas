import React, { useState } from 'react';
import { Plus, MoreVertical, Trash2, Edit3 } from 'lucide-react';
import { useBoard } from '../../contexts/BoardContext';
import { useAuth } from '../../contexts/AuthContext';
import { createKanbanColumn } from '../../utils/boardHelpers';
import KanbanCard from './kanban/KanbanCard';
import KanbanAddCard from './kanban/KanbanAddCard';
import KanbanCardDetail from './kanban/KanbanCardDetail';


export default function KanbanBoard() {
  const { board, canEdit, canComment, updateColumns, recordInteraction } = useBoard();
  const { user } = useAuth();
  const [addingCardTo, setAddingCardTo] = useState(null);
  const [addingColumn, setAddingColumn] = useState(false);
  const [newColumnTitle, setNewColumnTitle] = useState('');
  const [selectedCard, setSelectedCard] = useState(null);
  const [editingColumnId, setEditingColumnId] = useState(null);
  const [editColumnTitle, setEditColumnTitle] = useState('');
  const [columnMenuOpen, setColumnMenuOpen] = useState(null);

  if (!board?.columns) return null;

  const columns = board.columns;
  const isOwner = board.owner?.id === user?.id || !board.owner;
  const isLecturerOrAdmin = user?.role === 'lecturer' || user?.role === 'admin';
  const canManageColumns = canEdit && (isOwner || isLecturerOrAdmin);

  const makeAuthor = () => user ? {
    id: user.id,
    name: `${user.first_name} ${user.last_name}`,
    avatar: (user.first_name?.[0] || '') + (user.last_name?.[0] || ''),
    studentId: user.student_id || null,
  } : null;

  const handleAddCard = (columnId, card) => {
    card.author = makeAuthor();
    const newColumns = columns.map(col =>
      col.id === columnId ? { ...col, cards: [...col.cards, card] } : col
    );
    updateColumns(newColumns);
    if (board.trackInteractions && user) {
      recordInteraction(user, 'card_created');
      if (card.files && card.files.length > 0) recordInteraction(user, 'file_uploaded');
    }
  };

  const handleAddColumn = () => {
    if (!newColumnTitle.trim()) return;
    const column = createKanbanColumn(newColumnTitle.trim());
    updateColumns([...columns, column]);
    setNewColumnTitle('');
    setAddingColumn(false);
  };

  const handleRenameColumn = (columnId) => {
    if (!editColumnTitle.trim()) return;
    const newColumns = columns.map(col =>
      col.id === columnId ? { ...col, title: editColumnTitle.trim() } : col
    );
    updateColumns(newColumns);
    setEditingColumnId(null);
    setEditColumnTitle('');
  };

  const handleDeleteCard = (columnId, cardId) => {
    const newColumns = columns.map(col =>
      col.id === columnId ? { ...col, cards: col.cards.filter(c => c.id !== cardId) } : col
    );
    updateColumns(newColumns);
    setSelectedCard(null);
  };

  const handleDeleteColumn = (columnId) => {
    updateColumns(columns.filter(col => col.id !== columnId));
    setColumnMenuOpen(null);
  };

  const handleMoveCard = (fromColumnId, cardId, toColumnId) => {
    const fromCol = columns.find(c => c.id === fromColumnId);
    const card = fromCol?.cards.find(c => c.id === cardId);
    if (!card) return;
    const newColumns = columns.map(col => {
      if (col.id === fromColumnId) return { ...col, cards: col.cards.filter(c => c.id !== cardId) };
      if (col.id === toColumnId) return { ...col, cards: [...col.cards, card] };
      return col;
    });
    updateColumns(newColumns);
  };

  const handleAddComment = (columnId, cardId, text) => {
    if (!text || !user) return;
    const comment = {
      id: Date.now().toString(),
      text,
      user: { id: user.id, name: `${user.first_name} ${user.last_name}`, avatar: (user.first_name?.[0] || '') + (user.last_name?.[0] || '') },
      createdAt: new Date().toISOString(),
    };
    const newColumns = columns.map(col =>
      col.id === columnId
        ? { ...col, cards: col.cards.map(c => c.id === cardId ? { ...c, comments: [...c.comments, comment] } : c) }
        : col
    );
    updateColumns(newColumns);
    if (board.trackInteractions && user) {
      recordInteraction(user, 'commented');
    }
    // Update selectedCard to reflect new comment
    if (selectedCard?.card.id === cardId) {
      const updatedCol = newColumns.find(c => c.id === columnId);
      const updatedCard = updatedCol?.cards.find(c => c.id === cardId);
      if (updatedCard) setSelectedCard({ card: updatedCard, columnId });
    }
  };

  const handleToggleLike = (columnId, cardId) => {
    if (!user) return;
    const newColumns = columns.map(col => {
      if (col.id !== columnId) return col;
      return {
        ...col,
        cards: col.cards.map(c => {
          if (c.id !== cardId) return c;
          const likes = c.likes || [];
          const existing = likes.find(l => l.userId === user.id);
          const isNewLike = !existing;
          const newLikes = existing
            ? likes.filter(l => l.userId !== user.id)
            : [...likes, { userId: user.id, userName: `${user.first_name} ${user.last_name}` }];
          if (isNewLike && board.trackInteractions) {
            recordInteraction(user, 'card_liked');
          }
          return { ...c, likes: newLikes };
        }),
      };
    });
    updateColumns(newColumns);
    if (selectedCard?.card.id === cardId) {
      const updatedCol = newColumns.find(c => c.id === columnId);
      const updatedCard = updatedCol?.cards.find(c => c.id === cardId);
      if (updatedCard) setSelectedCard({ card: updatedCard, columnId });
    }
  };

  return (
    <div className="flex flex-col flex-1 min-h-0">
    <div className="flex-1 flex overflow-x-auto px-4 py-6 space-x-4">
      {columns.map(column => (
        <div key={column.id} className="flex-shrink-0 w-80 bg-gray-100 rounded-xl flex flex-col max-h-[calc(100vh-160px)] group/col">
          {/* Column Header */}
          <div className="px-4 py-3 flex items-center justify-between">
            <div className="flex items-center space-x-2 flex-1 min-w-0">
              <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: column.color }} />
              {editingColumnId === column.id ? (
                <input
                  type="text"
                  value={editColumnTitle}
                  onChange={(e) => setEditColumnTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleRenameColumn(column.id);
                    if (e.key === 'Escape') setEditingColumnId(null);
                  }}
                  onBlur={() => handleRenameColumn(column.id)}
                  className="font-semibold text-gray-900 bg-white border rounded px-1 py-0.5 text-sm flex-1 min-w-0 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  autoFocus
                />
              ) : (
                <h3
                  className={`font-semibold text-gray-900 truncate ${canManageColumns ? 'cursor-pointer hover:text-indigo-600' : ''}`}
                  onDoubleClick={() => {
                    if (canManageColumns) {
                      setEditingColumnId(column.id);
                      setEditColumnTitle(column.title);
                    }
                  }}
                >
                  {column.title}
                </h3>
              )}
              <span className="text-xs text-gray-500 bg-gray-200 px-1.5 py-0.5 rounded-full flex-shrink-0">{column.cards.length}</span>
            </div>
            {canManageColumns && (
              <div className="relative">
                <button
                  onClick={() => setColumnMenuOpen(columnMenuOpen === column.id ? null : column.id)}
                  className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded opacity-0 group-hover/col:opacity-100 transition"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>
                {columnMenuOpen === column.id && (
                  <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-xl border py-1 z-50 w-40">
                    <button
                      onClick={() => {
                        setEditingColumnId(column.id);
                        setEditColumnTitle(column.title);
                        setColumnMenuOpen(null);
                      }}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center space-x-2"
                    >
                      <Edit3 className="w-4 h-4" />
                      <span>Rename</span>
                    </button>
                    <button
                      onClick={() => handleDeleteColumn(column.id)}
                      className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Delete</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Cards */}
          <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-2">
            {column.cards.map(card => (
              <KanbanCard
                key={card.id}
                card={card}
                user={user}
                onClick={() => setSelectedCard({ card, columnId: column.id })}
              />
            ))}

            {(canEdit || canComment) && (
              <KanbanAddCard
                columnId={column.id}
                isAdding={addingCardTo === column.id}
                onAdd={handleAddCard}
                onCancel={(id) => id ? setAddingCardTo(id) : setAddingCardTo(null)}
              />
            )}
          </div>
        </div>
      ))}

      {/* Add Column */}
      {canManageColumns && (
        addingColumn ? (
          <div className="flex-shrink-0 w-80 bg-gray-100 rounded-xl p-4 space-y-3">
            <input
              type="text"
              value={newColumnTitle}
              onChange={(e) => setNewColumnTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddColumn()}
              placeholder="Column title..."
              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              autoFocus
            />
            <div className="flex space-x-2">
              <button onClick={handleAddColumn} className="px-3 py-1.5 bg-indigo-600 text-white rounded text-sm hover:bg-indigo-700">Add Column</button>
              <button onClick={() => { setAddingColumn(false); setNewColumnTitle(''); }} className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-200 rounded">Cancel</button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setAddingColumn(true)}
            className="flex-shrink-0 w-80 h-12 bg-gray-100 hover:bg-gray-200 rounded-xl flex items-center justify-center text-sm text-gray-600 transition"
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Column
          </button>
        )
      )}

      {/* Card Detail Modal */}
      <KanbanCardDetail
        selectedCard={selectedCard}
        columns={columns}
        user={user}
        canEdit={canEdit}
        canComment={canComment}
        onClose={() => setSelectedCard(null)}
        onDeleteCard={handleDeleteCard}
        onMoveCard={handleMoveCard}
        onToggleLike={handleToggleLike}
        onAddComment={handleAddComment}
      />
    </div>
    </div>
  );
}
