import React, { useEffect, useRef } from 'react';
import {
  Layout, BookOpen, ArrowRight, Calendar, Columns,
  GraduationCap, Shield, Share2, Lightbulb, Users,
  Zap, Lock, Globe, ChevronRight, HelpCircle
} from 'lucide-react';

// Hook: observe elements with .scroll-reveal and add .is-visible when in viewport
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

function HomePage({ onNavigate }) {
  const revealRef = useScrollReveal();
  return (
    <div ref={revealRef} className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-100 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Layout className="h-8 w-8 text-indigo-600" />
            <span className="text-2xl font-bold text-gray-900">OpenCanvas</span>
          </div>
          <nav className="hidden md:flex items-center space-x-8">
            <a href="#features" className="text-sm text-gray-600 hover:text-gray-900 transition">Features</a>
            <a href="#templates" className="text-sm text-gray-600 hover:text-gray-900 transition">Templates</a>
            <a href="#roles" className="text-sm text-gray-600 hover:text-gray-900 transition">Roles</a>
            <button
              onClick={() => onNavigate('about')}
              className="text-sm text-gray-600 hover:text-gray-900 transition">
              About
            </button>
          </nav>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => onNavigate('login')}
              className="text-sm text-gray-700 hover:text-gray-900 font-medium transition hidden sm:block">
              Sign In
            </button>
            <button
              onClick={() => onNavigate('signup')}
              className="bg-indigo-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition">
              Get Started
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-white to-purple-50" />
        <div className="absolute top-20 left-10 w-72 h-72 bg-indigo-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse" />
        <div className="absolute bottom-20 right-10 w-72 h-72 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse" />

        <div className="relative max-w-7xl mx-auto px-4 py-20 md:py-28">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center space-x-2 bg-indigo-100 text-indigo-700 px-4 py-1.5 rounded-full text-sm font-medium mb-6">
              <Zap className="w-4 h-4" />
              <span>Educational Collaborative Platform</span>
            </div>

            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
              Where Learning Meets
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">
                {' '}Collaboration
              </span>
            </h1>

            <p className="text-lg md:text-xl text-gray-600 mb-10 max-w-2xl mx-auto leading-relaxed">
              A whiteboard platform built for academic institutions. Create, Share, and Collaborate on
              boards with purpose-built templates.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={() => onNavigate('signup')}
                className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-8 py-3.5 rounded-xl text-lg font-semibold hover:shadow-lg hover:shadow-indigo-200 transition-all inline-flex items-center space-x-2"
              >
                <span>Get Started Free</span>
                <ArrowRight className="h-5 w-5" />
              </button>
              <button
                onClick={() => onNavigate('about')}
                className="text-gray-700 px-8 py-3.5 rounded-xl text-lg font-medium hover:bg-gray-100 transition inline-flex items-center space-x-2 border border-gray-200"
              >
                <span>Learn More</span>
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>

            {/* Stats */}
            <div className="mt-16 grid grid-cols-3 gap-8 max-w-lg mx-auto">
              {[
                { value: '5+', label: 'Board Templates' },
                { value: '3', label: 'User Roles' },
                { value: '100%', label: 'Free to Use' },
              ].map((stat, idx) => (
                <div key={idx} className="text-center">
                  <p className="text-2xl md:text-3xl font-bold text-indigo-600">{stat.value}</p>
                  <p className="text-sm text-gray-500 mt-1">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-14 scroll-reveal">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Everything You Need to Collaborate
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Purpose-built features that make learning and teaching more interactive and engaging.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: Share2,
                title: 'Share & Collaborate',
                desc: 'Invite members with view, edit, or comment permissions. Share boards via invite links.',
                color: 'indigo',
              },
              {
                icon: Lock,
                title: 'Role-Based Access',
                desc: 'Students, lecturers, and admins each have dedicated portals and appropriate permissions.',
                color: 'green',
              },
              {
                icon: BookOpen,
                title: 'Course Management',
                desc: 'Create courses, manage enrollment, and organize boards by class or subject.',
                color: 'blue',
              },
              {
                icon: Users,
                title: 'Guest Access',
                desc: 'Try the platform instantly with guest mode. Convert to a full account any time.',
                color: 'amber',
              },
              {
                icon: Shield,
                title: 'Admin Dashboard',
                desc: 'Complete admin panel with user management, storage monitoring, and audit logs.',
                color: 'purple',
              },
              {
                icon: Globe,
                title: 'Version History',
                desc: 'Track changes with up to 50 versions per board. Restore any previous version instantly.',
                color: 'teal',
              },
            ].map((feature, idx) => {
              const colorMap = {
                indigo: 'bg-indigo-100 text-indigo-600',
                green: 'bg-green-100 text-green-600',
                blue: 'bg-blue-100 text-blue-600',
                amber: 'bg-amber-100 text-amber-600',
                purple: 'bg-purple-100 text-purple-600',
                teal: 'bg-teal-100 text-teal-600',
              };
              return (
                <div key={idx} className={`scroll-reveal stagger-${idx + 1} bg-white p-6 rounded-xl border border-gray-200 hover:shadow-md hover:-translate-y-1 transition-all duration-300 group`}>
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-4 ${colorMap[feature.color]} group-hover:scale-110 transition-transform duration-300`}>
                    <feature.icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">{feature.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Board Templates */}
      <section id="templates" className="py-20">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-14 scroll-reveal">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Ready-Made Board Templates
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Start with a template designed for your workflow, or create from scratch.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-5">
            {[
              {
                icon: BookOpen,
                name: 'Course Material',
                desc: 'Structured content with sections for topics, resources, and notes.',
                badge: 'Lecturers',
                gradient: 'from-indigo-500 to-blue-600',
                bg: 'bg-indigo-50',
              },
              {
                icon: Lightbulb,
                name: 'Student Notes',
                desc: 'Brainstorm with ideas, questions, key points, and references.',
                badge: 'Students',
                gradient: 'from-amber-500 to-orange-600',
                bg: 'bg-amber-50',
              },
              {
                icon: Calendar,
                name: 'Study Planner',
                desc: 'Weekly timetable with goals, navigation, and copy-to-next-week.',
                badge: 'All Roles',
                gradient: 'from-green-500 to-emerald-600',
                bg: 'bg-green-50',
              },
              {
                icon: Columns,
                name: 'Kanban Board',
                desc: 'Column-based task management with media cards.',
                badge: 'All Roles',
                gradient: 'from-purple-500 to-violet-600',
                bg: 'bg-purple-50',
              },
              {
                icon: HelpCircle,
                name: 'Quiz Board',
                desc: 'Interactive quizzes with MCQ, true/false, and fill-in-the-blank.',
                badge: 'Lecturers',
                gradient: 'from-blue-500 to-cyan-600',
                bg: 'bg-blue-50',
              },
            ].map((tmpl, idx) => (
              <div key={idx} className={`scroll-reveal stagger-${idx + 1} ${tmpl.bg} rounded-xl p-5 border border-gray-200 hover:shadow-md hover:-translate-y-1 transition-all duration-300`}>
                <div className={`w-11 h-11 rounded-lg bg-gradient-to-r ${tmpl.gradient} flex items-center justify-center mb-3`}>
                  <tmpl.icon className="w-5 h-5 text-white" />
                </div>
                <h4 className="font-semibold text-gray-900 mb-1">{tmpl.name}</h4>
                <p className="text-sm text-gray-600 mb-3 leading-relaxed">{tmpl.desc}</p>
                <span className="inline-block text-xs font-medium bg-white px-2.5 py-1 rounded-full text-gray-600 border border-gray-200">
                  {tmpl.badge}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Roles */}
      <section id="roles" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-14 scroll-reveal">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Built for Every Role
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Dedicated portals and permissions for students, lecturers, and administrators.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: GraduationCap,
                title: 'Student',
                color: 'blue',
                features: ['Create and manage boards', 'Enroll in courses', 'Collaborate with classmates', 'Take interactive quizzes'],
              },
              {
                icon: BookOpen,
                title: 'Lecturer',
                color: 'green',
                features: ['Create courses and enroll students', 'Build course materials and quizzes', 'Dedicated lecturer portal', 'Bulk import students'],
              },
              {
                icon: Shield,
                title: 'Admin',
                color: 'purple',
                features: ['Full system dashboard', 'User and storage management', 'System settings configuration', 'Audit logs and monitoring'],
              },
            ].map((role, idx) => {
              const colors = {
                blue: { bg: 'bg-blue-600', light: 'bg-blue-50', text: 'text-blue-600', dot: 'bg-blue-400' },
                green: { bg: 'bg-green-600', light: 'bg-green-50', text: 'text-green-600', dot: 'bg-green-400' },
                purple: { bg: 'bg-purple-600', light: 'bg-purple-50', text: 'text-purple-600', dot: 'bg-purple-400' },
              };
              const c = colors[role.color];
              return (
                <div key={idx} className={`scroll-reveal stagger-${idx + 1} bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md hover:-translate-y-1 transition-all duration-300`}>
                  <div className={`${c.bg} p-6 text-white`}>
                    <role.icon className="w-10 h-10 mb-2" />
                    <h3 className="text-xl font-bold">{role.title}</h3>
                  </div>
                  <div className="p-6">
                    <ul className="space-y-3">
                      {role.features.map((f, i) => (
                        <li key={i} className="flex items-center space-x-3 text-sm text-gray-700">
                          <span className={`w-2 h-2 rounded-full ${c.dot} flex-shrink-0`} />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <div className="scroll-reveal bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-10 md:p-14 text-white">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Start Collaborating Today
            </h2>
            <p className="text-indigo-100 mb-8 max-w-xl mx-auto text-lg">
              Create an account or try as a guest. No credit card required.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={() => onNavigate('signup')}
                className="bg-white text-indigo-600 px-8 py-3.5 rounded-xl font-semibold hover:bg-gray-100 transition inline-flex items-center space-x-2"
              >
                <span>Create Free Account</span>
                <ArrowRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400">
        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="grid md:grid-cols-4 gap-8">
            {/* Brand */}
            <div className="md:col-span-2">
              <div className="flex items-center space-x-2 mb-4">
                <Layout className="h-7 w-7 text-indigo-400" />
                <span className="text-xl font-bold text-white">OpenCanvas</span>
              </div>
              <p className="text-sm leading-relaxed max-w-sm">
                An educational collaborative whiteboard platform for academic institutions.
                Create, Share, and Collaborate on digital boards.
              </p>
            </div>

            {/* Links */}
            <div>
              <h4 className="text-white font-semibold mb-4">Platform</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <button onClick={() => onNavigate('login')} className="hover:text-white transition">
                    Sign In
                  </button>
                </li>
                <li>
                  <button onClick={() => onNavigate('about')} className="hover:text-white transition">
                    About
                  </button>
                </li>
                <li>
                  <button onClick={() => onNavigate('login')} className="hover:text-white transition">
                    Guest Access
                  </button>
                </li>
              </ul>
            </div>

            {/* Portals */}
            <div>
              <h4 className="text-white font-semibold mb-4">Portals</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <button onClick={() => onNavigate('login')} className="hover:text-white transition">
                    Student Portal
                  </button>
                </li>
                <li>
                  <button onClick={() => onNavigate('lecturer-login')} className="hover:text-white transition">
                    Lecturer Portal
                  </button>
                </li>
                <li>
                  <button onClick={() => onNavigate('admin-login')} className="hover:text-white transition">
                    Admin Portal
                  </button>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 mt-10 pt-6 text-center text-sm">
            &copy; {new Date().getFullYear()} OpenCanvas. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}

export default HomePage;
