import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Layout, BookOpen, Users, Settings, Folder, BarChart,
  ChevronDown, ChevronRight, Bell, Archive, Share2, User, Grid, LogOut
} from 'lucide-react';
import NotificationDropdown from './NotificationDropdown';
import { useAuth } from '../contexts/AuthContext';

const menuItems = [
  { id: 'overview', path: '/lecturer', icon: Layout, label: 'Overview' },
  { id: 'boards', path: '/lecturer/boards', icon: Folder, label: 'My Boards' },
  { id: 'courses', path: '/lecturer/courses', icon: BookOpen, label: 'My Courses' },
  { id: 'students', path: '/lecturer/students', icon: Users, label: 'Students' },
  { id: 'analytics', path: '/lecturer/analytics', icon: BarChart, label: 'Analytics' },
  { id: 'templates', path: '/lecturer/templates', icon: Grid, label: 'Templates' },
  { id: 'shared', path: '/lecturer/shared', icon: Share2, label: 'Shared' },
  { id: 'archive', path: '/lecturer/archive', icon: Archive, label: 'Archive' },
  { id: 'settings', path: '/lecturer/settings', icon: Settings, label: 'Settings' },
];

export default function LecturerLayout({ children, onNavigate }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileMenuRef = useRef(null);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const userInitials = user
    ? (user.first_name && user.last_name
        ? `${user.first_name[0]}${user.last_name[0]}`
        : user.username?.[0]?.toUpperCase() || 'L')
    : 'L';

  const currentPath = location.pathname;

  const isActive = (item) => {
    if (item.path === '/lecturer') return currentPath === '/lecturer';
    return currentPath.startsWith(item.path);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Bar */}
      <nav className="bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg relative z-40">
        <div className="max-w-full mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3 cursor-pointer" onClick={() => navigate('/lecturer')}>
              <Layout className="w-8 h-8" />
              <span className="text-2xl font-bold">OpenCanvas</span>
            </div>
            <div className="flex items-center space-x-4">
              <button onClick={() => onNavigate('lecturer')} className="hover:text-blue-200 transition">
                Home
              </button>
              <NotificationDropdown onNavigate={onNavigate} />
              <div className="relative" ref={profileMenuRef}>
                <button
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                  className="w-8 h-8 bg-white text-indigo-600 rounded-full flex items-center justify-center font-semibold"
                >
                  {userInitials}
                </button>
                {showProfileMenu && (
                  <div className="absolute right-0 top-10 bg-white rounded-lg shadow-lg border py-1 z-50 w-48 animate-slideDown">
                    <div className="px-4 py-2 border-b">
                      <p className="text-sm font-medium text-gray-900">{user?.first_name} {user?.last_name}</p>
                      <p className="text-xs text-gray-500">{user?.email}</p>
                    </div>
                    <button
                      onClick={() => { navigate('/lecturer/profile'); setShowProfileMenu(false); }}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
                    >
                      <User className="w-4 h-4" /><span>Profile</span>
                    </button>
                    <button
                      onClick={() => { navigate('/lecturer/settings'); setShowProfileMenu(false); }}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
                    >
                      <Settings className="w-4 h-4" /><span>Settings</span>
                    </button>
                    <button
                      onClick={() => { logout(); navigate('/login'); }}
                      className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2 border-t"
                    >
                      <LogOut className="w-4 h-4" /><span>Logout</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </nav>

      <div className="flex min-h-[calc(100vh-64px)]">
        {/* Collapsible Sidebar */}
        <aside className={`bg-white border-r border-gray-200 flex-shrink-0 transition-all duration-300 ${sidebarCollapsed ? 'w-16' : 'w-64'}`}>
          <div className={`sticky top-0 ${sidebarCollapsed ? 'p-2' : 'p-4'}`}>
            <div className={`flex items-center mb-6 ${sidebarCollapsed ? 'justify-center' : 'justify-between'}`}>
              {!sidebarCollapsed && <h2 className="text-xl font-bold text-gray-900">Lecturer</h2>}
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                {sidebarCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </button>
            </div>
            <nav className="space-y-1">
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => navigate(item.path)}
                  className={`w-full flex items-center rounded-lg transition ${
                    sidebarCollapsed ? 'justify-center p-3' : 'space-x-3 px-3 py-3'
                  } ${
                    isActive(item)
                      ? 'bg-indigo-50 text-indigo-600'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                  title={sidebarCollapsed ? item.label : ''}
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  {!sidebarCollapsed && <span className="font-medium">{item.label}</span>}
                </button>
              ))}
            </nav>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-8 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
