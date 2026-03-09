import React, { useState } from 'react';
import { BookOpen, Bookmark, StickyNote, Lock } from 'lucide-react';
import { useBoard } from '../../contexts/BoardContext';
import { useAuth } from '../../contexts/AuthContext';
import { BLOCK_TYPES } from '../../utils/boardHelpers';
import BlockRenderer from './BlockRenderer';
import CommentThread from './CommentThread';
import AddBlockMenu from './AddBlockMenu';


const SECTION_STYLES = {
  Topic: { bg: 'bg-purple-50', border: 'border-purple-200', title: 'text-purple-800' },
  Content: { bg: 'bg-white', border: 'border-gray-200', title: 'text-gray-800' },
  Summary: { bg: 'bg-blue-50', border: 'border-blue-200', title: 'text-blue-800' },
  Resources: { bg: 'bg-teal-50', border: 'border-teal-200', title: 'text-teal-800' },
  Announcements: { bg: 'bg-orange-50', border: 'border-orange-200', title: 'text-orange-800' },
  'Student Resources': { bg: 'bg-amber-50', border: 'border-amber-200', title: 'text-amber-800' },
};

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
        <div className="flex items-center gap-3 px-4 py-2 bg-gray-50 rounded-lg border">
          <button
            onClick={() => setShowBookmarkedOnly(!showBookmarkedOnly)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition ${
              showBookmarkedOnly
                ? 'bg-amber-100 text-amber-700 border border-amber-300'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Bookmark size={14} className={showBookmarkedOnly ? 'fill-amber-500' : ''} />
            Show Bookmarked ({bookmarkedIds.length})
          </button>
        </div>
      )}

      {board.sections.map((section) => {
        const styles = SECTION_STYLES[section.title] || SECTION_STYLES.Content;

        return (
          <div
            key={section.id}
            className={`${styles.bg} border ${styles.border} rounded-xl p-6`}
          >
            <h2 className={`text-lg font-bold ${styles.title} mb-4 flex items-center space-x-2`}>
              <BookOpen className="w-5 h-5" />
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
                    <div key={block.id} className={`relative ${blockBookmarked ? 'ring-2 ring-amber-300 rounded-lg' : ''}`}>
                      {/* Bookmark button for students */}
                      {isStudent && block.type !== BLOCK_TYPES.PERSONAL_NOTE && (
                        <button
                          onClick={() => handleToggleBookmark(block.id)}
                          className={`absolute top-2 right-2 z-10 p-1 rounded ${
                            blockBookmarked ? 'text-amber-500' : 'text-gray-300 hover:text-amber-400'
                          }`}
                          title={blockBookmarked ? 'Remove bookmark' : 'Bookmark this block'}
                        >
                          <Bookmark size={16} className={blockBookmarked ? 'fill-amber-500' : ''} />
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
                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                              <div className="flex items-center gap-1 mb-2 text-xs text-amber-600">
                                <Lock size={10} />
                                <span>Personal Note (only you can see this)</span>
                              </div>
                              <textarea
                                value={noteText}
                                onChange={(e) => setNoteText(e.target.value)}
                                className="w-full px-2 py-1.5 border border-amber-300 rounded text-sm bg-white resize-none"
                                rows={2}
                                placeholder="Write a personal note..."
                                autoFocus
                              />
                              <div className="flex gap-2 mt-2">
                                <button
                                  onClick={() => handleSavePersonalNote(block.id)}
                                  className="px-2 py-1 bg-amber-500 text-white rounded text-xs hover:bg-amber-600"
                                >
                                  Save
                                </button>
                                <button
                                  onClick={() => setEditingNote(null)}
                                  className="px-2 py-1 bg-gray-200 text-gray-600 rounded text-xs hover:bg-gray-300"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : personalNote ? (
                            <div
                              onClick={() => handleStartEditNote(block.id)}
                              className="bg-amber-50 border border-amber-200 rounded-lg p-3 cursor-pointer hover:bg-amber-100"
                            >
                              <div className="flex items-center gap-1 mb-1 text-xs text-amber-600">
                                <StickyNote size={10} />
                                <Lock size={10} />
                                <span>Your Note</span>
                              </div>
                              <p className="text-sm text-amber-800">{personalNote}</p>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleStartEditNote(block.id)}
                              className="text-xs text-amber-500 hover:text-amber-600 flex items-center gap-1"
                            >
                              <StickyNote size={12} />
                              Add personal note
                            </button>
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
                <p className="text-sm text-gray-400 italic">No content yet</p>
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
