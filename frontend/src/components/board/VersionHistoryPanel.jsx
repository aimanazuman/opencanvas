import React, { useState, useEffect, useMemo } from 'react';
import { X, Clock, RotateCcw, ChevronDown, ChevronRight, Plus, Minus, Edit3, Check } from 'lucide-react';
import { boardsApi } from '../../services/api';
import { ClassroomDialog, ClassroomButton, ChalkBadge } from '../classroom';

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

// Static lookup maps. A change is shown by its icon and a screen-reader word, never by colour alone.
const CHANGE_ICONS = {
  added: Plus,
  removed: Minus,
  modified: Edit3,
};

const CHANGE_COLORS = {
  added: 'text-success bg-success-tint',
  removed: 'text-danger bg-danger-tint',
  modified: 'text-accent bg-accent-tint',
};

const CHANGE_WORDS = {
  added: 'Added',
  removed: 'Removed',
  modified: 'Changed',
};

function ChangesList({ changes }) {
  if (!changes || changes.length === 0) return null;

  return (
    <ul className="mt-2 space-y-1">
      {changes.map((change, i) => {
        const Icon = CHANGE_ICONS[change.type] || Edit3;
        const colorClass = CHANGE_COLORS[change.type] || 'text-ink-2 bg-surface-hover';
        return (
          <li key={i} className="flex items-start gap-1.5 text-xs">
            <span className={`mt-0.5 inline-flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-sm ${colorClass}`}>
              <Icon className="h-2.5 w-2.5" strokeWidth={1.5} aria-hidden="true" />
            </span>
            <span className="min-w-0 text-ink-2">
              <span className="sr-only">{CHANGE_WORDS[change.type] || 'Changed'}: </span>
              <span className="font-medium text-ink">{change.category}:</span>{' '}
              <span className="line-clamp-2">{change.detail}</span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}

// Loading placeholder: static neutral blocks, no pulse loop.
function VersionSkeleton() {
  return (
    <div role="status" className="space-y-2 p-4">
      <span className="sr-only">Loading versions</span>
      {[0, 1, 2].map((i) => (
        <div key={i} aria-hidden="true" className="h-14 rounded border border-line bg-surface-hover" />
      ))}
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
    <>
      <section
        aria-labelledby="version-history-title"
        className="motion-safe:animate-oc-fade-in fixed inset-x-0 bottom-0 z-40 flex max-h-[80vh] flex-col rounded-t-xl border border-line bg-surface shadow-pop md:inset-x-auto md:bottom-auto md:right-2 md:top-12 md:max-h-[calc(100vh-56px)] md:w-80 md:rounded-lg"
      >
        {/* Mobile bottom sheet handle (decorative) */}
        <div aria-hidden="true" className="mx-auto mt-2 h-1 w-8 rounded-sm bg-line-strong md:hidden" />

        <div className="flex items-center justify-between gap-2 border-b border-line px-3 py-2">
          <div className="flex min-w-0 items-center gap-2">
            <Clock className="h-4 w-4 flex-shrink-0 text-accent" strokeWidth={1.5} aria-hidden="true" />
            <h3 id="version-history-title" className="text-xs font-semibold text-ink">Version History</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn-motion flex h-11 w-11 flex-shrink-0 items-center justify-center rounded text-ink-2 hover:bg-surface-hover md:h-7 md:w-7"
            aria-label="Close version history"
          >
            <X className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {loading ? (
            <VersionSkeleton />
          ) : versions.length === 0 ? (
            <div className="px-4 py-12 text-center">
              <Clock className="mx-auto mb-3 h-5 w-5 text-ink-3" strokeWidth={1.5} aria-hidden="true" />
              <p className="text-sm font-medium text-ink">No version history yet</p>
              <p className="mt-1 text-xs text-ink-2">Versions are created when you save changes</p>
            </div>
          ) : (
            <ul className="divide-y divide-line">
              {versions.map((version, idx) => {
                const date = new Date(version.created_at);
                const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                const dateStr = date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
                const changes = versionChanges[version.id] || [];
                const hasChanges = changes.length > 0;
                const isExpanded = expandedVersions[version.id];
                const isLatest = idx === 0;
                const addedCount = changes.filter(c => c.type === 'added').length;
                const removedCount = changes.filter(c => c.type === 'removed').length;
                const modifiedCount = changes.filter(c => c.type === 'modified').length;

                return (
                  <li key={version.id} className="group px-4 py-3 hover:bg-surface-hover">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-medium text-ink">
                            Version {version.version_number}
                          </p>
                          {isLatest && <ChalkBadge tone="success" icon={Check} label="Latest" />}
                        </div>
                        <p className="mt-0.5 text-xs text-ink-2">
                          {dateStr} at {timeStr}
                        </p>
                        {version.created_by_name && (
                          <p className="mt-0.5 text-xs text-ink-3">
                            by {version.created_by_name}
                          </p>
                        )}
                        {version.description && (
                          <p className="mt-1 truncate text-xs text-ink-2">
                            {version.description}
                          </p>
                        )}

                        {/* Change summary */}
                        {hasChanges && (
                          <div className="mt-1.5">
                            <button
                              type="button"
                              onClick={() => toggleExpanded(version.id)}
                              aria-expanded={Boolean(isExpanded)}
                              className="btn-motion flex min-h-[44px] items-center gap-1 text-xs font-medium text-accent hover:text-accent-hover md:min-h-0"
                            >
                              {isExpanded
                                ? <ChevronDown className="h-3 w-3" strokeWidth={1.5} aria-hidden="true" />
                                : <ChevronRight className="h-3 w-3" strokeWidth={1.5} aria-hidden="true" />}
                              <span>
                                {changes.length} change{changes.length !== 1 ? 's' : ''}
                                {!isExpanded && (
                                  <span className="ml-1 text-ink-2">
                                    ({addedCount > 0 ? `+${addedCount}` : ''}
                                    {removedCount > 0 && <> -{removedCount}</>}
                                    {modifiedCount > 0 && <> ~{modifiedCount}</>})
                                  </span>
                                )}
                              </span>
                            </button>
                            {isExpanded && <ChangesList changes={changes} />}
                          </div>
                        )}
                      </div>
                      {!isLatest && (
                        // Always visible on touch (no hover there); on desktop it appears on hover or keyboard focus.
                        <button
                          type="button"
                          onClick={() => setConfirmRestore(version)}
                          className="btn-motion flex h-11 w-11 flex-shrink-0 items-center justify-center rounded text-accent opacity-100 hover:bg-accent-tint md:h-8 md:w-8 md:opacity-0 md:group-focus-within:opacity-100 md:group-hover:opacity-100"
                          title="Restore this version"
                          aria-label="Restore this version"
                        >
                          <RotateCcw className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>

      {/* Restore confirmation: a dialog of its own, outside the panel so its fixed overlay is not clipped. */}
      {confirmRestore && (
        <ClassroomDialog
          titleId="restore-version-title"
          title="Restore Version?"
          onClose={() => setConfirmRestore(null)}
          size="md"
          footer={(
            <>
              <ClassroomButton variant="secondary" className="w-full sm:w-auto" onClick={() => setConfirmRestore(null)}>
                Cancel
              </ClassroomButton>
              <ClassroomButton
                variant="primary"
                className="w-full sm:w-auto"
                icon={RotateCcw}
                loading={Boolean(restoring)}
                disabled={Boolean(restoring)}
                onClick={() => handleRestore(confirmRestore)}
              >
                Restore
              </ClassroomButton>
            </>
          )}
        >
          <p className="text-sm text-ink-2">
            This will restore your board to Version {confirmRestore.version_number}. A snapshot of the current state will be saved first.
          </p>
        </ClassroomDialog>
      )}
    </>
  );
}
