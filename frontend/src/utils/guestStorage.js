const GUEST_BOARDS_KEY = 'opencanvas_guest_boards';

export function saveGuestBoard(board) {
  const boards = getGuestBoards();
  const index = boards.findIndex(b => b.id === board.id);
  const updatedBoard = { ...board, updated_at: new Date().toISOString() };

  if (index >= 0) {
    boards[index] = updatedBoard;
  } else {
    boards.push(updatedBoard);
  }

  localStorage.setItem(GUEST_BOARDS_KEY, JSON.stringify(boards));
  return updatedBoard;
}

export function getGuestBoards() {
  try {
    const data = localStorage.getItem(GUEST_BOARDS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function getGuestBoardById(id) {
  const boards = getGuestBoards();
  return boards.find(b => b.id === id) || null;
}

export function deleteGuestBoard(id) {
  const boards = getGuestBoards().filter(b => b.id !== id);
  localStorage.setItem(GUEST_BOARDS_KEY, JSON.stringify(boards));
}

export function clearGuestBoards() {
  localStorage.removeItem(GUEST_BOARDS_KEY);
}

export function generateGuestDisplayName() {
  const suffix = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `Guest_${suffix}`;
}
