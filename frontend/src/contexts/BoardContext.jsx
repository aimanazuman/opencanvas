import React, { createContext, useContext, useReducer, useCallback } from 'react';
import { createComment } from '../utils/boardHelpers';

const BoardContext = createContext(null);

const HISTORY_LIMIT = 50;

const initialState = {
  board: null,
  isDirty: false,
  canEdit: true,
  canComment: true,
  history: [],
  historyIndex: -1,
};

function boardReducer(state, action) {
  switch (action.type) {
    case 'LOAD_BOARD': {
      const board = action.payload;
      return {
        ...state,
        board,
        isDirty: false,
        history: [JSON.parse(JSON.stringify(board))],
        historyIndex: 0,
      };
    }

    case 'UPDATE_BOARD': {
      const updatedBoard = { ...state.board, ...action.payload, updated_at: new Date().toISOString() };
      const newHistory = state.history.slice(0, state.historyIndex + 1);
      newHistory.push(JSON.parse(JSON.stringify(updatedBoard)));
      if (newHistory.length > HISTORY_LIMIT) newHistory.shift();
      return {
        ...state,
        board: updatedBoard,
        isDirty: true,
        history: newHistory,
        historyIndex: newHistory.length - 1,
      };
    }

    case 'SET_BOARD_NAME':
      return {
        ...state,
        board: { ...state.board, name: action.payload },
        isDirty: true,
      };

    case 'UPDATE_SECTIONS': {
      const updatedBoard = { ...state.board, sections: action.payload, updated_at: new Date().toISOString() };
      const newHistory = state.history.slice(0, state.historyIndex + 1);
      newHistory.push(JSON.parse(JSON.stringify(updatedBoard)));
      if (newHistory.length > HISTORY_LIMIT) newHistory.shift();
      return {
        ...state,
        board: updatedBoard,
        isDirty: true,
        history: newHistory,
        historyIndex: newHistory.length - 1,
      };
    }

    case 'UPDATE_COLUMNS': {
      const updatedBoard = { ...state.board, columns: action.payload, updated_at: new Date().toISOString() };
      const newHistory = state.history.slice(0, state.historyIndex + 1);
      newHistory.push(JSON.parse(JSON.stringify(updatedBoard)));
      if (newHistory.length > HISTORY_LIMIT) newHistory.shift();
      return {
        ...state,
        board: updatedBoard,
        isDirty: true,
        history: newHistory,
        historyIndex: newHistory.length - 1,
      };
    }

    case 'UPDATE_SCHEDULE':
      return {
        ...state,
        board: { ...state.board, schedule: action.payload, updated_at: new Date().toISOString() },
        isDirty: true,
      };

    case 'UPDATE_WEEKLY_GOALS':
      return {
        ...state,
        board: { ...state.board, weeklyGoals: action.payload, updated_at: new Date().toISOString() },
        isDirty: true,
      };

    case 'ADD_COMMENT': {
      const { blockId, comment } = action.payload;
      const comments = { ...state.board.comments };
      if (!comments[blockId]) comments[blockId] = [];
      comments[blockId] = [...comments[blockId], comment];
      return {
        ...state,
        board: { ...state.board, comments },
        isDirty: true,
      };
    }

    case 'UNDO': {
      if (state.historyIndex <= 0) return state;
      const newIndex = state.historyIndex - 1;
      return {
        ...state,
        board: JSON.parse(JSON.stringify(state.history[newIndex])),
        historyIndex: newIndex,
        isDirty: true,
      };
    }

    case 'REDO': {
      if (state.historyIndex >= state.history.length - 1) return state;
      const newIndex = state.historyIndex + 1;
      return {
        ...state,
        board: JSON.parse(JSON.stringify(state.history[newIndex])),
        historyIndex: newIndex,
        isDirty: true,
      };
    }

    case 'MARK_SAVED':
      return { ...state, isDirty: false };

    case 'ADD_PERSONAL_NOTE': {
      const { blockId, note, userId } = action.payload;
      const personalNotes = { ...(state.board.personalNotes || {}) };
      const key = `${userId}_${blockId}`;
      personalNotes[key] = note;
      return {
        ...state,
        board: { ...state.board, personalNotes },
        isDirty: true,
      };
    }

    case 'REMOVE_PERSONAL_NOTE': {
      const { blockId: rmBlockId, userId: rmUserId } = action.payload;
      const pNotes = { ...(state.board.personalNotes || {}) };
      delete pNotes[`${rmUserId}_${rmBlockId}`];
      return {
        ...state,
        board: { ...state.board, personalNotes: pNotes },
        isDirty: true,
      };
    }

    case 'TOGGLE_BOOKMARK': {
      const { blockId: bmBlockId, userId: bmUserId } = action.payload;
      const bookmarks = { ...(state.board.bookmarks || {}) };
      if (!bookmarks[bmUserId]) bookmarks[bmUserId] = [];
      const idx = bookmarks[bmUserId].indexOf(bmBlockId);
      if (idx >= 0) {
        bookmarks[bmUserId] = bookmarks[bmUserId].filter(id => id !== bmBlockId);
      } else {
        bookmarks[bmUserId] = [...bookmarks[bmUserId], bmBlockId];
      }
      return {
        ...state,
        board: { ...state.board, bookmarks },
        isDirty: true,
      };
    }

    case 'RECORD_INTERACTION': {
      const { user: interUser, actionType } = action.payload;
      if (!interUser || !state.board?.trackInteractions) return state;
      const interactions = state.board.interactions || {};
      const existing = interactions[interUser.id] || { name: '', actions: [] };
      const entry = { type: actionType, timestamp: new Date().toISOString() };
      return {
        ...state,
        board: {
          ...state.board,
          interactions: {
            ...interactions,
            [interUser.id]: {
              name: `${interUser.first_name || ''} ${interUser.last_name || ''}`.trim() || interUser.username,
              actions: [...existing.actions, entry],
              lastAction: entry.timestamp,
            },
          },
        },
        isDirty: true,
      };
    }

    case 'SET_TRACK_INTERACTIONS':
      return {
        ...state,
        board: { ...state.board, trackInteractions: action.payload },
        isDirty: true,
      };

    case 'SET_CAN_EDIT':
      return { ...state, canEdit: action.payload };

    case 'SET_CAN_COMMENT':
      return { ...state, canComment: action.payload };

    default:
      return state;
  }
}

