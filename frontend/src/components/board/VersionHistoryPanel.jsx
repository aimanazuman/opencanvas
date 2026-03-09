import React, { useState, useEffect, useMemo } from 'react';
import { X, Clock, RotateCcw, Loader2, AlertTriangle, ChevronDown, ChevronRight, Plus, Minus, Edit3 } from 'lucide-react';
import { boardsApi } from '../../services/api';

// Compare two version content objects and generate a human-readable change summary
function computeChanges(olderContent, newerContent) {
  if (!olderContent || !newerContent) return [];

  const changes = [];

  // Compare board name
  if (olderContent.name !== newerContent.name) {
    changes.push({ type: 'modified', category: 'Board', detail: `Renamed "${olderContent.name || 'Untitled'}" → "${newerContent.name || 'Untitled'}"` });
  }

  // Compare blocks/sections (generic content blocks)
  const oldBlocks = olderContent.blocks || [];
  const newBlocks = newerContent.blocks || [];
  const oldBlockIds = new Set(oldBlocks.map(b => b.id));
  const newBlockIds = new Set(newBlocks.map(b => b.id));

  const addedBlocks = newBlocks.filter(b => !oldBlockIds.has(b.id));
  const removedBlocks = oldBlocks.filter(b => !newBlockIds.has(b.id));
  const commonBlockIds = newBlocks.filter(b => oldBlockIds.has(b.id)).map(b => b.id);

  addedBlocks.forEach(b => {
    changes.push({ type: 'added', category: 'Block', detail: b.title || b.type || 'New block' });
  });
  removedBlocks.forEach(b => {
    changes.push({ type: 'removed', category: 'Block', detail: b.title || b.type || 'Removed block' });
  });

  // Check modified blocks
  commonBlockIds.forEach(id => {
    const oldBlock = oldBlocks.find(b => b.id === id);
    const newBlock = newBlocks.find(b => b.id === id);
    if (JSON.stringify(oldBlock) !== JSON.stringify(newBlock)) {
      const blockLabel = newBlock.title || newBlock.type || `Block ${id.substring(0, 6)}`;
      // Determine what changed
      const subChanges = [];
      if (oldBlock.title !== newBlock.title) subChanges.push('title');
      if (oldBlock.content !== newBlock.content) subChanges.push('content');
      if (JSON.stringify(oldBlock.items) !== JSON.stringify(newBlock.items)) subChanges.push('items');
      if (JSON.stringify(oldBlock.files) !== JSON.stringify(newBlock.files)) subChanges.push('files');
      const what = subChanges.length > 0 ? ` (${subChanges.join(', ')})` : '';
      changes.push({ type: 'modified', category: 'Block', detail: `${blockLabel}${what}` });
    }
  });

  // Compare columns (for kanban)
  const oldCols = olderContent.columns || [];
  const newCols = newerContent.columns || [];
  if (oldCols.length || newCols.length) {
    const oldColIds = new Set(oldCols.map(c => c.id));
    const newColIds = new Set(newCols.map(c => c.id));

    newCols.filter(c => !oldColIds.has(c.id)).forEach(c => {
      changes.push({ type: 'added', category: 'Column', detail: c.title || 'New column' });
    });
    oldCols.filter(c => !newColIds.has(c.id)).forEach(c => {
      changes.push({ type: 'removed', category: 'Column', detail: c.title || 'Removed column' });
    });

    // Check card changes within columns
    const oldCardsMap = {};
    const newCardsMap = {};
    oldCols.forEach(col => (col.cards || []).forEach(card => { oldCardsMap[card.id] = { ...card, column: col.title }; }));
    newCols.forEach(col => (col.cards || []).forEach(card => { newCardsMap[card.id] = { ...card, column: col.title }; }));

    Object.keys(newCardsMap).forEach(cardId => {
      if (!oldCardsMap[cardId]) {
        changes.push({ type: 'added', category: 'Card', detail: `"${newCardsMap[cardId].title || 'Untitled'}" in ${newCardsMap[cardId].column}` });
      } else if (JSON.stringify(oldCardsMap[cardId]) !== JSON.stringify(newCardsMap[cardId])) {
        const card = newCardsMap[cardId];
        if (oldCardsMap[cardId].column !== card.column) {
          changes.push({ type: 'modified', category: 'Card', detail: `Moved "${card.title || 'Untitled'}" to ${card.column}` });
        } else {
          changes.push({ type: 'modified', category: 'Card', detail: `"${card.title || 'Untitled'}" edited` });
        }
      }
    });
    Object.keys(oldCardsMap).forEach(cardId => {
      if (!newCardsMap[cardId]) {
        changes.push({ type: 'removed', category: 'Card', detail: `"${oldCardsMap[cardId].title || 'Untitled'}" from ${oldCardsMap[cardId].column}` });
      }
    });
  }

  // Compare quiz questions
  const oldQuestions = olderContent.questions || [];
  const newQuestions = newerContent.questions || [];
  if (oldQuestions.length || newQuestions.length) {
    const oldQIds = new Set(oldQuestions.map(q => q.id));
    const newQIds = new Set(newQuestions.map(q => q.id));

    newQuestions.filter(q => !oldQIds.has(q.id)).forEach(q => {
      changes.push({ type: 'added', category: 'Question', detail: q.text || 'New question' });
    });
    oldQuestions.filter(q => !newQIds.has(q.id)).forEach(q => {
      changes.push({ type: 'removed', category: 'Question', detail: q.text || 'Removed question' });
    });
    newQuestions.filter(q => oldQIds.has(q.id)).forEach(q => {
      const oldQ = oldQuestions.find(oq => oq.id === q.id);
      if (JSON.stringify(oldQ) !== JSON.stringify(q)) {
        changes.push({ type: 'modified', category: 'Question', detail: q.text || 'Modified question' });
      }
    });
  }

  // Compare quiz settings
  if (olderContent.quizSettings && newerContent.quizSettings) {
    if (JSON.stringify(olderContent.quizSettings) !== JSON.stringify(newerContent.quizSettings)) {
      changes.push({ type: 'modified', category: 'Settings', detail: 'Quiz settings changed' });
    }
  }

  // Compare sections (study planner etc)
  const oldSections = olderContent.sections || {};
  const newSections = newerContent.sections || {};
  if (typeof oldSections === 'object' && typeof newSections === 'object') {
    const allKeys = new Set([...Object.keys(oldSections), ...Object.keys(newSections)]);
    let sectionChanges = 0;
    allKeys.forEach(key => {
      if (!oldSections[key] && newSections[key]) sectionChanges++;
      else if (oldSections[key] && !newSections[key]) sectionChanges++;
      else if (JSON.stringify(oldSections[key]) !== JSON.stringify(newSections[key])) sectionChanges++;
    });
    if (sectionChanges > 0) {
      changes.push({ type: 'modified', category: 'Sections', detail: `${sectionChanges} section${sectionChanges > 1 ? 's' : ''} changed` });
    }
  }

  // If nothing detected but content is different
  if (changes.length === 0 && JSON.stringify(olderContent) !== JSON.stringify(newerContent)) {
    changes.push({ type: 'modified', category: 'Content', detail: 'Board content updated' });
  }

  return changes;
}

