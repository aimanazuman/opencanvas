import React, { useState, useRef, useMemo } from 'react';
import {
  Target, X, Check, Bell, Paperclip, Link2, MessageSquare,
  CheckCircle, Trash2, ChevronLeft, ChevronRight, Calendar,
  Copy, Loader2,
} from 'lucide-react';
import { useBoard } from '../../contexts/BoardContext';
import { useAuth } from '../../contexts/AuthContext';
import { uploadFile } from '../../utils/fileUpload';


const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const HOURS = [];
for (let h = 8; h <= 21; h++) {
  HOURS.push(`${String(h).padStart(2, '0')}:00`);
}

const SUBJECT_COLORS = [
  '#6366f1', '#10b981', '#ef4444', '#f59e0b', '#8b5cf6',
  '#ec4899', '#06b6d4', '#84cc16',
];

// ---- Date Helpers ----

function getMonday(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d;
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function formatDateKey(date) {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

function isSameDay(d1, d2) {
  return d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate();
}

function formatShortDate(date) {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatWeekRange(monday) {
  const sunday = addDays(monday, 6);
  const monStr = monday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const sunStr = sunday.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  return `${monStr} – ${sunStr}`;
}

function getWeekDates(monday) {
  return DAY_NAMES.map((_, i) => addDays(monday, i));
}

function getCellKey(date, hour) {
  return `${formatDateKey(date)}_${hour.split(':')[0]}`;
}

function getWeekKey(monday) {
  return formatDateKey(monday);
}

// Check if key is legacy format (Mon-09) vs new format (2026-01-27_09)
function isLegacyKey(key) {
  return /^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)-\d{2}$/.test(key);
}

// Migrate legacy schedule keys to date-based keys for a given monday
function migrateLegacySchedule(schedule, monday) {
  const dayToIndex = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };
  const newSchedule = {};
  for (const [key, value] of Object.entries(schedule)) {
    if (isLegacyKey(key)) {
      const [day, hour] = key.split('-');
      const date = addDays(monday, dayToIndex[day]);
      const newKey = `${formatDateKey(date)}_${hour}`;
      newSchedule[newKey] = value;
    } else {
      newSchedule[key] = value;
    }
  }
  return newSchedule;
}

// Get count of entries per week from schedule
function getWeekEntryCounts(schedule) {
  const counts = {};
  for (const key of Object.keys(schedule)) {
    if (!isLegacyKey(key) && key.includes('_')) {
      const dateStr = key.split('_')[0];
      const entryDate = new Date(dateStr + 'T00:00:00');
      const monday = getMonday(entryDate);
      const wk = formatDateKey(monday);
      counts[wk] = (counts[wk] || 0) + 1;
    }
  }
  return counts;
}

// ---- Mini Month Calendar ----

function MiniMonthCalendar({ currentMonday, onSelectWeek, onClose, schedule }) {
  const [viewMonth, setViewMonth] = useState(() => {
    const d = new Date(currentMonday);
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  const today = new Date();
  const entryCounts = useMemo(() => getWeekEntryCounts(schedule), [schedule]);

  const firstOfMonth = new Date(viewMonth.year, viewMonth.month, 1);
  const daysInMonth = new Date(viewMonth.year, viewMonth.month + 1, 0).getDate();
  const startDayOfWeek = (firstOfMonth.getDay() + 6) % 7; // 0=Mon

  const weeks = [];
  let dayNum = 1 - startDayOfWeek;
  while (dayNum <= daysInMonth) {
    const week = [];
    for (let i = 0; i < 7; i++) {
      if (dayNum >= 1 && dayNum <= daysInMonth) {
        week.push(new Date(viewMonth.year, viewMonth.month, dayNum));
      } else {
        week.push(null);
      }
      dayNum++;
    }
    weeks.push(week);
  }

  const monthName = firstOfMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const prevMonth = () => {
    setViewMonth(prev => {
      const m = prev.month === 0 ? 11 : prev.month - 1;
      const y = prev.month === 0 ? prev.year - 1 : prev.year;
      return { year: y, month: m };
    });
  };

  const nextMonth = () => {
    setViewMonth(prev => {
      const m = prev.month === 11 ? 0 : prev.month + 1;
      const y = prev.month === 11 ? prev.year + 1 : prev.year;
      return { year: y, month: m };
    });
  };

  return (
    <div className="absolute top-full left-0 mt-2 bg-white border rounded-xl shadow-xl z-50 p-4 w-80">
      <div className="flex items-center justify-between mb-3">
        <button onClick={prevMonth} className="p-1 hover:bg-gray-100 rounded">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-sm font-semibold text-gray-700">{monthName}</span>
        <button onClick={nextMonth} className="p-1 hover:bg-gray-100 rounded">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-0 text-center mb-1">
        {DAY_NAMES.map(d => (
          <div key={d} className="text-xs font-medium text-gray-400 py-1">{d[0]}</div>
        ))}
      </div>
      {weeks.map((week, wi) => {
        const mondayOfWeek = week.find(d => d !== null);
        const monday = mondayOfWeek ? getMonday(mondayOfWeek) : null;
        const weekKeyStr = monday ? formatDateKey(monday) : null;
        const isSelected = monday && isSameDay(monday, currentMonday);
        const hasEntries = weekKeyStr && entryCounts[weekKeyStr] > 0;

        return (
          <div
            key={wi}
            onClick={() => { if (monday) { onSelectWeek(monday); onClose(); } }}
            className={`grid grid-cols-7 gap-0 cursor-pointer rounded-lg transition ${
              isSelected ? 'bg-indigo-50 ring-1 ring-indigo-300' : 'hover:bg-gray-50'
            }`}
          >
            {week.map((date, di) => {
              if (!date) return <div key={di} className="py-1.5" />;
              const isToday = isSameDay(date, today);
              return (
                <div
                  key={di}
                  className={`py-1.5 text-xs text-center ${
                    isToday ? 'font-bold text-indigo-600' : 'text-gray-600'
                  }`}
                >
                  {date.getDate()}
                </div>
              );
            })}
            {hasEntries && (
              <div className="col-span-7 flex justify-center -mt-1 mb-0.5">
                <div className="w-1 h-1 bg-indigo-400 rounded-full" />
              </div>
            )}
          </div>
        );
      })}
      <div className="mt-2 pt-2 border-t flex justify-between">
        <button
          onClick={() => { onSelectWeek(getMonday(new Date())); onClose(); }}
          className="text-xs text-indigo-600 hover:text-indigo-700 font-medium"
        >
          Go to today
        </button>
        <button onClick={onClose} className="text-xs text-gray-400 hover:text-gray-600">
          Close
        </button>
      </div>
    </div>
  );
}

// ---- Main Component ----

export default function StudyPlannerBoard() {
  const { board, canEdit, updateSchedule, updateWeeklyGoals } = useBoard();
  const { user } = useAuth();

  // Week navigation
  const [currentMonday, setCurrentMonday] = useState(() => getMonday(new Date()));
  const [showMonthPicker, setShowMonthPicker] = useState(false);

  // Cell editing
  const [editingCell, setEditingCell] = useState(null);
  const [cellSubject, setCellSubject] = useState('');
  const [cellColor, setCellColor] = useState(SUBJECT_COLORS[0]);
  const [cellNotes, setCellNotes] = useState('');
  const [cellFiles, setCellFiles] = useState([]);
  const [cellLinks, setCellLinks] = useState([]);
  const [cellDone, setCellDone] = useState(false);
  const [cellReminder, setCellReminder] = useState('');
  const [cellComments, setCellComments] = useState([]);
  const [newLink, setNewLink] = useState('');
  const [newComment, setNewComment] = useState('');

  // Goal editing
  const [editingGoal, setEditingGoal] = useState(null);
  const [goalText, setGoalText] = useState('');

  const fileInputRef = useRef(null);
  const [uploadingFile, setUploadingFile] = useState(false);

  // Derived data (safe when board is null)
  const rawSchedule = board?.schedule || {};
  const rawGoals = board?.weeklyGoals || {};
  const hasLegacyKeys = Object.keys(rawSchedule).some(isLegacyKey);
  const schedule = hasLegacyKeys ? migrateLegacySchedule(rawSchedule, currentMonday) : rawSchedule;
  const today = new Date();
  const todayMonday = getMonday(today);
  const isCurrentWeek = isSameDay(currentMonday, todayMonday);
  const weekKey = getWeekKey(currentMonday);
  const weekDates = getWeekDates(currentMonday);

  // Goals for current week
  const currentWeekGoals = Array.isArray(rawGoals)
    ? rawGoals
    : (rawGoals[weekKey] || ['', '', '']);

  const getEntryForCell = (dayIndex, hour) => {
    const key = getCellKey(weekDates[dayIndex], hour);
    return schedule[key] || null;
  };

  const getCellKeyForDay = (dayIndex, hour) => {
    return getCellKey(weekDates[dayIndex], hour);
  };

  // Count entries in current week
  const weekEntryCount = useMemo(() => {
    let count = 0;
    for (const dayIndex of [0, 1, 2, 3, 4, 5, 6]) {
      for (const hour of HOURS) {
        if (getEntryForCell(dayIndex, hour)) count++;
      }
    }
    return count;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schedule, weekKey]);

  // Count completed entries
  const completedCount = useMemo(() => {
    let count = 0;
    for (const dayIndex of [0, 1, 2, 3, 4, 5, 6]) {
      for (const hour of HOURS) {
        const entry = getEntryForCell(dayIndex, hour);
        if (entry?.done) count++;
      }
    }
    return count;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schedule, weekKey]);

  // Early return AFTER all hooks
  if (!board) return null;

  // ---- Handlers ----

  const handleCellClick = (dayIndex, hour) => {
    if (!canEdit) return;
    const key = getCellKeyForDay(dayIndex, hour);
    const existing = schedule[key];
    if (existing) {
      setCellSubject(existing.subject || '');
      setCellColor(existing.color || SUBJECT_COLORS[0]);
      setCellNotes(existing.notes || '');
      setCellFiles(existing.files || []);
      setCellLinks(existing.links || []);
      setCellDone(existing.done || false);
      setCellReminder(existing.reminderAt || '');
      setCellComments(existing.comments || []);
    } else {
      setCellSubject('');
      setCellColor(SUBJECT_COLORS[0]);
      setCellNotes('');
      setCellFiles([]);
      setCellLinks([]);
      setCellDone(false);
      setCellReminder('');
      setCellComments([]);
    }
    setEditingCell(key);
  };

  const saveSchedule = (newSchedule) => {
    // If we migrated from legacy, persist the new format
    if (hasLegacyKeys) {
      // Remove legacy keys, keep migrated + new
      const cleaned = {};
      for (const [k, v] of Object.entries(newSchedule)) {
        if (!isLegacyKey(k)) cleaned[k] = v;
      }
      updateSchedule(cleaned);
    } else {
      updateSchedule(newSchedule);
    }
  };

  const handleCellSave = () => {
    const newSchedule = { ...schedule };
    if (cellSubject.trim()) {
      newSchedule[editingCell] = {
        id: editingCell,
        subject: cellSubject.trim(),
        color: cellColor,
        notes: cellNotes,
        files: cellFiles,
        links: cellLinks,
        done: cellDone,
        reminderAt: cellReminder || null,
        comments: cellComments,
      };
    } else {
      delete newSchedule[editingCell];
    }
    saveSchedule(newSchedule);
    setEditingCell(null);
  };

  const handleCellDelete = () => {
    const newSchedule = { ...schedule };
    delete newSchedule[editingCell];
    saveSchedule(newSchedule);
    setEditingCell(null);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    // Show instant local preview with temp ID
    const tempId = 'temp_' + Date.now();
    const localUrl = URL.createObjectURL(file);
    setCellFiles(prev => [...prev, {
      id: tempId,
      name: file.name,
      size: file.size,
      url: localUrl,
      _uploading: true,
    }]);

    // Upload to server in background
    setUploadingFile(true);
    const result = await uploadFile(file);
    setUploadingFile(false);

    if (result) {
      URL.revokeObjectURL(localUrl);
      setCellFiles(prev => prev.map(f =>
        f.id === tempId
          ? { id: result.id, fileId: result.id, name: result.name, size: result.size, url: result.url }
          : f
      ));
    } else {
      // Upload failed — remove the temp entry
      setCellFiles(prev => prev.filter(f => f.id !== tempId));
      URL.revokeObjectURL(localUrl);
    }
  };

  const handleRemoveFile = (fileId) => {
    setCellFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const handleAddLink = () => {
    if (!newLink.trim()) return;
    let url = newLink.trim();
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
    setCellLinks(prev => [...prev, { id: Date.now().toString(), url }]);
    setNewLink('');
  };

  const handleRemoveLink = (linkId) => {
    setCellLinks(prev => prev.filter(l => l.id !== linkId));
  };

  const handleAddComment = () => {
    if (!newComment.trim()) return;
    setCellComments(prev => [...prev, {
      id: Date.now().toString(),
      text: newComment.trim(),
      author: user ? `${user.first_name} ${user.last_name}` : 'Anonymous',
      createdAt: new Date().toISOString(),
    }]);
    setNewComment('');
  };

  // ---- Goal Handlers ----

  const saveGoals = (newGoals) => {
    if (Array.isArray(rawGoals)) {
      // Migrate from legacy array to object
      updateWeeklyGoals({ [weekKey]: newGoals });
    } else {
      updateWeeklyGoals({ ...rawGoals, [weekKey]: newGoals });
    }
  };

  const handleGoalEdit = (index) => {
    if (!canEdit) return;
    setGoalText(currentWeekGoals[index] || '');
    setEditingGoal(index);
  };

  const handleGoalSave = () => {
    const newGoals = [...currentWeekGoals];
    newGoals[editingGoal] = goalText;
    saveGoals(newGoals);
    setEditingGoal(null);
  };

  const handleGoalRemove = (index) => {
    const newGoals = currentWeekGoals.filter((_, i) => i !== index);
    saveGoals(newGoals);
  };

  const addGoal = () => {
    const newGoals = [...currentWeekGoals, ''];
    saveGoals(newGoals);
    setEditingGoal(currentWeekGoals.length);
    setGoalText('');
  };

  // ---- Copy Week ----

  const handleCopyWeekToNext = () => {
    const nextMonday = addDays(currentMonday, 7);
    const newSchedule = { ...schedule };
    // Copy current week entries to next week
    for (let di = 0; di < 7; di++) {
      for (const hour of HOURS) {
        const srcKey = getCellKey(weekDates[di], hour);
        const entry = schedule[srcKey];
        if (entry) {
          const destDate = addDays(nextMonday, di);
          const destKey = getCellKey(destDate, hour);
          if (!newSchedule[destKey]) {
            newSchedule[destKey] = { ...entry, id: destKey, done: false };
          }
        }
      }
    }
    saveSchedule(newSchedule);
    // Copy goals too
    const nextWeekKey = getWeekKey(nextMonday);
    const goalsObj = Array.isArray(rawGoals) ? {} : { ...rawGoals };
    if (!goalsObj[nextWeekKey] || goalsObj[nextWeekKey].every(g => !g)) {
      goalsObj[nextWeekKey] = currentWeekGoals.map(() => ''); // empty goals for new week
    }
    goalsObj[weekKey] = currentWeekGoals;
    updateWeeklyGoals(goalsObj);
    setCurrentMonday(nextMonday);
  };

  // ---- Cell Display Label ----

  const getCellDisplayLabel = (key) => {
    if (!key) return '';
    const parts = key.split('_');
    if (parts.length === 2) {
      const dateStr = parts[0];
      const hour = parts[1];
      const date = new Date(dateStr + 'T00:00:00');
      const dayName = DAY_NAMES[(date.getDay() + 6) % 7];
      return `${dayName} ${formatShortDate(date)} – ${hour}:00`;
    }
    return key;
  };

  // ---- Render ----

  return (
    <div className="max-w-full mx-auto px-4 py-6">
      {/* Week Navigation Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3 relative">
          <button
            onClick={() => setCurrentMonday(addDays(currentMonday, -7))}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
            title="Previous week"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          <button
            onClick={() => setShowMonthPicker(!showMonthPicker)}
            className="flex items-center space-x-2 px-4 py-2 bg-white border rounded-lg hover:bg-gray-50 transition"
          >
            <Calendar className="w-4 h-4 text-indigo-500" />
            <span className="text-sm font-semibold text-gray-800">
              {formatWeekRange(currentMonday)}
            </span>
          </button>
          <button
            onClick={() => setCurrentMonday(addDays(currentMonday, 7))}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
            title="Next week"
          >
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </button>

          {!isCurrentWeek && (
            <button
              onClick={() => setCurrentMonday(getMonday(new Date()))}
              className="px-3 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition"
            >
              Today
            </button>
          )}

          {showMonthPicker && (
            <MiniMonthCalendar
              currentMonday={currentMonday}
              onSelectWeek={setCurrentMonday}
              onClose={() => setShowMonthPicker(false)}
              schedule={schedule}
            />
          )}
        </div>

        <div className="flex items-center space-x-3">
          {/* Week Stats */}
          <div className="flex items-center space-x-4 text-xs text-gray-500">
            <span>{weekEntryCount} session{weekEntryCount !== 1 ? 's' : ''}</span>
            {completedCount > 0 && (
              <span className="flex items-center space-x-1 text-green-600">
                <CheckCircle className="w-3.5 h-3.5" />
                <span>{completedCount} done</span>
              </span>
            )}
          </div>

          {/* Copy to Next Week */}
          {weekEntryCount > 0 && (
            <button
              onClick={handleCopyWeekToNext}
              className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
              title="Copy schedule to next week"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Copy to next week</span>
            </button>
          )}
        </div>
      </div>

      {/* Weekly Goals */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-5 mb-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-yellow-800 flex items-center space-x-2">
            <Target className="w-4 h-4" />
            <span>Goals for this week</span>
          </h2>
          <span className="text-xs text-yellow-600">
            {formatShortDate(currentMonday)} – {formatShortDate(addDays(currentMonday, 6))}
          </span>
        </div>
        <div className="space-y-1.5">
          {currentWeekGoals.map((goal, index) => (
            <div key={index} className="flex items-center space-x-2">
              <span className="text-xs font-medium text-yellow-700 w-5">{index + 1}.</span>
              {editingGoal === index ? (
                <div className="flex-1 flex space-x-2">
                  <input
                    type="text"
                    value={goalText}
                    onChange={(e) => setGoalText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleGoalSave()}
                    className="flex-1 px-3 py-1 border rounded text-sm"
                    autoFocus
                  />
                  <button onClick={handleGoalSave} className="p-1 text-green-600 hover:bg-green-50 rounded">
                    <Check className="w-4 h-4" />
                  </button>
                  <button onClick={() => setEditingGoal(null)} className="p-1 text-gray-400 hover:bg-gray-50 rounded">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex-1 flex items-center">
                  <button
                    onClick={() => handleGoalEdit(index)}
                    className="flex-1 text-left text-sm text-gray-700 hover:bg-yellow-100 px-2 py-1 rounded"
                  >
                    {goal || <span className="text-gray-400 italic">Click to add goal</span>}
                  </button>
                  {goal && (
                    <button
                      onClick={() => handleGoalRemove(index)}
                      className="p-1 text-gray-300 hover:text-red-400 rounded"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
          {canEdit && (
            <button
              onClick={addGoal}
              className="text-sm text-yellow-600 hover:text-yellow-700 mt-1"
            >
              + Add goal
            </button>
          )}
        </div>
      </div>

      {/* Timetable Grid */}
      <div className="bg-white border rounded-xl overflow-x-auto">
        <table className="w-full min-w-[800px]">
          <thead>
            <tr>
              <th className="w-20 px-3 py-3 text-left text-xs font-semibold text-gray-500 bg-gray-50 border-b border-r">
                Time
              </th>
              {weekDates.map((date, i) => {
                const isToday = isSameDay(date, today);
                return (
                  <th
                    key={i}
                    className={`px-3 py-2 text-center border-b ${
                      isToday ? 'bg-indigo-50' : 'bg-gray-50'
                    }`}
                  >
                    <div className={`text-xs font-semibold ${isToday ? 'text-indigo-700' : 'text-gray-700'}`}>
                      {DAY_NAMES[i]}
                    </div>
                    <div className={`text-[10px] mt-0.5 ${isToday ? 'text-indigo-500 font-medium' : 'text-gray-400'}`}>
                      {formatShortDate(date)}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {HOURS.map(hour => (
              <tr key={hour}>
                <td className="px-3 py-1 text-xs text-gray-500 border-r bg-gray-50 font-mono">
                  {hour}
                </td>
                {weekDates.map((date, di) => {
                  const entry = getEntryForCell(di, hour);
                  const hasAttachments = entry && ((entry.files?.length > 0) || (entry.links?.length > 0));
                  const hasReminder = entry?.reminderAt;
                  const isDone = entry?.done;
                  const isToday = isSameDay(date, today);
                  return (
                    <td
                      key={di}
                      onClick={() => handleCellClick(di, hour)}
                      className={`px-1 py-1 border-b border-r last:border-r-0 cursor-pointer hover:bg-gray-50 transition h-10 ${
                        isToday ? 'bg-indigo-50/30' : ''
                      }`}
                    >
                      {entry && (
                        <div
                          className={`px-2 py-1 rounded text-xs font-medium text-white truncate relative ${isDone ? 'opacity-70' : ''}`}
                          style={{ backgroundColor: entry.color }}
                          title={entry.subject}
                        >
                          <span className={isDone ? 'line-through' : ''}>
                            {entry.subject}
                          </span>
                          <span className="absolute top-0 right-0.5 flex gap-0.5">
                            {isDone && <CheckCircle size={10} className="text-white" />}
                            {hasReminder && <Bell size={10} className="text-white" />}
                            {hasAttachments && <span className="w-1.5 h-1.5 bg-white rounded-full inline-block mt-0.5" />}
                          </span>
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Empty Week Message */}
      {weekEntryCount === 0 && (
        <div className="text-center py-8 text-gray-400 text-sm">
          No sessions scheduled for this week. Click any cell to add one.
        </div>
      )}

      {/* Cell Edit Modal */}
      {editingCell && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {getCellDisplayLabel(editingCell)}
              </h3>
              <button onClick={() => setEditingCell(null)} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              {/* Subject */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Subject</label>
                <input
                  type="text"
                  value={cellSubject}
                  onChange={(e) => setCellSubject(e.target.value)}
                  placeholder="e.g., CS301 - Web Tech"
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  autoFocus
                />
              </div>

              {/* Color */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Color</label>
                <div className="flex space-x-2">
                  {SUBJECT_COLORS.map(color => (
                    <button
                      key={color}
                      onClick={() => setCellColor(color)}
                      className={`w-8 h-8 rounded-full border-2 ${cellColor === color ? 'border-gray-800 scale-110' : 'border-transparent'} transition`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              {/* Done checkbox */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={cellDone}
                  onChange={(e) => setCellDone(e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm text-gray-700">Mark as completed</span>
                {cellDone && <CheckCircle size={16} className="text-green-500" />}
              </label>

              {/* Reminder */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block flex items-center gap-1">
                  <Bell size={14} />
                  Reminder
                </label>
                <input
                  type="datetime-local"
                  value={cellReminder}
                  onChange={(e) => setCellReminder(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Notes</label>
                <textarea
                  value={cellNotes}
                  onChange={(e) => setCellNotes(e.target.value)}
                  placeholder="Add study notes..."
                  className="w-full px-3 py-2 border rounded-lg text-sm resize-none"
                  rows={3}
                />
              </div>

              {/* Files */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block flex items-center gap-1">
                  <Paperclip size={14} />
                  Files
                </label>
                {cellFiles.length > 0 && (
                  <div className="space-y-1 mb-2">
                    {cellFiles.map(file => (
                      <div key={file.id} className="flex items-center gap-2 text-sm px-2 py-1 bg-gray-50 rounded">
                        {file._uploading && <Loader2 size={12} className="text-indigo-500 animate-spin shrink-0" />}
                        <span className="truncate flex-1">
                          {file.name}
                          {file._uploading && <span className="text-xs text-indigo-500 ml-1">uploading...</span>}
                        </span>
                        <button onClick={() => handleRemoveFile(file.id)} className="text-red-400 hover:text-red-600">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <button
                  onClick={() => !uploadingFile && fileInputRef.current?.click()}
                  disabled={uploadingFile}
                  className="text-sm text-indigo-600 hover:text-indigo-700 disabled:opacity-50 flex items-center gap-1"
                >
                  {uploadingFile ? <><Loader2 size={14} className="animate-spin" /> Uploading...</> : '+ Add file'}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={uploadingFile}
                />
              </div>

              {/* Links */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block flex items-center gap-1">
                  <Link2 size={14} />
                  Links
                </label>
                {cellLinks.length > 0 && (
                  <div className="space-y-1 mb-2">
                    {cellLinks.map(link => (
                      <div key={link.id} className="flex items-center gap-2 text-sm px-2 py-1 bg-gray-50 rounded">
                        <a href={link.url} target="_blank" rel="noopener noreferrer" className="truncate flex-1 text-blue-600 hover:underline">
                          {link.url}
                        </a>
                        <button onClick={() => handleRemoveLink(link.id)} className="text-red-400 hover:text-red-600">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newLink}
                    onChange={(e) => setNewLink(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddLink()}
                    placeholder="https://..."
                    className="flex-1 px-2 py-1 border rounded text-sm"
                  />
                  <button onClick={handleAddLink} className="text-sm text-indigo-600 hover:text-indigo-700 px-2">
                    Add
                  </button>
                </div>
              </div>

              {/* Comments */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block flex items-center gap-1">
                  <MessageSquare size={14} />
                  Comments ({cellComments.length})
                </label>
                {cellComments.length > 0 && (
                  <div className="space-y-2 mb-2 max-h-32 overflow-y-auto">
                    {cellComments.map(c => (
                      <div key={c.id} className="text-sm bg-gray-50 rounded p-2">
                        <span className="font-medium text-gray-800">{c.author}</span>
                        <span className="text-xs text-gray-400 ml-2">{new Date(c.createdAt).toLocaleString()}</span>
                        <p className="text-gray-600 mt-0.5">{c.text}</p>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
                    placeholder="Add a comment..."
                    className="flex-1 px-2 py-1 border rounded text-sm"
                  />
                  <button onClick={handleAddComment} className="text-sm text-indigo-600 hover:text-indigo-700 px-2">
                    Post
                  </button>
                </div>
              </div>

              {/* Actions */}
              <div className="flex space-x-2 pt-2 border-t">
                {schedule[editingCell] && (
                  <button
                    onClick={handleCellDelete}
                    className="px-4 py-2 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50"
                  >
                    Remove
                  </button>
                )}
                <div className="flex-1" />
                <button
                  onClick={() => setEditingCell(null)}
                  className="px-4 py-2 text-sm text-gray-600 border rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCellSave}
                  className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
