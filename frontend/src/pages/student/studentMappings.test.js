/**
 * Student-area mappings: every template and board type resolves to literal class strings in the allowed
 * hues, no template-literal colour class survives in the student pages, and the pure helpers behave.
 */
import fs from 'fs';
import path from 'path';
import TEMPLATES from '../../utils/templateDefinitions';
import { BOARD_TYPES } from '../../utils/boardHelpers';
import {
  getTypeStyle, getTypeStyleOrFallback, spineFor, courseStatus, greetingFor, dateLabelFor,
  pickPinned, pickRecent, CHIP_CLASS,
} from './studentMappings';

// Allowed hue families for the student area (azure is the `accent` key).
const ALLOWED_HUES = ['accent', 'teal', 'green', 'amber', 'orange', 'slate'];
const COLOUR_TOKEN = /\b(?:bg|text|border|ring|fill|outline)-([a-z]+)-\d{2,3}\b/g;
const FORBIDDEN_HUE = /\b(indigo|purple|violet|pink|rose|fuchsia|magenta|lavender|yellow|cyan|emerald|red|blue|sky)-\d{2,3}\b/;

const STUDENT_DIR = __dirname;
const STUDENT_FILES = ['StudentDashboardPage.jsx', 'StudentCoursesPage.jsx', 'StudentCoursePage.jsx', 'studentMappings.js'];

function colourFamilies(classString) {
  const found = [];
  let m;
  COLOUR_TOKEN.lastIndex = 0;
  while ((m = COLOUR_TOKEN.exec(classString)) !== null) found.push(m[1]);
  return found;
}

function styleClasses(style) {
  return [style.chip, style.tile, style.glyph].join(' ');
}

describe('template and board type mappings', () => {
  test.each(TEMPLATES.map((t) => [t.id, t]))('template %s resolves to a style', (id) => {
    const style = getTypeStyle(id);
    expect(style).not.toBeNull();
    expect(typeof style.chip).toBe('string');
    expect(style.chip.length).toBeGreaterThan(0);
    expect(style.tile.length).toBeGreaterThan(0);
    expect(style.glyph.length).toBeGreaterThan(0);
  });

  test.each(Object.values(BOARD_TYPES).map((t) => [t]))('board type %s resolves to a style with an icon', (type) => {
    const style = getTypeStyle(type);
    expect(style).not.toBeNull();
    expect(style.icon).toBeTruthy();
    expect(style.label).toEqual(expect.any(String));
  });

  test('every mapped colour uses only the allowed hues', () => {
    Object.values(BOARD_TYPES).forEach((type) => {
      const families = colourFamilies(styleClasses(getTypeStyle(type)));
      expect(families.length).toBeGreaterThan(0);
      families.forEach((family) => expect(ALLOWED_HUES).toContain(family));
    });
  });

  test('unknown type has no chip and falls back to the neutral folder style', () => {
    expect(getTypeStyle('does-not-exist')).toBeNull();
    expect(getTypeStyle('constructor')).toBeNull();
    const fallback = getTypeStyleOrFallback('does-not-exist');
    expect(fallback.icon).toBeTruthy();
    expect(fallback.tile).toBe('bg-slate-200');
  });

  test('the chip layout class is a literal string', () => {
    expect(CHIP_CLASS).toContain('rounded-full');
  });
});

