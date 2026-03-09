import React from 'react';
import { HelpCircle } from 'lucide-react';
import TemplateBoardsPage from './TemplateBoardsPage';

export default function QuizTemplatePage({ onNavigate }) {
  return (
    <TemplateBoardsPage
      onNavigate={onNavigate}
      templateId="quiz"
      templateName="Quiz"
      templateDescription="Interactive quizzes with timed questions, scoring, and leaderboard"
      templateColor="rose"
      TemplateIcon={HelpCircle}
    />
  );
}
