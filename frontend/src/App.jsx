import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useParams, Navigate, useSearchParams, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import WorkspacePage from './pages/WorkspacePage';
import AdminPage from './pages/AdminPage';
import ProfilePage from './pages/ProfilePage';
import ArchivePage from './pages/ArchivePage';
import SharedPage from './pages/SharedPage';
import TemplatesPage from './pages/TemplatesPage';
import SettingsPage from './pages/SettingsPage';
import LecturerLoginPage from './pages/LecturerLoginPage';
import AdminLoginPage from './pages/AdminLoginPage';
import NotificationsPage from './pages/NotificationsPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import AboutPage from './pages/AboutPage';
import SignUpPage from './pages/SignUpPage';
import VerifyEmailPage from './pages/VerifyEmailPage';
import JoinBoardPage from './pages/JoinBoardPage';
import JoinCoursePage from './pages/JoinCoursePage';
import { ToastProvider } from './components/Toast';
import GuestExpiryBanner from './components/GuestExpiryBanner';

// Student sub-pages
import StudentCoursesPage from './pages/student/StudentCoursesPage';
import StudentCoursePage from './pages/student/StudentCoursePage';

// Template sub-pages
import CourseMaterialTemplatePage from './pages/templates/CourseMaterialTemplatePage';
import StudentNotesTemplatePage from './pages/templates/StudentNotesTemplatePage';
import StudyPlannerTemplatePage from './pages/templates/StudyPlannerTemplatePage';
import KanbanTemplatePage from './pages/templates/KanbanTemplatePage';
import QuizTemplatePage from './pages/templates/QuizTemplatePage';

// Lecturer sub-pages
import LecturerLayout from './components/LecturerLayout';
import LecturerDashboardPage from './pages/lecturer/LecturerDashboardPage';
import LecturerBoardsPage from './pages/lecturer/LecturerBoardsPage';
import LecturerCoursesPage from './pages/lecturer/LecturerCoursesPage';
import LecturerStudentsPage from './pages/lecturer/LecturerStudentsPage';
import LecturerAnalyticsPage from './pages/lecturer/LecturerAnalyticsPage';
import LecturerSettingsPage from './pages/lecturer/LecturerSettingsPage';
import LecturerSharedPage from './pages/lecturer/LecturerSharedPage';
import LecturerArchivePage from './pages/lecturer/LecturerArchivePage';
import LecturerProfilePage from './pages/lecturer/LecturerProfilePage';

// Page transition wrapper — re-triggers animation on route change via key
const PageWrapper = ({ children }) => {
  const location = useLocation();
  return (
    <div key={location.pathname} className="animate-pageEnter">
      {children}
    </div>
  );
};

// Splash / loading screen shown while auth loads
const SplashScreen = ({ visible, exiting }) => {
  if (!visible) return null;
  return (
    <div className={`fixed inset-0 z-[9999] bg-gradient-to-br from-indigo-600 to-purple-700 flex flex-col items-center justify-center ${exiting ? 'animate-splashExit' : ''}`}>
      <div className="animate-splashLogo flex flex-col items-center">
        <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mb-5 shadow-lg">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <line x1="3" y1="9" x2="21" y2="9" />
            <line x1="9" y1="21" x2="9" y2="9" />
          </svg>
        </div>
        <h1 className="text-white text-3xl font-bold tracking-tight">OpenCanvas</h1>
        <p className="text-indigo-200 text-sm mt-1">Loading your workspace</p>
      </div>
      <div className="flex space-x-2 mt-8">
        <div className="w-2 h-2 bg-white rounded-full splash-dot" />
        <div className="w-2 h-2 bg-white rounded-full splash-dot" />
        <div className="w-2 h-2 bg-white rounded-full splash-dot" />
      </div>
    </div>
  );
};

// Lecturer route wrapper with layout
function LecturerRoute({ children, onNavigate }) {
  return (
    <LecturerLayout onNavigate={onNavigate}>
      <PageWrapper>{children}</PageWrapper>
    </LecturerLayout>
  );
}

// Wrapper to extract courseId from URL params
function StudentCoursePageWrapper({ onNavigate }) {
  const { courseId } = useParams();
  return <StudentCoursePage onNavigate={onNavigate} courseId={courseId} />;
}

