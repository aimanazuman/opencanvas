import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Layout, Search, X, Plus, BookOpen, Calendar, Lightbulb, Info, HelpCircle } from 'lucide-react';
import Navigation from '../components/Navigation';
import {
  ClassroomShell, ChalkboardHeader, ClassroomButton, PaperPanel, StickyNote, WoodFrame, CorkBoard,
} from '../components/classroom';
import { getTemplatesForRole } from '../utils/templateDefinitions';
import { useAuth } from '../contexts/AuthContext';

const TEMPLATE_ICONS = {
  'course-material': BookOpen,
  'student-notes': Lightbulb,
  'study-planner': Calendar,
  'kanban': Layout,
  'quiz': HelpCircle,
};

const TEMPLATE_ROUTES = {
  'course-material': 'templates-course-material',
  'student-notes': 'templates-student-notes',
  'study-planner': 'templates-study-planner',
  'kanban': 'templates-kanban',
  'quiz': 'templates-quiz',
};

// Static lookup: the note colour per template. Only azure, teal, green, amber, orange (and slate elsewhere).
const TEMPLATE_NOTE = {
  'course-material': 'azure',
  'student-notes': 'green',
  'study-planner': 'teal',
  'kanban': 'amber',
  'quiz': 'orange',
};

const TemplatesPage = ({ onNavigate, hideNav = false }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const { user } = useAuth();
  const location = useLocation();
  const urlParams = new URLSearchParams(location.search);
  const courseId = urlParams.get('courseId');
  const courseName = urlParams.get('courseName');
  const section = urlParams.get('section');

  const templates = getTemplatesForRole(user?.role || 'student').map(t => ({
    ...t,
    icon: TEMPLATE_ICONS[t.id] || Layout,
  }));

  const query = searchQuery.toLowerCase();
  const filteredTemplates = templates.filter(template =>
    template.name.toLowerCase().includes(query) ||
    template.description.toLowerCase().includes(query)
  );

  const handleUseTemplate = (template) => {
    const params = { templateType: template.id };
    if (courseId) params.courseId = courseId;
    if (section) params.section = section;
    onNavigate('workspace', params);
  };

  const handleBlankBoard = () => {
    const params = {};
    if (courseId) params.courseId = courseId;
    if (section) params.section = section;
    onNavigate('workspace', params);
  };

  const Content = hideNav ? 'div' : 'main';

  return (
    <ClassroomShell embedded={hideNav}>
      {!hideNav && <Navigation onNavigate={onNavigate} currentPage="templates" />}
      <Content
        aria-labelledby="templates-title"
        className={hideNav ? 'space-y-6' : 'mx-auto max-w-6xl space-y-6 px-4 py-6 md:py-8'}
      >
        <ChalkboardHeader
          size="banner"
          underline
          titleId="templates-title"
          title="Board Templates"
          subtitle="Start quickly with pre-designed layouts, or browse your boards by type"
          actions={
            <ClassroomButton onChalk icon={Plus} onClick={handleBlankBoard}>Blank Board</ClassroomButton>
          }
        />

        {/* Course context: white panel, not a board or cork. */}
        {courseId && (
          <PaperPanel tone="white" padded={false} className="flex items-start gap-3 p-4">
            <Info className="mt-0.5 h-5 w-5 flex-none text-accent-600" strokeWidth={1.5} aria-hidden="true" />
            <p className="text-sm text-ink">
              Creating board for <span className="font-semibold">{courseName || `Course #${courseId}`}</span>
              {section && <> / <span className="font-semibold">Section {section}</span></>}
              . Choose a template below.
            </p>
          </PaperPanel>
        )}

        {/* Search is user input: white panel, never ruled paper or cork. */}
        <PaperPanel tone="white" padded={false} className="p-3">
          <div className="relative max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-2" strokeWidth={1.5} aria-hidden="true" />
            <label htmlFor="templates-search" className="sr-only">Search templates</label>
            <input
              id="templates-search"
              type="text"
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="min-h-[44px] w-full rounded border border-line-strong py-2 pl-10 pr-11 text-ink"
            />
            {searchQuery && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => setSearchQuery('')}
                className="absolute right-0 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded hover:bg-surface-hover"
              >
                <X className="h-5 w-5 text-ink-2" strokeWidth={1.5} aria-hidden="true" />
              </button>
            )}
          </div>
        </PaperPanel>

        <section aria-labelledby="templates-gallery-title" className="space-y-3">
          {/* Heading sits on the wall, above the cork. Text on cork is never allowed. */}
          <h2 id="templates-gallery-title" className="font-hand text-xl text-ink md:text-2xl">
            Choose a template
          </h2>

          {filteredTemplates.length > 0 ? (
            <WoodFrame>
              <CorkBoard as="div" padded={false} layout="three" className="p-4 md:p-6">
                {filteredTemplates.map((template, idx) => {
                  const Icon = template.icon;
                  const routeKey = TEMPLATE_ROUTES[template.id];
                  const titleId = `template-${template.id}-title`;
                  return (
                    <li key={template.id}>
                      <StickyNote
                        as="article"
                        aria-labelledby={titleId}
                        color={TEMPLATE_NOTE[template.id] || 'azure'}
                        rotate={idx % 2 === 0 ? -2 : 2}
                        decorative
                        pinned
                        spacious
                        className="lift h-full"
                      >
                        <Icon className="mb-3 h-6 w-6 text-ink" strokeWidth={1.5} aria-hidden="true" />
                        <h3 id={titleId} className="text-base font-semibold text-ink">{template.name}</h3>
                        <p className="mt-1 text-sm leading-relaxed text-ink">{template.description}</p>
                        <ul aria-label={`${template.name} features`} className="mt-3 flex flex-wrap gap-1.5">
                          {template.features.map(feature => (
                            <li key={feature} className="rounded-full bg-white px-2 py-0.5 text-xs text-ink">
                              {feature}
                            </li>
                          ))}
                        </ul>
                        <div className="mt-auto flex flex-col gap-2 pt-4 sm:flex-row">
                          <ClassroomButton className="flex-1" onClick={() => onNavigate(routeKey)}>
                            View Boards<span className="sr-only"> for {template.name}</span>
                          </ClassroomButton>
                          <ClassroomButton variant="primary" className="flex-1" onClick={() => handleUseTemplate(template)}>
                            Create New<span className="sr-only"> {template.name}</span>
                          </ClassroomButton>
                        </div>
                      </StickyNote>
                    </li>
                  );
                })}
              </CorkBoard>
            </WoodFrame>
          ) : (
            <StickyNote color="azure" className="mx-auto max-w-sm items-center text-center">
              <Layout className="mb-2 h-5 w-5 text-ink" strokeWidth={1.5} aria-hidden="true" />
              <h3 className="text-base font-semibold text-ink">No templates found</h3>
              <p className="mt-1 text-sm text-ink">Try adjusting your search</p>
              <ClassroomButton variant="primary" className="mt-4" onClick={() => setSearchQuery('')}>
                Show All Templates
              </ClassroomButton>
            </StickyNote>
          )}
        </section>
      </Content>
    </ClassroomShell>
  );
};

export default TemplatesPage;
