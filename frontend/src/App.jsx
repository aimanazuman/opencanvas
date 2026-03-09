import React from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useParams, Navigate, useSearchParams } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
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
import JoinBoardPage from './pages/JoinBoardPage';
import JoinCoursePage from './pages/JoinCoursePage';
import { ToastProvider } from './components/Toast';

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

// Page transition wrapper
const PageWrapper = ({ children }) => (
  <div className="animate-fadeIn">
    {children}
  </div>
);

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
      <Routes>
        <Route path="/" element={<PageWrapper><HomePage onNavigate={handleNavigate} /></PageWrapper>} />
        <Route path="/login" element={<PageWrapper><LoginPage onNavigate={handleNavigate} /></PageWrapper>} />
        <Route path="/lecturer-login" element={<PageWrapper><LecturerLoginPage onNavigate={handleNavigate} /></PageWrapper>} />
        <Route path="/admin-login" element={<PageWrapper><AdminLoginPage onNavigate={handleNavigate} /></PageWrapper>} />
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
