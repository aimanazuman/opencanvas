import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Layout, BookOpen, Users, Settings, Folder, BarChart,
  ChevronLeft, ChevronRight, Archive, Share2, User, Grid, LogOut
} from 'lucide-react';
import NotificationDropdown from './NotificationDropdown';
import Tooltip from './ui/Tooltip';
import ClassroomShell from './classroom/ClassroomShell';
import cx from './classroom/cx';
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

// Staff-room rail. Wood-dark fill with chalk labels, no texture (the one chalkboard stays in the page header).
// Contrast: chalk-dust on wood-dark 8.9:1, chalk-ink on wood-dark 10.8:1, wood-dark on paper 11.7:1 (all AA text).
// Focus uses a chalk-ink ring (10.8:1 on wood-dark), not the azure global ring (2.1:1 there).
const RAIL_SURFACE = 'border-wood-dark bg-wood-dark';
const RAIL_FOCUS = 'focus-visible:outline-chalk-ink';
const RAIL_IDLE = 'text-chalk-dust hover:bg-white/10 hover:text-chalk-ink';
// Active item: a paper tile with wood text, the chalk-label equivalent of a highlight.
const RAIL_ACTIVE = 'bg-paper font-semibold text-wood-dark';

const MENU_BUTTON = 'flex h-11 md:h-8 w-full items-center gap-2 rounded px-2 text-left text-sm text-ink hover:bg-surface-hover';
const MENU_BUTTON_DANGER = 'flex h-11 md:h-8 w-full items-center gap-2 rounded px-2 text-left text-sm text-danger hover:bg-danger-tint';

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

  useEffect(() => {
    document.body.classList.add('has-bottom-bar');
    return () => document.body.classList.remove('has-bottom-bar');
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
    <ClassroomShell>
      {/* Top bar: 48 px chrome, white surface. The brand is the only hand-font text in the chrome. */}
      <header className="relative z-40 border-b border-line bg-surface">
        <div className="flex h-12 items-center justify-between px-3">
          <button
            type="button"
            className="flex min-h-[44px] items-center gap-2 rounded px-1 md:min-h-0"
            onClick={() => navigate('/lecturer')}
          >
            <Layout className="h-4 w-4 text-accent" strokeWidth={1.5} aria-hidden="true" />
            <span className="font-sans text-lg font-semibold leading-none text-ink">OpenCanvas</span>
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onNavigate('lecturer')}
              className="h-8 rounded px-2 text-sm font-medium text-ink-2 hover:bg-surface-hover"
            >
              Home
            </button>
            <NotificationDropdown onNavigate={onNavigate} />
            <div className="relative" ref={profileMenuRef}>
              <button
                type="button"
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                aria-label="Account menu"
                aria-haspopup="menu"
                aria-expanded={showProfileMenu}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-line text-2xs font-semibold text-ink"
              >
                {userInitials}
              </button>
              {showProfileMenu && (
                <div role="menu" className="absolute right-0 top-9 z-50 w-48 rounded-lg border border-line bg-surface p-1 shadow-pop animate-slideDown">
                  <div className="mb-1 border-b border-line px-2 py-1">
                    <p className="text-sm font-semibold text-ink">{user?.first_name} {user?.last_name}</p>
                    <p className="break-all text-xs text-ink-2">{user?.email}</p>
                  </div>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => { navigate('/lecturer/profile'); setShowProfileMenu(false); }}
                    className={MENU_BUTTON}
                  >
                    <User className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" /><span>Profile</span>
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => { navigate('/lecturer/settings'); setShowProfileMenu(false); }}
                    className={MENU_BUTTON}
                  >
                    <Settings className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" /><span>Settings</span>
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => { logout(); navigate('/login'); }}
                    className={MENU_BUTTON_DANGER}
                  >
                    <LogOut className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" /><span>Logout</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Staff-room rail (desktop and tablet) */}
        <aside
          aria-label="Lecturer navigation"
          className={cx(
            'fixed left-2 top-14 z-30 hidden rounded-lg border p-2 shadow-float transition-all duration-200 md:block',
            RAIL_SURFACE,
            sidebarCollapsed ? 'w-12' : 'w-52'
          )}
        >
          <nav className="flex flex-col gap-1">
            <ul className="flex flex-col gap-1">
              {menuItems.map((item) => {
                const active = isActive(item);
                const button = (
                  <button
                    type="button"
                    onClick={() => navigate(item.path)}
                    aria-label={item.label}
                    aria-current={active ? 'page' : undefined}
                    className={cx(
                      'flex h-8 items-center gap-2 rounded text-sm font-medium transition-colors duration-150',
                      RAIL_FOCUS,
                      sidebarCollapsed ? 'w-8 justify-center' : 'w-full px-2',
                      active ? RAIL_ACTIVE : RAIL_IDLE
                    )}
                  >
                    <item.icon className="h-4 w-4 flex-shrink-0" strokeWidth={1.5} aria-hidden="true" />
                    {!sidebarCollapsed && <span>{item.label}</span>}
                  </button>
                );
                return (
                  <li key={item.id}>
                    {sidebarCollapsed ? <Tooltip text={item.label} side="right">{button}</Tooltip> : button}
                  </li>
                );
              })}
            </ul>
            <button
              type="button"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              aria-label={sidebarCollapsed ? 'Expand navigation' : 'Collapse navigation'}
              aria-expanded={!sidebarCollapsed}
              className={cx(
                'mt-1 flex h-8 items-center rounded border-t border-white/20 pt-1 text-chalk-dust hover:bg-white/10 hover:text-chalk-ink',
                RAIL_FOCUS,
                sidebarCollapsed ? 'w-8 justify-center' : 'w-full gap-2 px-2 text-sm'
              )}
            >
              {sidebarCollapsed
                ? <ChevronRight className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
                : <><ChevronLeft className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" /><span>Collapse</span></>}
            </button>
          </nav>
        </aside>

        {/* Main content */}
        <main className={cx('min-w-0 flex-1 p-4 transition-all duration-200 md:p-6', sidebarCollapsed ? 'md:pl-20' : 'md:pl-60')}>
          {children}
        </main>
      </div>

      {/* Mobile bottom tool bar: same nine destinations, scrollable on narrow screens. */}
      <nav
        aria-label="Lecturer"
        className={cx(
          'fixed bottom-2 left-2 right-2 z-40 flex overflow-x-auto rounded-xl border shadow-pop md:hidden',
          RAIL_SURFACE
        )}
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {menuItems.map((item) => {
          const active = isActive(item);
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => navigate(item.path)}
              aria-current={active ? 'page' : undefined}
              className={cx(
                'flex h-14 min-w-[64px] flex-none flex-col items-center justify-center gap-0.5 rounded-lg text-2xs font-medium focus-visible:-outline-offset-2 focus-visible:outline-chalk-ink',
                active ? RAIL_ACTIVE : 'text-chalk-dust'
              )}
            >
              <item.icon className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </ClassroomShell>
  );
}
