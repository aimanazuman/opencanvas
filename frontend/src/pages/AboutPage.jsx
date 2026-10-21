import React from 'react';
import {
  Users, Shield, BookOpen, Columns, Calendar,
  Lightbulb, Globe, ArrowLeft, GraduationCap,
  Palette, HelpCircle, Check
} from 'lucide-react';
import useScrollReveal from '../hooks/useScrollReveal';
import {
  ClassroomShell, ClassroomButton, WoodFrame, PaperPanel, StickyNote, CorkBoard, ChalkBadge,
} from '../components/classroom';
import cx from '../components/classroom/cx';

// Static lookups: Tailwind only keeps literal class names.
const MISSION_NOTES = [
  { icon: Users, label: 'Collaborative', desc: 'Real-time sharing', color: 'azure' },
  { icon: Shield, label: 'Secure', desc: 'Role-based access', color: 'green' },
  { icon: Palette, label: 'Creative', desc: 'Rich board tools', color: 'amber' },
  { icon: Globe, label: 'Accessible', desc: 'Works everywhere', color: 'teal' },
];

// Sticky notes pinned to the corkboard. `color` keys into the StickyNote colour map.
const TEMPLATES = [
  { icon: BookOpen, name: 'Course Material', desc: 'Structured content for lectures', color: 'azure', role: 'Lecturers' },
  { icon: Lightbulb, name: 'Student Notes', desc: 'Brainstorming and note-taking', color: 'amber', role: 'Students' },
  { icon: Calendar, name: 'Study Planner', desc: 'Weekly timetable and goals', color: 'green', role: 'All Roles' },
  { icon: Columns, name: 'Kanban Board', desc: 'Task and project management', color: 'teal', role: 'All Roles' },
  { icon: HelpCircle, name: 'Quiz Board', desc: 'Interactive quizzes', color: 'orange', role: 'Lecturers' },
];

const ROLES = [
  {
    icon: GraduationCap,
    title: 'Students',
    tick: 'text-accent-600',
    stripe: 'bg-note-azure',
    features: [
      'Create and manage personal boards',
      'Enroll in courses via invite codes',
      'Collaborate on shared boards',
      'Use Student Notes and Study Planner templates',
      'Take quizzes created by lecturers',
    ],
  },
  {
    icon: BookOpen,
    title: 'Lecturers',
    tick: 'text-green-700',
    stripe: 'bg-note-green',
    features: [
      'Create courses and manage enrollment',
      'Build Course Material and Quiz boards',
      'Dedicated lecturer portal with analytics',
      'Share boards with students',
      'Bulk import students via CSV/XLSX',
    ],
  },
  {
    icon: Shield,
    title: 'Administrators',
    tick: 'text-teal-700',
    stripe: 'bg-note-teal',
    features: [
      'Full system dashboard with stats',
      'User management (CRUD, bulk import)',
      'Storage monitoring and quotas',
      'System settings configuration',
      'Audit logs and activity tracking',
    ],
  },
];

