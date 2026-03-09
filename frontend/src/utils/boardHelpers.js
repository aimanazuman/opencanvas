import { v4 as uuidv4 } from 'uuid';

export function generateId() {
  return uuidv4();
}

export const BLOCK_TYPES = {
  TEXT: 'text',
  IMAGE: 'image',
  VIDEO: 'video',
  FILE: 'file',
  AUDIO: 'audio',
  LINK_EMBED: 'link-embed',
  PERSONAL_NOTE: 'personal-note',
  ANNOUNCEMENT: 'announcement',
  RESOURCE_LIBRARY: 'resource-library',
  PROGRESS_TRACKER: 'progress-tracker',
  GOOGLE_MEET: 'google-meet',
};

export const BOARD_TYPES = {
  COURSE_MATERIAL: 'course-material',
  LECTURE_NOTES: 'lecture-notes', // legacy alias
  STUDY_PLANNER: 'study-planner',
  KANBAN: 'kanban',
  STUDENT_NOTES: 'student-notes',
  QUIZ: 'quiz',
};

export function createBlock(type, data = {}) {
  return {
    id: generateId(),
    type,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...data,
  };
}

export function createTextBlock(content = '') {
  return createBlock(BLOCK_TYPES.TEXT, { content });
}

export function createImageBlock(src = '', caption = '') {
  return createBlock(BLOCK_TYPES.IMAGE, { src, caption });
}

export function createVideoBlock(url = '') {
  return createBlock(BLOCK_TYPES.VIDEO, { url, embedUrl: getVideoEmbedUrl(url) });
}

export function createFileBlock(name = '', size = '', url = '') {
  return createBlock(BLOCK_TYPES.FILE, { fileName: name, fileSize: size, fileUrl: url });
}

export function createComment(text, user) {
  return {
    id: generateId(),
    text,
    user: {
      id: user.id,
      name: user.first_name + ' ' + user.last_name,
      avatar: (user.first_name?.[0] || '') + (user.last_name?.[0] || ''),
    },
    createdAt: new Date().toISOString(),
  };
}

export function createKanbanColumn(title, color = '#6366f1') {
  return {
    id: generateId(),
    title,
    color,
    cards: [],
  };
}

export function createKanbanCard(content = '', type = 'text') {
  return {
    id: generateId(),
    title: '',
    content,
    type,
    imageUrl: '',
    videoUrl: '',
    linkUrl: '',
    files: [],
    comments: [],
    likes: [],
    createdAt: new Date().toISOString(),
    author: null,
  };
}

export function getVideoEmbedUrl(url) {
  if (!url) return '';
  const youtubeMatch = url.match(
    /(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/
  );
  if (youtubeMatch) {
    return `https://www.youtube.com/embed/${youtubeMatch[1]}`;
  }
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) {
    return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
  }
  return url;
}

export function getVideoThumbnail(url) {
  if (!url) return null;
  const youtubeMatch = url.match(
    /(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/
  );
  if (youtubeMatch) {
    return `https://img.youtube.com/vi/${youtubeMatch[1]}/hqdefault.jpg`;
  }
  return null;
}

export function createStudyPlannerEntry(subject = '', color = '#6366f1') {
  return {
    id: generateId(),
    subject,
    color,
    notes: '',
    files: [],
    links: [],
    done: false,
    reminderAt: null,
    comments: [],
  };
}

export function createAudioBlock(name = '', url = '') {
  return createBlock(BLOCK_TYPES.AUDIO, { audioName: name, audioUrl: url });
}

export function createLinkEmbedBlock(url = '', title = '') {
  return createBlock(BLOCK_TYPES.LINK_EMBED, { linkUrl: url, linkTitle: title, embed: false });
}

export function createPersonalNoteBlock(content = '', userId = '') {
  return createBlock(BLOCK_TYPES.PERSONAL_NOTE, { content, ownerId: userId });
}

export function createAnnouncementBlock(title = '', content = '', priority = 'normal') {
  return createBlock(BLOCK_TYPES.ANNOUNCEMENT, { title, content, priority });
}

export function createResourceLibraryBlock(title = '', files = []) {
  return createBlock(BLOCK_TYPES.RESOURCE_LIBRARY, { title, files });
}

export function createProgressTrackerBlock(title = '', students = []) {
  return createBlock(BLOCK_TYPES.PROGRESS_TRACKER, { title, students });
}

export function createGoogleMeetBlock(meetUrl = '', title = '', scheduledAt = '') {
  return createBlock(BLOCK_TYPES.GOOGLE_MEET, { meetUrl, title, scheduledAt });
}

