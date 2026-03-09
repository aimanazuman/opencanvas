import React from 'react';
import { Layout } from 'lucide-react';
import TemplateBoardsPage from './TemplateBoardsPage';

export default function KanbanTemplatePage({ onNavigate }) {
  return (
    <TemplateBoardsPage
      onNavigate={onNavigate}
      templateId="kanban"
      templateName="Kanban Board"
      templateDescription="Column-based workflow board for tracking tasks and progress"
      templateColor="cyan"
      TemplateIcon={Layout}
    />
  );
}
