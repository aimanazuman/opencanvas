import { recentCourses, recentEnrollments, studentNameFor, initialsFor } from './lecturerMappings';

describe('recentCourses', () => {
  const courses = [
    { id: 1, created_at: '2026-01-10T09:00:00Z' },
    { id: 2, created_at: '2026-03-02T09:00:00Z' },
    { id: 3, created_at: 'not a date' },
    { id: 4, created_at: '2026-02-01T09:00:00Z' },
  ];

  test('returns the newest first, at most the limit, and does not mutate the input', () => {
    const before = courses.map((c) => c.id);
    const result = recentCourses(courses, 2);
    expect(result.map((c) => c.id)).toEqual([2, 4]);
    expect(courses.map((c) => c.id)).toEqual(before);
  });

  test('a missing or invalid date sorts last', () => {
    expect(recentCourses(courses, 10).map((c) => c.id)).toEqual([2, 4, 1, 3]);
  });

  test('an empty or missing list gives an empty result', () => {
    expect(recentCourses([])).toEqual([]);
    expect(recentCourses(undefined)).toEqual([]);
  });
});

describe('recentEnrollments', () => {
  test('sorts by enrolled_at, newest first, with a default limit of four', () => {
    const rows = [1, 2, 3, 4, 5].map((n) => ({ id: n, enrolled_at: `2026-01-0${n}T00:00:00Z` }));
    expect(recentEnrollments(rows).map((r) => r.id)).toEqual([5, 4, 3, 2]);
    expect(rows[0].id).toBe(1);
  });
});

describe('studentNameFor', () => {
  test('uses the full name when both parts exist', () => {
    expect(studentNameFor({ student: 5, student_details: { first_name: 'Grace', last_name: 'Hopper', username: 'g' } }))
      .toBe('Grace Hopper');
  });

  test('falls back to the username, then to a numbered label', () => {
    expect(studentNameFor({ student: 5, student_details: { first_name: '', last_name: '', username: 'grace' } })).toBe('grace');
    expect(studentNameFor({ student: 5 })).toBe('User 5');
  });
});

describe('initialsFor', () => {
  test('uses first and last initials when both names exist, upper-cased', () => {
    expect(initialsFor({ student: 5, student_details: { first_name: 'grace', last_name: 'hopper', username: 'g' } })).toBe('GH');
  });

  test('falls back to the first letter of the display name', () => {
    expect(initialsFor({ student: 5, student_details: { username: 'alan' } })).toBe('A');
    expect(initialsFor({})).toBe('U');
    expect(initialsFor(undefined)).toBe('U');
  });
});