// Navigation wrapper that provides useNavigate to child components
function AppContent() {
  const navigate = useNavigate();
  const { loading: authLoading } = useAuth();
  const [showSplash, setShowSplash] = useState(true);
  const [splashExiting, setSplashExiting] = useState(false);

  useEffect(() => {
    if (!authLoading && showSplash) {
      // Auth done — start exit animation, then hide
      setSplashExiting(true);
      const timer = setTimeout(() => setShowSplash(false), 400);
      return () => clearTimeout(timer);
    }
  }, [authLoading, showSplash]);

  const handleNavigate = (page, params = {}) => {
    const routes = {
      'home': '/',
      'login': '/login',
      'dashboard': '/dashboard',
      'workspace': '/workspace',
      'admin': '/admin',
      'lecturer': '/lecturer',
      'profile': '/profile',
      'archive': '/archive',
      'shared': '/shared',
      'templates': '/templates',
      'settings': '/settings',
      'lecturer-login': '/lecturer-login',
      'admin-login': '/admin-login',
      'notifications': '/notifications',
      'forgot-password': '/forgot-password',
      'about': '/about',
      'signup': '/signup',
      'verify-email': '/verify-email',
      // Lecturer sub-routes
      'lecturer-boards': '/lecturer/boards',
      'lecturer-courses': '/lecturer/courses',
      'lecturer-students': '/lecturer/students',
      'lecturer-analytics': '/lecturer/analytics',
      'lecturer-settings': '/lecturer/settings',
      'lecturer-shared': '/lecturer/shared',
      'lecturer-archive': '/lecturer/archive',
      'lecturer-profile': '/lecturer/profile',
      'lecturer-templates': '/lecturer/templates',
      'lecturer-notifications': '/lecturer/notifications',
      // Student sub-routes
      'courses': '/courses',
      // Template sub-routes
      'templates-course-material': '/templates/course-material',
      'templates-student-notes': '/templates/student-notes',
      'templates-study-planner': '/templates/study-planner',
      'templates-kanban': '/templates/kanban',
      'templates-quiz': '/templates/quiz',
    };

    // Handle dynamic route params
    if (page === 'course' && params.courseId) {
      const courseId = params.courseId;
      delete params.courseId;
      navigate(`/courses/${courseId}`);
      return;
    }

    const route = routes[page] || '/';

    // If params exist, add them as URL search parameters
    if (Object.keys(params).length > 0) {
      const searchParams = new URLSearchParams(params).toString();
      navigate(`${route}?${searchParams}`);
    } else {
      navigate(route);
    }
  };

  return (
    <div className="App">
      <SplashScreen visible={showSplash} exiting={splashExiting} />
      <GuestExpiryBanner />
      <Routes>
        <Route path="/" element={<PageWrapper><HomePage onNavigate={handleNavigate} /></PageWrapper>} />
        <Route path="/login" element={<PageWrapper><LoginPage onNavigate={handleNavigate} /></PageWrapper>} />
        <Route path="/lecturer-login" element={<PageWrapper><LecturerLoginPage onNavigate={handleNavigate} /></PageWrapper>} />
        <Route path="/admin-login" element={<PageWrapper><AdminLoginPage onNavigate={handleNavigate} /></PageWrapper>} />
        <Route path="/about" element={<PageWrapper><AboutPage onNavigate={handleNavigate} /></PageWrapper>} />
        <Route path="/signup" element={<PageWrapper><SignUpPage onNavigate={handleNavigate} /></PageWrapper>} />
        <Route path="/verify-email" element={<PageWrapper><VerifyEmailPage onNavigate={handleNavigate} /></PageWrapper>} />
        <Route path="/forgot-password" element={<PageWrapper><ForgotPasswordPage onNavigate={handleNavigate} /></PageWrapper>} />
        <Route path="/dashboard" element={<ProtectedRoute><PageWrapper><DashboardPage onNavigate={handleNavigate} /></PageWrapper></ProtectedRoute>} />
        <Route path="/workspace" element={<ProtectedRoute><PageWrapper><WorkspacePage onNavigate={handleNavigate} /></PageWrapper></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute requireRole="admin"><PageWrapper><AdminPage onNavigate={handleNavigate} /></PageWrapper></ProtectedRoute>} />

        {/* Lecturer routes */}
        <Route path="/lecturer" element={<ProtectedRoute requireRole="lecturer"><LecturerRoute onNavigate={handleNavigate}><LecturerDashboardPage onNavigate={handleNavigate} /></LecturerRoute></ProtectedRoute>} />
        <Route path="/lecturer/boards" element={<ProtectedRoute requireRole="lecturer"><LecturerRoute onNavigate={handleNavigate}><LecturerBoardsPage onNavigate={handleNavigate} /></LecturerRoute></ProtectedRoute>} />
        <Route path="/lecturer/courses" element={<ProtectedRoute requireRole="lecturer"><LecturerRoute onNavigate={handleNavigate}><LecturerCoursesPage onNavigate={handleNavigate} /></LecturerRoute></ProtectedRoute>} />
        <Route path="/lecturer/students" element={<ProtectedRoute requireRole="lecturer"><LecturerRoute onNavigate={handleNavigate}><LecturerStudentsPage onNavigate={handleNavigate} /></LecturerRoute></ProtectedRoute>} />
        <Route path="/lecturer/analytics" element={<ProtectedRoute requireRole="lecturer"><LecturerRoute onNavigate={handleNavigate}><LecturerAnalyticsPage onNavigate={handleNavigate} /></LecturerRoute></ProtectedRoute>} />
        <Route path="/lecturer/settings" element={<ProtectedRoute requireRole="lecturer"><LecturerRoute onNavigate={handleNavigate}><LecturerSettingsPage onNavigate={handleNavigate} /></LecturerRoute></ProtectedRoute>} />
        <Route path="/lecturer/shared" element={<ProtectedRoute requireRole="lecturer"><LecturerRoute onNavigate={handleNavigate}><LecturerSharedPage onNavigate={handleNavigate} /></LecturerRoute></ProtectedRoute>} />
        <Route path="/lecturer/archive" element={<ProtectedRoute requireRole="lecturer"><LecturerRoute onNavigate={handleNavigate}><LecturerArchivePage onNavigate={handleNavigate} /></LecturerRoute></ProtectedRoute>} />
        <Route path="/lecturer/profile" element={<ProtectedRoute requireRole="lecturer"><LecturerRoute onNavigate={handleNavigate}><LecturerProfilePage onNavigate={handleNavigate} /></LecturerRoute></ProtectedRoute>} />
        <Route path="/lecturer/templates" element={<ProtectedRoute requireRole="lecturer"><LecturerRoute onNavigate={handleNavigate}><TemplatesPage onNavigate={handleNavigate} hideNav={true} /></LecturerRoute></ProtectedRoute>} />
        <Route path="/lecturer/notifications" element={<ProtectedRoute requireRole="lecturer"><LecturerRoute onNavigate={handleNavigate}><NotificationsPage onNavigate={handleNavigate} hideNav={true} /></LecturerRoute></ProtectedRoute>} />

        {/* Student routes */}
        <Route path="/courses" element={<ProtectedRoute><PageWrapper><StudentCoursesPage onNavigate={handleNavigate} /></PageWrapper></ProtectedRoute>} />
        <Route path="/courses/:courseId" element={<ProtectedRoute><PageWrapper><StudentCoursePageWrapper onNavigate={handleNavigate} /></PageWrapper></ProtectedRoute>} />

        <Route path="/profile" element={<ProtectedRoute><PageWrapper><ProfilePage onNavigate={handleNavigate} /></PageWrapper></ProtectedRoute>} />
        <Route path="/archive" element={<ProtectedRoute><PageWrapper><ArchivePage onNavigate={handleNavigate} /></PageWrapper></ProtectedRoute>} />
        <Route path="/shared" element={<ProtectedRoute><PageWrapper><SharedPage onNavigate={handleNavigate} /></PageWrapper></ProtectedRoute>} />
        <Route path="/templates" element={<ProtectedRoute><PageWrapper><TemplatesPage onNavigate={handleNavigate} /></PageWrapper></ProtectedRoute>} />
        <Route path="/templates/course-material" element={<ProtectedRoute requireRole="lecturer"><PageWrapper><CourseMaterialTemplatePage onNavigate={handleNavigate} /></PageWrapper></ProtectedRoute>} />
        <Route path="/templates/student-notes" element={<ProtectedRoute><PageWrapper><StudentNotesTemplatePage onNavigate={handleNavigate} /></PageWrapper></ProtectedRoute>} />
        <Route path="/templates/study-planner" element={<ProtectedRoute><PageWrapper><StudyPlannerTemplatePage onNavigate={handleNavigate} /></PageWrapper></ProtectedRoute>} />
        <Route path="/templates/kanban" element={<ProtectedRoute><PageWrapper><KanbanTemplatePage onNavigate={handleNavigate} /></PageWrapper></ProtectedRoute>} />
        <Route path="/templates/quiz" element={<ProtectedRoute requireRole="lecturer"><PageWrapper><QuizTemplatePage onNavigate={handleNavigate} /></PageWrapper></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><PageWrapper><SettingsPage onNavigate={handleNavigate} /></PageWrapper></ProtectedRoute>} />
        <Route path="/notifications" element={<ProtectedRoute><PageWrapper><NotificationsPage onNavigate={handleNavigate} /></PageWrapper></ProtectedRoute>} />
        <Route path="/join/:token" element={<ProtectedRoute><PageWrapper><JoinBoardPage onNavigate={handleNavigate} /></PageWrapper></ProtectedRoute>} />
        <Route path="/join-course/:inviteCode" element={<ProtectedRoute><PageWrapper><JoinCoursePage onNavigate={handleNavigate} /></PageWrapper></ProtectedRoute>} />
      </Routes>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <AppContent />
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
