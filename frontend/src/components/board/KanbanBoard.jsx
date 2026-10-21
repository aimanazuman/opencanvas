import React, { useState } from 'react';
import { Plus, MoreVertical, Trash2, Edit3 } from 'lucide-react';
import { useBoard } from '../../contexts/BoardContext';
import { useAuth } from '../../contexts/AuthContext';
import { createKanbanColumn } from '../../utils/boardHelpers';
import KanbanCard from './kanban/KanbanCard';
import KanbanAddCard from './kanban/KanbanAddCard';
import KanbanCardDetail from './kanban/KanbanCardDetail';
import { ClassroomButton } from '../classroom';


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

  // Column titles use the UI font, the same as the rename input, so double-clicking does not change the font.
  const titleFont = () => 'text-sm font-semibold';

  return (
    <div className="flex flex-col flex-1 min-h-0">
    <div className="flex-1 flex overflow-x-auto px-4 py-6 space-x-4">
      {columns.map(column => (
        // Wood-toned top edge marks the lane; the lane and its white cards stay flat.
        <div key={column.id} className="flex-shrink-0 w-80 bg-surface-hover border border-line border-t-2 border-t-wood rounded-xl flex flex-col max-h-[calc(100vh-160px)] group/col">
          {/* Column Header */}
          <div className="px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: column.color }} aria-hidden="true" />
              {editingColumnId === column.id ? (
                <input
                  type="text"
                  aria-label="Column name"
                  value={editColumnTitle}
                  onChange={(e) => setEditColumnTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleRenameColumn(column.id);
                    if (e.key === 'Escape') setEditingColumnId(null);
                  }}
                  onBlur={() => handleRenameColumn(column.id)}
                  className="font-semibold text-ink bg-surface border border-line-strong rounded px-1 py-0.5 text-sm flex-1 min-w-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  autoFocus
                />
              ) : (
                <h3
                  className={`${titleFont()} text-ink truncate ${canManageColumns ? 'cursor-pointer hover:text-accent' : ''}`}
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
              <span className="text-xs text-ink-2 bg-surface border border-line px-1.5 py-0.5 rounded-full flex-shrink-0">{column.cards.length}</span>
            </div>
            {canManageColumns && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setColumnMenuOpen(columnMenuOpen === column.id ? null : column.id)}
                  className="btn-motion p-2 text-ink-2 hover:text-ink hover:bg-line rounded opacity-0 group-hover/col:opacity-100 focus-visible:opacity-100"
                  title={`Column menu for ${column.title}`}
                  aria-label={`Column menu for ${column.title}`}
                  aria-haspopup="true"
                  aria-expanded={columnMenuOpen === column.id}
                >
                  <MoreVertical className="w-4 h-4" strokeWidth={1.5} aria-hidden="true" />
                </button>
                {columnMenuOpen === column.id && (
                  <div className="absolute right-0 top-full mt-1 bg-surface rounded-lg shadow-pop border border-line py-1 z-50 w-40">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingColumnId(column.id);
                        setEditColumnTitle(column.title);
                        setColumnMenuOpen(null);
                      }}
                      className="btn-motion w-full px-3 py-2 text-left text-sm text-ink hover:bg-surface-hover flex items-center gap-2"
                    >
                      <Edit3 className="w-4 h-4" strokeWidth={1.5} aria-hidden="true" />
                      <span>Rename</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteColumn(column.id)}
                      className="btn-motion w-full px-3 py-2 text-left text-sm text-danger hover:bg-danger-tint flex items-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" strokeWidth={1.5} aria-hidden="true" />
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
          <div className="flex-shrink-0 w-80 bg-surface border border-line rounded-xl p-4 space-y-3">
            <input
              type="text"
              aria-label="New column title"
              value={newColumnTitle}
              onChange={(e) => setNewColumnTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddColumn()}
              placeholder="Column title..."
              className="w-full px-3 py-2 rounded border border-line-strong bg-surface text-sm text-ink placeholder:text-ink-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              autoFocus
            />
            <div className="flex gap-2">
              <ClassroomButton variant="primary" onClick={handleAddColumn}>Add Column</ClassroomButton>
              <ClassroomButton variant="ghost" onClick={() => { setAddingColumn(false); setNewColumnTitle(''); }}>Cancel</ClassroomButton>
            </div>
          </div>
        ) : (
          <ClassroomButton variant="secondary" icon={Plus} onClick={() => setAddingColumn(true)} className="flex-shrink-0 w-80">
            Add Column
          </ClassroomButton>
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
