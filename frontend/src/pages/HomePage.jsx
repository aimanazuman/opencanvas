import React from 'react';
import {
  Layout, BookOpen, ArrowRight, Calendar, Columns,
  Shield, Share2, Lightbulb, Users,
  Lock, Globe, ChevronRight, HelpCircle, Bell, Pencil, Apple, Backpack, Check
} from 'lucide-react';
import useScrollReveal from '../hooks/useScrollReveal';
import {
  ClassroomShell, ChalkboardHeader, WoodFrame, PaperPanel, StickyNote, CorkBoard, TimetableGrid,
} from '../components/classroom';

const STATS = [
  { value: '5+', label: 'Board Templates' },
  { value: '3', label: 'User Roles' },
  { value: '100%', label: 'Free to Use' },
];

const FEATURES = [
  { icon: Share2, title: 'Share & Collaborate', desc: 'Invite members with view, edit, or comment permissions. Share boards via invite links.', tone: 'bg-accent-50 text-accent-700' },
  { icon: Lock, title: 'Role-Based Access', desc: 'Students, lecturers, and admins each have dedicated portals and appropriate permissions.', tone: 'bg-green-50 text-green-700' },
  { icon: BookOpen, title: 'Course Management', desc: 'Create courses, manage enrollment, and organize boards by class or subject.', tone: 'bg-accent-50 text-accent-700' },
  { icon: Users, title: 'Guest Access', desc: 'Try the platform instantly with guest mode. Convert to a full account any time.', tone: 'bg-amber-50 text-amber-800' },
  { icon: Shield, title: 'Admin Dashboard', desc: 'Complete admin panel with user management, storage monitoring, and audit logs.', tone: 'bg-teal-50 text-teal-700' },
  { icon: Globe, title: 'Version History', desc: 'Track changes with up to 50 versions per board. Restore any previous version instantly.', tone: 'bg-teal-50 text-teal-700' },
];

// Sticky notes pinned to the corkboard. `color` keys into the StickyNote colour map.
const TEMPLATES = [
  { icon: BookOpen, name: 'Course Material', desc: 'Structured content with sections for topics, resources, and notes.', badge: 'Lecturers', color: 'azure' },
  { icon: Lightbulb, name: 'Student Notes', desc: 'Brainstorm with ideas, questions, key points, and references.', badge: 'Students', color: 'amber' },
  { icon: Calendar, name: 'Study Planner', desc: 'Weekly timetable with goals, navigation, and copy-to-next-week.', badge: 'All Roles', color: 'green' },
  { icon: Columns, name: 'Kanban Board', desc: 'Column-based task management with media cards.', badge: 'All Roles', color: 'teal' },
  { icon: HelpCircle, name: 'Quiz Board', desc: 'Interactive quizzes with MCQ, true/false, and fill-in-the-blank.', badge: 'Lecturers', color: 'orange' },
];

// Timetable cell fills. Literal class names so Tailwind keeps them.
const NOTE_CELL = {
  azure: 'bg-note-azure',
  amber: 'bg-note-amber',
  green: 'bg-note-green',
  teal: 'bg-note-teal',
  orange: 'bg-note-orange',
};

// Example week: each cell reuses a template name and its note colour.
const TIMETABLE_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
const cell = (tmpl) => ({ label: tmpl.name, className: NOTE_CELL[tmpl.color] });
const TIMETABLE_ROWS = [
  { label: 'Period 1', cells: [TEMPLATES[0], TEMPLATES[1], TEMPLATES[4], TEMPLATES[3], TEMPLATES[2]].map(cell) },
  { label: 'Period 2', cells: [TEMPLATES[2], TEMPLATES[3], TEMPLATES[0], TEMPLATES[1], TEMPLATES[4]].map(cell) },
  { label: 'Period 3', cells: [TEMPLATES[4], TEMPLATES[2], TEMPLATES[1], TEMPLATES[0], TEMPLATES[3]].map(cell) },
];

const ROLES = [
  {
    icon: Backpack,
    title: 'Student',
    tick: 'text-accent-600',
    features: ['Create and manage boards', 'Enroll in courses', 'Collaborate with classmates', 'Take interactive quizzes'],
  },
  {
    icon: BookOpen,
    title: 'Lecturer',
    tick: 'text-green-700',
    features: ['Create courses and enroll students', 'Build course materials and quizzes', 'Dedicated lecturer portal', 'Bulk import students'],
  },
  {
    icon: Shield,
    title: 'Admin',
    tick: 'text-teal-700',
    features: ['Full system dashboard', 'User and storage management', 'System settings configuration', 'Audit logs and monitoring'],
  },
];

