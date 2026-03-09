import React from 'react';
import { Palette, BookOpen, ArrowRight, Layout, Calendar, Columns, GraduationCap, Shield, Share2, ClipboardList, Lightbulb } from 'lucide-react';

function HomePage({ onNavigate }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Layout className="h-8 w-8 text-indigo-600" />
            <span className="text-2xl font-bold text-gray-900">OpenCanvas</span>
          </div>
          <button
            onClick={() => onNavigate('login')}
            className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition"
          >
            Sign In
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 py-16">
        <div className="text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Collaborative Learning Made Simple
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            An educational whiteboard platform with ready-made board templates and role-based portals for students, lecturers, and administrators.
          </p>
          <button
            onClick={() => onNavigate('login')}
            className="bg-indigo-600 text-white px-8 py-3 rounded-lg text-lg font-semibold hover:bg-indigo-700 transition inline-flex items-center space-x-2"
          >
            <span>Get Started</span>
            <ArrowRight className="h-5 w-5" />
          </button>
        </div>

        {/* Features */}
        <div className="mt-20 grid md:grid-cols-3 gap-8">
          <div className="bg-white p-6 rounded-xl shadow-lg">
            <Palette className="h-12 w-12 text-indigo-600 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Board Templates</h3>
            <p className="text-gray-600">Choose from 4 templates — Course Material, Student Notes, Study Planner, and Kanban Board — each tailored for different workflows.</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-lg">
            <Share2 className="h-12 w-12 text-indigo-600 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Share & Collaborate</h3>
            <p className="text-gray-600">Invite members and share boards with view or edit permissions to work together across your institution.</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-lg">
            <ClipboardList className="h-12 w-12 text-indigo-600 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Courses & Collaboration</h3>
            <p className="text-gray-600">Create courses, enroll students, and collaborate on boards with view or edit permissions.</p>
          </div>
        </div>

        {/* Board Templates Showcase */}
        <div className="mt-24">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-4">Board Templates</h2>
          <p className="text-gray-600 text-center mb-12 max-w-2xl mx-auto">
            Start with a template designed for your workflow, or create a blank board from scratch.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
              <BookOpen className="h-10 w-10 text-indigo-600 mb-3" />
              <h4 className="text-lg font-semibold mb-1">Course Material</h4>
              <span className="inline-block text-xs font-medium bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded mb-2">Lecturers</span>
              <p className="text-sm text-gray-600">Organize structured course content with sections for topics, resources, and notes.</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
              <Lightbulb className="h-10 w-10 text-amber-500 mb-3" />
              <h4 className="text-lg font-semibold mb-1">Student Notes</h4>
              <span className="inline-block text-xs font-medium bg-amber-100 text-amber-700 px-2 py-0.5 rounded mb-2">Students</span>
              <p className="text-sm text-gray-600">Brainstorm with sections for ideas, questions, key points, references, and shared notes.</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
              <Calendar className="h-10 w-10 text-green-600 mb-3" />
              <h4 className="text-lg font-semibold mb-1">Study Planner</h4>
              <span className="inline-block text-xs font-medium bg-green-100 text-green-700 px-2 py-0.5 rounded mb-2">All Roles</span>
              <p className="text-sm text-gray-600">Weekly timetable with goals, week/month navigation, and copy-to-next-week.</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
              <Columns className="h-10 w-10 text-purple-600 mb-3" />
              <h4 className="text-lg font-semibold mb-1">Kanban Board</h4>
              <span className="inline-block text-xs font-medium bg-purple-100 text-purple-700 px-2 py-0.5 rounded mb-2">All Roles</span>
              <p className="text-sm text-gray-600">Column-based task management with media cards for files, images, and links.</p>
            </div>
          </div>
        </div>

        {/* Role-Based Access Section */}
        <div className="mt-24">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-4">Built for Every Role</h2>
          <p className="text-gray-600 text-center mb-12 max-w-2xl mx-auto">
            Dedicated portals and permissions for students, lecturers, and administrators.
          </p>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100 text-center">
              <GraduationCap className="h-10 w-10 text-blue-600 mb-3 mx-auto" />
              <h4 className="text-lg font-semibold mb-2">Student</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>Create and manage boards</li>
                <li>Enroll in courses</li>
                <li>Collaborate with classmates</li>
              </ul>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100 text-center">
              <BookOpen className="h-10 w-10 text-green-600 mb-3 mx-auto" />
              <h4 className="text-lg font-semibold mb-2">Lecturer</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>Create courses and enroll students</li>
                <li>Track board activity</li>
                <li>Dedicated lecturer portal</li>
              </ul>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100 text-center">
              <Shield className="h-10 w-10 text-gray-600 mb-3 mx-auto" />
              <h4 className="text-lg font-semibold mb-2">Admin</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>Manage users and institutions</li>
                <li>Configure system settings</li>
                <li>View audit logs</li>
              </ul>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-20">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <Layout className="h-6 w-6 text-indigo-600" />
              <span className="text-lg font-semibold text-gray-900">OpenCanvas</span>
            </div>
            <div className="flex flex-wrap justify-center gap-6 text-sm text-gray-600">
              <button
                onClick={() => onNavigate('lecturer-login')}
                className="hover:text-indigo-600 transition"
              >
                Lecturer Portal
              </button>
              <span className="text-gray-300">|</span>
              <button
                onClick={() => onNavigate('admin-login')}
                className="hover:text-indigo-600 transition"
              >
                Admin Portal
              </button>
              <span className="text-gray-300">|</span>
              <span>© 2026 OpenCanvas. All rights reserved.</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default HomePage;
