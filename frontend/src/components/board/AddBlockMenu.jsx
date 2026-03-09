import React, { useState, useRef, useEffect } from 'react';
import {
  Plus, Type, ImageIcon, Video, File,
  Music, Link2, StickyNote, Megaphone, FolderOpen, BarChart3, MonitorPlay
} from 'lucide-react';
import {
  BLOCK_TYPES,
  createTextBlock, createImageBlock, createVideoBlock, createFileBlock,
  createAudioBlock, createLinkEmbedBlock, createPersonalNoteBlock,
  createAnnouncementBlock, createResourceLibraryBlock, createProgressTrackerBlock, createGoogleMeetBlock,
} from '../../utils/boardHelpers';

const BLOCK_OPTIONS = [
  { type: BLOCK_TYPES.TEXT, icon: Type, label: 'Text', description: 'Add a text block' },
  { type: BLOCK_TYPES.IMAGE, icon: ImageIcon, label: 'Image', description: 'Upload an image' },
  { type: BLOCK_TYPES.VIDEO, icon: Video, label: 'Video', description: 'Embed a video' },
  { type: BLOCK_TYPES.AUDIO, icon: Music, label: 'Audio', description: 'Upload audio file' },
  { type: BLOCK_TYPES.FILE, icon: File, label: 'File', description: 'Attach a file' },
  { type: BLOCK_TYPES.LINK_EMBED, icon: Link2, label: 'Link / Embed', description: 'Embed a link or website' },
  { type: BLOCK_TYPES.GOOGLE_MEET, icon: MonitorPlay, label: 'Google Meet', description: 'Add a meeting link', lecturerOnly: true },
  { type: BLOCK_TYPES.ANNOUNCEMENT, icon: Megaphone, label: 'Announcement', description: 'Post a course announcement', lecturerOnly: true },
  { type: BLOCK_TYPES.RESOURCE_LIBRARY, icon: FolderOpen, label: 'Resource Library', description: 'Multi-file resource collection', lecturerOnly: true },
  { type: BLOCK_TYPES.PROGRESS_TRACKER, icon: BarChart3, label: 'Progress Tracker', description: 'Track student progress', lecturerOnly: true },
  { type: BLOCK_TYPES.PERSONAL_NOTE, icon: StickyNote, label: 'Personal Note', description: 'Private note (only you)', studentOnly: true },
];

export default function AddBlockMenu({ onAddBlock, userRole, currentUserId }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleSelect = (type) => {
    let block;
    switch (type) {
      case BLOCK_TYPES.TEXT:
        block = createTextBlock();
        break;
      case BLOCK_TYPES.IMAGE:
        block = createImageBlock();
        break;
      case BLOCK_TYPES.VIDEO:
        block = createVideoBlock();
        break;
      case BLOCK_TYPES.FILE:
        block = createFileBlock();
        break;
      case BLOCK_TYPES.AUDIO:
        block = createAudioBlock();
        break;
      case BLOCK_TYPES.LINK_EMBED:
        block = createLinkEmbedBlock();
        break;
      case BLOCK_TYPES.PERSONAL_NOTE:
        block = createPersonalNoteBlock('', currentUserId || '');
        break;
      case BLOCK_TYPES.ANNOUNCEMENT:
        block = createAnnouncementBlock();
        break;
      case BLOCK_TYPES.RESOURCE_LIBRARY:
        block = createResourceLibraryBlock('Resource Library');
        break;
      case BLOCK_TYPES.PROGRESS_TRACKER:
        block = createProgressTrackerBlock('Student Progress');
        break;
      case BLOCK_TYPES.GOOGLE_MEET:
        block = createGoogleMeetBlock();
        break;
      default:
        return;
    }
    onAddBlock(block);
    setOpen(false);
  };

  const isLecturer = userRole === 'lecturer' || userRole === 'admin';
  const isStudent = userRole === 'student';
  const visibleOptions = BLOCK_OPTIONS.filter(opt => {
    if (opt.lecturerOnly && !isLecturer) return false;
    if (opt.studentOnly && !isStudent) return false;
    return true;
  });

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center space-x-1 px-3 py-1.5 text-sm text-indigo-600 hover:bg-indigo-50 rounded-lg border border-dashed border-indigo-300 transition"
      >
        <Plus className="w-4 h-4" />
        <span>Add content</span>
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 bg-white rounded-lg shadow-xl border py-1 z-40 w-56 max-h-80 overflow-y-auto animate-slideDown">
          {visibleOptions.map((option) => (
            <button
              key={option.type}
              onClick={() => handleSelect(option.type)}
              className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center space-x-3"
            >
              <option.icon className="w-4 h-4 text-gray-500 shrink-0" />
              <div>
                <p className="text-sm font-medium text-gray-900">{option.label}</p>
                <p className="text-xs text-gray-500">{option.description}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