export function BoardProvider({ children }) {
  const [state, dispatch] = useReducer(boardReducer, initialState);

  const loadBoard = useCallback((board) => {
    dispatch({ type: 'LOAD_BOARD', payload: board });
  }, []);

  const updateBoard = useCallback((updates) => {
    dispatch({ type: 'UPDATE_BOARD', payload: updates });
  }, []);

  const setBoardName = useCallback((name) => {
    dispatch({ type: 'SET_BOARD_NAME', payload: name });
  }, []);

  const updateSections = useCallback((sections) => {
    dispatch({ type: 'UPDATE_SECTIONS', payload: sections });
  }, []);

  const updateColumns = useCallback((columns) => {
    dispatch({ type: 'UPDATE_COLUMNS', payload: columns });
  }, []);

  const updateSchedule = useCallback((schedule) => {
    dispatch({ type: 'UPDATE_SCHEDULE', payload: schedule });
  }, []);

  const updateWeeklyGoals = useCallback((goals) => {
    dispatch({ type: 'UPDATE_WEEKLY_GOALS', payload: goals });
  }, []);

  const addComment = useCallback((blockId, text, user) => {
    const comment = createComment(text, user);
    dispatch({ type: 'ADD_COMMENT', payload: { blockId, comment } });
  }, []);

  const addBlockToSection = useCallback((sectionId, block) => {
    if (!state.board?.sections) return;
    const sections = state.board.sections.map(s =>
      s.id === sectionId ? { ...s, blocks: [...s.blocks, block] } : s
    );
    dispatch({ type: 'UPDATE_SECTIONS', payload: sections });
  }, [state.board]);

  const updateBlockInSection = useCallback((sectionId, blockId, updates) => {
    if (!state.board?.sections) return;
    const sections = state.board.sections.map(s =>
      s.id === sectionId
        ? {
            ...s,
            blocks: s.blocks.map(b =>
              b.id === blockId ? { ...b, ...updates, updatedAt: new Date().toISOString() } : b
            ),
          }
        : s
    );
    dispatch({ type: 'UPDATE_SECTIONS', payload: sections });
  }, [state.board]);

  const removeBlockFromSection = useCallback((sectionId, blockId) => {
    if (!state.board?.sections) return;
    const sections = state.board.sections.map(s =>
      s.id === sectionId ? { ...s, blocks: s.blocks.filter(b => b.id !== blockId) } : s
    );
    dispatch({ type: 'UPDATE_SECTIONS', payload: sections });
  }, [state.board]);

  const addPersonalNote = useCallback((blockId, note, userId) => {
    dispatch({ type: 'ADD_PERSONAL_NOTE', payload: { blockId, note, userId } });
  }, []);

  const removePersonalNote = useCallback((blockId, userId) => {
    dispatch({ type: 'REMOVE_PERSONAL_NOTE', payload: { blockId, userId } });
  }, []);

  const toggleBookmark = useCallback((blockId, userId) => {
    dispatch({ type: 'TOGGLE_BOOKMARK', payload: { blockId, userId } });
  }, []);

  const recordInteraction = useCallback((user, actionType) => {
    dispatch({ type: 'RECORD_INTERACTION', payload: { user, actionType } });
  }, []);

  const setTrackInteractions = useCallback((enabled) => {
    dispatch({ type: 'SET_TRACK_INTERACTIONS', payload: enabled });
  }, []);

  const setCanEdit = useCallback((canEdit) => {
    dispatch({ type: 'SET_CAN_EDIT', payload: canEdit });
  }, []);

  const setCanComment = useCallback((canComment) => {
    dispatch({ type: 'SET_CAN_COMMENT', payload: canComment });
  }, []);

  const getPersonalNote = useCallback((blockId, userId) => {
    return state.board?.personalNotes?.[`${userId}_${blockId}`] || null;
  }, [state.board]);

  const isBookmarked = useCallback((blockId, userId) => {
    return (state.board?.bookmarks?.[userId] || []).includes(blockId);
  }, [state.board]);

  const getBookmarkedBlockIds = useCallback((userId) => {
    return state.board?.bookmarks?.[userId] || [];
  }, [state.board]);

  const undo = useCallback(() => dispatch({ type: 'UNDO' }), []);
  const redo = useCallback(() => dispatch({ type: 'REDO' }), []);
  const markSaved = useCallback(() => dispatch({ type: 'MARK_SAVED' }), []);

  const canUndo = state.historyIndex > 0;
  const canRedo = state.historyIndex < state.history.length - 1;

  const value = {
    board: state.board,
    isDirty: state.isDirty,
    canEdit: state.canEdit,
    canComment: state.canComment,
    canUndo,
    canRedo,
    loadBoard,
    updateBoard,
    setBoardName,
    updateSections,
    updateColumns,
    updateSchedule,
    updateWeeklyGoals,
    addComment,
    addBlockToSection,
    updateBlockInSection,
    removeBlockFromSection,
    addPersonalNote,
    removePersonalNote,
    toggleBookmark,
    getPersonalNote,
    isBookmarked,
    getBookmarkedBlockIds,
    recordInteraction,
    setTrackInteractions,
    setCanEdit,
    setCanComment,
    undo,
    redo,
    markSaved,
  };

  return (
    <BoardContext.Provider value={value}>
      {children}
    </BoardContext.Provider>
  );
}

export function useBoard() {
  const context = useContext(BoardContext);
  if (!context) {
    throw new Error('useBoard must be used within a BoardProvider');
  }
  return context;
}

export default BoardContext;
