/**
 * Board interaction tracking utility.
 * Stores interactions in board content JSON — no backend changes needed.
 *
 * Board JSON shape:
 * {
 *   trackInteractions: boolean,
 *   interactions: {
 *     [userId]: {
 *       name: string,
 *       actions: [{ type: string, timestamp: string }],
 *       lastAction: string (ISO8601)
 *     }
 *   }
 * }
 */

/**
 * Record an interaction for a user.
 * Returns a new interactions object (immutable).
 */
export function recordInteraction(interactions, user, actionType) {
  if (!user) return interactions;
  const existing = interactions[user.id] || { name: '', actions: [] };
  const entry = {
    type: actionType,
    timestamp: new Date().toISOString(),
  };
  return {
    ...interactions,
    [user.id]: {
      name: `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username,
      actions: [...existing.actions, entry],
      lastAction: entry.timestamp,
    },
  };
}

/**
 * Get a summary of interactions for a board.
 */
export function getInteractionSummary(board) {
  const interactions = board?.interactions || {};
  const users = Object.entries(interactions);
  const totalActions = users.reduce((sum, [, data]) => sum + data.actions.length, 0);

  return {
    totalUsers: users.length,
    totalActions,
    users: users.map(([userId, data]) => ({
      userId: Number(userId),
      name: data.name,
      actionCount: data.actions.length,
      lastAction: data.lastAction,
      actionTypes: [...new Set(data.actions.map(a => a.type))],
    })).sort((a, b) => new Date(b.lastAction) - new Date(a.lastAction)),
  };
}

/**
 * Get enrolled students who have not interacted with the board.
 */
export function getUsersWithoutInteraction(board, enrolledStudents) {
  const interactions = board?.interactions || {};
  const interactedIds = new Set(Object.keys(interactions).map(Number));
  return enrolledStudents.filter(s => !interactedIds.has(s.id));
}
