import React, { useEffect, useCallback, useState, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { BoardProvider, useBoard } from '../contexts/BoardContext';
import { useAutoSave } from '../hooks/useAutoSave';
import { useAuth } from '../contexts/AuthContext';
import { BOARD_TYPES } from '../utils/boardHelpers';
import { createEmptyBoard } from '../utils/mockData';
import { createBoardFromTemplate } from '../utils/templateDefinitions';
import { boardsApi } from '../services/api';
import { setMediaBoardId } from '../utils/media';
import { saveGuestBoard, getGuestBoardById } from '../utils/guestStorage';
import BoardHeader from '../components/board/BoardHeader';
import LectureNotesBoard from '../components/board/LectureNotesBoard';
import StudentNotesBoard from '../components/board/StudentNotesBoard';
import StudyPlannerBoard from '../components/board/StudyPlannerBoard';
import KanbanBoard from '../components/board/KanbanBoard';
import QuizBoard from '../components/board/QuizBoard';
import InteractionPanel from '../components/board/InteractionPanel';
import VersionHistoryPanel from '../components/board/VersionHistoryPanel';
import { ClassroomShell, ClassroomDialog, ClassroomButton } from '../components/classroom';
import cx from '../components/classroom/cx';

// Canvas: wall colour with the 16 px dot grid (--canvas-dot). Static class string, so Tailwind sees it.
const CANVAS = 'bg-wall bg-[image:radial-gradient(var(--canvas-dot)_1px,transparent_1px)] bg-[length:16px_16px]';

function WorkspaceContent({ onNavigate }) {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const boardId = searchParams.get('boardId');
  const templateType = searchParams.get('templateType');
  const courseId = searchParams.get('courseId');
  const sectionParam = searchParams.get('section');
  const { isGuest, user } = useAuth();

  const { board, isDirty, canEdit, canComment, canUndo, canRedo, loadBoard, setBoardName, setCanEdit, setCanComment, undo, redo, markSaved } = useBoard();

  const isLecturerOrAdmin = user?.role === 'lecturer' || user?.role === 'admin';
  const [courseName, setCourseName] = React.useState('');
  const [sectionName, setSectionName] = React.useState('');
  const [saveStatus, setSaveStatus] = useState('idle'); // 'idle' | 'saving' | 'saved' | 'error'
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const pendingNavigateRef = useRef(null);
  const savedTimerRef = useRef(null);

  useEffect(() => {
    const fetchBoard = async () => {
      setMediaBoardId(null);
      // Try loading existing board by ID
      if (boardId) {
        // Guest boards stored locally: try localStorage first, then fall through to API
        if (isGuest) {
          const guestBoard = getGuestBoardById(boardId);
          if (guestBoard) {
            loadBoard(guestBoard);
            return;
          }
        }

        // Load from API (for authenticated users AND guests accessing shared boards)
        try {
          const response = await boardsApi.get(boardId);
          const serverBoard = response.data;
          // uploaded files embedded in this board are authorised through the board (see utils/media.js)
          setMediaBoardId(serverBoard.id);

          // Set permissions from server response
          setCanEdit(serverBoard.can_edit !== false);
          setCanComment(serverBoard.can_comment !== false);
          if (serverBoard.course_name) setCourseName(serverBoard.course_name);
          if (serverBoard.section) setSectionName(serverBoard.section);

          // Always trust serverBoard.board_type from the database over content.type
          const resolvedType = serverBoard.board_type || serverBoard.content?.type || 'course-material';
          const boardData = serverBoard.content && Object.keys(serverBoard.content).length > 0
            ? {
                ...serverBoard.content,
                id: serverBoard.id,
                name: serverBoard.content.name || serverBoard.name,
                type: resolvedType,
                board_type: serverBoard.board_type,
                updated_at: serverBoard.updated_at,
              }
            : {
                id: serverBoard.id,
                name: serverBoard.name,
                type: resolvedType,
                board_type: serverBoard.board_type,
                course_name: serverBoard.course_name,
                updated_at: serverBoard.updated_at,
              };

          // If template type is provided and content is empty, create from template
          if (templateType && (!serverBoard.content || Object.keys(serverBoard.content).length === 0)) {
            const templateBoard = createBoardFromTemplate(templateType);
            if (templateBoard) {
              templateBoard.id = serverBoard.id;
              loadBoard(templateBoard);
              return;
            }
          }

          loadBoard(boardData);
          return;
        } catch (err) {
          console.error('Failed to load board from API:', err);
        }
      }

      // Create from template
      if (templateType) {
        const newBoard = createBoardFromTemplate(templateType);
        if (newBoard) {
          loadBoard(newBoard);
          return;
        }
      }

      // Default: create empty course material board
      loadBoard(createEmptyBoard(BOARD_TYPES.COURSE_MATERIAL));
    };

    fetchBoard();
  }, [boardId, templateType, loadBoard, isGuest]);

  const handleSave = useCallback(async () => {
    if (!board) return;

    if (isGuest) {
      saveGuestBoard(board);
      markSaved();
      setSaveStatus('saved');
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
      savedTimerRef.current = setTimeout(() => setSaveStatus('idle'), 2000);
      return;
    }

    setSaveStatus('saving');
    try {
      if (board.id && typeof board.id === 'number') {
        await boardsApi.update(board.id, {
          name: board.name,
          content: board,
          board_type: board.type || board.board_type || 'course-material',
        });
      } else {
        const createData = {
          name: board.name || 'Untitled Board',
          content: board,
          board_type: board.type || board.board_type || 'course-material',
        };
        if (courseId) createData.course = parseInt(courseId);
        if (sectionParam) createData.section = sectionParam;
        const response = await boardsApi.create(createData);
        board.id = response.data.id;
      }
      markSaved();
      setSaveStatus('saved');
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
      savedTimerRef.current = setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (err) {
      console.error('Failed to save board:', err);
      setSaveStatus('error');
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
      savedTimerRef.current = setTimeout(() => setSaveStatus('idle'), 3000);
    }
  }, [board, markSaved, isGuest, courseId, sectionParam]);

  // Auto-save
  useAutoSave(isDirty ? board : null, handleSave);

  // Warn before leaving with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z') { e.preventDefault(); undo(); }
        if (e.key === 'y') { e.preventDefault(); redo(); }
        if (e.key === 's') { e.preventDefault(); handleSave(); }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, handleSave]);

  // Skeleton of the header and canvas while the board loads. Announced once through the status region.
  if (!board) {
    return (
      <ClassroomShell embedded className="flex h-screen flex-col overflow-hidden bg-wall">
        <div role="status" aria-busy="true" className="flex h-10 flex-shrink-0 items-center border-b-4 border-wood bg-surface px-3">
          <span className="sr-only">Loading board</span>
          <div aria-hidden="true" className="h-6 w-56 max-w-full rounded bg-line" />
        </div>
        <div aria-hidden="true" className={cx('flex-1 p-4', CANVAS)}>
          <div className="h-24 w-full max-w-xl rounded border border-line bg-surface" />
        </div>
      </ClassroomShell>
    );
  }

  const renderBoard = () => {
    switch (board.type) {
      case BOARD_TYPES.COURSE_MATERIAL:
      case BOARD_TYPES.LECTURE_NOTES: // legacy
        return <LectureNotesBoard />;
      case BOARD_TYPES.STUDENT_NOTES:
        return <StudentNotesBoard />;
      case BOARD_TYPES.STUDY_PLANNER:
        return <StudyPlannerBoard />;
      case BOARD_TYPES.KANBAN:
        return <KanbanBoard />;
      case BOARD_TYPES.QUIZ:
        return <QuizBoard />;
      default:
        return (
          <div className="flex h-full items-center justify-center text-ink-2">
            Unknown board type: {board.type}
          </div>
        );
    }
  };

  return (
    <ClassroomShell embedded className="flex h-screen flex-col overflow-hidden bg-wall">
      <BoardHeader
        boardName={board.name}
        boardType={board.type}
        boardId={board.id}
        isDirty={isDirty}
        canEdit={canEdit}
        canUndo={canUndo}
        canRedo={canRedo}
        courseName={courseName}
        sectionName={sectionName}
        saveStatus={saveStatus}
        onNameChange={setBoardName}
        onUndo={undo}
        onRedo={redo}
        onSave={handleSave}
        onShowVersionHistory={board.id && typeof board.id === 'number' ? () => setShowVersionHistory(true) : undefined}
        onBack={() => {
          const dest = user?.role === 'lecturer' ? 'lecturer-boards' : user?.role === 'admin' ? 'admin' : 'dashboard';
          if (isDirty) {
            pendingNavigateRef.current = dest;
            setShowLeaveModal(true);
          } else {
            onNavigate(dest);
          }
        }}
      />
      <div className="flex-1 flex overflow-hidden">
        <main className={cx('flex-1 overflow-auto', CANVAS)}>
          {renderBoard()}
        </main>
        {isLecturerOrAdmin && (
          <InteractionPanel />
        )}
      </div>

      {/* Version History Panel */}
      <VersionHistoryPanel
        isOpen={showVersionHistory}
        onClose={() => setShowVersionHistory(false)}
        boardId={board.id}
        onRestore={(restoredBoard) => {
          setShowVersionHistory(false);
          if (restoredBoard?.content) {
            const boardData = {
              ...restoredBoard.content,
              id: restoredBoard.id,
              name: restoredBoard.content.name || restoredBoard.name,
              type: restoredBoard.board_type || restoredBoard.content.type || 'course-material',
              board_type: restoredBoard.board_type,
              updated_at: restoredBoard.updated_at,
            };
            loadBoard(boardData);
          }
        }}
      />

      {/* Unsaved changes confirmation: shared dialog (focus in, Escape closes, focus returns to the opener) */}
      {showLeaveModal && (
        <ClassroomDialog
          titleId="leave-board-title"
          title="Unsaved Changes"
          onClose={() => setShowLeaveModal(false)}
          size="md"
          footer={(
            <>
              <ClassroomButton
                variant="primary"
                className="w-full sm:w-auto"
                onClick={async () => {
                  await handleSave();
                  setShowLeaveModal(false);
                  if (pendingNavigateRef.current) onNavigate(pendingNavigateRef.current);
                }}
              >
                Save & Leave
              </ClassroomButton>
              <ClassroomButton
                variant="danger"
                className="w-full sm:w-auto"
                onClick={() => {
                  setShowLeaveModal(false);
                  if (pendingNavigateRef.current) onNavigate(pendingNavigateRef.current);
                }}
              >
                Leave Without Saving
              </ClassroomButton>
              <ClassroomButton variant="secondary" className="w-full sm:w-auto" onClick={() => setShowLeaveModal(false)}>
                Cancel
              </ClassroomButton>
            </>
          )}
        >
          <p className="text-sm text-ink">You have unsaved changes that will be lost if you leave without saving.</p>
        </ClassroomDialog>
      )}
    </ClassroomShell>
  );
}

function WorkspacePage({ onNavigate }) {
  return (
    <BoardProvider>
      <WorkspaceContent onNavigate={onNavigate} />
    </BoardProvider>
  );
}

export default WorkspacePage;
