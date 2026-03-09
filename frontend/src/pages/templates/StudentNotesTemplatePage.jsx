import React from 'react';
import { Lightbulb } from 'lucide-react';
import TemplateBoardsPage from './TemplateBoardsPage';

export default function StudentNotesTemplatePage({ onNavigate }) {
  return (
    <TemplateBoardsPage
      onNavigate={onNavigate}
      templateId="student-notes"
      templateName="Student Notes"
      templateDescription="Brainstorming sections for ideas, questions, and key points"
      templateColor="emerald"
      TemplateIcon={Lightbulb}
    />
  );
}
