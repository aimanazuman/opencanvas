import React, { useState } from 'react';
import { BookOpen, Bookmark, StickyNote, Lock } from 'lucide-react';
import { useBoard } from '../../contexts/BoardContext';
import { useAuth } from '../../contexts/AuthContext';
import { BLOCK_TYPES } from '../../utils/boardHelpers';
import BlockRenderer from './BlockRenderer';
import CommentThread from './CommentThread';
import AddBlockMenu from './AddBlockMenu';
import { ClassroomButton, StickyNote as EmptyNote } from '../classroom';

// Section panels stay white. Only the icon carries the section's label colour.
const SECTION_STYLES = {
  Topic: { tone: 'text-teal-700' },
  Content: { tone: 'text-ink-2' },
  Summary: { tone: 'text-accent' },
  Resources: { tone: 'text-teal-700' },
  Announcements: { tone: 'text-orange-700' },
  'Student Resources': { tone: 'text-amber-700' },
};

// Hand font only for short section titles (under 40 characters).
const titleFont = (title) => ((title || '').length < 40 ? 'font-hand text-lg' : 'text-base font-semibold');

const SECTION = 'rounded-xl border border-line border-t-2 border-t-wood bg-surface p-6';
// 44 px on phones, 32 px on desktop. Colour is added per state by the caller.
const ICON_BTN = 'btn-motion flex h-11 w-11 flex-shrink-0 items-center justify-center rounded md:h-8 md:w-8';

