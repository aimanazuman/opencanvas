import { generateId, BLOCK_TYPES, BOARD_TYPES } from './boardHelpers';

export const DEMO_USERS = {
  lecturer: {
    id: 1,
    username: 'lecturer',
    email: 'lecturer@uptm.edu.my',
    first_name: 'Dr. Sarah',
    last_name: 'Johnson',
    role: 'lecturer',
  },
  student1: {
    id: 2,
    username: 'ahmad',
    email: 'ahmad@student.uptm.edu.my',
    first_name: 'Ahmad',
    last_name: 'Razak',
    role: 'student',
  },
  student2: {
    id: 3,
    username: 'siti',
    email: 'siti@student.uptm.edu.my',
    first_name: 'Siti',
    last_name: 'Aminah',
    role: 'student',
  },
};

export const DEMO_COURSES = [
  { id: 1, code: 'CS301', name: 'Web Technologies', lecturer: DEMO_USERS.lecturer },
  { id: 2, code: 'CS202', name: 'Data Structures', lecturer: DEMO_USERS.lecturer },
  { id: 3, code: 'CS303', name: 'Cybersecurity', lecturer: DEMO_USERS.lecturer },
];

export const DEMO_BOARDS = [
  {
    id: 'board-1',
    name: 'Introduction to HTML & CSS',
    type: BOARD_TYPES.LECTURE_NOTES,
    course_name: 'CS301 - Web Technologies',
    is_starred: true,
    is_archived: false,
    updated_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    owner: DEMO_USERS.lecturer,
    sections: [
      {
        id: 's1',
        title: 'Topic',
        blocks: [
          {
            id: 'b1',
            type: BLOCK_TYPES.TEXT,
            content: 'Introduction to HTML5 and CSS3 - Building Modern Web Pages',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
      },
      {
        id: 's2',
        title: 'Content',
        blocks: [
          {
            id: 'b2',
            type: BLOCK_TYPES.TEXT,
            content: 'HTML (HyperText Markup Language) is the standard markup language for creating web pages. It describes the structure of a web page semantically.\n\nKey concepts:\n- Elements and tags\n- Attributes\n- Semantic HTML5 elements\n- Forms and input types',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            id: 'b3',
            type: BLOCK_TYPES.IMAGE,
            src: '',
            caption: 'HTML Document Structure Diagram',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            id: 'b4',
            type: BLOCK_TYPES.VIDEO,
            url: 'https://youtube.com/embed/LGQuIIv2RVA',
            embedUrl: 'https://youtube.com/embed/LGQuIIv2RVA',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
      },
      {
        id: 's3',
        title: 'Summary',
        blocks: [
          {
            id: 'b5',
            type: BLOCK_TYPES.TEXT,
            content: 'In this lecture, we covered the fundamentals of HTML5 document structure and CSS3 styling. Students should now understand how to create basic web pages with proper semantic markup.',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
      },
      {
        id: 's4',
        title: 'Resources',
        blocks: [],
      },
    ],
    comments: {
      'b2': [
        {
          id: 'c1',
          text: 'Could you provide more examples of semantic HTML5 elements?',
          user: { id: 2, name: 'Ahmad Razak', avatar: 'AR' },
          createdAt: new Date(Date.now() - 3600000).toISOString(),
        },
        {
          id: 'c2',
          text: 'Great question! I will add more examples in the next lecture.',
          user: { id: 1, name: 'Dr. Sarah Johnson', avatar: 'SJ' },
          createdAt: new Date(Date.now() - 1800000).toISOString(),
        },
      ],
    },
  },
  {
    id: 'board-2',
    name: 'Weekly Study Schedule',
    type: BOARD_TYPES.STUDY_PLANNER,
    course_name: null,
    is_starred: false,
    is_archived: false,
    updated_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    owner: DEMO_USERS.student1,
    weeklyGoals: {
      '2026-01-26': [
        'Complete CS301 assignment',
        'Review Data Structures notes',
        'Start Cybersecurity lab report',
      ],
    },
    schedule: {
      '2026-01-26_09': { id: 'e1', subject: 'CS301 - Web Tech', color: '#6366f1', notes: 'Review HTML5 semantics before class', files: [], links: [{ id: 'l1', url: 'https://developer.mozilla.org/en-US/docs/Web/HTML' }], done: false, reminderAt: null, comments: [] },
      '2026-01-26_11': { id: 'e2', subject: 'CS202 - Data Structures', color: '#10b981', notes: 'Bring printed notes on sorting algorithms', files: [], links: [], done: false, reminderAt: '2026-01-27T10:30', comments: [{ id: 'sc1', text: 'Quiz announced for this session!', author: 'Ahmad Razak', createdAt: new Date(Date.now() - 86400000).toISOString() }] },
      '2026-01-26_14': { id: 'e3', subject: 'Study Session', color: '#f59e0b', notes: '', files: [], links: [], done: true, reminderAt: null, comments: [] },
      '2026-01-27_09': { id: 'e4', subject: 'CS303 - Cybersecurity', color: '#ef4444', notes: 'Lab report due next week', files: [], links: [], done: false, reminderAt: null, comments: [] },
      '2026-01-27_14': { id: 'e5', subject: 'CS301 - Lab', color: '#6366f1', notes: '', files: [], links: [], done: false, reminderAt: null, comments: [] },
      '2026-01-28_09': { id: 'e6', subject: 'CS301 - Web Tech', color: '#6366f1', notes: '', files: [], links: [], done: true, reminderAt: null, comments: [] },
      '2026-01-28_11': { id: 'e7', subject: 'CS202 - Data Structures', color: '#10b981', notes: '', files: [], links: [], done: false, reminderAt: null, comments: [] },
      '2026-01-29_09': { id: 'e8', subject: 'CS303 - Cybersecurity', color: '#ef4444', notes: '', files: [], links: [], done: false, reminderAt: null, comments: [] },
      '2026-01-29_14': { id: 'e9', subject: 'Group Study', color: '#8b5cf6', notes: 'Meet at library room 3B', files: [], links: [], done: false, reminderAt: '2026-01-29T13:45', comments: [] },
      '2026-01-30_09': { id: 'e10', subject: 'CS202 - Lab', color: '#10b981', notes: '', files: [], links: [], done: false, reminderAt: null, comments: [] },
      '2026-01-30_14': { id: 'e11', subject: 'Free Study', color: '#f59e0b', notes: '', files: [], links: [], done: false, reminderAt: null, comments: [] },
    },
  },
  {
    id: 'board-3',
    name: 'Algorithm Study Notes',
    type: BOARD_TYPES.LECTURE_NOTES,
    course_name: 'CS202 - Data Structures',
    is_starred: true,
    is_archived: false,
    updated_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    owner: DEMO_USERS.lecturer,
    sections: [
      {
        id: 's1',
        title: 'Topic',
        blocks: [
          {
            id: 'b10',
            type: BLOCK_TYPES.TEXT,
            content: 'Sorting Algorithms - Comparison and Analysis',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
      },
      {
        id: 's2',
        title: 'Content',
        blocks: [
          {
            id: 'b11',
            type: BLOCK_TYPES.TEXT,
            content: 'We will explore the following sorting algorithms:\n\n1. Bubble Sort - O(n^2)\n2. Selection Sort - O(n^2)\n3. Merge Sort - O(n log n)\n4. Quick Sort - O(n log n) average\n5. Heap Sort - O(n log n)\n\nEach algorithm has trade-offs in terms of time complexity, space complexity, and stability.',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
      },
      {
        id: 's3',
        title: 'Summary',
        blocks: [],
      },
    ],
    comments: {},
  },
  {
    id: 'board-4',
    name: 'Sprint Planning Board',
    type: BOARD_TYPES.KANBAN,
    course_name: 'CS301 - Web Technologies',
    is_starred: false,
    is_archived: false,
    updated_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    owner: DEMO_USERS.lecturer,
    columns: [
      {
        id: 'col-1',
        title: 'To Do',
        color: '#6b7280',
        cards: [
          {
            id: 'card-1',
            content: 'Design the database schema for user authentication',
            type: 'text',
            imageUrl: '',
            videoUrl: '',
            linkUrl: '',
            comments: [
              {
                id: 'cc1',
                text: 'Should we use JWT or session-based auth?',
                user: { id: 2, name: 'Ahmad Razak', avatar: 'AR' },
                createdAt: new Date(Date.now() - 7200000).toISOString(),
              },
            ],
            createdAt: new Date().toISOString(),
            author: { id: 2, name: 'Ahmad Razak', avatar: 'AR' },
          },
          {
            id: 'card-2',
            content: 'Create wireframes for the dashboard page',
            type: 'text',
            imageUrl: '',
            videoUrl: '',
            linkUrl: '',
            comments: [],
            createdAt: new Date().toISOString(),
            author: { id: 3, name: 'Siti Aminah', avatar: 'SA' },
          },
          {
            id: 'card-3',
            content: 'Write unit tests for the API endpoints',
            type: 'text',
            imageUrl: '',
            videoUrl: '',
            linkUrl: '',
            comments: [],
            createdAt: new Date().toISOString(),
            author: null,
          },
        ],
      },
      {
        id: 'col-2',
        title: 'In Progress',
        color: '#3b82f6',
        cards: [
          {
            id: 'card-4',
            content: 'Implement the REST API for board CRUD operations',
            type: 'text',
            imageUrl: '',
            videoUrl: '',
            linkUrl: '',
            comments: [],
            createdAt: new Date().toISOString(),
            author: { id: 2, name: 'Ahmad Razak', avatar: 'AR' },
          },
          {
            id: 'card-5',
            content: 'Set up the React frontend with routing',
            type: 'text',
            imageUrl: '',
            videoUrl: '',
            linkUrl: '',
            comments: [
              {
                id: 'cc2',
                text: 'Using React Router v6 for this',
                user: { id: 3, name: 'Siti Aminah', avatar: 'SA' },
                createdAt: new Date(Date.now() - 3600000).toISOString(),
              },
            ],
            createdAt: new Date().toISOString(),
            author: { id: 3, name: 'Siti Aminah', avatar: 'SA' },
          },
        ],
      },
      {
        id: 'col-3',
        title: 'Done',
        color: '#22c55e',
        cards: [
          {
            id: 'card-6',
            content: 'Set up Django project and PostgreSQL database',
            type: 'text',
            imageUrl: '',
            videoUrl: '',
            linkUrl: '',
            comments: [],
            createdAt: new Date().toISOString(),
            author: { id: 2, name: 'Ahmad Razak', avatar: 'AR' },
          },
          {
            id: 'card-7',
            content: 'Configure Docker environment for development',
            type: 'text',
            imageUrl: '',
            videoUrl: '',
            linkUrl: '',
            comments: [],
            createdAt: new Date().toISOString(),
            author: { id: 1, name: 'Dr. Sarah Johnson', avatar: 'SJ' },
          },
        ],
      },
    ],
  },
  {
    id: 'board-5',
    name: 'Network Security Concepts',
    type: BOARD_TYPES.LECTURE_NOTES,
    course_name: 'CS303 - Cybersecurity',
    is_starred: true,
    is_archived: false,
    updated_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    owner: DEMO_USERS.lecturer,
    sections: [
      { id: 's1', title: 'Topic', blocks: [{ id: 'b20', type: BLOCK_TYPES.TEXT, content: 'Network Security Fundamentals', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }] },
      { id: 's2', title: 'Content', blocks: [{ id: 'b21', type: BLOCK_TYPES.TEXT, content: 'Topics covered:\n- Firewalls and IDS/IPS\n- VPN technologies\n- SSL/TLS protocols\n- Common attack vectors\n- Defense in depth strategy', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }] },
      { id: 's3', title: 'Summary', blocks: [] },
    ],
    comments: {},
  },
  {
    id: 'board-6',
    name: 'Project Task Tracker',
    type: BOARD_TYPES.KANBAN,
    course_name: 'CS202 - Data Structures',
    is_starred: false,
    is_archived: false,
    updated_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    owner: DEMO_USERS.student1,
    columns: [
      { id: 'col-a', title: 'Backlog', color: '#6b7280', cards: [{ id: 'ck1', content: 'Research linked list implementations', type: 'text', imageUrl: '', videoUrl: '', linkUrl: '', comments: [], createdAt: new Date().toISOString(), author: null }] },
      { id: 'col-b', title: 'In Progress', color: '#f59e0b', cards: [] },
      { id: 'col-c', title: 'Review', color: '#8b5cf6', cards: [] },
      { id: 'col-d', title: 'Done', color: '#22c55e', cards: [] },
    ],
  },
  {
    id: 'board-7',
    name: 'Learning Hub - Web Technologies',
    type: BOARD_TYPES.LECTURE_NOTES,
    course_name: 'CS301 - Web Technologies',
    is_starred: true,
    is_archived: false,
    updated_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    owner: DEMO_USERS.lecturer,
    sections: [
      {
        id: 's7-1',
        title: 'Topic',
        blocks: [
          {
            id: 'b7-1',
            type: BLOCK_TYPES.TEXT,
            content: 'Week 5: JavaScript Fundamentals - Variables, Functions & DOM Manipulation',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
      },
      {
        id: 's7-2',
        title: 'Announcements',
        blocks: [
          {
            id: 'b7-ann1',
            type: 'announcement',
            title: 'Mid-term Exam Postponed',
            content: 'The mid-term exam originally scheduled for Week 7 has been moved to Week 8. Please use the extra time to review Chapters 4-6.',
            priority: 'urgent',
            createdAt: new Date(Date.now() - 3600000).toISOString(),
            updatedAt: new Date(Date.now() - 3600000).toISOString(),
          },
          {
            id: 'b7-ann2',
            type: 'announcement',
            title: 'Guest Lecture Next Week',
            content: 'We will have a guest speaker from Google Malaysia discussing modern web development practices. Attendance is mandatory.',
            priority: 'normal',
            createdAt: new Date(Date.now() - 86400000).toISOString(),
            updatedAt: new Date(Date.now() - 86400000).toISOString(),
          },
        ],
      },
      {
        id: 's7-3',
        title: 'Content',
        blocks: [
          {
            id: 'b7-2',
            type: BLOCK_TYPES.TEXT,
            content: 'JavaScript is a dynamic programming language that enables interactive web pages.\n\nKey Topics:\n- Variable declarations (var, let, const)\n- Functions and arrow functions\n- DOM selection and manipulation\n- Event handling\n- ES6+ features',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            id: 'b7-audio1',
            type: 'audio',
            audioName: 'Lecture Recording - JS Basics.mp3',
            audioUrl: '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            id: 'b7-link1',
            type: 'link-embed',
            linkUrl: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide',
            linkTitle: 'MDN JavaScript Guide',
            embed: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
      },
      {
        id: 's7-4',
        title: 'Resources',
        blocks: [
          {
            id: 'b7-meet1',
            type: 'google-meet',
            meetUrl: 'https://meet.google.com/abc-defg-hij',
            title: 'Weekly Q&A Session',
            scheduledAt: '2026-01-30T14:00',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            id: 'b7-res1',
            type: 'resource-library',
            title: 'Week 5 Materials',
            files: [
              { id: 'rf1', name: 'JS_Fundamentals_Slides.pptx', size: 2456000, url: '', addedAt: new Date().toISOString() },
              { id: 'rf2', name: 'DOM_Cheatsheet.pdf', size: 345000, url: '', addedAt: new Date().toISOString() },
              { id: 'rf3', name: 'Exercise_Set_5.docx', size: 128000, url: '', addedAt: new Date().toISOString() },
            ],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            id: 'b7-prog1',
            type: 'progress-tracker',
            title: 'Week 5 Progress',
            students: [
              { name: 'Ahmad Razak', viewed: true, submitted: true },
              { name: 'Siti Aminah', viewed: true, submitted: false },
              { name: 'Lee Wei Ming', viewed: false, submitted: false },
              { name: 'Priya Nair', viewed: true, submitted: true },
              { name: 'Muhammad Hafiz', viewed: true, submitted: false },
            ],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
      },
      {
        id: 's7-6',
        title: 'Student Resources',
        blocks: [
          {
            id: 'b7-file1',
            type: BLOCK_TYPES.FILE,
            fileName: 'my_js_notes.pdf',
            fileSize: '245 KB',
            fileUrl: '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
      },
    ],
    comments: {
      'b7-2': [
        {
          id: 'c7-1',
          text: 'Is there a recommended IDE for JavaScript development?',
          user: { id: 2, name: 'Ahmad Razak', avatar: 'AR' },
          createdAt: new Date(Date.now() - 7200000).toISOString(),
        },
        {
          id: 'c7-2',
          text: 'VS Code is highly recommended. Install the ESLint and Prettier extensions.',
          user: { id: 1, name: 'Dr. Sarah Johnson', avatar: 'SJ' },
          createdAt: new Date(Date.now() - 3600000).toISOString(),
        },
      ],
    },
    personalNotes: {
      '2_b7-2': 'Remember to practice DOM manipulation exercises before the quiz!',
    },
    bookmarks: {
      '2': ['b7-2', 'b7-assign1'],
    },
  },
];

export function getDemoBoardById(id) {
  return DEMO_BOARDS.find(b => b.id === id) || null;
}

export function createEmptyBoard(type, name = 'Untitled Board') {
  const base = {
    id: generateId(),
    name,
    type,
    course_name: null,
    is_starred: false,
    is_archived: false,
    updated_at: new Date().toISOString(),
    owner: null,
    comments: {},
  };

  switch (type) {
    case BOARD_TYPES.COURSE_MATERIAL:
    case BOARD_TYPES.LECTURE_NOTES: // legacy support
      return {
        ...base,
        type: BOARD_TYPES.COURSE_MATERIAL,
        sections: [
          { id: generateId(), title: 'Topic', blocks: [] },
          { id: generateId(), title: 'Announcements', blocks: [] },
          { id: generateId(), title: 'Content', blocks: [] },
          { id: generateId(), title: 'Resources', blocks: [] },
          { id: generateId(), title: 'Summary', blocks: [] },
          { id: generateId(), title: 'Student Resources', blocks: [] },
        ],
        personalNotes: {},
        bookmarks: {},
      };
    case BOARD_TYPES.STUDENT_NOTES:
      return {
        ...base,
        sections: [
          { id: generateId(), title: 'My Ideas', blocks: [] },
          { id: generateId(), title: 'Questions', blocks: [] },
          { id: generateId(), title: 'Key Points', blocks: [] },
          { id: generateId(), title: 'References', blocks: [] },
          { id: generateId(), title: 'Shared Notes', blocks: [] },
        ],
        personalNotes: {},
        bookmarks: {},
      };
    case BOARD_TYPES.STUDY_PLANNER:
      return {
        ...base,
        weeklyGoals: ['', '', ''],
        schedule: {},
      };
    case BOARD_TYPES.KANBAN:
      return {
        ...base,
        columns: [
          { id: generateId(), title: 'To Do', color: '#6b7280', cards: [] },
          { id: generateId(), title: 'In Progress', color: '#3b82f6', cards: [] },
          { id: generateId(), title: 'Done', color: '#22c55e', cards: [] },
        ],
      };
    case BOARD_TYPES.QUIZ:
      return {
        ...base,
        questions: [],
        quizSettings: { shuffleQuestions: false, showResults: true, allowRetake: false },
        responses: {},
      };
    default:
      return base;
  }
}
