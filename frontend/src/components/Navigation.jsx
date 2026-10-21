import React, { useState, useEffect, useId, useRef } from 'react';
import { Layout, User, ChevronDown, Settings, LogOut, UserPlus, Shield, Menu, X, Home, Archive, Share2, Grid, BookOpen, Folder } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import NotificationDropdown from './NotificationDropdown';
import { useAuth } from '../contexts/AuthContext';

// Classroom chrome, kept compact: white bar, a wood-toned edge, a chalk underline on the current
// destination. No frame, no texture. The chalk underline is decorative; aria-current carries the state.
const CHALK_MARK_DESKTOP = 'pointer-events-none absolute inset-x-2 bottom-0 block h-0.5 origin-left rounded-full bg-chalk-board motion-safe:animate-oc-draw';
const CHALK_MARK_MOBILE = 'pointer-events-none absolute inset-x-3 bottom-1 block h-0.5 origin-left rounded-full bg-chalk-board motion-safe:animate-oc-draw';

const Navigation = ({ onNavigate }) => {
  const { user, logout, isGuest } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const location = useLocation();
  // The account menu is a disclosure: a button that shows and hides a group of ordinary buttons. It is not an ARIA
  // menu, so no arrow-key roving is needed. Escape and an outside press close it; Escape returns focus to the trigger.
  const userMenuId = useId();
  const userMenuRef = useRef(null);
  const userMenuTriggerRef = useRef(null);

  useEffect(() => {
    if (!showUserMenu) return undefined;
    const onPointerDown = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) setShowUserMenu(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [showUserMenu]);

  const onUserMenuKeyDown = (event) => {
    if (event.key !== 'Escape' || !showUserMenu) return;
    event.preventDefault();
    setShowUserMenu(false);
    userMenuTriggerRef.current?.focus();
  };

  // Check if a nav link is the current route
  const isActive = (page) => {
    const routeMap = {
      dashboard: '/dashboard',
      archive: '/archive',
      shared: '/shared',
      courses: '/courses',
      templates: '/templates',
      lecturer: '/lecturer',
      admin: '/admin',
    };
    const route = routeMap[page];
    if (!route) return false;
    return location.pathname === route || location.pathname.startsWith(route + '/');
  };

  const displayName = isGuest
    ? 'Guest'
    : [user?.first_name, user?.last_name].filter(Boolean).join(' ') || user?.username || 'User';
  const initials = isGuest
    ? 'G'
    : displayName.split(' ').map(n => n[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || 'U';
  const userRole = user?.role || 'student';

  const links = [
    { page: 'dashboard', label: 'Dashboard', icon: Home, show: true },
    { page: 'archive', label: 'Archive', icon: Archive, show: !isGuest },
    { page: 'shared', label: 'Shared', icon: Share2, show: !isGuest },
    { page: 'courses', label: 'Courses', icon: BookOpen, show: !isGuest && userRole === 'student' },
    { page: 'templates', label: 'Templates', icon: Grid, show: true },
    { page: 'lecturer', label: 'Lecturer', icon: Folder, show: userRole === 'lecturer' || userRole === 'admin' },
  ].filter(l => l.show);

  // Reserve room for the bottom tool bar on small screens
  useEffect(() => {
    document.body.classList.add('has-bottom-bar');
    return () => document.body.classList.remove('has-bottom-bar');
  }, []);

  const go = (page) => {
    onNavigate(page);
    setShowMobileMenu(false);
    setShowUserMenu(false);
  };
  const menuItem = 'w-full px-2 h-11 md:h-7 text-left text-sm text-ink hover:bg-surface-hover rounded flex items-center gap-2';

  return (
    <>
      <nav className="relative z-40 border-b-2 border-wood-light bg-surface" aria-label="Primary">
        <div className="px-3">
          <div className="flex items-center justify-between h-12 md:h-10">
            <button onClick={() => go('dashboard')} className="flex items-center gap-2 rounded px-1">
              <Layout className="w-4 h-4 text-chalk-board" strokeWidth={1.5} aria-hidden="true" />
              <span className="font-sans text-lg font-semibold leading-none text-ink">OpenCanvas</span>
            </button>

            {/* Desktop navigation */}
            <div className="hidden md:flex items-center gap-1">
              {links.map(link => (
                <button
                  key={link.page}
                  onClick={() => go(link.page)}
                  aria-current={isActive(link.page) ? 'page' : undefined}
                  className={`relative h-7 px-2 rounded text-sm transition-colors duration-150 ${
                    isActive(link.page) ? 'font-semibold text-ink' : 'font-medium text-ink-2 hover:bg-surface-hover'
                  }`}
                >
                  {link.label}
                  {isActive(link.page) && <span aria-hidden="true" className={CHALK_MARK_DESKTOP} />}
                </button>
              ))}
              {userRole === 'admin' && (
                <button
                  onClick={() => go('admin')}
                  aria-current={isActive('admin') ? 'page' : undefined}
                  className={`relative h-7 px-2 rounded text-sm flex items-center gap-1 transition-colors duration-150 ${
                    isActive('admin') ? 'font-semibold text-ink' : 'font-medium text-ink-2 hover:bg-surface-hover'
                  }`}
                >
                  <Shield className="w-4 h-4" strokeWidth={1.5} aria-hidden="true" />
                  <span>Admin</span>
                  {isActive('admin') && <span aria-hidden="true" className={CHALK_MARK_DESKTOP} />}
                </button>
              )}

              {!isGuest && <NotificationDropdown onNavigate={onNavigate} />}

              <div className="relative" ref={userMenuRef} onKeyDown={onUserMenuKeyDown}>
                <button
                  ref={userMenuTriggerRef}
                  type="button"
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  aria-expanded={showUserMenu}
                  aria-controls={showUserMenu ? userMenuId : undefined}
                  className="flex items-center gap-2 rounded px-1 h-7 hover:bg-surface-hover"
                >
                  <span className="w-6 h-6 bg-chalk-board text-chalk-ink rounded-full flex items-center justify-center text-2xs font-semibold" aria-hidden="true">
                    {initials}
                  </span>
                  <span className="hidden lg:block text-sm text-ink">{displayName}</span>
                  <ChevronDown className="w-4 h-4 text-ink-2" strokeWidth={1.5} aria-hidden="true" />
                </button>

                {showUserMenu && (
                  <div id={userMenuId} className="absolute right-0 mt-1 w-48 bg-surface border border-line rounded-lg shadow-pop p-1 z-50 animate-slideDown">
                    <div className="px-2 py-1 border-b border-line mb-1">
                      <p className="text-sm font-semibold text-ink">{displayName}</p>
                      <p className="text-xs text-ink-2 capitalize">{userRole}</p>
                    </div>
                    <button type="button" onClick={() => go('profile')} className={menuItem}>
                      <User className="w-4 h-4" strokeWidth={1.5} aria-hidden="true" />
                      <span>Profile</span>
                    </button>
                    {!isGuest && (
                      <button type="button" onClick={() => go('settings')} className={menuItem}>
                        <Settings className="w-4 h-4" strokeWidth={1.5} aria-hidden="true" />
                        <span>Settings</span>
                      </button>
                    )}
                    {isGuest && (
                      <button type="button" onClick={() => go('login')} className={`${menuItem} text-accent bg-accent-tint`}>
                        <UserPlus className="w-4 h-4" strokeWidth={1.5} aria-hidden="true" />
                        <span>Sign Up</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={async () => {
                        setShowUserMenu(false);
                        await logout();
                        onNavigate('home');
                      }}
                      className={`${menuItem} text-danger`}
                    >
                      <LogOut className="w-4 h-4" strokeWidth={1.5} aria-hidden="true" />
                      <span>Log Out</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Mobile menu button */}
            <button
              className="md:hidden flex items-center justify-center rounded hover:bg-surface-hover"
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              aria-label={showMobileMenu ? 'Close menu' : 'Open menu'}
              aria-expanded={showMobileMenu}
            >
              {showMobileMenu
                ? <X className="w-5 h-5" strokeWidth={1.5} aria-hidden="true" />
                : <Menu className="w-5 h-5" strokeWidth={1.5} aria-hidden="true" />}
            </button>
          </div>
        </div>

        {/* Mobile menu: account and secondary destinations */}
        {showMobileMenu && (
          <div className="md:hidden px-3 py-2 border-t border-line bg-surface animate-mobileMenu">
            <div className="flex flex-col">
              {userRole === 'admin' && (
                <button onClick={() => go('admin')} className={menuItem}>Admin Panel</button>
              )}
              {!isGuest && <button onClick={() => go('profile')} className={menuItem}>Profile</button>}
              {!isGuest && <button onClick={() => go('settings')} className={menuItem}>Settings</button>}
              {isGuest && <button onClick={() => go('login')} className={`${menuItem} text-accent`}>Sign Up</button>}
              <button
                onClick={async () => { setShowMobileMenu(false); await logout(); onNavigate('home'); }}
                className={`${menuItem} text-danger`}
              >
                Log Out
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* Mobile bottom tool bar: primary destinations */}
      <nav
        aria-label="Main"
        className="md:hidden fixed left-2 right-2 bottom-2 z-40 bg-surface border border-line rounded-xl shadow-pop flex justify-around"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {links.slice(0, 5).map(link => (
          <button
            key={link.page}
            onClick={() => go(link.page)}
            aria-current={isActive(link.page) ? 'page' : undefined}
            className={`relative flex-1 h-14 flex flex-col items-center justify-center gap-0.5 rounded-lg text-2xs ${
              isActive(link.page) ? 'font-semibold text-ink' : 'font-medium text-ink-2'
            }`}
          >
            <link.icon className="w-4 h-4" strokeWidth={1.5} aria-hidden="true" />
            <span>{link.label}</span>
            {isActive(link.page) && <span aria-hidden="true" className={CHALK_MARK_MOBILE} />}
          </button>
        ))}
      </nav>
    </>
  );
};

export default Navigation;
