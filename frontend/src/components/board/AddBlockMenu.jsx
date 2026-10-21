import React, { useState, useRef, useEffect, useId } from 'react';
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
import Button from '../ui/Button';

// Static class strings: Tailwind only sees literal class names.
const MENU = 'absolute left-0 top-full z-40 mt-1 max-h-80 w-56 overflow-y-auto rounded-lg border border-line bg-surface p-1 shadow-pop motion-safe:animate-oc-fade-in';
const ITEM = 'flex w-full items-center gap-3 rounded px-2 py-2 text-left hover:bg-surface-hover';

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
  const triggerRef = useRef(null);
  const menuId = useId();

  useEffect(() => {
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Escape closes the menu. Focus returns to the trigger only when it was inside the menu.
  const handleKeyDown = (e) => {
    if (e.key !== 'Escape' || !open) return;
    const focusInside = menuRef.current && menuRef.current.contains(document.activeElement);
    setOpen(false);
    if (focusInside && triggerRef.current) triggerRef.current.focus();
  };

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
    <div className="relative" ref={menuRef} onKeyDown={handleKeyDown}>
      <Button
        ref={triggerRef}
        variant="secondary"
        icon={Plus}
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
      >
        Add content
      </Button>

      {open && (
        <div id={menuId} className={MENU}>
          {visibleOptions.map((option) => (
            <button
              key={option.type}
              type="button"
              onClick={() => handleSelect(option.type)}
              className={ITEM}
            >
              <option.icon className="h-4 w-4 flex-none text-ink-2" strokeWidth={1.5} aria-hidden="true" />
              <span className="min-w-0">
                <span className="block text-sm font-medium text-ink">{option.label}</span>
                <span className="block text-xs text-ink-3">{option.description}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
