import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Layout, Search, X, Plus, BookOpen, Calendar, Lightbulb, ChevronRight, Info, HelpCircle } from 'lucide-react';
import Navigation from '../components/Navigation';
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

  const filteredTemplates = templates.filter(template =>
    template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    template.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getColorClasses = (color) => {
    const colors = {
      indigo: { bg: 'bg-indigo-100', text: 'text-indigo-600', border: 'border-indigo-200', hover: 'hover:border-indigo-400' },
      emerald: { bg: 'bg-emerald-100', text: 'text-emerald-600', border: 'border-emerald-200', hover: 'hover:border-emerald-400' },
      teal: { bg: 'bg-teal-100', text: 'text-teal-600', border: 'border-teal-200', hover: 'hover:border-teal-400' },
      cyan: { bg: 'bg-cyan-100', text: 'text-cyan-600', border: 'border-cyan-200', hover: 'hover:border-cyan-400' },
    };
    return colors[color] || colors.indigo;
  };

  const handleUseTemplate = (template) => {
    const params = { templateType: template.id };
    if (courseId) params.courseId = courseId;
    if (section) params.section = section;
    onNavigate('workspace', params);
  };

  return (
    <div className={hideNav ? '' : 'min-h-screen bg-gray-50'}>
      {!hideNav && <Navigation onNavigate={onNavigate} currentPage="templates" />}
      <div className={hideNav ? '' : 'max-w-7xl mx-auto px-4 py-8'}>
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Board Templates</h1>
            <p className="text-gray-600 mt-1">Start quickly with pre-designed layouts, or browse your boards by type</p>
          </div>
          <button
            onClick={() => {
              const params = {};
              if (courseId) params.courseId = courseId;
              if (section) params.section = section;
              onNavigate('workspace', params);
            }}
            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:shadow-lg transition flex items-center space-x-2"
          >
            <Plus className="w-5 h-5" />
            <span>Blank Board</span>
          </button>
        </div>

        {/* Course context banner */}
        {courseId && (
          <div className="mb-6 flex items-center space-x-3 px-4 py-3 bg-indigo-50 border border-indigo-200 rounded-lg">
            <Info className="w-5 h-5 text-indigo-600 flex-shrink-0" />
            <p className="text-sm text-indigo-700">
              Creating board for <span className="font-semibold">{courseName || `Course #${courseId}`}</span>
              {section && <> / <span className="font-semibold">Section {section}</span></>}
              . Choose a template below.
            </p>
          </div>
        )}

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>

        {filteredTemplates.length > 0 ? (
          <div className="grid md:grid-cols-2 gap-6">
            {filteredTemplates.map(template => {
              const Icon = template.icon;
              const colors = getColorClasses(template.color);
              const routeKey = TEMPLATE_ROUTES[template.id];
              return (
                <div
                  key={template.id}
                  className={`bg-white rounded-xl shadow-sm border ${colors.border} ${colors.hover} hover:shadow-md transition group`}
                >
                  <div className="p-6">
                    <div className="flex items-start space-x-4">
                      <div className={`w-14 h-14 ${colors.bg} rounded-xl flex items-center justify-center flex-shrink-0`}>
                        <Icon className={`w-7 h-7 ${colors.text}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-bold text-gray-900 mb-1">{template.name}</h3>
                        <p className="text-sm text-gray-600 mb-3">{template.description}</p>
                        <div className="flex flex-wrap gap-2 mb-4">
                          {template.features.map((feature, i) => (
                            <span key={i} className={`text-xs ${colors.bg} ${colors.text} px-2 py-0.5 rounded-full`}>
                              {feature}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="flex space-x-2 mt-2">
                      <button
                        onClick={() => onNavigate(routeKey)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition font-medium text-sm flex items-center justify-center space-x-1"
                      >
                        <span>View Boards</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleUseTemplate(template)}
                        className={`flex-1 px-3 py-2 ${colors.bg} ${colors.text} rounded-lg transition font-medium text-sm hover:opacity-80`}
                      >
                        Create New
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16">
            <Layout className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No templates found</h3>
            <p className="text-gray-500 mb-6">Try adjusting your search</p>
            <button onClick={() => setSearchQuery('')} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
              Show All Templates
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default TemplatesPage;