function AboutPage({ onNavigate }) {
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
          <button
            type="button"
            onClick={() => onNavigate('home')}
            className="btn-motion inline-flex min-h-[44px] items-center gap-2 rounded px-1 text-ink-2 hover:text-ink"
          >
            <ArrowLeft className="h-5 w-5" strokeWidth={1.5} aria-hidden="true" />
            <span className="text-sm font-medium">Back to Home</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('login')}
            className="btn-motion h-9 rounded bg-accent px-4 text-sm font-medium text-white hover:bg-accent-hover"
          >
            Sign In
          </button>
        </div>
      </header>

      <main id="main" className="pb-16 md:pb-20">
        {/* Hero: one chalkboard on a wood frame. Long title, so it stays in the body face. */}
        <section aria-labelledby="about-title" className="px-4 pb-12 pt-8 md:pb-16 md:pt-14">
          <div className="mx-auto max-w-5xl">
            <WoodFrame>
              <div className="chalkboard rounded-sm px-5 py-10 text-center motion-safe:animate-oc-rise md:px-14 md:py-16">
                <ChalkBadge surface="chalk" icon={HelpCircle} label="About OpenCanvas" />
                <h1 id="about-title" className="mx-auto mt-6 max-w-3xl text-3xl font-semibold leading-tight text-chalk-ink md:text-5xl">
                  Empowering Education Through<br />
                  <span className="relative text-note-amber">
                    Collaborative Whiteboards
                    <span aria-hidden="true" className="absolute -bottom-1.5 left-0 right-0 block h-1 origin-left motion-safe:animate-oc-draw">
                      <span className="block h-full w-full rounded-full bg-note-amber motion-safe:animate-oc-breathe" />
                    </span>
                  </span>
                </h1>
                <p className="mx-auto mt-6 max-w-3xl text-base leading-relaxed text-chalk-dust md:text-lg">
                  OpenCanvas is an educational collaborative whiteboard platform designed for academic institutions.
                  It enables students, lecturers, and administrators to create, manage, and collaborate on
                  digital boards tailored for educational use.
                </p>
              </div>
            </WoodFrame>
          </div>
        </section>

        {/* Mission: a white paper card with four sticky notes */}
        <section aria-labelledby="mission-title" className="scroll-reveal px-4 pb-16 md:pb-20">
          <PaperPanel tone="paper" padded={false} className="mx-auto grid max-w-5xl gap-10 overflow-x-clip p-6 md:grid-cols-2 md:gap-12 md:p-12">
            <div>
              <h2 id="mission-title" className="font-hand text-3xl text-ink md:text-4xl">Our Mission</h2>
              <p className="mt-4 leading-relaxed text-ink-2">
                We believe in making collaborative learning accessible and engaging. OpenCanvas provides
                a suite of purpose-built board templates and tools that transform how students and
                educators interact with course material.
              </p>
              <p className="mt-4 leading-relaxed text-ink-2">
                From visual brainstorming sessions to structured course materials, our platform adapts
                to every learning style and teaching methodology.
              </p>
            </div>
            <ul className="grid grid-cols-2 gap-4">
              {MISSION_NOTES.map((item, idx) => (
                <li key={item.label}>
                  <StickyNote color={item.color} rotate={idx % 2 === 0 ? -2 : 2} decorative className="h-full items-center text-center">
                    <item.icon className="mb-2 h-7 w-7 text-ink" strokeWidth={1.5} aria-hidden="true" />
                    <p className="font-hand text-lg text-ink">{item.label}</p>
                    <p className="text-xs text-ink-2">{item.desc}</p>
                  </StickyNote>
                </li>
              ))}
            </ul>
          </PaperPanel>
        </section>

        {/* Board templates: sticky notes on a corkboard in a wood frame. Headings sit on the wall, not on cork. */}
        <section aria-labelledby="templates-title" id="templates" className="scroll-mt-16 pb-16 md:pb-20">
          <div className="scroll-reveal mx-auto mb-10 max-w-3xl px-4 text-center">
            <h2 id="templates-title" className="font-hand text-3xl text-ink md:text-4xl">Board Templates</h2>
            <p className="mx-auto mt-3 max-w-2xl text-ink-2">
              Start with a template designed for your workflow, or create a blank board from scratch.
            </p>
          </div>
          <div className="mx-auto max-w-6xl px-4">
            <WoodFrame>
              <CorkBoard as="div" layout="five">
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
                      <h3 className="font-sans text-xl font-semibold text-ink">{tmpl.name}</h3>
                      <p className="mb-4 mt-1 text-sm leading-relaxed text-ink-2">{tmpl.desc}</p>
                      <div className="mt-auto">
                        <span className="inline-flex h-5 items-center rounded-sm bg-chalk-board px-1.5 text-2xs font-medium text-chalk-ink">
                          {tmpl.role}
                        </span>
                      </div>
                    </StickyNote>
                  </li>
                ))}
              </CorkBoard>
            </WoodFrame>
          </div>
        </section>

        {/* Roles: white cards with a coloured top stripe */}
        <section id="roles" aria-labelledby="roles-title" className="scroll-mt-16 px-4 pb-16 md:pb-20">
          <div className="scroll-reveal mx-auto mb-10 max-w-3xl text-center">
            <h2 id="roles-title" className="font-hand text-3xl text-ink md:text-4xl">Built for Every Role</h2>
            <p className="mx-auto mt-3 max-w-2xl text-ink-2">
              Dedicated portals and permissions for every member of your institution.
            </p>
          </div>
          <div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-3">
            {ROLES.map((role, idx) => (
              <div key={role.title} className={`scroll-reveal h-full reveal-delay-${idx + 1}`}>
                <PaperPanel tone="white" padded={false} as="article" className="lift relative flex h-full flex-col overflow-hidden">
                  <span aria-hidden="true" className={cx('h-1.5 w-full', role.stripe)} />
                  <div className="flex flex-1 flex-col gap-4 p-5 md:p-6">
                    <div className="flex items-center gap-3">
                      <role.icon className={cx('h-6 w-6 flex-shrink-0', role.tick)} strokeWidth={1.5} aria-hidden="true" />
                      <h3 className="font-sans text-2xl font-semibold text-ink">{role.title}</h3>
                    </div>
                    <ul className="flex flex-col gap-2.5">
                      {role.features.map((f) => (
                        <li key={f} className="flex items-start gap-2.5 text-sm text-ink">
                          <Check className={cx('mt-0.5 h-4 w-4 flex-shrink-0', role.tick)} strokeWidth={1.5} aria-hidden="true" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </PaperPanel>
              </div>
            ))}
          </div>
        </section>

        {/* Security */}
        {/* <div className="bg-white rounded-xl border border-gray-200 p-8 md:p-12 mb-16">
          <div className="text-center mb-8">
            <Lock className="w-10 h-10 text-accent-600 mx-auto mb-3" />
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">Security & Privacy</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              OpenCanvas is built with security in mind at every layer.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { title: 'JWT Authentication', desc: 'Secure token-based auth with automatic refresh and blacklisting' },
              { title: 'XSS Protection', desc: 'All user input is sanitized with DOMPurify to prevent cross-site scripting' },
              { title: 'Role-Based Access', desc: 'Granular permissions ensure users only access what they should' },
              { title: 'Audit Logging', desc: 'All actions are logged for accountability and security monitoring' },
            ].map((item, idx) => (
              <div key={idx} className="text-center">
                <h4 className="font-semibold text-gray-900 mb-1">{item.title}</h4>
                <p className="text-sm text-gray-500">{item.desc}</p>
              </div>
            ))}
          </div>
        </div> */}

        {/* Tech Stack */}
        {/* <div className="mb-16">
          <h2 className="text-2xl font-semibold text-gray-900 text-center mb-3">Technology Stack</h2>
          <p className="text-gray-600 text-center mb-10">Built with modern, reliable technologies.</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'React 18', desc: 'Frontend UI framework', icon: Layers },
              { label: 'Django REST', desc: 'Backend API framework', icon: Globe },
              { label: 'Konva.js', desc: '2D canvas rendering', icon: Palette },
              { label: 'MySQL 8', desc: 'Relational database', icon: Lock },
            ].map((tech, idx) => (
              <div key={idx} className="bg-white rounded-xl border border-gray-200 p-5 text-center">
                <tech.icon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="font-semibold text-gray-900">{tech.label}</p>
                <p className="text-sm text-gray-500">{tech.desc}</p>
              </div>
            ))}
          </div>
        </div> */}

        {/* CTA: a paper card, not a second chalkboard (one chalkboard per screen) */}
        <section aria-labelledby="cta-title" className="scroll-reveal px-4">
          <PaperPanel tone="paper" padded={false} className="mx-auto max-w-4xl p-6 text-center md:p-12">
            <h2 id="cta-title" className="font-hand text-3xl text-ink md:text-4xl">Ready to get started?</h2>
            <p className="mx-auto mt-3 max-w-lg text-ink-2">
              Join OpenCanvas today and transform how your institution collaborates.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <ClassroomButton variant="primary" onClick={() => onNavigate('signup')} className="px-6 font-semibold">
                Get Started
              </ClassroomButton>
              <ClassroomButton onClick={() => onNavigate('home')} className="px-6">
                Back to Home
              </ClassroomButton>
            </div>
          </PaperPanel>
        </section>
      </main>

      {/* Footer on a dark wood shelf */}
      <footer className="bg-wood-dark text-wood-cream">
        <div className="mx-auto max-w-6xl px-4 py-6 text-center text-sm">
          &copy; {new Date().getFullYear()} OpenCanvas. All rights reserved.
        </div>
      </footer>
    </ClassroomShell>
  );
}

export default AboutPage;
