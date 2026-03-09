import React, { useEffect, useCallback, useState, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { BoardProvider, useBoard } from '../contexts/BoardContext';
import { useAutoSave } from '../hooks/useAutoSave';
import { useAuth } from '../contexts/AuthContext';
import { BOARD_TYPES } from '../utils/boardHelpers';
import { createEmptyBoard } from '../utils/mockData';
import { createBoardFromTemplate } from '../utils/templateDefinitions';
import { boardsApi } from '../services/api';
import { saveGuestBoard, getGuestBoardById } from '../utils/guestStorage';
import BoardHeader from '../components/board/BoardHeader';
import LectureNotesBoard from '../components/board/LectureNotesBoard';
import StudentNotesBoard from '../components/board/StudentNotesBoard';
import StudyPlannerBoard from '../components/board/StudyPlannerBoard';
import KanbanBoard from '../components/board/KanbanBoard';
import QuizBoard from '../components/board/QuizBoard';
import InteractionPanel from '../components/board/InteractionPanel';
import VersionHistoryPanel from '../components/board/VersionHistoryPanel';
import { AlertTriangle } from 'lucide-react';

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
      // Try loading existing board by ID
      if (boardId) {
        if (isGuest) {
          // Guest: load from localStorage
          const guestBoard = getGuestBoardById(boardId);
          if (guestBoard) {
            loadBoard(guestBoard);
            return;
          }
        } else {
          // Authenticated: load from API
          try {
            const response = await boardsApi.get(boardId);
            const serverBoard = response.data;

            // Set permissions from server response
            setCanEdit(serverBoard.can_edit !== false);
            setCanComment(serverBoard.can_comment !== false);
            if (serverBoard.course_name) setCourseName(serverBoard.course_name);
            if (serverBoard.section) setSectionName(serverBoard.section);

            // If board has content with board data, use content as the board
            // Otherwise, construct from server fields
            const boardData = serverBoard.content && Object.keys(serverBoard.content).length > 0
              ? {
                  ...serverBoard.content,
                  id: serverBoard.id,
                  name: serverBoard.content.name || serverBoard.name,
                  type: serverBoard.content.type || serverBoard.board_type || 'course-material',
                  board_type: serverBoard.board_type,
                  updated_at: serverBoard.updated_at,
                }
              : {
                  id: serverBoard.id,
                  name: serverBoard.name,
                  type: serverBoard.board_type || 'course-material',
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

  if (!board) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
      </div>
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
          <div className="flex items-center justify-center h-full text-gray-500">
            Unknown board type: {board.type}
          </div>
        );
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50 overflow-hidden">
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
        <main className="flex-1 overflow-auto">
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
              type: restoredBoard.content.type || restoredBoard.board_type || 'course-material',
              board_type: restoredBoard.board_type,
              updated_at: restoredBoard.updated_at,
            };
            loadBoard(boardData);
          }
        }}
      />

      {/* Unsaved changes confirmation modal */}
      {showLeaveModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-backdropFade" role="dialog" aria-modal="true" onKeyDown={(e) => { if (e.key === 'Escape') setShowLeaveModal(false); }}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md animate-scaleIn">
            <div className="p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">Unsaved Changes</h3>
              </div>
              <p className="text-gray-600 mb-6">You have unsaved changes that will be lost if you leave without saving.</p>
              <div className="flex flex-col space-y-2">
                <button
                  onClick={async () => {
                    await handleSave();
                    setShowLeaveModal(false);
                    if (pendingNavigateRef.current) onNavigate(pendingNavigateRef.current);
                  }}
                  className="w-full px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-medium"
                >
                  Save & Leave
                </button>
                <button
                  onClick={() => {
                    setShowLeaveModal(false);
                    if (pendingNavigateRef.current) onNavigate(pendingNavigateRef.current);
                  }}
                  className="w-full px-4 py-2.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition font-medium"
                >
                  Leave Without Saving
                </button>
                <button
                  onClick={() => setShowLeaveModal(false)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
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
