import React, { useState } from 'react';
import { Layout, User, ChevronDown, Settings, LogOut, UserPlus, Shield } from 'lucide-react';
import NotificationDropdown from './NotificationDropdown';
import { useAuth } from '../contexts/AuthContext';

const Navigation = ({ onNavigate }) => {
  const { user, logout, isGuest } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const displayName = isGuest
    ? 'Guest'
    : [user?.first_name, user?.last_name].filter(Boolean).join(' ') || user?.username || 'User';
  const initials = isGuest
    ? 'G'
    : displayName.split(' ').map(n => n[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || 'U';
  const userRole = user?.role || 'student';

  return (
    <nav className="bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg relative z-40">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <button
            onClick={() => onNavigate('dashboard')}
            className="flex items-center space-x-3 hover:opacity-80 transition"
          >
            <Layout className="w-8 h-8" />
            <span className="text-2xl font-bold">OpenCanvas</span>
          </button>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-6">
            <button
              onClick={() => onNavigate('dashboard')}
              className="hover:text-blue-200 transition"
            >
              Dashboard
            </button>
            {!isGuest && (
              <button
                onClick={() => onNavigate('archive')}
                className="hover:text-blue-200 transition"
              >
                Archive
              </button>
            )}
            {!isGuest && (
              <button
                onClick={() => onNavigate('shared')}
                className="hover:text-blue-200 transition"
              >
                Shared
              </button>
            )}
            {!isGuest && userRole === 'student' && (
              <button
                onClick={() => onNavigate('courses')}
                className="hover:text-blue-200 transition"
              >
                Courses
              </button>
            )}
            <button
              onClick={() => onNavigate('templates')}
              className="hover:text-blue-200 transition"
            >
              Templates
            </button>

            {/* Role-based navigation */}
            {(userRole === 'lecturer' || userRole === 'admin') && (
              <button
                onClick={() => onNavigate('lecturer')}
                className="hover:text-blue-200 transition"
              >
                Lecturer
              </button>
            )}
            {userRole === 'admin' && (
              <button
                onClick={() => onNavigate('admin')}
                className="hover:text-blue-200 transition flex items-center space-x-1"
              >
                <Shield className="w-4 h-4" />
                <span>Admin</span>
              </button>
            )}

            {/* Notifications */}
            {!isGuest && <NotificationDropdown onNavigate={onNavigate} />}

            {/* User Menu */}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center space-x-2 hover:text-blue-200 transition"
              >
                <div className="w-8 h-8 bg-white text-indigo-600 rounded-full flex items-center justify-center font-semibold">
                  {initials}
                </div>
                <span className="hidden lg:block">{displayName}</span>
                <ChevronDown className="w-4 h-4" />
              </button>

              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl py-2 z-50 animate-slideDown">
                  <div className="px-4 py-2 border-b border-gray-200">
                    <p className="font-semibold text-gray-900">{displayName}</p>
                    <p className="text-xs text-gray-600 capitalize">{userRole}</p>
                  </div>
                  <button
                    onClick={() => {
                      onNavigate('profile');
                      setShowUserMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                  >
                    <User className="w-4 h-4" />
                    <span>Profile</span>
                  </button>
                  {!isGuest && (
                    <button
                      onClick={() => {
                        onNavigate('settings');
                        setShowUserMenu(false);
                      }}
                      className="w-full px-4 py-2 text-left text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                    >
                      <Settings className="w-4 h-4" />
                      <span>Settings</span>
                    </button>
                  )}
                  {isGuest && (
                    <button
                      onClick={() => {
                        onNavigate('login');
                        setShowUserMenu(false);
                      }}
                      className="w-full px-4 py-2 text-left text-indigo-600 hover:bg-indigo-50 flex items-center space-x-2"
                    >
                      <UserPlus className="w-4 h-4" />
                      <span>Sign Up</span>
                    </button>
                  )}
                  <button
                    onClick={async () => {
                      setShowUserMenu(false);
                      await logout();
                      onNavigate('home');
                    }}
                    className="w-full px-4 py-2 text-left text-red-600 hover:bg-red-50 flex items-center space-x-2"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Log Out</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden"
            onClick={() => setShowMobileMenu(!showMobileMenu)}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>

        {/* Mobile Menu */}
        {showMobileMenu && (
          <div className="md:hidden py-4 border-t border-blue-500">
            <div className="flex flex-col space-y-3">
              <button onClick={() => { onNavigate('dashboard'); setShowMobileMenu(false); }} className="text-left hover:text-blue-200">
                Dashboard
              </button>
              <button onClick={() => { onNavigate('archive'); setShowMobileMenu(false); }} className="text-left hover:text-blue-200">
                Archive
              </button>
              <button onClick={() => { onNavigate('shared'); setShowMobileMenu(false); }} className="text-left hover:text-blue-200">
                Shared
              </button>
              <button onClick={() => { onNavigate('templates'); setShowMobileMenu(false); }} className="text-left hover:text-blue-200">
                Templates
              </button>
              {!isGuest && userRole === 'student' && (
                <button onClick={() => { onNavigate('courses'); setShowMobileMenu(false); }} className="text-left hover:text-blue-200">
                  Courses
                </button>
              )}
              {(userRole === 'lecturer' || userRole === 'admin') && (
                <button onClick={() => { onNavigate('lecturer'); setShowMobileMenu(false); }} className="text-left hover:text-blue-200">
                  Lecturer
                </button>
              )}
              {userRole === 'admin' && (
                <button onClick={() => { onNavigate('admin'); setShowMobileMenu(false); }} className="text-left hover:text-blue-200">
                  Admin Panel
                </button>
              )}
              {!isGuest && (
                <button onClick={() => { onNavigate('profile'); setShowMobileMenu(false); }} className="text-left hover:text-blue-200">
                  Profile
                </button>
              )}
              {!isGuest && (
                <button onClick={() => { onNavigate('settings'); setShowMobileMenu(false); }} className="text-left hover:text-blue-200">
                  Settings
                </button>
              )}
              {isGuest && (
                <button onClick={() => { onNavigate('login'); setShowMobileMenu(false); }} className="text-left text-green-300 hover:text-green-200">
                  Sign Up
                </button>
              )}
              <button onClick={async () => { setShowMobileMenu(false); await logout(); onNavigate('home'); }} className="text-left text-red-300 hover:text-red-200">
                Log Out
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navigation;
