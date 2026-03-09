import { BOARD_TYPES } from './boardHelpers';
import { createEmptyBoard } from './mockData';

export const TEMPLATES = [
  {
    id: 'course-material',
    name: 'Course Material',
    type: BOARD_TYPES.COURSE_MATERIAL,
    description: 'Structured template for organizing course content with sections for topics, announcements, resources, and summaries.',
    color: 'indigo',
    features: ['Topic & content sections', 'Video & image embedding', 'Resource library', 'Student comments'],
    preview: 'A vertical, single-column layout for lecturers to share course material. Students can comment on blocks and collaborate.',
    allowedRoles: ['lecturer', 'admin'],
  },
  {
    id: 'student-notes',
    name: 'Student Notes',
    type: BOARD_TYPES.STUDENT_NOTES,
    description: 'Structured template for students to brainstorm ideas, take notes, and share their views with lecturers.',
    color: 'emerald',
    features: ['My Ideas section', 'Questions for lecturer', 'Key points summary', 'Shared notes for review'],
    preview: 'A structured board with sections for brainstorming, questions, key points, references, and notes to share with your lecturer.',
    allowedRoles: ['student'],
  },
  {
    id: 'study-planner',
    name: 'Study Planner',
    type: BOARD_TYPES.STUDY_PLANNER,
    description: 'Weekly timetable grid to plan and track study sessions with color-coded subjects.',
    color: 'teal',
    features: ['Weekly timetable grid', 'Color-coded subjects', 'Weekly goals section', 'Click to add entries'],
    preview: 'An editable weekly schedule with time slots from 08:00 to 22:00. Click any cell to add or edit a subject entry.',
    allowedRoles: null, // all roles
  },
  {
    id: 'kanban',
    name: 'Kanban Board',
    type: BOARD_TYPES.KANBAN,
    description: 'Column-based workflow board for tracking tasks and project progress.',
    color: 'cyan',
    features: ['Customizable columns', 'Card creation', 'Card detail view', 'Comments on cards'],
    preview: 'A horizontal scrolling board with columns for different workflow stages. Add cards with text, images, or links.',
    allowedRoles: null, // all roles
  },
  {
    id: 'quiz',
    name: 'Quiz',
    type: BOARD_TYPES.QUIZ,
    description: 'Interactive quiz with multiple question types, timers, scoring, and a leaderboard.',
    color: 'rose',
    features: ['Multiple choice questions', 'True/False questions', 'Fill-in-the-blank', 'Timer & scoring', 'Leaderboard'],
    preview: 'Create interactive quizzes with timed questions. Students answer one question at a time with a countdown timer. View scores and leaderboard.',
    allowedRoles: ['lecturer', 'admin'],
  },
];

export function getTemplateById(templateId) {
  return TEMPLATES.find(t => t.id === templateId) || null;
}

export function getTemplatesForRole(role) {
  return TEMPLATES.filter(t => !t.allowedRoles || t.allowedRoles.includes(role));
}

export function createBoardFromTemplate(templateId, name) {
  const template = getTemplateById(templateId);
  if (!template) return null;
  const boardName = name || `New ${template.name}`;
  return createEmptyBoard(template.type, boardName);
}

export default TEMPLATES;
