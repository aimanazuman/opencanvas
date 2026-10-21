import { BookOpen, Lightbulb, Calendar, Layout, HelpCircle, Folder, Clock, CheckCircle, Archive, AlertTriangle } from 'lucide-react';
import { BOARD_TYPES } from '../../utils/boardHelpers';

/*
 * Static lookup maps for the student area. Every class name is a full literal string: Tailwind's content
 * scanner cannot see template-literal class names, and they vanish from the production build.
 * Hues used here: accent (azure), teal, green, amber, orange, slate. Nothing else.
 */

// Keyed by board type. Template ids equal board types, so one map serves the create modal and the cards.
const TYPE_STYLE = {
  [BOARD_TYPES.COURSE_MATERIAL]: {
    label: 'Course Material', icon: BookOpen, chip: 'bg-accent-100 text-accent-700', tile: 'bg-accent-100', glyph: 'text-accent-600',
  },
  // Legacy alias of course material.
  [BOARD_TYPES.LECTURE_NOTES]: {
    label: 'Course Material', icon: BookOpen, chip: 'bg-accent-100 text-accent-700', tile: 'bg-accent-100', glyph: 'text-accent-600',
  },
  [BOARD_TYPES.STUDENT_NOTES]: {
    label: 'Student Notes', icon: Lightbulb, chip: 'bg-green-100 text-green-700', tile: 'bg-green-100', glyph: 'text-green-700',
  },
  [BOARD_TYPES.STUDY_PLANNER]: {
    label: 'Study Planner', icon: Calendar, chip: 'bg-teal-100 text-teal-700', tile: 'bg-teal-100', glyph: 'text-teal-700',
  },
  [BOARD_TYPES.KANBAN]: {
    label: 'Kanban', icon: Layout, chip: 'bg-slate-200 text-slate-700', tile: 'bg-slate-200', glyph: 'text-slate-700',
  },
  [BOARD_TYPES.QUIZ]: {
    label: 'Quiz', icon: HelpCircle, chip: 'bg-orange-100 text-orange-700', tile: 'bg-orange-100', glyph: 'text-orange-700',
  },
};

/** Shared layout classes for the board-type chip. The colour comes from the style's `chip`. */
export const CHIP_CLASS = 'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium';

const FALLBACK_STYLE = {
  label: '', icon: Folder, chip: 'bg-slate-200 text-slate-700', tile: 'bg-slate-200', glyph: 'text-slate-700',
};

/** Style for a board type or template id. Returns null for an unknown type (callers decide the fallback). */
export function getTypeStyle(type) {
  return Object.prototype.hasOwnProperty.call(TYPE_STYLE, type) ? TYPE_STYLE[type] : null;
}

/** Style for a board type, with the neutral folder fallback for unknown types. */
export function getTypeStyleOrFallback(type) {
  return getTypeStyle(type) || FALLBACK_STYLE;
}

// Spine colours for course cards. Chosen by course id, so a course keeps its colour between visits.
const SPINE = ['bg-accent-600', 'bg-green-600', 'bg-teal-600', 'bg-orange-500', 'bg-amber-500', 'bg-slate-500'];

export function spineFor(courseId) {
  const n = Math.abs(Number(courseId)) || 0;
  return SPINE[n % SPINE.length];
}

// Course status badges (ChalkBadge props). Tone and icon carry the meaning, not colour alone.
const COURSE_STATUS = {
  inactive: { label: 'Inactive', icon: AlertTriangle, tone: 'warning' },
  upcoming: { label: 'Upcoming', icon: Clock, tone: 'neutral' },
  active: { label: 'Active', icon: CheckCircle, tone: 'success' },
  ended: { label: 'Ended', icon: Archive, tone: 'neutral' },
};

// Parses a YYYY-MM-DD string as a local calendar day (new Date('2026-10-20') would be UTC midnight).
function parseDay(value) {
  if (typeof value !== 'string') return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

/** Course status from the real course fields: is_active, start_date and end_date. */
export function courseStatus(course, now = new Date()) {
  if (course && course.is_active === false) return { key: 'inactive', ...COURSE_STATUS.inactive };
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const start = parseDay(course?.start_date);
  const end = parseDay(course?.end_date);
  if (end && today > end) return { key: 'ended', ...COURSE_STATUS.ended };
  if (start && today < start) return { key: 'upcoming', ...COURSE_STATUS.upcoming };
  return { key: 'active', ...COURSE_STATUS.active };
}

/** Greeting line for the chalkboard banner. The name is optional. */
export function greetingFor(now = new Date(), name = '') {
  const hour = now.getHours();
  const part = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const clean = String(name || '').trim();
  return clean ? `${part}, ${clean}` : part;
}

/** Today's date as words, for example "Tuesday, 20 October" (locale from the browser unless given). */
export function dateLabelFor(now = new Date(), locale) {
  return now.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' });
}

function updatedTime(board) {
  const t = Date.parse(board.updated_at);
  return Number.isNaN(t) ? 0 : t;
}

/** Starred boards, in the order given, at most `limit`. */
export function pickPinned(boards, limit = 3) {
  return boards.filter((b) => b.is_starred).slice(0, limit);
}

/** Most recently updated boards that are not already pinned, at most `limit`. Does not mutate `boards`. */
export function pickRecent(boards, excludeIds = new Set(), limit = 3) {
  return boards
    .filter((b) => !excludeIds.has(b.id))
    .slice()
    .sort((a, b) => updatedTime(b) - updatedTime(a))
    .slice(0, limit);
}
