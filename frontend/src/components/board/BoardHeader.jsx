import React, { useState } from 'react';
import {
  ArrowLeft, Save, Undo, Redo, UserPlus, Eye, BookOpen, User as UserIcon, Check, Loader2, Clock, AlertCircle, Circle,
  FileText, StickyNote, CalendarDays, Kanban, ListChecks,
} from 'lucide-react';
import { BOARD_TYPES } from '../../utils/boardHelpers';
import ShareModal from './ShareModal';
import Button from '../ui/Button';
import ChalkBadge from '../classroom/ChalkBadge';

// Static lookup maps: Tailwind only sees literal class names. Type and status are always label plus icon.
const TYPE_BADGES = {
  [BOARD_TYPES.COURSE_MATERIAL]: { label: 'Course Material', icon: FileText },
  [BOARD_TYPES.LECTURE_NOTES]: { label: 'Course Material', icon: FileText }, // legacy
  [BOARD_TYPES.STUDENT_NOTES]: { label: 'Student Notes', icon: StickyNote },
  [BOARD_TYPES.STUDY_PLANNER]: { label: 'Study Planner', icon: CalendarDays },
  [BOARD_TYPES.KANBAN]: { label: 'Kanban', icon: Kanban },
  [BOARD_TYPES.QUIZ]: { label: 'Quiz', icon: ListChecks },
};

const SAVE_STATE = {
  saving: { label: 'Saving...', icon: Loader2, tone: 'neutral', iconClassName: 'motion-safe:animate-spin' },
  saved: { label: 'Saved', icon: Check, tone: 'success' },
  error: { label: 'Save failed', icon: AlertCircle, tone: 'danger' },
  unsaved: { label: 'Unsaved changes', icon: Circle, tone: 'warning' },
};

// Title: the UI font in both states (read-only span and editable input), so the font does not change on edit.
// Short names keep the larger size; names of 40 characters or more are smaller.
const TITLE_FONT = { short: 'font-sans text-lg font-semibold', long: 'font-sans text-sm font-medium' };
const TITLE_INPUT = 'h-11 md:h-8 w-48 max-w-full min-w-0 rounded border border-transparent bg-transparent px-2 text-ink hover:border-line focus:border-accent';

// 44 px on phones, 32 px on desktop.
const ICON_BTN = 'flex h-11 w-11 flex-none items-center justify-center rounded text-ink hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-50 md:h-8 md:w-8';

// Same rules as before: nothing while read-only; "Unsaved changes" also shows next to a failed save.
function saveBadges(canEdit, isDirty, saveStatus) {
  if (!canEdit) return [];
  const list = [];
  if (saveStatus === 'saving') list.push(SAVE_STATE.saving);
  if (saveStatus === 'saved') list.push(SAVE_STATE.saved);
  if (saveStatus === 'error') list.push(SAVE_STATE.error);
  if (isDirty && saveStatus !== 'saving' && saveStatus !== 'saved') list.push(SAVE_STATE.unsaved);
  return list;
}

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
  const titleFont = (boardName || '').length < 40 ? TITLE_FONT.short : TITLE_FONT.long;

  return (
    <>
      {/* Wood-toned bottom edge; the surface stays white and flat. */}
      <header className="z-30 flex flex-shrink-0 flex-wrap items-center justify-between gap-2 border-b-4 border-wood bg-surface px-3 py-1 md:h-10 md:flex-nowrap md:py-0">
        <div className="flex min-w-0 items-center gap-2">
          <button type="button" onClick={onBack} className={ICON_BTN} title="Back" aria-label="Go back">
            <ArrowLeft className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
          </button>
          {/* Context badge: course or personal */}
          {isPersonal ? (
            <ChalkBadge icon={UserIcon} label="Personal Board" />
          ) : (
            <ChalkBadge icon={BookOpen} label={`${courseName}${sectionName ? ` / ${sectionName}` : ''}`} />
          )}
          {canEdit ? (
            <input
              type="text"
              value={boardName}
              onChange={(e) => onNameChange(e.target.value)}
              aria-label="Board name"
              className={`${TITLE_INPUT} ${titleFont}`}
            />
          ) : (
            <span className={`flex h-11 items-center px-2 text-ink md:h-8 ${titleFont}`}>{boardName}</span>
          )}
          {badge && <ChalkBadge icon={badge.icon} label={badge.label} />}
          {!canEdit && <ChalkBadge icon={Eye} label="View Only" />}
          {/* Save status: icon plus text */}
          <span role="status" aria-live="polite" className="contents">
            {saveBadges(canEdit, isDirty, saveStatus).map((state) => (
              <ChalkBadge
                key={state.label}
                icon={state.icon}
                label={state.label}
                tone={state.tone}
                iconClassName={state.iconClassName}
              />
            ))}
          </span>
        </div>

        <div className="flex items-center gap-1">
          {canEdit && (
            <>
              <button
                type="button"
                onClick={onUndo}
                disabled={!canUndo}
                className={ICON_BTN}
                title="Undo (Ctrl+Z)"
                aria-label="Undo"
              >
                <Undo className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={onRedo}
                disabled={!canRedo}
                className={ICON_BTN}
                title="Redo (Ctrl+Y)"
                aria-label="Redo"
              >
                <Redo className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
              </button>
              <div className="mx-1 h-5 w-px bg-line" aria-hidden="true" />
              <Button variant="ghost" icon={UserPlus} onClick={() => setShowShareModal(true)} title="Invite Members">
                <span className="hidden sm:inline">Invite</span>
                <span className="sr-only sm:hidden">Invite</span>
              </Button>
              {onShowVersionHistory && (
                <button
                  type="button"
                  onClick={onShowVersionHistory}
                  className={ICON_BTN}
                  title="Version History"
                  aria-label="Version History"
                >
                  <Clock className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
                </button>
              )}
            </>
          )}
          {canEdit && (
            <Button variant="primary" icon={Save} onClick={onSave}>
              Save
            </Button>
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
