import React from 'react';
import { Calendar } from 'lucide-react';
import TemplateBoardsPage from './TemplateBoardsPage';

export default function StudyPlannerTemplatePage({ onNavigate }) {
  return (
    <TemplateBoardsPage
      onNavigate={onNavigate}
      templateId="study-planner"
      templateName="Study Planner"
      templateDescription="Weekly timetable to plan and track study sessions"
      templateColor="teal"
      TemplateIcon={Calendar}
    />
  );
}
