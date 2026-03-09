import React, { useState } from 'react';
import { BarChart3, Trash2, CheckCircle, Circle, Eye } from 'lucide-react';

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
    <div className="border border-violet-200 rounded-lg bg-violet-50">
      <div className="flex items-center justify-between px-4 py-3 border-b border-violet-200">
        <div className="flex items-center gap-2">
          <BarChart3 size={18} className="text-violet-600" />
          {editingTitle && canEdit ? (
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleTitleSave}
              onKeyDown={(e) => e.key === 'Enter' && handleTitleSave()}
              className="text-sm font-semibold border-b border-violet-400 bg-transparent outline-none"
              autoFocus
            />
          ) : (
            <h4
              className={`text-sm font-semibold text-violet-800 ${canEdit ? 'cursor-pointer hover:text-violet-600' : ''}`}
              onClick={() => canEdit && setEditingTitle(true)}
            >
              {block.title || 'Progress Tracker'}
            </h4>
          )}
        </div>
        {canEdit && (
          <button onClick={onDelete} className="p-1.5 text-gray-400 hover:text-red-500 rounded" title="Remove">
            <Trash2 size={16} />
          </button>
        )}
      </div>

      {/* Progress bar */}
      <div className="px-4 py-2 border-b border-violet-100">
        <div className="flex items-center justify-between text-xs text-violet-600 mb-1">
          <span>{completedCount}/{students.length} submitted</span>
          <span>{progressPct}%</span>
        </div>
        <div className="w-full bg-violet-200 rounded-full h-2">
          <div
            className="bg-violet-500 h-2 rounded-full transition-all"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {students.length === 0 ? (
        <div className="px-4 py-6 text-center text-sm text-violet-500">
          {canEdit ? 'No students tracked yet' : 'No progress data'}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-violet-600 uppercase tracking-wide">
                <th className="px-4 py-2 text-left font-medium">Student</th>
                <th className="px-4 py-2 text-center font-medium">Viewed</th>
                <th className="px-4 py-2 text-center font-medium">Submitted</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-violet-100">
              {students.map((student, idx) => (
                <tr key={idx} className="hover:bg-violet-100">
                  <td className="px-4 py-2 text-gray-800">{student.name}</td>
                  <td className="px-4 py-2 text-center">
                    <button
                      onClick={() => toggleStatus(idx, 'viewed')}
                      className={canEdit ? 'cursor-pointer' : 'cursor-default'}
                      disabled={!canEdit}
                    >
                      {student.viewed ? (
                        <Eye size={16} className="text-violet-500 mx-auto" />
                      ) : (
                        <Circle size={16} className="text-gray-300 mx-auto" />
                      )}
                    </button>
                  </td>
                  <td className="px-4 py-2 text-center">
                    <button
                      onClick={() => toggleStatus(idx, 'submitted')}
                      className={canEdit ? 'cursor-pointer' : 'cursor-default'}
                      disabled={!canEdit}
                    >
                      {student.submitted ? (
                        <CheckCircle size={16} className="text-green-500 mx-auto" />
                      ) : (
                        <Circle size={16} className="text-gray-300 mx-auto" />
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
        <div className="px-4 py-2 border-t border-violet-200 flex items-center justify-between">
          <span className="text-xs text-violet-500">{viewedCount} viewed, {completedCount} submitted</span>
        </div>
      )}
    </div>
  );
}
