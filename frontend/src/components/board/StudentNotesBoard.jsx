import React from 'react';
import { Lightbulb, HelpCircle, Key, Link2, Share2 } from 'lucide-react';
import { useBoard } from '../../contexts/BoardContext';
import { useAuth } from '../../contexts/AuthContext';
import BlockRenderer from './BlockRenderer';
import CommentThread from './CommentThread';
import AddBlockMenu from './AddBlockMenu';


const SECTION_STYLES = {
  'My Ideas': { bg: 'bg-yellow-50', border: 'border-yellow-200', title: 'text-yellow-800', icon: Lightbulb },
  'Questions': { bg: 'bg-blue-50', border: 'border-blue-200', title: 'text-blue-800', icon: HelpCircle },
  'Key Points': { bg: 'bg-green-50', border: 'border-green-200', title: 'text-green-800', icon: Key },
  'References': { bg: 'bg-purple-50', border: 'border-purple-200', title: 'text-purple-800', icon: Link2 },
  'Shared Notes': { bg: 'bg-indigo-50', border: 'border-indigo-200', title: 'text-indigo-800', icon: Share2 },
};

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
        const style = SECTION_STYLES[section.title] || { bg: 'bg-gray-50', border: 'border-gray-200', title: 'text-gray-800', icon: Lightbulb };
        const SectionIcon = style.icon;

        return (
          <div
            key={section.id}
            className={`${style.bg} border ${style.border} rounded-xl p-6`}
          >
            <h2 className={`text-lg font-bold ${style.title} mb-4 flex items-center space-x-2`}>
              <SectionIcon className="w-5 h-5" />
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

              {section.blocks.length === 0 && (
                <p className="text-sm text-gray-400 italic">
                  {section.title === 'My Ideas' && 'Jot down your brainstorming ideas here...'}
                  {section.title === 'Questions' && 'Write questions you want to ask your lecturer...'}
                  {section.title === 'Key Points' && 'Summarize the key takeaways here...'}
                  {section.title === 'References' && 'Add links, files, and resources...'}
                  {section.title === 'Shared Notes' && 'Add notes you want to share with your lecturer...'}
                </p>
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