const FOCUS_ON_DARK = 'focus-visible:outline-white';

function HomePage({ onNavigate }) {
  const revealRef = useScrollReveal({ threshold: 0.12 });
  return (
    <ClassroomShell ref={revealRef}>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-surface focus:px-3 focus:py-2 focus:text-sm focus:text-ink focus:shadow-pop"
      >
        Skip to content
      </a>

      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-line bg-surface">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4">
          <div className="flex items-center gap-2">
            <Layout className="h-6 w-6 text-accent-600" strokeWidth={1.5} aria-hidden="true" />
            <span className="text-xl font-semibold text-ink">OpenCanvas</span>
          </div>
          <nav aria-label="Page sections" className="hidden items-center gap-7 md:flex">
            <a href="#features" className="text-sm text-ink-2 hover:text-ink">Features</a>
            <a href="#templates" className="text-sm text-ink-2 hover:text-ink">Templates</a>
            <a href="#roles" className="text-sm text-ink-2 hover:text-ink">Roles</a>
            <button type="button" onClick={() => onNavigate('about')} className="text-sm text-ink-2 hover:text-ink">
              About
            </button>
          </nav>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => onNavigate('login')}
              className="btn-motion hidden h-8 px-2 text-sm font-medium text-ink hover:text-accent-700 sm:block"
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => onNavigate('signup')}
              className="btn-motion h-9 rounded bg-accent px-4 text-sm font-medium text-white hover:bg-accent-hover"
            >
              Get Started
            </button>
          </div>
        </div>
      </header>

      <main id="main">
        {/* Hero: a chalkboard on a wood frame, with a marker tray and a bell-schedule strip */}
        <section aria-labelledby="hero-title" className="px-4 pb-12 pt-8 md:pb-16 md:pt-14">
          <div className="mx-auto max-w-5xl">
            <ChalkboardHeader
              size="hero"
              titleId="hero-title"
              enter
              tray
              eyebrow={
                <p className="inline-flex h-6 items-center gap-2 rounded-sm border border-chalk-dust/40 px-2.5 text-xs font-medium text-chalk-dust">
                  <Pencil className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden="true" />
                  <span>Educational Collaborative Platform</span>
                </p>
              }
              title={
                <>
                  Where Learning Meets{' '}
                  <span className="relative inline-block whitespace-nowrap">
                    Collaboration
                    <span aria-hidden="true" className="absolute -bottom-1.5 left-0 right-0 block h-1 origin-left motion-safe:animate-oc-draw">
                      <span className="block h-full w-full rounded-full bg-note-amber motion-safe:animate-oc-breathe" />
                    </span>
                  </span>
                </>
              }
              subtitle="A whiteboard platform built for academic institutions. Create, Share, and Collaborate on boards with purpose-built templates."
              actions={
                <>
                  <button
                    type="button"
                    onClick={() => onNavigate('signup')}
                    className={`btn-motion inline-flex h-11 items-center gap-2 rounded bg-paper px-6 font-semibold text-accent-700 hover:bg-note-azure ${FOCUS_ON_DARK}`}
                  >
                    <span>Get Started Free</span>
                    <ArrowRight className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onNavigate('about')}
                    className={`btn-motion inline-flex h-11 items-center gap-2 rounded border border-chalk-dust/60 px-6 font-medium text-chalk-ink hover:bg-chalk-deep ${FOCUS_ON_DARK}`}
                  >
                    <span>Learn More</span>
                    <ChevronRight className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
                  </button>
                </>
              }
            />

            {/* Bell-schedule strip with the stats */}
            <ul className="mx-auto mt-8 grid max-w-3xl grid-cols-3 gap-px overflow-hidden rounded-lg border border-line bg-line">
              {STATS.map((stat, idx) => (
                <li key={stat.label} className="bg-surface px-2 py-3 text-center md:px-4 md:py-4">
                  <p aria-hidden="true" className="flex items-center justify-center gap-1.5 text-2xs font-medium uppercase tracking-[0.04em] text-ink-2">
                    <Bell className="h-3 w-3" strokeWidth={1.5} />
                    <span>Period {idx + 1}</span>
                  </p>
                  <p className="mt-1 text-xl font-semibold text-accent-600 md:text-3xl">{stat.value}</p>
                  <p className="mt-0.5 text-xs text-ink-2 md:text-sm">{stat.label}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Features: notebook paper with a red margin */}
        <PaperPanel
          as="section"
          id="features"
          aria-labelledby="features-title"
          ruled
          margin
          flat
          padded={false}
          className="scroll-mt-16 py-16 md:py-20"
        >
          <div className="mx-auto max-w-5xl pl-14 pr-4 md:px-4 md:pl-16">
            <div className="scroll-reveal mb-10 md:mb-12">
              <h2 id="features-title" className="font-hand text-3xl text-ink md:text-4xl">
                Everything You Need to Collaborate
              </h2>
              <p className="mt-3 max-w-2xl text-ink-2">
                Purpose-built features that make learning and teaching more interactive and engaging.
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((feature, idx) => (
                <div key={feature.title} className={`scroll-reveal reveal-delay-${(idx % 3) + 1}`}>
                  <div className="lift h-full rounded-lg border border-line bg-surface p-5 md:p-6">
                    <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded ${feature.tone}`}>
                      <feature.icon className="h-5 w-5" strokeWidth={1.5} aria-hidden="true" />
                    </div>
                    <h3 className="mb-2 text-lg font-semibold text-ink">{feature.title}</h3>
                    <p className="text-sm leading-relaxed text-ink-2">{feature.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </PaperPanel>

        {/* Board templates: sticky notes pinned to a corkboard strip */}
        <CorkBoard
          as="section"
          id="templates"
          aria-labelledby="templates-title"
          layout="five"
          className="scroll-mt-16"
          header={
            <div className="scroll-reveal mb-12 text-center">
              <h2 id="templates-title" className="font-hand text-3xl text-ink md:text-4xl">
                Ready-Made Board Templates
              </h2>
              <p className="mx-auto mt-3 max-w-2xl text-ink">
                Start with a template designed for your workflow, or create from scratch.
              </p>
            </div>
          }
        >
          {TEMPLATES.map((tmpl, idx) => (
            <li key={tmpl.name} className={`scroll-reveal reveal-delay-${(idx % 3) + 1}`}>
              <StickyNote
                as="article"
                color={tmpl.color}
                rotate={idx % 2 === 0 ? -2 : 2}
                decorative
                pinned
                spacious
                className="lift h-full"
              >
                <tmpl.icon className="mb-3 h-6 w-6 text-ink" strokeWidth={1.5} aria-hidden="true" />
                <h3 className="text-base font-semibold text-ink">{tmpl.name}</h3>
                <p className="mb-4 mt-1 text-sm leading-relaxed text-ink-2">{tmpl.desc}</p>
                <div className="mt-auto">
                  <span className="inline-flex h-5 items-center rounded-sm bg-chalk-board px-1.5 text-2xs font-medium text-chalk-ink">
                    {tmpl.badge}
                  </span>
                </div>
              </StickyNote>
            </li>
          ))}
        </CorkBoard>

        {/* Timetable grid */}
        <section aria-labelledby="week-title" className="px-4 py-16 md:py-20">
          <div className="scroll-reveal mx-auto max-w-4xl">
            <h2 id="week-title" className="text-center font-hand text-3xl text-ink md:text-4xl">
              A week on the board
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-center text-ink-2">
              Plan lessons, quizzes and study sessions on one weekly timetable.
            </p>
            <TimetableGrid
              className="mt-8"
              caption="Example weekly timetable built from board templates"
              corner={
                <>
                  <span className="sr-only">Period</span>
                  <Bell className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden="true" />
                </>
              }
              columns={TIMETABLE_DAYS}
              rows={TIMETABLE_ROWS}
            />
          </div>
        </section>

        {/* Roles: chalkboard headers on class cards */}
        <section id="roles" aria-labelledby="roles-title" className="scroll-mt-16 px-4 pb-16 md:pb-20">
          <div className="mx-auto max-w-6xl">
            <div className="scroll-reveal mb-12 text-center">
              <h2 id="roles-title" className="font-hand text-3xl text-ink md:text-4xl">
                Built for Every Role
              </h2>
              <p className="mx-auto mt-3 max-w-2xl text-ink-2">
                Dedicated portals and permissions for students, lecturers, and administrators.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              {ROLES.map((role, idx) => (
                <div key={role.title} className={`scroll-reveal h-full reveal-delay-${idx + 1}`}>
                  <div className="lift flex h-full flex-col overflow-hidden rounded-lg border border-line bg-surface">
                    <div className="chalkboard flex items-center gap-3 px-5 py-4">
                      <role.icon className="h-6 w-6 text-chalk-ink" strokeWidth={1.5} aria-hidden="true" />
                      <h3 className="font-hand text-2xl text-chalk-ink">{role.title}</h3>
                    </div>
                    <ul className="flex flex-1 flex-col gap-3 p-5">
                      {role.features.map((f) => (
                        <li key={f} className="flex items-start gap-2.5 text-sm text-ink">
                          <Check className={`mt-0.5 h-4 w-4 flex-shrink-0 ${role.tick}`} strokeWidth={1.5} aria-hidden="true" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA on the chalkboard */}
        <section aria-labelledby="cta-title" className="px-4 pb-16 md:pb-20">
          <div className="scroll-reveal mx-auto max-w-4xl">
            <WoodFrame>
              <div className="chalkboard rounded-sm px-6 py-12 text-center md:px-14 md:py-14">
                <Apple className="mx-auto mb-4 h-7 w-7 text-note-amber" strokeWidth={1.5} aria-hidden="true" />
                <h2 id="cta-title" className="font-hand text-3xl text-chalk-ink md:text-4xl">
                  Start Collaborating Today
                </h2>
                <p className="mx-auto mt-3 max-w-xl text-base text-chalk-dust md:text-lg">
                  Create an account or try as a guest. No credit card required.
                </p>
                <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => onNavigate('signup')}
                    className={`btn-motion inline-flex h-11 items-center gap-2 rounded bg-paper px-7 font-semibold text-accent-700 hover:bg-note-azure ${FOCUS_ON_DARK}`}
                  >
                    <span>Create Free Account</span>
                    <ArrowRight className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
                  </button>
                </div>
              </div>
            </WoodFrame>
          </div>
        </section>
      </main>

      {/* Footer on a dark wood shelf */}
      <footer className="bg-wood-dark text-wood-cream">
        <div className="mx-auto max-w-6xl px-4 py-12">
          <div className="grid gap-8 md:grid-cols-4">
            <div className="md:col-span-2">
              <div className="mb-4 flex items-center gap-2">
                <Layout className="h-7 w-7 text-note-amber" strokeWidth={1.5} aria-hidden="true" />
                <span className="text-xl font-semibold text-chalk-ink">OpenCanvas</span>
              </div>
              <p className="max-w-sm text-sm leading-relaxed">
                An educational collaborative whiteboard platform for academic institutions.
                Create, Share, and Collaborate on digital boards.
              </p>
            </div>

            <nav aria-label="Platform">
              <h3 className="mb-4 font-semibold text-chalk-ink">Platform</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <button type="button" onClick={() => onNavigate('login')} className={`hover:text-white ${FOCUS_ON_DARK}`}>
                    Sign In
                  </button>
                </li>
                <li>
                  <button type="button" onClick={() => onNavigate('about')} className={`hover:text-white ${FOCUS_ON_DARK}`}>
                    About
                  </button>
                </li>
                <li>
                  <button type="button" onClick={() => onNavigate('login')} className={`hover:text-white ${FOCUS_ON_DARK}`}>
                    Guest Access
                  </button>
                </li>
              </ul>
            </nav>

            <nav aria-label="Portals">
              <h3 className="mb-4 font-semibold text-chalk-ink">Portals</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <button type="button" onClick={() => onNavigate('login')} className={`hover:text-white ${FOCUS_ON_DARK}`}>
                    Student Portal
                  </button>
                </li>
                <li>
                  <button type="button" onClick={() => onNavigate('lecturer-login')} className={`hover:text-white ${FOCUS_ON_DARK}`}>
                    Lecturer Portal
                  </button>
                </li>
                <li>
                  <button type="button" onClick={() => onNavigate('admin-login')} className={`hover:text-white ${FOCUS_ON_DARK}`}>
                    Admin Portal
                  </button>
                </li>
              </ul>
            </nav>
          </div>

          <div className="mt-10 border-t border-wood pt-6 text-center text-sm">
            &copy; {new Date().getFullYear()} OpenCanvas. All rights reserved.
          </div>
        </div>
      </footer>
    </ClassroomShell>
  );
}

export default HomePage;
