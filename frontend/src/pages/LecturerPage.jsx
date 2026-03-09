import React, { useState, useEffect, useCallback } from 'react';
import {
  Layout, BookOpen, Users, Settings, Plus, Folder, FileText,
  ChevronDown, ChevronRight, BarChart, Trash2,
  Eye, Clock, X, Search, Filter, Mail,
  UserPlus, Bell, Save, CheckCircle, Activity
} from 'lucide-react';
import NotificationDropdown from '../components/NotificationDropdown';
import { useAuth } from '../contexts/AuthContext';
import { coursesApi, enrollmentsApi, authApi, usersApi, boardsApi } from '../services/api';

function formatTimeAgo(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function LecturerPage({ onNavigate }) {
  const { user } = useAuth();
  const [activeMenu, setActiveMenu] = useState('overview');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [expandedCourses, setExpandedCourses] = useState({});
  const [selectedSection, setSelectedSection] = useState(null);
  const [viewMode, setViewMode] = useState('sections');
  const [showAddCourseModal, setShowAddCourseModal] = useState(false);
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [studentFilterCourse, setStudentFilterCourse] = useState('all');
  const [settingsSaved, setSettingsSaved] = useState(false);

  // API data
  const [courses, setCourses] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Boards tab state
  const [lecturerBoards, setLecturerBoards] = useState([]);
  const [boardsLoading, setBoardsLoading] = useState(false);
  const [boardsCourseFilter, setBoardsCourseFilter] = useState('all');
  const [boardsSearch, setBoardsSearch] = useState('');

  // Add Course form
  const [newCourse, setNewCourse] = useState({ code: '', name: '', description: '' });
  const [addingCourse, setAddingCourse] = useState(false);
  const [courseError, setCourseError] = useState('');

  // Add Student form
  const [newStudentQuery, setNewStudentQuery] = useState('');
  const [studentSearchResults, setStudentSearchResults] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [newStudentCourseId, setNewStudentCourseId] = useState('');
  const [newStudentSection, setNewStudentSection] = useState('');
  const [addingStudent, setAddingStudent] = useState(false);

  // Student detail modal
  const [viewingStudent, setViewingStudent] = useState(null);

  // Settings
  const [lecturerSettings, setLecturerSettings] = useState({
    emailNotifications: true,
    boardActivityAlerts: true,
    weeklyReports: true,
    defaultBoardVisibility: 'students',
    allowStudentComments: true,
    officeHours: '',
    contactEmail: '',
  });

  const menuItems = [
    { id: 'overview', icon: Layout, label: 'Overview' },
    { id: 'boards', icon: Folder, label: 'My Boards' },
    { id: 'courses', icon: BookOpen, label: 'My Courses' },
    { id: 'students', icon: Users, label: 'Students' },
    { id: 'analytics', icon: BarChart, label: 'Analytics' },
    { id: 'settings', icon: Settings, label: 'Settings' },
  ];

  // Load data
  const loadCourses = useCallback(async () => {
    try {
      const res = await coursesApi.getAll();
      setCourses(res.data.results || res.data);
    } catch (err) {
      console.error('Failed to load courses:', err);
    }
  }, []);

  const loadEnrollments = useCallback(async () => {
    try {
      const res = await enrollmentsApi.getAll();
      setEnrollments(res.data.results || res.data);
    } catch (err) {
      console.error('Failed to load enrollments:', err);
    }
  }, []);

  const loadBoards = useCallback(async () => {
    setBoardsLoading(true);
    try {
      const params = { is_archived: 'false' };
      if (boardsCourseFilter === 'all') {
        // Personal boards only (no course association)
        params.scope = 'personal';
      } else if (boardsCourseFilter === 'all-courses') {
        // All course boards the lecturer has access to
        params.scope = 'course';
      } else {
        // Specific course filter
        params.course = boardsCourseFilter;
      }
      const res = await boardsApi.getAll(params);
      setLecturerBoards(res.data.results || res.data);
    } catch (err) {
      console.error('Failed to load boards:', err);
    } finally {
      setBoardsLoading(false);
    }
  }, [boardsCourseFilter]);

  useEffect(() => {
    if (activeMenu === 'boards' || activeMenu === 'overview' || activeMenu === 'analytics') {
      loadBoards();
    }
  }, [activeMenu, loadBoards]);

  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      await Promise.all([loadCourses(), loadEnrollments()]);
      setLoading(false);
    };
    loadAll();
  }, [loadCourses, loadEnrollments]);

  useEffect(() => {
    if (user) {
      setLecturerSettings(prev => ({
        ...prev,
        contactEmail: user.email || '',
      }));
    }
  }, [user]);

  // Derived data
  const totalStudents = courses.reduce((acc, c) => acc + (c.student_count || 0), 0);
  const totalBoards = courses.reduce((acc, c) => acc + (c.board_count || 0), 0);

  const getSectionsForCourse = (courseId) => {
    const courseEnrollments = enrollments.filter(e => e.course === courseId && e.status === 'active');
    const sectionMap = {};
    courseEnrollments.forEach(e => {
      const sec = e.section || 'Unassigned';
      if (!sectionMap[sec]) sectionMap[sec] = { name: sec, students: 0, enrollments: [] };
      sectionMap[sec].students++;
      sectionMap[sec].enrollments.push(e);
    });
    return Object.values(sectionMap);
  };

  const getStudentsList = () => {
    return enrollments.map(e => ({
      id: e.id,
      studentId: e.student_details?.id || e.student,
      name: e.student_details
        ? `${e.student_details.first_name || ''} ${e.student_details.last_name || ''}`.trim() || e.student_details.username
        : `User ${e.student}`,
      email: e.student_details?.email || '',
      courseCode: e.course_details?.code || '',
      courseId: e.course,
      section: e.section || '-',
      status: e.status,
      enrolledAt: e.enrolled_at,
    }));
  };

  const allStudents = getStudentsList();

  const filteredStudents = allStudents.filter(student => {
    const matchesSearch = student.name.toLowerCase().includes(studentSearchQuery.toLowerCase()) ||
                         student.email.toLowerCase().includes(studentSearchQuery.toLowerCase());
    const matchesCourse = studentFilterCourse === 'all' || student.courseCode === studentFilterCourse;
    return matchesSearch && matchesCourse;
  });

  const recentEnrollments = [...enrollments]
    .sort((a, b) => new Date(b.enrolled_at) - new Date(a.enrolled_at))
    .slice(0, 4);

  // Count boards with interaction tracking enabled
  const boardsWithTracking = lecturerBoards.filter(b => b.content?.trackInteractions);
  const totalInteractions = boardsWithTracking.reduce((sum, b) => {
    const interactions = b.content?.interactions || {};
    return sum + Object.values(interactions).reduce((s, u) => s + (u.actions?.length || 0), 0);
  }, 0);

  const stats = [
    { label: 'Total Courses', value: courses.length, icon: BookOpen, color: 'indigo', change: '' },
    { label: 'Total Students', value: totalStudents, icon: Users, color: 'green', change: '' },
    { label: 'Active Boards', value: totalBoards, icon: Folder, color: 'purple', change: '' },
    { label: 'Board Activity', value: totalInteractions, icon: Activity, color: 'yellow', change: boardsWithTracking.length > 0 ? `${boardsWithTracking.length} tracked` : '' },
  ];

  const colorClasses = {
    indigo: 'bg-indigo-100 text-indigo-600',
    green: 'bg-green-100 text-green-600',
    purple: 'bg-purple-100 text-purple-600',
    yellow: 'bg-yellow-100 text-yellow-600',
  };

  // Handlers
  const toggleCourseExpand = (courseId) => {
    setExpandedCourses(prev => ({ ...prev, [courseId]: !prev[courseId] }));
  };

  const handleAddCourse = async () => {
    if (!newCourse.code || !newCourse.name) return;
    setAddingCourse(true);
    setCourseError('');
    try {
      await coursesApi.create(newCourse);
      setShowAddCourseModal(false);
      setNewCourse({ code: '', name: '', description: '' });
      loadCourses();
    } catch (err) {
      const data = err.response?.data;
      setCourseError(data?.code?.[0] || data?.detail || 'Failed to create course');
    } finally {
      setAddingCourse(false);
    }
  };

  const handleSearchStudentForAdd = async (query) => {
    setNewStudentQuery(query);
    if (query.length < 2) {
      setStudentSearchResults([]);
      return;
    }
    try {
      const res = await usersApi.search(query);
      setStudentSearchResults(res.data.results || res.data);
    } catch (err) {
      console.error('Failed to search users:', err);
    }
  };

  const handleAddStudent = async () => {
    if (!selectedStudentId || !newStudentCourseId) return;
    setAddingStudent(true);
    try {
      await enrollmentsApi.create({
        student: selectedStudentId,
        course: parseInt(newStudentCourseId),
        section: newStudentSection,
      });
      setShowAddStudentModal(false);
      setNewStudentQuery('');
      setStudentSearchResults([]);
      setSelectedStudentId(null);
      setNewStudentCourseId('');
      setNewStudentSection('');
      loadEnrollments();
      loadCourses();
    } catch (err) {
      console.error('Failed to add student:', err);
      alert(err.response?.data?.non_field_errors?.[0] || err.response?.data?.detail || 'Failed to enroll student');
    } finally {
      setAddingStudent(false);
    }
  };

  const handleDeleteCourse = async (courseId) => {
    if (!window.confirm('Are you sure you want to delete this course? This will also remove all enrollments.')) return;
    try {
      await coursesApi.delete(courseId);
      loadCourses();
      loadEnrollments();
    } catch (err) {
      console.error('Failed to delete course:', err);
    }
  };

  const handleSaveSettings = async () => {
    try {
      await authApi.updateProfile({ preferences: lecturerSettings });
      setSettingsSaved(true);
      setTimeout(() => setSettingsSaved(false), 3000);
    } catch (err) {
      console.error('Failed to save settings:', err);
    }
  };

  const userInitials = user
    ? (user.first_name && user.last_name
        ? `${user.first_name[0]}${user.last_name[0]}`
        : user.username?.[0]?.toUpperCase() || 'L')
    : 'L';

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading lecturer portal...</p>
        </div>
      </div>
    );
  }

  // Render Overview Content
  const renderOverview = () => (
    <>
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard Overview</h1>
          <p className="text-gray-600 mt-1">Welcome back! Here's what's happening with your courses.</p>
        </div>
        <button
          onClick={() => setShowAddCourseModal(true)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 transition flex items-center space-x-2 self-start"
        >
          <Plus className="w-5 h-5" />
          <span>New Course</span>
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat, idx) => (
          <div key={idx} className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">{stat.label}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                {stat.change && <p className="text-xs text-green-600 mt-1">{stat.change}</p>}
              </div>
              <div className={`p-3 rounded-lg ${colorClasses[stat.color]}`}>
                <stat.icon className="w-6 h-6" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-8 mb-8">
        {/* Recent Activity */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Recent Enrollments</h2>
            <button
              onClick={() => setActiveMenu('students')}
              className="text-indigo-600 text-sm hover:underline"
            >
              View All
            </button>
          </div>
          <div className="space-y-4">
            {recentEnrollments.length === 0 && (
              <p className="text-gray-400 text-center py-4">No enrollments yet</p>
            )}
            {recentEnrollments.map((enrollment) => {
              const studentName = enrollment.student_details
                ? `${enrollment.student_details.first_name || ''} ${enrollment.student_details.last_name || ''}`.trim() || enrollment.student_details.username
                : `User ${enrollment.student}`;
              const initials = enrollment.student_details?.first_name && enrollment.student_details?.last_name
                ? `${enrollment.student_details.first_name[0]}${enrollment.student_details.last_name[0]}`
                : studentName[0]?.toUpperCase() || '?';
              return (
                <div key={enrollment.id} className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg">
                  <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-medium text-sm">
                    {initials}
                  </div>
                  <div className="flex-1">
                    <p className="text-gray-900">
                      <span className="font-medium">{studentName}</span>
                      {' - Enrolled'}
                    </p>
                    <p className="text-sm text-gray-500">{enrollment.course_details?.code || ''}</p>
                  </div>
                  <span className="text-sm text-gray-400">{formatTimeAgo(enrollment.enrolled_at)}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Quick Course Overview */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Course Overview</h2>
            <button
              onClick={() => setActiveMenu('courses')}
              className="text-indigo-600 text-sm hover:underline"
            >
              View All
            </button>
          </div>
          <div className="space-y-4">
            {courses.length === 0 && (
              <p className="text-gray-400 text-center py-4">No courses yet. Create your first course!</p>
            )}
            {courses.map((course) => (
              <div key={course.id} className="p-4 border rounded-lg hover:border-indigo-300 transition">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-3">
                    <span className="px-2 py-1 bg-indigo-100 text-indigo-600 rounded text-xs font-semibold">
                      {course.code}
                    </span>
                    <span className="font-medium text-gray-900">{course.name}</span>
                  </div>
                </div>
                <div className="flex items-center space-x-6 text-sm text-gray-500">
                  <span className="flex items-center">
                    <Users className="w-4 h-4 mr-1" />{course.student_count || 0} students
                  </span>
                  <span className="flex items-center">
                    <Folder className="w-4 h-4 mr-1" />{course.board_count || 0} boards
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

    </>
  );

  // Render Courses Content
  const renderCourses = () => (
    <>
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Courses</h1>
          <p className="text-gray-600 mt-1">Manage courses, sections, and student activities</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex border border-gray-300 rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('sections')}
              className={`px-3 py-2 text-sm ${viewMode === 'sections' ? 'bg-indigo-100 text-indigo-600' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
            >
              Sections View
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-2 text-sm ${viewMode === 'list' ? 'bg-indigo-100 text-indigo-600' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
            >
              List View
            </button>
          </div>
          <button
            onClick={() => setShowAddCourseModal(true)}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 transition flex items-center space-x-2"
          >
            <Plus className="w-5 h-5" />
            <span>New Course</span>
          </button>
        </div>
      </div>

      {courses.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="text-lg font-medium">No courses yet</p>
          <p className="text-sm">Create your first course to get started</p>
        </div>
      )}

      {/* Courses List */}
      <div className="space-y-4">
        {courses.map(course => {
          const sections = getSectionsForCourse(course.id);
          return (
            <div key={course.id} className="bg-white rounded-xl shadow-sm border overflow-hidden">
              <div className="p-6">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-4">
                  <div className="flex items-start space-x-4">
                    {/* <button
                      onClick={() => toggleCourseExpand(course.id)}
                      className="mt-1 p-1 hover:bg-gray-100 rounded flex-shrink-0"
                    >
                      {expandedCourses[course.id] ?
                        <ChevronDown className="w-5 h-5 text-gray-500" /> :
                        <ChevronRight className="w-5 h-5 text-gray-500" />
                      }
                    </button> */}
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className="px-3 py-1 bg-indigo-100 text-indigo-600 rounded-full text-sm font-semibold">
                          {course.code}
                        </span>
                        <h3 className="text-xl font-bold text-gray-900">{course.name}</h3>
                        {!course.is_active && (
                          <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded text-xs">Inactive</span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                        <span className="flex items-center">
                          <Users className="w-4 h-4 mr-1" />
                          {course.student_count || 0} students
                        </span>
                        <span className="flex items-center">
                          <Folder className="w-4 h-4 mr-1" />
                          {sections.length} sections
                        </span>
                        <span className="flex items-center">
                          <FileText className="w-4 h-4 mr-1" />
                          {course.board_count || 0} boards
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteCourse(course.id)}
                    className="text-gray-400 hover:text-red-500 self-start"
                    title="Delete course"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex flex-wrap gap-3 mt-4">
                  <button
                    onClick={() => { setBoardsCourseFilter(course.id.toString()); setActiveMenu('boards'); }}
                    className="flex-1 min-w-[120px] px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition font-medium flex items-center justify-center space-x-2"
                  >
                    <Eye className="w-4 h-4" />
                    <span>View Boards</span>
                  </button>
                  <button
                    onClick={() => setActiveMenu('analytics')}
                    className="flex-1 min-w-[120px] px-4 py-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition font-medium flex items-center justify-center space-x-2"
                  >
                    <BarChart className="w-4 h-4" />
                    <span>Analytics</span>
                  </button>
                  <button
                    onClick={() => setActiveMenu('settings')}
                    className="flex-1 min-w-[120px] px-4 py-2 bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100 transition font-medium flex items-center justify-center space-x-2"
                  >
                    <Settings className="w-4 h-4" />
                    <span>Manage</span>
                  </button>
                </div>
              </div>

              {(expandedCourses[course.id] || viewMode === 'sections') && sections.length > 0 && (
                <div className="border-t border-gray-100 p-6 bg-gray-50">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-semibold text-gray-700">Sections</h4>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {sections.map((section, idx) => (
                      <button
                        key={idx}
                        onClick={() => setSelectedSection({ course, section })}
                        className="p-4 bg-white border-2 border-gray-200 rounded-lg hover:border-indigo-400 hover:shadow-md transition text-left"
                      >
                        <p className="font-semibold text-gray-900 mb-1">
                          {section.name === 'Unassigned' ? 'No Section' : `Section ${section.name}`}
                        </p>
                        <p className="text-sm text-gray-600">{section.students} students</p>
                        <div className="mt-3 flex items-center space-x-2">
                          <div className="flex -space-x-2">
                            {[...Array(Math.min(3, section.students))].map((_, i) => (
                              <div key={i} className="w-6 h-6 bg-gradient-to-br from-blue-400 to-purple-400 rounded-full border-2 border-white"></div>
                            ))}
                          </div>
                          {section.students > 3 && (
                            <span className="text-xs text-gray-500">+{section.students - 3}</span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );

  // Render Students Content
  const renderStudents = () => (
    <>
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Students</h1>
          <p className="text-gray-600 mt-1">Manage and monitor student progress across all courses</p>
        </div>
        <button
          onClick={() => setShowAddStudentModal(true)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 transition flex items-center space-x-2 self-start"
        >
          <UserPlus className="w-5 h-5" />
          <span>Add Student</span>
        </button>
      </div>

      {/* Student Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <p className="text-sm text-gray-600">Total Enrolled</p>
          <p className="text-2xl font-bold text-gray-900">{allStudents.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <p className="text-sm text-gray-600">Active</p>
          <p className="text-2xl font-bold text-green-600">{allStudents.filter(s => s.status === 'active').length}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <p className="text-sm text-gray-600">Dropped</p>
          <p className="text-2xl font-bold text-red-600">{allStudents.filter(s => s.status === 'dropped').length}</p>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search students by name or email..."
              value={studentSearchQuery}
              onChange={(e) => setStudentSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <select
              value={studentFilterCourse}
              onChange={(e) => setStudentFilterCourse(e.target.value)}
              className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 appearance-none bg-white min-w-[150px]"
            >
              <option value="all">All Courses</option>
              {courses.map(c => (
                <option key={c.code} value={c.code}>{c.code}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Students Table */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Student</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Course</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Section</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Status</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Enrolled</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredStudents.map((student) => {
                const initials = student.name.trim()
                  ? student.name.split(' ').map(n => n[0]).join('').toUpperCase()
                  : '?';
                return (
                  <tr key={student.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-medium">
                          {initials}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{student.name}</p>
                          <p className="text-sm text-gray-500">{student.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded text-xs font-medium">
                        {student.courseCode}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {student.section === '-' ? '-' : `Section ${student.section}`}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        student.status === 'active' ? 'bg-green-100 text-green-700' :
                        student.status === 'dropped' ? 'bg-red-100 text-red-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {student.status.charAt(0).toUpperCase() + student.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {formatTimeAgo(student.enrolledAt)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setViewingStudent(student)}
                          className="p-1 hover:bg-gray-100 rounded text-gray-600"
                          title="View student"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => student.email && window.open(`mailto:${student.email}`, '_blank')}
                          className="p-1 hover:bg-gray-100 rounded text-gray-600"
                          title="Email student"
                        >
                          <Mail className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredStudents.length === 0 && (
                <tr>
                  <td colSpan="6" className="px-4 py-8 text-center text-gray-400">
                    No students found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );

  // Render Analytics Content
  const renderAnalytics = () => (
    <>
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
          <p className="text-gray-600 mt-1">Track student engagement and course performance</p>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600">Total Students</span>
            <Users className="w-5 h-5 text-green-500" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{totalStudents}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600">Total Boards</span>
            <Folder className="w-5 h-5 text-purple-500" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{totalBoards}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600">Total Courses</span>
            <BookOpen className="w-5 h-5 text-indigo-500" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{courses.length}</p>
        </div>
      </div>

      {/* Course Performance */}
      <div className="bg-white rounded-xl shadow-sm border p-6 mb-8">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Course Performance</h2>
        {courses.length === 0 && (
          <p className="text-gray-400 text-center py-4">No courses to analyze</p>
        )}
        <div className="space-y-4">
          {courses.map((course) => (
            <div key={course.id} className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <span className="px-2 py-1 bg-indigo-100 text-indigo-600 rounded text-xs font-semibold">
                    {course.code}
                  </span>
                  <span className="font-semibold text-gray-900">{course.name}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Students</p>
                  <p className="text-lg font-bold text-gray-900">{course.student_count || 0}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Boards</p>
                  <p className="text-lg font-bold text-gray-900">{course.board_count || 0}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Board Activity */}
      {boardsWithTracking.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center space-x-2">
            <Activity className="w-5 h-5 text-yellow-500" />
            <span>Board Interaction Activity</span>
          </h2>
          <div className="space-y-4">
            {boardsWithTracking.map((b) => {
              const interactions = b.content?.interactions || {};
              const userCount = Object.keys(interactions).length;
              const actionCount = Object.values(interactions).reduce((s, u) => s + (u.actions?.length || 0), 0);
              return (
                <div key={b.id} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-gray-900">{b.name}</span>
                    <button
                      onClick={() => onNavigate('workspace', { id: b.id })}
                      className="text-xs text-indigo-600 hover:underline"
                    >
                      Open Board
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Active Users</p>
                      <p className="text-lg font-bold text-gray-900">{userCount}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Total Actions</p>
                      <p className="text-lg font-bold text-gray-900">{actionCount}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );

  // Render Settings Content
  const renderSettings = () => (
    <>
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600 mt-1">Manage your preferences and course settings</p>
        </div>
        {settingsSaved && (
          <div className="flex items-center space-x-2 bg-green-100 text-green-700 px-4 py-2 rounded-lg">
            <CheckCircle className="w-5 h-5" />
            <span>Settings saved successfully!</span>
          </div>
        )}
      </div>

      <div className="space-y-6">
        {/* Notification Settings */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center space-x-3 mb-6">
            <Bell className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-bold text-gray-900">Notifications</h2>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b">
              <div>
                <p className="font-medium text-gray-900">Email Notifications</p>
                <p className="text-sm text-gray-500">Receive updates via email</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={lecturerSettings.emailNotifications}
                  onChange={(e) => setLecturerSettings({...lecturerSettings, emailNotifications: e.target.checked})}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>
            <div className="flex items-center justify-between py-3 border-b">
              <div>
                <p className="font-medium text-gray-900">Board Activity Alerts</p>
                <p className="text-sm text-gray-500">Get notified about board activity</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={lecturerSettings.boardActivityAlerts}
                  onChange={(e) => setLecturerSettings({...lecturerSettings, boardActivityAlerts: e.target.checked})}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>
            <div className="flex items-center justify-between py-3">
              <div>
                <p className="font-medium text-gray-900">Weekly Reports</p>
                <p className="text-sm text-gray-500">Receive weekly summary of student activities</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={lecturerSettings.weeklyReports}
                  onChange={(e) => setLecturerSettings({...lecturerSettings, weeklyReports: e.target.checked})}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Course Settings */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center space-x-3 mb-6">
            <BookOpen className="w-6 h-6 text-purple-600" />
            <h2 className="text-xl font-bold text-gray-900">Course Settings</h2>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b">
              <div>
                <p className="font-medium text-gray-900">Default Board Visibility</p>
                <p className="text-sm text-gray-500">Who can see new boards by default</p>
              </div>
              <select
                value={lecturerSettings.defaultBoardVisibility}
                onChange={(e) => setLecturerSettings({...lecturerSettings, defaultBoardVisibility: e.target.value})}
                className="px-4 py-2 border border-gray-300 rounded-lg"
              >
                <option value="students">Students Only</option>
                <option value="section">Section Only</option>
                <option value="course">Entire Course</option>
              </select>
            </div>
            <div className="flex items-center justify-between py-3">
              <div>
                <p className="font-medium text-gray-900">Allow Student Comments</p>
                <p className="text-sm text-gray-500">Let students comment on boards</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={lecturerSettings.allowStudentComments}
                  onChange={(e) => setLecturerSettings({...lecturerSettings, allowStudentComments: e.target.checked})}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Profile Settings */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center space-x-3 mb-6">
            <Users className="w-6 h-6 text-green-600" />
            <h2 className="text-xl font-bold text-gray-900">Profile Settings</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Contact Email</label>
              <input
                type="email"
                value={lecturerSettings.contactEmail}
                onChange={(e) => setLecturerSettings({...lecturerSettings, contactEmail: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Office Hours</label>
              <input
                type="text"
                value={lecturerSettings.officeHours}
                onChange={(e) => setLecturerSettings({...lecturerSettings, officeHours: e.target.value})}
                placeholder="e.g., Mon, Wed 2:00 PM - 4:00 PM"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            onClick={handleSaveSettings}
            className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-3 rounded-lg font-semibold hover:shadow-lg transition flex items-center space-x-2"
          >
            <Save className="w-5 h-5" />
            <span>Save All Settings</span>
          </button>
        </div>
      </div>
    </>
  );

  // Render Boards Content
  const renderBoards = () => {
    const filteredBoards = lecturerBoards.filter(board =>
      board.name.toLowerCase().includes(boardsSearch.toLowerCase())
    );

    return (
      <>
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Boards</h1>
            <p className="text-gray-600 mt-1">View and manage your boards across all courses</p>
          </div>
          <button
            onClick={() => onNavigate('dashboard')}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 transition flex items-center space-x-2 self-start"
          >
            <Plus className="w-5 h-5" />
            <span>New Board</span>
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search boards by name..."
                value={boardsSearch}
                onChange={(e) => setBoardsSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <select
                value={boardsCourseFilter}
                onChange={(e) => setBoardsCourseFilter(e.target.value)}
                className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 appearance-none bg-white min-w-[180px]"
              >
                <option value="all">Personal Boards</option>
                <option value="all-courses">All Course Boards</option>
                {courses.map(c => (
                  <option key={c.id} value={c.id}>{c.code} - {c.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Boards Grid */}
        {boardsLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-3 text-gray-500">Loading boards...</p>
          </div>
        ) : filteredBoards.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Folder className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-lg font-medium">
              {boardsCourseFilter !== 'all' && boardsCourseFilter !== 'all-courses' ? 'No boards for this course' : 'No boards found'}
            </p>
            <p className="text-sm">
              {boardsSearch ? 'Try a different search term' : 'Create a new board to get started'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredBoards.map(board => (
              <button
                key={board.id}
                onClick={() => onNavigate('workspace', { id: board.id })}
                className="bg-white rounded-xl shadow-sm border p-5 text-left hover:shadow-md hover:border-indigo-300 transition group"
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-semibold text-gray-900 group-hover:text-indigo-600 transition truncate pr-2">
                    {board.name}
                  </h3>
                  {board.is_starred && (
                    <span className="text-yellow-400 flex-shrink-0">&#9733;</span>
                  )}
                </div>
                {board.board_type && (
                  <span className="inline-block px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded text-xs font-medium mb-2">
                    {board.board_type}
                  </span>
                )}
                {board.course_name && (
                  <p className="text-sm text-gray-500 mb-2 flex items-center">
                    <BookOpen className="w-3.5 h-3.5 mr-1 flex-shrink-0" />
                    {board.course_name}
                  </p>
                )}
                <p className="text-xs text-gray-400 flex items-center">
                  <Clock className="w-3.5 h-3.5 mr-1" />
                  {formatTimeAgo(board.updated_at)}
                </p>
              </button>
            ))}
          </div>
        )}
      </>
    );
  };

  // Render content based on active menu
  const renderContent = () => {
    switch (activeMenu) {
      case 'overview': return renderOverview();
      case 'boards': return renderBoards();
      case 'courses': return renderCourses();
      case 'students': return renderStudents();
      case 'analytics': return renderAnalytics();
      case 'settings': return renderSettings();
      default: return renderOverview();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Bar */}
      <nav className="bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg relative z-40">
        <div className="max-w-full mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <Layout className="w-8 h-8" />
              <span className="text-2xl font-bold">OpenCanvas</span>
            </div>
            <div className="flex items-center space-x-4">
              <button onClick={() => onNavigate('dashboard')} className="hover:text-blue-200 transition">
                Home
              </button>
              <NotificationDropdown onNavigate={onNavigate} />
              <div className="w-8 h-8 bg-white text-indigo-600 rounded-full flex items-center justify-center font-semibold">
                {userInitials}
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
                  onClick={() => setActiveMenu(item.id)}
                  className={`w-full flex items-center rounded-lg transition ${
                    sidebarCollapsed ? 'justify-center p-3' : 'space-x-3 px-3 py-3'
                  } ${
                    activeMenu === item.id
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
          {renderContent()}
        </main>
      </div>

      {/* Section Details Modal */}
      {selectedSection && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex justify-between items-center p-6 border-b flex-shrink-0">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {selectedSection.section.name === 'Unassigned' ? 'No Section' : `Section ${selectedSection.section.name}`}
                </h2>
                <p className="text-gray-600">{selectedSection.course.name}</p>
              </div>
              <button
                onClick={() => setSelectedSection(null)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6 overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-indigo-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-indigo-600">{selectedSection.section.students}</p>
                  <p className="text-sm text-gray-600">Students</p>
                </div>
                <div className="bg-green-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-green-600">{selectedSection.course.board_count || 0}</p>
                  <p className="text-sm text-gray-600">Course Boards</p>
                </div>
              </div>

              {selectedSection.section.enrollments && selectedSection.section.enrollments.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Students in this Section</h3>
                  <div className="space-y-2">
                    {selectedSection.section.enrollments.map((enrollment) => {
                      const name = enrollment.student_details
                        ? `${enrollment.student_details.first_name || ''} ${enrollment.student_details.last_name || ''}`.trim() || enrollment.student_details.username
                        : `User ${enrollment.student}`;
                      return (
                        <div key={enrollment.id} className="flex items-center space-x-3 text-sm text-gray-600 p-2 bg-gray-50 rounded">
                          <Users className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          <span className="font-medium">{name}</span>
                          <span className="text-gray-400">{enrollment.student_details?.email || ''}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t bg-gray-50 flex flex-col sm:flex-row gap-3 flex-shrink-0">
              <button
                onClick={() => { setBoardsCourseFilter(selectedSection.course.id.toString()); setActiveMenu('boards'); setSelectedSection(null); }}
                className="flex-1 bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition"
              >
                View Course Boards
              </button>
              <button
                onClick={() => setSelectedSection(null)}
                className="flex-1 border-2 border-gray-200 py-3 rounded-lg font-semibold hover:bg-gray-50 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Course Modal */}
      {showAddCourseModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900">Add New Course</h3>
                <button onClick={() => { setShowAddCourseModal(false); setCourseError(''); }} className="p-1 hover:bg-gray-100 rounded">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              {courseError && (
                <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{courseError}</div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Course Code</label>
                <input
                  type="text"
                  value={newCourse.code}
                  onChange={(e) => setNewCourse({ ...newCourse, code: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g., CS101"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Course Name</label>
                <input
                  type="text"
                  value={newCourse.name}
                  onChange={(e) => setNewCourse({ ...newCourse, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g., Introduction to Programming"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
                <textarea
                  value={newCourse.description}
                  onChange={(e) => setNewCourse({ ...newCourse, description: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  rows={2}
                  placeholder="Brief course description..."
                />
              </div>
            </div>
            <div className="p-6 border-t flex space-x-3">
              <button
                onClick={() => { setShowAddCourseModal(false); setCourseError(''); }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleAddCourse}
                disabled={addingCourse || !newCourse.code || !newCourse.name}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-medium disabled:opacity-50"
              >
                {addingCourse ? 'Creating...' : 'Add Course'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Student Modal */}
      {showAddStudentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900">Add Student</h3>
                <button onClick={() => { setShowAddStudentModal(false); setStudentSearchResults([]); setSelectedStudentId(null); }} className="p-1 hover:bg-gray-100 rounded">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Search Student</label>
                <input
                  type="text"
                  value={newStudentQuery}
                  onChange={(e) => handleSearchStudentForAdd(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder="Search by name or email..."
                />
                {studentSearchResults.length > 0 && (
                  <div className="mt-2 border rounded-lg max-h-32 overflow-y-auto">
                    {studentSearchResults.map(u => (
                      <button
                        key={u.id}
                        onClick={() => {
                          setSelectedStudentId(u.id);
                          setNewStudentQuery(`${u.first_name || ''} ${u.last_name || ''}`.trim() || u.username);
                          setStudentSearchResults([]);
                        }}
                        className={`w-full text-left px-3 py-2 hover:bg-indigo-50 text-sm ${selectedStudentId === u.id ? 'bg-indigo-50' : ''}`}
                      >
                        <span className="font-medium">{u.first_name} {u.last_name}</span>
                        <span className="text-gray-500 ml-2">{u.email}</span>
                      </button>
                    ))}
                  </div>
                )}
                {selectedStudentId && (
                  <p className="text-sm text-green-600 mt-1">Student selected</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Course</label>
                <select
                  value={newStudentCourseId}
                  onChange={(e) => setNewStudentCourseId(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select a course</option>
                  {courses.map(c => (
                    <option key={c.id} value={c.id}>{c.code} - {c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Section (optional)</label>
                <input
                  type="text"
                  value={newStudentSection}
                  onChange={(e) => setNewStudentSection(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g., A"
                />
              </div>
            </div>
            <div className="p-6 border-t flex space-x-3">
              <button
                onClick={() => { setShowAddStudentModal(false); setStudentSearchResults([]); setSelectedStudentId(null); }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleAddStudent}
                disabled={addingStudent || !selectedStudentId || !newStudentCourseId}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-medium disabled:opacity-50"
              >
                {addingStudent ? 'Enrolling...' : 'Add Student'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Student Detail Modal */}
      {viewingStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg animate-scaleIn">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-bold text-gray-900">Student Details</h2>
              <button onClick={() => setViewingStudent(null)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center space-x-4">
                <div className="w-14 h-14 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-xl font-bold">
                  {viewingStudent.name.trim()
                    ? viewingStudent.name.split(' ').map(n => n[0]).join('').toUpperCase()
                    : '?'}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{viewingStudent.name}</h3>
                  <p className="text-gray-500">{viewingStudent.email}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">Course</p>
                  <p className="font-medium text-gray-900">{viewingStudent.courseCode}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">Section</p>
                  <p className="font-medium text-gray-900">{viewingStudent.section === '-' ? 'Unassigned' : `Section ${viewingStudent.section}`}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">Status</p>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    viewingStudent.status === 'active' ? 'bg-green-100 text-green-700' :
                    viewingStudent.status === 'dropped' ? 'bg-red-100 text-red-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {viewingStudent.status.charAt(0).toUpperCase() + viewingStudent.status.slice(1)}
                  </span>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">Enrolled</p>
                  <p className="font-medium text-gray-900">{formatTimeAgo(viewingStudent.enrolledAt)}</p>
                </div>
              </div>

              {/* All enrollments for this student */}
              {(() => {
                const studentEnrollments = allStudents.filter(s => s.studentId === viewingStudent.studentId && s.id !== viewingStudent.id);
                if (studentEnrollments.length === 0) return null;
                return (
                  <div>
                    <h4 className="font-medium text-gray-700 mb-2">Other Enrollments</h4>
                    <div className="space-y-2">
                      {studentEnrollments.map(e => (
                        <div key={e.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded text-xs font-medium">{e.courseCode}</span>
                          <span className="text-sm text-gray-500">Section {e.section}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
            <div className="p-6 border-t flex gap-3">
              <button
                onClick={() => { viewingStudent.email && window.open(`mailto:${viewingStudent.email}`, '_blank'); }}
                className="flex-1 bg-indigo-600 text-white py-2 rounded-lg font-medium hover:bg-indigo-700 transition flex items-center justify-center space-x-2"
              >
                <Mail className="w-4 h-4" />
                <span>Send Email</span>
              </button>
              <button
                onClick={() => setViewingStudent(null)}
                className="flex-1 border-2 border-gray-200 py-2 rounded-lg font-medium hover:bg-gray-50 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default LecturerPage;