const CHANGE_ICONS = {
  added: Plus,
  removed: Minus,
  modified: Edit3,
};

const CHANGE_COLORS = {
  added: 'text-green-600 bg-green-50',
  removed: 'text-red-600 bg-red-50',
  modified: 'text-blue-600 bg-blue-50',
};

function ChangesList({ changes }) {
  if (!changes || changes.length === 0) return null;

  return (
    <div className="mt-2 space-y-1">
      {changes.map((change, i) => {
        const Icon = CHANGE_ICONS[change.type] || Edit3;
        const colorClass = CHANGE_COLORS[change.type] || 'text-gray-600 bg-gray-50';
        return (
          <div key={i} className="flex items-start space-x-1.5 text-xs">
            <span className={`inline-flex items-center justify-center w-4 h-4 rounded flex-shrink-0 mt-0.5 ${colorClass}`}>
              <Icon className="w-2.5 h-2.5" />
            </span>
            <span className="text-gray-600">
              <span className="font-medium text-gray-700">{change.category}:</span>{' '}
              <span className="line-clamp-2">{change.detail}</span>
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function VersionHistoryPanel({ isOpen, onClose, boardId, onRestore }) {
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState(null);
  const [confirmRestore, setConfirmRestore] = useState(null);
  const [expandedVersions, setExpandedVersions] = useState({});

  useEffect(() => {
    if (isOpen && boardId) {
      setLoading(true);
      boardsApi.getVersions(boardId)
        .then(res => setVersions(res.data))
        .catch(err => console.error('Failed to load versions:', err))
        .finally(() => setLoading(false));
    }
  }, [isOpen, boardId]);

  // Compute changes between consecutive versions
  const versionChanges = useMemo(() => {
    const changesMap = {};
    if (versions.length < 2) return changesMap;

    // Versions are expected newest-first; compare each to its predecessor
    for (let i = 0; i < versions.length - 1; i++) {
      const newer = versions[i];
      const older = versions[i + 1];
      if (newer.content && older.content) {
        changesMap[newer.id] = computeChanges(older.content, newer.content);
      }
    }
    return changesMap;
  }, [versions]);

  const toggleExpanded = (versionId) => {
    setExpandedVersions(prev => ({ ...prev, [versionId]: !prev[versionId] }));
  };

  const handleRestore = async (version) => {
    setRestoring(version.id);
    try {
      const res = await boardsApi.restoreVersion(boardId, version.id);
      setConfirmRestore(null);
      if (onRestore) onRestore(res.data);
    } catch (err) {
      console.error('Failed to restore version:', err);
    } finally {
      setRestoring(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-white shadow-2xl z-40 flex flex-col animate-slideRight border-l">
      <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
        <div className="flex items-center space-x-2">
          <Clock className="w-5 h-5 text-indigo-600" />
          <h3 className="font-semibold text-gray-900">Version History</h3>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 hover:bg-gray-200 rounded-lg transition"
          aria-label="Close version history"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
          </div>
        ) : versions.length === 0 ? (
          <div className="text-center py-12 px-4">
            <Clock className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">No version history yet</p>
            <p className="text-gray-400 text-xs mt-1">Versions are created when you save changes</p>
          </div>
        ) : (
          <div className="divide-y">
            {versions.map((version, idx) => {
              const date = new Date(version.created_at);
              const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              const dateStr = date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
              const changes = versionChanges[version.id] || [];
              const hasChanges = changes.length > 0;
              const isExpanded = expandedVersions[version.id];
              const isLatest = idx === 0;

              return (
                <div key={version.id} className="px-4 py-3 hover:bg-gray-50 transition group">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <p className="text-sm font-medium text-gray-900">
                          Version {version.version_number}
                        </p>
                        {isLatest && (
                          <span className="text-xs px-1.5 py-0.5 bg-green-100 text-green-700 rounded-full">Latest</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {dateStr} at {timeStr}
                      </p>
                      {version.created_by_name && (
                        <p className="text-xs text-gray-400 mt-0.5">
                          by {version.created_by_name}
                        </p>
                      )}
                      {version.description && (
                        <p className="text-xs text-gray-600 mt-1 truncate">
                          {version.description}
                        </p>
                      )}

                      {/* Change summary badges */}
                      {hasChanges && (
                        <div className="mt-1.5">
                          <button
                            onClick={() => toggleExpanded(version.id)}
                            className="flex items-center space-x-1 text-xs text-indigo-600 hover:text-indigo-800 transition"
                          >
                            {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                            <span>
                              {changes.length} change{changes.length !== 1 ? 's' : ''}
                              {!isExpanded && (
                                <span className="text-gray-400 ml-1">
                                  ({changes.filter(c => c.type === 'added').length > 0 ? `+${changes.filter(c => c.type === 'added').length}` : ''}
                                  {changes.filter(c => c.type === 'removed').length > 0 ? ` -${changes.filter(c => c.type === 'removed').length}` : ''}
                                  {changes.filter(c => c.type === 'modified').length > 0 ? ` ~${changes.filter(c => c.type === 'modified').length}` : ''})
                                </span>
                              )}
                            </span>
                          </button>
                          {isExpanded && <ChangesList changes={changes} />}
                        </div>
                      )}
                    </div>
                    {!isLatest && (
                      <button
                        onClick={() => setConfirmRestore(version)}
                        className="opacity-0 group-hover:opacity-100 p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition flex-shrink-0"
                        title="Restore this version"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Restore confirmation dialog */}
      {confirmRestore && (
        <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl p-5 w-full max-w-xs animate-scaleIn">
            <div className="flex items-center space-x-2 mb-3">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              <h4 className="font-semibold text-gray-900">Restore Version?</h4>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              This will restore your board to Version {confirmRestore.version_number}. A snapshot of the current state will be saved first.
            </p>
            <div className="flex space-x-2">
              <button
                onClick={() => setConfirmRestore(null)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => handleRestore(confirmRestore)}
                disabled={restoring}
                className="flex-1 px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 transition flex items-center justify-center space-x-1"
              >
                {restoring ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <RotateCcw className="w-4 h-4" />
                    <span>Restore</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