export default function LectureNotesBoard() {
  const {
    board, canEdit, canComment, addBlockToSection, updateBlockInSection, removeBlockFromSection, addComment,
    addPersonalNote, removePersonalNote, toggleBookmark, getPersonalNote, isBookmarked, getBookmarkedBlockIds,
  } = useBoard();
  const { user } = useAuth();
  const [showBookmarkedOnly, setShowBookmarkedOnly] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [noteText, setNoteText] = useState('');

  if (!board?.sections) return null;

  const isLecturer = user?.role === 'lecturer' || user?.role === 'admin';
  const isStudent = user?.role === 'student';
  const userId = user?.id || '';
  const bookmarkedIds = getBookmarkedBlockIds(userId);

  const handleAddBlock = (sectionId, block) => {
    addBlockToSection(sectionId, block);
  };

  const handleUpdateBlock = (sectionId, blockId, updates) => {
    updateBlockInSection(sectionId, blockId, updates);
  };

  const handleDeleteBlock = (sectionId, blockId) => {
    removeBlockFromSection(sectionId, blockId);
  };

  const handleAddComment = (blockId, text) => {
    if (user) {
      addComment(blockId, text, user);
    }
  };

  const handleToggleBookmark = (blockId) => {
    toggleBookmark(blockId, userId);
  };

  const handleSavePersonalNote = (blockId) => {
    if (noteText.trim()) {
      addPersonalNote(blockId, noteText.trim(), userId);
    } else {
      removePersonalNote(blockId, userId);
    }
    setEditingNote(null);
    setNoteText('');
  };

  const handleStartEditNote = (blockId) => {
    const existing = getPersonalNote(blockId, userId);
    setNoteText(existing || '');
    setEditingNote(blockId);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Student toolbar - bookmarks filter */}
      {isStudent && (
        <div className="flex items-center gap-3 px-4 py-2 rounded-lg border border-line bg-surface">
          <ClassroomButton
            variant={showBookmarkedOnly ? 'primary' : 'secondary'}
            aria-pressed={showBookmarkedOnly}
            onClick={() => setShowBookmarkedOnly(!showBookmarkedOnly)}
          >
            <Bookmark size={14} strokeWidth={1.5} className={showBookmarkedOnly ? 'fill-current' : ''} aria-hidden="true" />
            Show Bookmarked ({bookmarkedIds.length})
          </ClassroomButton>
        </div>
      )}

      {board.sections.map((section) => {
        const styles = SECTION_STYLES[section.title] || SECTION_STYLES.Content;

        return (
          <div key={section.id} className={SECTION}>
            <h2 className={`mb-4 flex items-center gap-2 text-ink ${titleFont(section.title)}`}>
              <BookOpen className={`h-5 w-5 flex-shrink-0 ${styles.tone}`} strokeWidth={1.5} aria-hidden="true" />
              <span>{section.title}</span>
            </h2>

            <div className="space-y-4">
              {section.blocks
                .filter(block => {
                  // Filter personal notes: only show to owner
                  if (block.type === BLOCK_TYPES.PERSONAL_NOTE && block.ownerId && block.ownerId !== userId) {
                    return false;
                  }
                  // Filter by bookmark if toggled
                  if (showBookmarkedOnly && !bookmarkedIds.includes(block.id)) {
                    return false;
                  }
                  return true;
                })
                .map((block) => {
                  const blockBookmarked = isBookmarked(block.id, userId);
                  const personalNote = getPersonalNote(block.id, userId);

                  return (
                    <div key={block.id} className={`relative rounded-lg ${blockBookmarked ? 'ring-2 ring-amber-700' : ''}`}>
                      {/* Bookmark button for students */}
                      {isStudent && block.type !== BLOCK_TYPES.PERSONAL_NOTE && (
                        <button
                          type="button"
                          onClick={() => handleToggleBookmark(block.id)}
                          className={`${ICON_BTN} absolute top-2 right-2 z-10 ${
                            blockBookmarked ? 'text-amber-700' : 'text-ink-3 hover:text-amber-700'
                          }`}
                          title={blockBookmarked ? 'Remove bookmark' : 'Bookmark this block'}
                        >
                          <Bookmark size={16} strokeWidth={1.5} className={blockBookmarked ? 'fill-current' : ''} aria-hidden="true" />
                        </button>
                      )}

                      <BlockRenderer
                        block={block}
                        canEdit={canEdit && isLecturer}
                        canSubmit={canEdit && isStudent}
                        currentUserId={userId}
                        onUpdate={(updates) => handleUpdateBlock(section.id, block.id, updates)}
                        onDelete={() => handleDeleteBlock(section.id, block.id)}
                      />

                      {/* Personal note indicator/editor for students */}
                      {isStudent && block.type !== BLOCK_TYPES.PERSONAL_NOTE && (
                        <div className="mt-2">
                          {editingNote === block.id ? (
                            <div className="rounded-lg border border-line bg-surface p-3">
                              <div className="mb-2 flex items-center gap-1 text-xs text-ink-2">
                                <Lock size={12} strokeWidth={1.5} aria-hidden="true" />
                                <span>Personal Note (only you can see this)</span>
                              </div>
                              <textarea
                                aria-label="Personal note"
                                value={noteText}
                                onChange={(e) => setNoteText(e.target.value)}
                                className="w-full resize-none rounded border border-line-strong bg-surface px-2 py-1.5 text-sm text-ink placeholder:text-ink-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                                rows={2}
                                placeholder="Write a personal note..."
                                autoFocus
                              />
                              <div className="flex gap-2 mt-2">
                                <ClassroomButton variant="primary" onClick={() => handleSavePersonalNote(block.id)}>
                                  Save
                                </ClassroomButton>
                                <ClassroomButton variant="ghost" onClick={() => setEditingNote(null)}>
                                  Cancel
                                </ClassroomButton>
                              </div>
                            </div>
                          ) : personalNote ? (
                            <button
                              type="button"
                              onClick={() => handleStartEditNote(block.id)}
                              className="btn-motion block w-full rounded-lg border border-line bg-surface p-3 text-left hover:bg-surface-hover"
                            >
                              <span className="mb-1 flex items-center gap-1 text-xs text-ink-2">
                                <StickyNote size={12} strokeWidth={1.5} aria-hidden="true" />
                                <Lock size={12} strokeWidth={1.5} aria-hidden="true" />
                                <span>Your Note</span>
                              </span>
                              <span className="block whitespace-pre-wrap text-sm text-ink">{personalNote}</span>
                            </button>
                          ) : (
                            <ClassroomButton
                              variant="ghost"
                              icon={StickyNote}
                              onClick={() => handleStartEditNote(block.id)}
                            >
                              Add personal note
                            </ClassroomButton>
                          )}
                        </div>
                      )}

                      {/* Comments */}
                      <CommentThread
                          comments={board.comments?.[block.id] || []}
                          onAddComment={(text) => handleAddComment(block.id, text)}
                          canComment={canComment}
                        />
                    </div>
                  );
                })}

              {section.blocks.length === 0 && (
                <EmptyNote as="p" color="azure" className="text-sm">No content yet</EmptyNote>
              )}
            </div>

            {/* Add block menu - lecturers for all sections, students for Student Resources */}
            {canEdit && (isLecturer || (isStudent && section.title === 'Student Resources')) && (
              <div className="mt-4">
                <AddBlockMenu
                  onAddBlock={(block) => handleAddBlock(section.id, block)}
                  userRole={user?.role}
                  currentUserId={userId}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
