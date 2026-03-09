import React, { useState } from 'react';
import { ArrowLeft, Save, Undo, Redo, UserPlus, Eye, BookOpen, User as UserIcon, Check, Loader2, Clock } from 'lucide-react';
import { BOARD_TYPES } from '../../utils/boardHelpers';
import ShareModal from './ShareModal';

const TYPE_BADGES = {
  [BOARD_TYPES.COURSE_MATERIAL]: { label: 'Course Material', color: 'bg-indigo-100 text-indigo-700' },
  [BOARD_TYPES.LECTURE_NOTES]: { label: 'Course Material', color: 'bg-indigo-100 text-indigo-700' }, // legacy
  [BOARD_TYPES.STUDENT_NOTES]: { label: 'Student Notes', color: 'bg-emerald-100 text-emerald-700' },
  [BOARD_TYPES.STUDY_PLANNER]: { label: 'Study Planner', color: 'bg-teal-100 text-teal-700' },
  [BOARD_TYPES.KANBAN]: { label: 'Kanban', color: 'bg-cyan-100 text-cyan-700' },
  [BOARD_TYPES.QUIZ]: { label: 'Quiz', color: 'bg-rose-100 text-rose-700' },
};

export default function BoardHeader({
  boardName,
  boardType,
  boardId,
  isDirty,
  canEdit = true,
  canUndo,
  canRedo,
  courseName,
  sectionName,
  saveStatus,
  onNameChange,
  onUndo,
  onRedo,
  onSave,
  onBack,
  onShowVersionHistory,
}) {
  const badge = TYPE_BADGES[boardType];
  const [showShareModal, setShowShareModal] = useState(false);
  const isPersonal = !courseName;

  return (
    <>
      <header className="bg-white border-b px-4 py-2 flex items-center justify-between flex-shrink-0 z-30">
        <div className="flex items-center space-x-3">
          <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-lg transition active:scale-95" title="Back" aria-label="Go back">
            <ArrowLeft className="h-5 w-5" />
          </button>
          {/* Context badge: course or personal */}
          {isPersonal ? (
            <span className="flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
              <UserIcon className="h-3 w-3" />
              <span>Personal Board</span>
            </span>
          ) : (
            <span className="flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">
              <BookOpen className="h-3 w-3" />
              <span>{courseName}{sectionName ? ` / ${sectionName}` : ''}</span>
            </span>
          )}
          {canEdit ? (
            <input
              type="text"
              value={boardName}
              onChange={(e) => onNameChange(e.target.value)}
              className="font-semibold text-lg border-none focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded px-2 py-1"
            />
          ) : (
            <span className="font-semibold text-lg px-2 py-1">{boardName}</span>
          )}
          {badge && (
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${badge.color}`}>
              {badge.label}
            </span>
          )}
          {!canEdit && (
            <span className="flex items-center space-x-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
              <Eye className="h-3 w-3" />
              <span>View Only</span>
            </span>
          )}
          {/* Save status / unsaved indicator */}
          {canEdit && saveStatus === 'saving' && (
            <span className="flex items-center space-x-1.5 text-xs text-blue-600">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>Saving...</span>
            </span>
          )}
          {canEdit && saveStatus === 'saved' && (
            <span className="flex items-center space-x-1.5 text-xs text-green-600">
              <Check className="w-3 h-3" />
              <span>Saved</span>
            </span>
          )}
          {canEdit && saveStatus === 'error' && (
            <span className="flex items-center space-x-1.5 text-xs text-red-600">
              <span>Save failed</span>
            </span>
          )}
          {canEdit && isDirty && saveStatus !== 'saving' && saveStatus !== 'saved' && (
            <span className="flex items-center space-x-1.5 text-xs text-amber-600">
              <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
              <span>Unsaved changes</span>
            </span>
          )}
        </div>

        <div className="flex items-center space-x-2">
          {canEdit && (
            <>
              <button
                onClick={onUndo}
                disabled={!canUndo}
                className={`p-2 rounded-lg ${canUndo ? 'hover:bg-gray-100' : 'opacity-50'}`}
                title="Undo (Ctrl+Z)"
                aria-label="Undo"
              >
                <Undo className="h-5 w-5" />
              </button>
              <button
                onClick={onRedo}
                disabled={!canRedo}
                className={`p-2 rounded-lg ${canRedo ? 'hover:bg-gray-100' : 'opacity-50'}`}
                title="Redo (Ctrl+Y)"
                aria-label="Redo"
              >
                <Redo className="h-5 w-5" />
              </button>
              <div className="w-px h-6 bg-gray-300 mx-2" />
              <button
                onClick={() => setShowShareModal(true)}
                className="p-2 hover:bg-gray-100 rounded-lg flex items-center space-x-1"
                title="Invite Members"
              >
                <UserPlus className="h-5 w-5" />
                <span className="text-sm hidden sm:inline">Invite</span>
              </button>
              {onShowVersionHistory && (
                <button
                  onClick={onShowVersionHistory}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                  title="Version History"
                  aria-label="Version History"
                >
                  <Clock className="h-5 w-5" />
                </button>
              )}
            </>
          )}
          {canEdit && (
            <button
              onClick={onSave}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition active:scale-95 flex items-center space-x-1"
            >
              <Save className="h-4 w-4" />
              <span>Save</span>
            </button>
          )}
        </div>
      </header>

      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        boardId={boardId}
        boardName={boardName}
      />
    </>
  );
}
