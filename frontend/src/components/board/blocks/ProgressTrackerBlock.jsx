import React, { useState } from 'react';
import { BarChart3, Trash2, CheckCircle, Circle, Eye } from 'lucide-react';

// 44 px on phones, 32 px on desktop.
const ICON_BTN = 'btn-motion flex h-11 w-11 flex-none items-center justify-center rounded text-ink-2 hover:bg-surface-hover hover:text-danger md:h-8 md:w-8';

export default function ProgressTrackerBlock({ block, canEdit, onUpdate, onDelete }) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [title, setTitle] = useState(block.title || '');

  const students = block.students || [];

  const handleTitleSave = () => {
    onUpdate({ title });
    setEditingTitle(false);
  };

  const toggleStatus = (studentIdx, field) => {
    if (!canEdit) return;
    const updated = students.map((s, i) =>
      i === studentIdx ? { ...s, [field]: !s[field] } : s
    );
    onUpdate({ students: updated });
  };

  const completedCount = students.filter(s => s.submitted).length;
  const viewedCount = students.filter(s => s.viewed).length;
  const progressPct = students.length > 0 ? Math.round((completedCount / students.length) * 100) : 0;

  return (
    <div className="rounded-lg border border-line bg-surface">
      <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <BarChart3 size={18} strokeWidth={1.5} className="flex-shrink-0 text-teal-700" aria-hidden="true" />
          {editingTitle && canEdit ? (
            <input
              type="text"
              aria-label="Progress tracker title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleTitleSave}
              onKeyDown={(e) => e.key === 'Enter' && handleTitleSave()}
              className="border-b border-line-strong bg-transparent text-sm font-semibold text-ink outline-none"
              autoFocus
            />
          ) : (
            <h4 className="text-sm font-semibold text-ink">
              {canEdit ? (
                <button
                  type="button"
                  className="btn-motion text-left hover:text-accent"
                  onClick={() => setEditingTitle(true)}
                >
                  {block.title || 'Progress Tracker'}
                </button>
              ) : (
                block.title || 'Progress Tracker'
              )}
            </h4>
          )}
        </div>
        {canEdit && (
          <button type="button" onClick={onDelete} className={ICON_BTN} title="Remove" aria-label="Remove">
            <Trash2 size={16} strokeWidth={1.5} aria-hidden="true" />
          </button>
        )}
      </div>

      {/* Progress bar */}
      <div className="border-b border-line px-4 py-2">
        <div className="mb-1 flex items-center justify-between text-xs text-ink-2">
          <span>{completedCount}/{students.length} submitted</span>
          <span>{progressPct}%</span>
        </div>
        <div
          role="progressbar"
          aria-label="Students submitted"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progressPct}
          className="h-2 w-full rounded-full bg-line"
        >
          <div
            className="h-2 rounded-full bg-teal-700"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {students.length === 0 ? (
        <div className="px-4 py-6 text-center text-sm text-ink-2">
          {canEdit ? 'No students tracked yet' : 'No progress data'}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wide text-ink-2">
                <th scope="col" className="px-4 py-2 text-left font-medium">Student</th>
                <th scope="col" className="px-4 py-2 text-center font-medium">Viewed</th>
                <th scope="col" className="px-4 py-2 text-center font-medium">Submitted</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {students.map((student, idx) => (
                <tr key={idx} className="hover:bg-surface-hover">
                  <td className="px-4 py-2 text-ink">{student.name}</td>
                  <td className="px-4 py-2 text-center">
                    <button
                      type="button"
                      onClick={() => toggleStatus(idx, 'viewed')}
                      aria-label={`Viewed: ${student.name}`}
                      aria-pressed={!!student.viewed}
                      className={canEdit ? 'cursor-pointer' : 'cursor-default'}
                      disabled={!canEdit}
                    >
                      {student.viewed ? (
                        <Eye size={16} strokeWidth={1.5} className="mx-auto block text-teal-700" aria-hidden="true" />
                      ) : (
                        <Circle size={16} strokeWidth={1.5} className="mx-auto block text-ink-3" aria-hidden="true" />
                      )}
                    </button>
                  </td>
                  <td className="px-4 py-2 text-center">
                    <button
                      type="button"
                      onClick={() => toggleStatus(idx, 'submitted')}
                      aria-label={`Submitted: ${student.name}`}
                      aria-pressed={!!student.submitted}
                      className={canEdit ? 'cursor-pointer' : 'cursor-default'}
                      disabled={!canEdit}
                    >
                      {student.submitted ? (
                        <CheckCircle size={16} strokeWidth={1.5} className="mx-auto block text-green-700" aria-hidden="true" />
                      ) : (
                        <Circle size={16} strokeWidth={1.5} className="mx-auto block text-ink-3" aria-hidden="true" />
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {canEdit && (
        <div className="flex items-center justify-between border-t border-line px-4 py-2">
          <span className="text-xs text-ink-2">{viewedCount} viewed, {completedCount} submitted</span>
        </div>
      )}
    </div>
  );
}
