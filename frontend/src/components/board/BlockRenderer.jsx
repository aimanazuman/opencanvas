import React from 'react';
import { BLOCK_TYPES } from '../../utils/boardHelpers';
import TextBlock from './blocks/TextBlock';
import ImageBlock from './blocks/ImageBlock';
import VideoBlock from './blocks/VideoBlock';
import FileBlock from './blocks/FileBlock';
import AudioBlock from './blocks/AudioBlock';
import LinkEmbedBlock from './blocks/LinkEmbedBlock';
import PersonalNoteBlock from './blocks/PersonalNoteBlock';
import AnnouncementBlock from './blocks/AnnouncementBlock';
import ResourceLibraryBlock from './blocks/ResourceLibraryBlock';
import ProgressTrackerBlock from './blocks/ProgressTrackerBlock';
import GoogleMeetBlock from './blocks/GoogleMeetBlock';

export default function BlockRenderer({ block, canEdit, canSubmit, onUpdate, onDelete, currentUserId }) {
  switch (block.type) {
    case BLOCK_TYPES.TEXT:
      return <TextBlock block={block} canEdit={canEdit} onUpdate={onUpdate} onDelete={onDelete} />;
    case BLOCK_TYPES.IMAGE:
      return <ImageBlock block={block} canEdit={canEdit} onUpdate={onUpdate} onDelete={onDelete} />;
    case BLOCK_TYPES.VIDEO:
      return <VideoBlock block={block} canEdit={canEdit} onUpdate={onUpdate} onDelete={onDelete} />;
    case BLOCK_TYPES.FILE:
      return <FileBlock block={block} canEdit={canEdit} onUpdate={onUpdate} onDelete={onDelete} />;
    case BLOCK_TYPES.AUDIO:
      return <AudioBlock block={block} canEdit={canEdit} onUpdate={onUpdate} onDelete={onDelete} />;
    case BLOCK_TYPES.LINK_EMBED:
      return <LinkEmbedBlock block={block} canEdit={canEdit} onUpdate={onUpdate} onDelete={onDelete} />;
    case BLOCK_TYPES.PERSONAL_NOTE:
      return <PersonalNoteBlock block={block} canEdit={true} onUpdate={onUpdate} onDelete={onDelete} currentUserId={currentUserId} />;
    case BLOCK_TYPES.ANNOUNCEMENT:
      return <AnnouncementBlock block={block} canEdit={canEdit} onUpdate={onUpdate} onDelete={onDelete} />;
    case BLOCK_TYPES.RESOURCE_LIBRARY:
      return <ResourceLibraryBlock block={block} canEdit={canEdit} onUpdate={onUpdate} onDelete={onDelete} />;
    case BLOCK_TYPES.PROGRESS_TRACKER:
      return <ProgressTrackerBlock block={block} canEdit={canEdit} onUpdate={onUpdate} onDelete={onDelete} />;
    case BLOCK_TYPES.GOOGLE_MEET:
      return <GoogleMeetBlock block={block} canEdit={canEdit} onUpdate={onUpdate} onDelete={onDelete} />;
    default:
      return (
        <div className="p-3 bg-gray-100 rounded-lg text-sm text-gray-500">
          Unknown block type: {block.type}
        </div>
      );
  }
}