describe('no template-literal colour classes in the student area', () => {
  const source = (file) => fs.readFileSync(path.join(STUDENT_DIR, file), 'utf8');

  test.each(STUDENT_FILES.map((f) => [f]))('%s has no dynamic colour class and no forbidden hue', (file) => {
    const text = source(file);
    expect(text).not.toMatch(/\b(?:bg|text|border|ring|fill|from|to|via|outline|stroke)-\$\{/);
    expect(text).not.toMatch(/className=\{`[^`]*\$\{/);
    expect(text).not.toMatch(FORBIDDEN_HUE);
  });

  test('the dashboard keeps its badge and template classes literal', () => {
    const text = source('StudentDashboardPage.jsx');
    expect(text).not.toMatch(/\b(?:bg|text|border|ring|fill)-\$\{/);
    expect(text).not.toMatch(/badge\.(bg|text)\b/);
    expect(text).toMatch(/getTypeStyle/);
  });
});

describe('course cards', () => {
  test('spineFor returns an allowed hue and is stable per course id', () => {
    [1, 2, 3, 7, 42, 1001].forEach((id) => {
      const spine = spineFor(id);
      expect(spine).toBe(spineFor(id));
      expect(spine).toMatch(/^bg-[a-z]+-\d{3}$/);
      expect(ALLOWED_HUES).toContain(colourFamilies(spine)[0]);
    });
  });

  test('spineFor copes with a missing id', () => {
    expect(spineFor(undefined)).toMatch(/^bg-/);
  });

  // Local-time dates: 20 October 2026 at 10:00 local.
  const now = new Date(2026, 9, 20, 10, 0);

  test('course status is active when today is inside the course dates', () => {
    expect(courseStatus({ is_active: true, start_date: '2026-10-01', end_date: '2026-12-20' }, now).key).toBe('active');
  });

  test('a course starting today is active, not upcoming (date parsed as local day)', () => {
    expect(courseStatus({ start_date: '2026-10-20' }, now).key).toBe('active');
  });

  test('a course that starts later is upcoming, and one that ended is ended', () => {
    expect(courseStatus({ start_date: '2026-11-02' }, now).key).toBe('upcoming');
    expect(courseStatus({ end_date: '2026-10-19' }, now).key).toBe('ended');
  });

  test('an inactive course wins over its dates', () => {
    expect(courseStatus({ is_active: false, start_date: '2026-10-01' }, now).key).toBe('inactive');
  });

  test('a course without dates is active', () => {
    expect(courseStatus({}, now).key).toBe('active');
    expect(courseStatus(undefined, now).key).toBe('active');
  });

  test('every status has an icon and a label for the badge', () => {
    ['active', 'upcoming', 'ended', 'inactive'].forEach((key) => {
      const sample = {
        active: {}, upcoming: { start_date: '2026-11-02' }, ended: { end_date: '2026-10-01' }, inactive: { is_active: false },
      }[key];
      const status = courseStatus(sample, now);
      expect(status.icon).toBeTruthy();
      expect(status.label.length).toBeGreaterThan(0);
    });
  });
});

describe('dashboard helpers', () => {
  test('greeting uses the time of day and the name when given', () => {
    expect(greetingFor(new Date(2026, 9, 20, 8), 'Ahmad')).toBe('Good morning, Ahmad');
    expect(greetingFor(new Date(2026, 9, 20, 14), 'Ahmad')).toBe('Good afternoon, Ahmad');
    expect(greetingFor(new Date(2026, 9, 20, 21), 'Ahmad')).toBe('Good evening, Ahmad');
    expect(greetingFor(new Date(2026, 9, 20, 8), '   ')).toBe('Good morning');
    expect(greetingFor(new Date(2026, 9, 20, 8))).toBe('Good morning');
  });

  test('date label names the weekday, day and month', () => {
    const label = dateLabelFor(new Date(2026, 9, 20, 12), 'en-US');
    expect(label).toContain('Tuesday');
    expect(label).toContain('October');
    expect(label).toContain('20');
  });

  const boards = [
    { id: 1, name: 'A', is_starred: false, updated_at: '2026-10-01T10:00:00Z' },
    { id: 2, name: 'B', is_starred: true, updated_at: '2026-09-01T10:00:00Z' },
    { id: 3, name: 'C', is_starred: false, updated_at: '2026-10-10T10:00:00Z' },
    { id: 4, name: 'D', is_starred: true, updated_at: '2026-10-05T10:00:00Z' },
    { id: 5, name: 'E', is_starred: false, updated_at: 'not a date' },
  ];

  test('pickPinned returns starred boards in order, capped', () => {
    expect(pickPinned(boards).map((b) => b.id)).toEqual([2, 4]);
    expect(pickPinned(boards, 1).map((b) => b.id)).toEqual([2]);
    expect(pickPinned([])).toEqual([]);
  });

  test('pickRecent sorts by update time, skips excluded ids, and does not mutate the input', () => {
    const before = boards.map((b) => b.id);
    expect(pickRecent(boards, new Set([2, 4])).map((b) => b.id)).toEqual([3, 1, 5]);
    expect(pickRecent(boards, new Set(), 2).map((b) => b.id)).toEqual([3, 4]);
    expect(boards.map((b) => b.id)).toEqual(before);
  });
});
