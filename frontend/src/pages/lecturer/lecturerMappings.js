/*
 * Pure helpers for the lecturer dashboard. They only reorder or label real API rows; nothing is invented.
 * Board pinning and greeting helpers are shared with the student area (pages/student/studentMappings.js).
 */

function timeOf(value) {
  const t = Date.parse(value);
  return Number.isNaN(t) ? 0 : t;
}

/** Newest courses first, at most `limit`. Does not mutate `courses`. */
export function recentCourses(courses = [], limit = 3) {
  return courses
    .slice()
    .sort((a, b) => timeOf(b.created_at) - timeOf(a.created_at))
    .slice(0, limit);
}

/** Newest enrolments first, at most `limit`. Does not mutate `enrollments`. */
export function recentEnrollments(enrollments = [], limit = 4) {
  return enrollments
    .slice()
    .sort((a, b) => timeOf(b.enrolled_at) - timeOf(a.enrolled_at))
    .slice(0, limit);
}

/** Display name for an enrolment row: full name, else username, else a numbered fallback. */
export function studentNameFor(enrollment) {
  const d = enrollment?.student_details;
  if (!d) return `User ${enrollment?.student ?? ''}`.trim();
  const full = `${d.first_name || ''} ${d.last_name || ''}`.trim();
  return full || d.username || `User ${enrollment.student}`;
}

/** Two-letter initials for an avatar. Falls back to the first letter of the display name. */
export function initialsFor(enrollment) {
  const d = enrollment?.student_details;
  if (d?.first_name && d?.last_name) return `${d.first_name[0]}${d.last_name[0]}`.toUpperCase();
  const name = studentNameFor(enrollment);
  return name ? name[0].toUpperCase() : '?';
}
