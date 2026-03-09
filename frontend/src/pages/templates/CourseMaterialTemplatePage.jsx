import React from 'react';
import { BookOpen } from 'lucide-react';
import TemplateBoardsPage from './TemplateBoardsPage';

export default function CourseMaterialTemplatePage({ onNavigate }) {
  return (
    <TemplateBoardsPage
      onNavigate={onNavigate}
      templateId="course-material"
      templateName="Course Material"
      templateDescription="Structured course content with topics, announcements, and resources"
      templateColor="indigo"
      TemplateIcon={BookOpen}
    />
  );
}
