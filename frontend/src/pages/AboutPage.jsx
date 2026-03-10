import React, { useEffect, useRef } from 'react';
import {
  Layout, Users, Shield, BookOpen, Columns, Calendar,
  Lightbulb, Share2, Lock, Globe, ArrowLeft, GraduationCap,
  Palette, Layers, HelpCircle
} from 'lucide-react';

function useScrollReveal() {
  const containerRef = useRef(null);
  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;
    const elements = root.querySelectorAll('.scroll-reveal');
    if (!elements.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );
    elements.forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, []);
  return containerRef;
}

function AboutPage({ onNavigate }) {
  const revealRef = useScrollReveal();
  return (
    <div ref={revealRef} className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <button
            onClick={() => onNavigate('home')}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition"
          >
            <ArrowLeft className="h-5 w-5" />
            <span className="text-sm font-medium">Back to Home</span>
          </button>
          <button
            onClick={() => onNavigate('login')}
            className="bg-indigo-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition"
          >
            Sign In
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-16">
        {/* Hero */}
        <div className="text-center mb-20">
          <div className="inline-flex items-center space-x-2 bg-indigo-100 text-indigo-700 px-4 py-1.5 rounded-full text-sm font-medium mb-6">
            <HelpCircle className="w-4 h-4" />
            <span>About OpenCanvas</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            Empowering Education Through<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">
              Collaborative Whiteboards
            </span>
          </h1>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto leading-relaxed">
            OpenCanvas is an educational collaborative whiteboard platform designed for academic institutions.
            It enables students, lecturers, and administrators to create, manage, and collaborate on
            digital boards tailored for educational use.
          </p>
        </div>

        {/* Mission */}
        <div className="scroll-reveal bg-white rounded-2xl shadow-sm border border-gray-200 p-8 md:p-12 mb-16">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Our Mission</h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                We believe in making collaborative learning accessible and engaging. OpenCanvas provides
                a suite of purpose-built board templates and tools that transform how students and
                educators interact with course material.
              </p>
              <p className="text-gray-600 leading-relaxed">
                From visual brainstorming sessions to structured course materials, our platform adapts
                to every learning style and teaching methodology.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { icon: Users, label: 'Collaborative', desc: 'Real-time sharing' },
                { icon: Shield, label: 'Secure', desc: 'Role-based access' },
                { icon: Palette, label: 'Creative', desc: 'Rich board tools' },
                { icon: Globe, label: 'Accessible', desc: 'Works everywhere' },
              ].map((item, idx) => (
                <div key={idx} className="bg-gray-50 rounded-xl p-4 text-center">
                  <item.icon className="w-8 h-8 text-indigo-600 mx-auto mb-2" />
                  <p className="font-semibold text-gray-900 text-sm">{item.label}</p>
                  <p className="text-xs text-gray-500">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Board Templates */}
        <div className="scroll-reveal mb-16">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-3">Board Templates</h2>
          <p className="text-gray-600 text-center mb-10 max-w-2xl mx-auto">
            Start with a template designed for your workflow, or create a blank board from scratch.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-5">
            {[
              { icon: BookOpen, name: 'Course Material', desc: 'Structured content for lectures', color: 'indigo', role: 'Lecturers' },
              { icon: Lightbulb, name: 'Student Notes', desc: 'Brainstorming and note-taking', color: 'amber', role: 'Students' },
              { icon: Calendar, name: 'Study Planner', desc: 'Weekly timetable and goals', color: 'green', role: 'All Roles' },
              { icon: Columns, name: 'Kanban Board', desc: 'Task and project management', color: 'purple', role: 'All Roles' },
              { icon: HelpCircle, name: 'Quiz Board', desc: 'Interactive quizzes', color: 'blue', role: 'Lecturers' },
            ].map((tmpl, idx) => {
              const colorMap = {
                indigo: 'bg-indigo-100 text-indigo-600 border-indigo-200',
                amber: 'bg-amber-100 text-amber-600 border-amber-200',
                green: 'bg-green-100 text-green-600 border-green-200',
                purple: 'bg-purple-100 text-purple-600 border-purple-200',
                blue: 'bg-blue-100 text-blue-600 border-blue-200',
              };
              const badgeMap = {
                indigo: 'bg-indigo-50 text-indigo-700',
                amber: 'bg-amber-50 text-amber-700',
                green: 'bg-green-50 text-green-700',
                purple: 'bg-purple-50 text-purple-700',
                blue: 'bg-blue-50 text-blue-700',
              };
              return (
                <div key={idx} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-3 ${colorMap[tmpl.color]}`}>
                    <tmpl.icon className="w-6 h-6" />
                  </div>
                  <h4 className="font-semibold text-gray-900 mb-1">{tmpl.name}</h4>
                  <p className="text-sm text-gray-500 mb-2">{tmpl.desc}</p>
                  <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded ${badgeMap[tmpl.color]}`}>
                    {tmpl.role}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Roles */}
        <div className="scroll-reveal mb-16">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-3">Built for Every Role</h2>
          <p className="text-gray-600 text-center mb-10 max-w-2xl mx-auto">
            Dedicated portals and permissions for every member of your institution.
          </p>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: GraduationCap,
                title: 'Students',
                color: 'blue',
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
                color: 'green',
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
                color: 'purple',
                features: [
                  'Full system dashboard with stats',
                  'User management (CRUD, bulk import)',
                  'Storage monitoring and quotas',
                  'System settings configuration',
                  'Audit logs and activity tracking',
                ],
              },
            ].map((role, idx) => {
              const colors = {
                blue: 'border-blue-200 bg-blue-50',
                green: 'border-green-200 bg-green-50',
                purple: 'border-purple-200 bg-purple-50',
              };
              const iconColors = {
                blue: 'text-blue-600',
                green: 'text-green-600',
                purple: 'text-purple-600',
              };
              return (
                <div key={idx} className={`rounded-xl border-2 ${colors[role.color]} p-6`}>
                  <role.icon className={`w-10 h-10 ${iconColors[role.color]} mb-3`} />
                  <h3 className="text-lg font-bold text-gray-900 mb-3">{role.title}</h3>
                  <ul className="space-y-2">
                    {role.features.map((f, i) => (
                      <li key={i} className="flex items-start space-x-2 text-sm text-gray-700">
                        <span className={`mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${iconColors[role.color].replace('text-', 'bg-')}`} />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>

        {/* Security */}
        {/* <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 md:p-12 mb-16">
          <div className="text-center mb-8">
            <Lock className="w-10 h-10 text-indigo-600 mx-auto mb-3" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Security & Privacy</h2>
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
        {/* <div className="scroll-reveal mb-16">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-3">Technology Stack</h2>
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

        {/* CTA */}
        <div className="scroll-reveal text-center bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-10 text-white">
          <h2 className="text-3xl font-bold mb-3">Ready to get started?</h2>
          <p className="text-indigo-100 mb-6 max-w-lg mx-auto">
            Join OpenCanvas today and transform how your institution collaborates.
          </p>
          <div className="flex items-center justify-center space-x-4">
            <button
              onClick={() => onNavigate('signup')}
              className="bg-white text-indigo-600 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition"
            >
              Get Started
            </button>
            <button
              onClick={() => onNavigate('home')}
              className="border-2 border-white text-white px-6 py-3 rounded-lg font-semibold hover:bg-white/10 transition"
            >
              Back to Home
            </button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-16">
        <div className="max-w-6xl mx-auto px-4 py-6 text-center text-sm text-gray-500">
          &copy; {new Date().getFullYear()} OpenCanvas. All rights reserved.
        </div>
      </footer>
    </div>
  );
}

export default AboutPage;
