import React from 'react';
import { Lightbulb, HelpCircle, Key, Link2, Share2 } from 'lucide-react';
import { useBoard } from '../../contexts/BoardContext';
import { useAuth } from '../../contexts/AuthContext';
import BlockRenderer from './BlockRenderer';
import CommentThread from './CommentThread';
import AddBlockMenu from './AddBlockMenu';
import { StickyNote as EmptyNote } from '../classroom';

// Section panels stay white. Only the icon carries the section's label colour.
const SECTION_STYLES = {
  'My Ideas': { tone: 'text-amber-700', icon: Lightbulb },
  'Questions': { tone: 'text-accent', icon: HelpCircle },
  'Key Points': { tone: 'text-green-700', icon: Key },
  'References': { tone: 'text-teal-700', icon: Link2 },
  'Shared Notes': { tone: 'text-accent', icon: Share2 },
};
const DEFAULT_STYLE = { tone: 'text-ink-2', icon: Lightbulb };

// Empty-state copy per section. A section without a hint shows nothing extra.
const EMPTY_HINT = {
  'My Ideas': 'Jot down your brainstorming ideas here...',
  'Questions': 'Write questions you want to ask your lecturer...',
  'Key Points': 'Summarize the key takeaways here...',
  'References': 'Add links, files, and resources...',
  'Shared Notes': 'Add notes you want to share with your lecturer...',
};

// Hand font only for short section titles (under 40 characters).
const titleFont = (title) => ((title || '').length < 40 ? 'font-hand text-lg' : 'text-base font-semibold');

const SECTION = 'rounded-xl border border-line border-t-2 border-t-wood bg-surface p-6';

export default function StudentNotesBoard() {
  const {
    board, canEdit, canComment, addBlockToSection, updateBlockInSection, removeBlockFromSection, addComment,
  } = useBoard();
  const { user } = useAuth();

  if (!board?.sections) return null;

  const userId = user?.id || '';
  const isOwner = board.owner?.id === userId || !board.owner;

  const handleAddBlock = (sectionId, block) => {
    addBlockToSection(sectionId, block);
  };

  const handleUpdateBlock = (sectionId, blockId, updates) => {
    updateBlockInSection(sectionId, blockId, updates);
  };

  const handleDeleteBlock = (sectionId, blockId) => {
    removeBlockFromSection(sectionId, blockId);
  };

  const handleAddComment = (blockId, text) => {
    if (user) {
      addComment(blockId, text, user);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {board.sections.map((section) => {
        const style = SECTION_STYLES[section.title] || DEFAULT_STYLE;
        const SectionIcon = style.icon;
        const hint = EMPTY_HINT[section.title];

        return (
          <div key={section.id} className={SECTION}>
            <h2 className={`mb-4 flex items-center gap-2 text-ink ${titleFont(section.title)}`}>
              <SectionIcon className={`h-5 w-5 flex-shrink-0 ${style.tone}`} strokeWidth={1.5} aria-hidden="true" />
              <span>{section.title}</span>
            </h2>

            <div className="space-y-4">
              {section.blocks.map((block) => (
                <div key={block.id} className="relative">
                  <BlockRenderer
                    block={block}
                    canEdit={canEdit && isOwner}
                    canSubmit={false}
                    currentUserId={userId}
                    onUpdate={(updates) => handleUpdateBlock(section.id, block.id, updates)}
                    onDelete={() => handleDeleteBlock(section.id, block.id)}
                  />

                  <CommentThread
                    comments={board.comments?.[block.id] || []}
                    onAddComment={(text) => handleAddComment(block.id, text)}
                    canComment={canComment}
                  />
                </div>
              ))}

              {section.blocks.length === 0 && hint && (
                <EmptyNote as="p" color="azure" className="text-sm">{hint}</EmptyNote>
              )}
            </div>

            {canEdit && isOwner && (
              <div className="mt-4">
                <AddBlockMenu
                  onAddBlock={(block) => handleAddBlock(section.id, block)}
                  userRole={user?.role}
                  currentUserId={userId}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
