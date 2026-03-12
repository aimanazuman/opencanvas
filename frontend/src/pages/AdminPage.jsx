import React, { useState, useEffect, useCallback } from 'react';
import {
  Layout, Users, Folder, Settings, Shield,
  HardDrive, CheckCircle,
  ChevronDown, ChevronRight, Search, UserPlus, Edit, Trash2,
  X, Download,
  RefreshCw, Globe, Lock, Save,
  FileText, Image, Video, Filter, ChevronLeft, Upload,
  UserX, Clock, AlertTriangle
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { usersApi, adminApi } from '../services/api';
import BulkImportModal from '../components/BulkImportModal';
import { useToast } from '../components/Toast';
import useStorageWarning from '../hooks/useStorageWarning';

function formatStorageSize(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const value = bytes / Math.pow(k, i);
  // Show up to 3 decimal places, but trim trailing zeros
  const formatted = value.toFixed(3).replace(/\.?0+$/, '');
  return `${formatted} ${units[i]}`;
}

function formatStorageSizeShort(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const value = bytes / Math.pow(k, i);
  const formatted = value.toFixed(2).replace(/\.?0+$/, '');
  return `${formatted} ${units[i]}`;
}

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

function AdminPage({ onNavigate }) {
  const { user } = useAuth();
  const toast = useToast();
  useStorageWarning();
  const [activeMenu, setActiveMenu] = useState('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showUserModal, setShowUserModal] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(null);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userFilterRole, setUserFilterRole] = useState('all');
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [logFilter, setLogFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [selectedUsers, setSelectedUsers] = useState(new Set());
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [storageSearchQuery, setStorageSearchQuery] = useState('');
  const [showDeleteLogsModal, setShowDeleteLogsModal] = useState(false);
  const [deletingLogs, setDeletingLogs] = useState(false);

  // API data
  const [dashboardStats, setDashboardStats] = useState(null);
  const [allUsers, setAllUsers] = useState([]);
  const [storageStats, setStorageStats] = useState(null);
  const [largeFiles, setLargeFiles] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [userStorageData, setUserStorageData] = useState([]);
  const [guestAccounts, setGuestAccounts] = useState({ total: 0, expired: 0, guests: [] });
  const [cleaningGuests, setCleaningGuests] = useState(false);
  const [userStorageSort, setUserStorageSort] = useState('storage_used');
  const [systemSettings, setSystemSettings] = useState({
    siteName: 'OpenCanvas',
    siteUrl: '',
    adminEmail: '',
    allowRegistration: true,
    requireEmailVerification: true,
    sessionTimeout: 30,
    maintenanceMode: false,
    enableNotifications: true,
    enableAnalytics: true,
    backupFrequency: 'daily',
    allowUsernameChange: true,
    usernameChangeCooldownDays: 30,
    maxUsernameChanges: 5,
    allowEmailChange: true,
    emailChangeCooldownDays: 30,
    maxEmailChanges: 5,
    defaultStorageQuota: 5,
    systemStorageLimit: '',
  });

  // User modal form state
  const [userForm, setUserForm] = useState({ username: '', email: '', first_name: '', last_name: '', role: 'student', password: '', storage_quota_gb: 5 });
  const [savingUser, setSavingUser] = useState(false);
  const [userError, setUserError] = useState('');
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [showFileDeleteModal, setShowFileDeleteModal] = useState(null); // file object or null
  const [fileDeleteReason, setFileDeleteReason] = useState('');
  const [fileDeleteCustomMessage, setFileDeleteCustomMessage] = useState('');
  const [deletingFile, setDeletingFile] = useState(false);

  const menuItems = [
    { id: 'dashboard', icon: Layout, label: 'Dashboard' },
    { id: 'users', icon: Users, label: 'User Management' },
    { id: 'guests', icon: UserX, label: 'Guest Accounts' },
    { id: 'storage', icon: HardDrive, label: 'Storage Management' },
    { id: 'settings', icon: Settings, label: 'System Settings' },
    { id: 'logs', icon: FileText, label: 'Logs & Audit' },
  ];

  // Load data
  const loadDashboardStats = useCallback(async () => {
    try {
      const res = await adminApi.getDashboardStats();
      setDashboardStats(res.data);
    } catch (err) {
      console.error('Failed to load dashboard stats:', err);
    }
  }, []);

  const loadUsers = useCallback(async () => {
    try {
      const res = await usersApi.getAll({ role: userFilterRole !== 'all' ? userFilterRole : undefined, search: userSearchQuery || undefined });
      setAllUsers(res.data.results || res.data);
    } catch (err) {
      console.error('Failed to load users:', err);
    }
  }, [userFilterRole, userSearchQuery]);

  const loadStorageStats = useCallback(async () => {
    try {
      const res = await adminApi.getStorageStats();
      setStorageStats(res.data);
    } catch (err) {
      console.error('Failed to load storage stats:', err);
    }
  }, []);

  const loadUserStorage = useCallback(async () => {
    try {
      const res = await adminApi.getUserStorage({ sort: userStorageSort, order: 'desc' });
      setUserStorageData(res.data);
    } catch (err) {
      console.error('Failed to load user storage:', err);
    }
  }, [userStorageSort]);

  const loadLargeFiles = useCallback(async () => {
    try {
      const res = await adminApi.getLargeFiles();
      setLargeFiles(res.data);
    } catch (err) {
      console.error('Failed to load large files:', err);
    }
  }, []);

  const loadGuestAccounts = useCallback(async () => {
    try {
      const res = await adminApi.getGuestAccounts();
      setGuestAccounts(res.data);
    } catch (err) {
      console.error('Failed to load guest accounts:', err);
    }
  }, []);

  const handleCleanupGuests = async () => {
    setCleaningGuests(true);
    try {
      const res = await adminApi.cleanupGuests();
      toast.success(res.data.message);
      loadGuestAccounts();
      loadDashboardStats();
    } catch (err) {
      toast.error('Failed to cleanup guest accounts');
    } finally {
      setCleaningGuests(false);
    }
  };

  const handleAdminDeleteFile = async () => {
    if (!showFileDeleteModal || !fileDeleteReason) return;
    setDeletingFile(true);
    try {
      await adminApi.deleteFile(showFileDeleteModal.id, {
        reason: fileDeleteReason,
        message: fileDeleteCustomMessage,
      });
      toast.success(`File "${showFileDeleteModal.name}" deleted successfully`);
      setShowFileDeleteModal(null);
      setFileDeleteReason('');
      setFileDeleteCustomMessage('');
      loadLargeFiles();
      loadStorageStats();
      loadUserStorage();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete file');
    } finally {
      setDeletingFile(false);
    }
  };

  const loadSettings = useCallback(async () => {
    try {
      const res = await adminApi.getSettings();
      setSystemSettings(prev => ({
        ...prev,
        ...res.data,
        allowRegistration: res.data.allowRegistration === 'true' || res.data.allowRegistration === true,
        requireEmailVerification: res.data.requireEmailVerification === 'true' || res.data.requireEmailVerification === true,
        maintenanceMode: res.data.maintenanceMode === 'true' || res.data.maintenanceMode === true,
        enableNotifications: res.data.enableNotifications === 'true' || res.data.enableNotifications === true,
        enableAnalytics: res.data.enableAnalytics === 'true' || res.data.enableAnalytics === true,
        sessionTimeout: parseInt(res.data.sessionTimeout) || 30,
        allowUsernameChange: res.data.allowUsernameChange === 'true' || res.data.allowUsernameChange === true || res.data.allowUsernameChange === undefined,
        usernameChangeCooldownDays: parseInt(res.data.usernameChangeCooldownDays) || 30,
        maxUsernameChanges: parseInt(res.data.maxUsernameChanges) || 5,
        allowEmailChange: res.data.allowEmailChange === 'true' || res.data.allowEmailChange === true || res.data.allowEmailChange === undefined,
        emailChangeCooldownDays: parseInt(res.data.emailChangeCooldownDays) || 30,
        maxEmailChanges: parseInt(res.data.maxEmailChanges) || 5,
        defaultStorageQuota: parseFloat(res.data.defaultStorageQuota) || 5,
      }));
    } catch (err) {
      console.error('Failed to load settings:', err);
    }
  }, []);

  const loadLogs = useCallback(async () => {
    try {
      const res = await adminApi.getLogs({ limit: 200 });
      setAuditLogs(res.data);
    } catch (err) {
      console.error('Failed to load logs:', err);
    }
  }, []);

  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      await Promise.all([loadDashboardStats(), loadUsers(), loadSettings(), loadLogs()]);
      setLoading(false);
    };
    loadAll();
  }, [loadDashboardStats, loadUsers, loadSettings, loadLogs]);

  // Load section-specific data when switching tabs
  useEffect(() => {
    if (activeMenu === 'storage') {
      loadStorageStats();
      loadLargeFiles();
      loadUserStorage();
    } else if (activeMenu === 'logs') {
      loadLogs();
    } else if (activeMenu === 'users') {
      loadUsers();
    } else if (activeMenu === 'guests') {
      loadGuestAccounts();
    }
  }, [activeMenu, loadStorageStats, loadLargeFiles, loadUserStorage, loadLogs, loadUsers, loadGuestAccounts]);

  // Reload users when search/filter changes
  useEffect(() => {
    if (activeMenu === 'users') {
      const timeout = setTimeout(() => loadUsers(), 300);
      return () => clearTimeout(timeout);
    }
  }, [userSearchQuery, userFilterRole, activeMenu, loadUsers]);

  const colorClasses = {
    indigo: 'bg-indigo-100 text-indigo-600',
    green: 'bg-green-100 text-green-600',
    purple: 'bg-purple-100 text-purple-600',
    yellow: 'bg-yellow-100 text-yellow-600',
    blue: 'bg-blue-100 text-blue-600',
    gray: 'bg-gray-100 text-gray-600',
  };

  const getStatusColor = (percentage) => {
    if (percentage >= 90) return 'bg-green-500';
    if (percentage >= 50) return 'bg-yellow-500';
    return 'bg-indigo-500';
  };

  // User CRUD handlers
  const handleOpenAddUser = () => {
    setUserForm({ username: '', email: '', first_name: '', last_name: '', role: 'student', password: '', storage_quota_gb: systemSettings.defaultStorageQuota || 5 });
    setUserError('');
    setShowUserModal({ mode: 'add' });
  };

  const handleOpenEditUser = (u) => {
    setUserForm({
      username: u.username || '',
      email: u.email || '',
      first_name: u.first_name || '',
      last_name: u.last_name || '',
      role: u.role || 'student',
      password: '',
      storage_quota_gb: u.storage_quota ? Math.round((u.storage_quota / (1024 ** 3)) * 100) / 100 : 5,
    });
    setUserError('');
    setShowUserModal({ mode: 'edit', user: u });
  };

  const handleSaveUser = async () => {
    setSavingUser(true);
    setUserError('');
    try {
      if (showUserModal.mode === 'add') {
        const data = { ...userForm };
        if (!data.password) {
          setUserError('Password is required for new users');
          setSavingUser(false);
          return;
        }
        data.storage_quota = Math.round((data.storage_quota_gb || 5) * (1024 ** 3));
        delete data.storage_quota_gb;
        await usersApi.create(data);
      } else {
        const data = { ...userForm };
        delete data.password; // Don't send empty password on edit
        data.storage_quota = Math.round((data.storage_quota_gb || 5) * (1024 ** 3));
        delete data.storage_quota_gb;
        await usersApi.update(showUserModal.user.id, data);
      }
      setShowUserModal(null);
      loadUsers();
      loadDashboardStats();
    } catch (err) {
      const data = err.response?.data;
      const firstError = data ? Object.values(data).flat()[0] : 'Failed to save user';
      setUserError(typeof firstError === 'string' ? firstError : 'Failed to save user');
    } finally {
      setSavingUser(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!showDeleteModal) return;
    try {
      await usersApi.delete(showDeleteModal.id);
      setShowDeleteModal(null);
      loadUsers();
      loadDashboardStats();
      toast.success('User deleted');
    } catch (err) {
      console.error('Failed to delete user:', err);
      toast.error('Failed to delete user');
    }
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedUsers);
    let deleted = 0;
    let failed = 0;
    for (const id of ids) {
      try {
        await usersApi.delete(id);
        deleted++;
      } catch (err) {
        console.error(`Failed to delete user ${id}:`, err);
        failed++;
      }
    }
    setSelectedUsers(new Set());
    setShowBulkDeleteModal(false);
    loadUsers();
    loadDashboardStats();
    if (failed === 0) {
      toast.success(`${deleted} user${deleted !== 1 ? 's' : ''} deleted`);
    } else {
      toast.warning(`${deleted} deleted, ${failed} failed`);
    }
  };

  const toggleUserSelection = (userId) => {
    setSelectedUsers(prev => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedUsers.size === allUsers.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(allUsers.map(u => u.id)));
    }
  };

  const handleSaveSettings = async () => {
    try {
      await adminApi.updateSettings({
        siteName: systemSettings.siteName,
        siteUrl: systemSettings.siteUrl,
        adminEmail: systemSettings.adminEmail,
        allowRegistration: String(systemSettings.allowRegistration),
        requireEmailVerification: String(systemSettings.requireEmailVerification),
        sessionTimeout: String(systemSettings.sessionTimeout),
        maintenanceMode: String(systemSettings.maintenanceMode),
        enableNotifications: String(systemSettings.enableNotifications),
        enableAnalytics: String(systemSettings.enableAnalytics),
        backupFrequency: systemSettings.backupFrequency,
        allowUsernameChange: String(systemSettings.allowUsernameChange),
        usernameChangeCooldownDays: String(systemSettings.usernameChangeCooldownDays),
        maxUsernameChanges: String(systemSettings.maxUsernameChanges),
        allowEmailChange: String(systemSettings.allowEmailChange),
        emailChangeCooldownDays: String(systemSettings.emailChangeCooldownDays),
        maxEmailChanges: String(systemSettings.maxEmailChanges),
        defaultStorageQuota: String(systemSettings.defaultStorageQuota),
        systemStorageLimit: String(systemSettings.systemStorageLimit || ''),
      });
      setSettingsSaved(true);
      setTimeout(() => setSettingsSaved(false), 3000);
      toast.success('Settings saved successfully');
    } catch (err) {
      console.error('Failed to save settings:', err);
      toast.error('Failed to save settings');
    }
  };

  const userInitials = user
    ? (user.first_name && user.last_name
        ? `${user.first_name[0]}${user.last_name[0]}`
        : user.username?.[0]?.toUpperCase() || 'A')
    : 'A';

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  const stats = [
    { label: 'Total Users', value: dashboardStats?.total_users || 0, change: `${dashboardStats?.users_by_role?.students || 0} students`, icon: Users, color: 'indigo' },
    { label: 'Active Boards', value: dashboardStats?.total_boards || 0, change: `${dashboardStats?.total_courses || 0} courses`, icon: Folder, color: 'green' },
    { label: 'Storage Used', value: formatStorageSizeShort(dashboardStats?.storage_used_bytes || 0), change: `${dashboardStats?.storage_percentage || 0}% of quota`, icon: HardDrive, color: 'purple' },
    { label: 'Guest Accounts', value: dashboardStats?.guest_users || 0, change: `${dashboardStats?.expired_guests || 0} expired`, icon: UserX, color: 'yellow', onClick: () => setActiveMenu('guests') },
  ];

  // Render Dashboard Content
  const renderDashboard = () => (
    <>
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">System Overview</h1>
          <p className="text-gray-600 mt-1">Monitor system performance and manage users</p>
        </div>
        <button
          onClick={() => { setActiveMenu('users'); handleOpenAddUser(); }}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 transition flex items-center space-x-2 self-start"
        >
          <UserPlus className="w-5 h-5" />
          <span>Add User</span>
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat, idx) => (
          <div
            key={idx}
            className={`bg-white rounded-xl shadow-sm border p-6 ${stat.onClick ? 'cursor-pointer hover:shadow-md transition' : ''}`}
            onClick={stat.onClick}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">{stat.label}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                <p className="text-sm mt-1 text-gray-600">{stat.change}</p>
              </div>
              <div className={`p-3 rounded-lg ${colorClasses[stat.color]}`}>
                <stat.icon className="w-6 h-6" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-8 mb-8">
        {/* User Breakdown */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Users by Role</h2>
          <div className="space-y-4">
            {[
              { role: 'Students', count: dashboardStats?.users_by_role?.students || 0, color: 'bg-blue-500' },
              { role: 'Lecturers', count: dashboardStats?.users_by_role?.lecturers || 0, color: 'bg-green-500' },
              { role: 'Admins', count: dashboardStats?.users_by_role?.admins || 0, color: 'bg-purple-500' },
            ].map((item, idx) => {
              const total = dashboardStats?.total_users || 1;
              const pct = Math.round((item.count / total) * 100);
              return (
                <div key={idx}>
                  <div className="flex justify-between mb-1">
                    <span className="text-gray-700 font-medium text-sm">{item.role}</span>
                    <span className="text-sm text-gray-600">{item.count} ({pct}%)</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className={`h-2 rounded-full ${item.color}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">System Status</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-700">Active Users</span>
              <span className="font-bold text-green-600">{dashboardStats?.active_users || 0}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-700">Active Courses</span>
              <span className="font-bold text-blue-600">{dashboardStats?.total_courses || 0}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-700">Active Boards</span>
              <span className="font-bold text-purple-600">{dashboardStats?.total_boards || 0}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-700">Storage</span>
              <span className="font-bold text-gray-900">{formatStorageSizeShort(dashboardStats?.storage_used_bytes || 0)} / {formatStorageSizeShort(dashboardStats?.storage_quota_bytes || 0)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Logs Preview */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">Recent Activity</h2>
          <button onClick={() => setActiveMenu('logs')} className="text-indigo-600 text-sm hover:underline">View All</button>
        </div>
        {auditLogs.length === 0 ? (
          <p className="text-gray-400 text-center py-4">No recent activity</p>
        ) : (
          <div className="space-y-3">
            {auditLogs.slice(0, 4).map((log) => (
              <div key={log.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                <div className={`w-2 h-2 rounded-full ${
                  log.type === 'error' ? 'bg-red-500' :
                  log.type === 'warning' ? 'bg-yellow-500' :
                  log.type === 'success' ? 'bg-green-500' : 'bg-blue-500'
                }`}></div>
                <span className="flex-1 text-gray-700 text-sm">{log.message}</span>
                {log.user && <span className="text-xs text-gray-500">{log.user}</span>}
                <span className="text-xs text-gray-400">{formatTimeAgo(log.time)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );

  // Render User Management Content
  const renderUserManagement = () => (
    <>
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-600 mt-1">Manage users, roles, and permissions</p>
        </div>
        <div className="flex items-center space-x-3 self-start">
          <button
            onClick={() => setShowBulkImport(true)}
            className="bg-white text-indigo-600 border border-indigo-600 px-4 py-2 rounded-lg font-medium hover:bg-indigo-50 transition flex items-center space-x-2"
          >
            <Upload className="w-5 h-5" />
            <span>Bulk Import</span>
          </button>
          <button
            onClick={handleOpenAddUser}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 transition flex items-center space-x-2"
          >
            <UserPlus className="w-5 h-5" />
            <span>Add User</span>
          </button>
        </div>
      </div>

      {/* User Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <p className="text-sm text-gray-600">Total Users</p>
          <p className="text-2xl font-bold text-gray-900">{allUsers.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <p className="text-sm text-gray-600">Students</p>
          <p className="text-2xl font-bold text-blue-600">{allUsers.filter(u => u.role === 'student').length}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <p className="text-sm text-gray-600">Lecturers</p>
          <p className="text-2xl font-bold text-green-600">{allUsers.filter(u => u.role === 'lecturer').length}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <p className="text-sm text-gray-600">Admins</p>
          <p className="text-2xl font-bold text-purple-600">{allUsers.filter(u => u.role === 'admin').length}</p>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search users by name or email..."
              value={userSearchQuery}
              onChange={(e) => setUserSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <select
              value={userFilterRole}
              onChange={(e) => setUserFilterRole(e.target.value)}
              className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 appearance-none bg-white min-w-[150px]"
            >
              <option value="all">All Roles</option>
              <option value="admin">Admin</option>
              <option value="lecturer">Lecturer</option>
              <option value="student">Student</option>
              <option value="guest">Guest</option>
            </select>
          </div>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selectedUsers.size > 0 && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3 mb-4 flex items-center justify-between animate-slideDown">
          <span className="text-sm text-indigo-700 font-medium">
            {selectedUsers.size} user{selectedUsers.size !== 1 ? 's' : ''} selected
          </span>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setSelectedUsers(new Set())}
              className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition"
            >
              Clear
            </button>
            <button
              onClick={() => setShowBulkDeleteModal(true)}
              className="px-3 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition flex items-center space-x-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Selected</span>
            </button>
          </div>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={allUsers.length > 0 && selectedUsers.size === allUsers.length}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">User</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Role</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Status</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Joined</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {allUsers.map((u) => {
                const displayName = u.first_name && u.last_name
                  ? `${u.first_name} ${u.last_name}`
                  : u.username;
                const initials = u.first_name && u.last_name
                  ? `${u.first_name[0]}${u.last_name[0]}`
                  : u.username?.[0]?.toUpperCase() || '?';
                return (
                  <tr key={u.id} className={`hover:bg-gray-50 ${selectedUsers.has(u.id) ? 'bg-indigo-50' : ''}`}>
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedUsers.has(u.id)}
                        onChange={() => toggleUserSelection(u.id)}
                        className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-medium">
                          {initials}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{displayName}</p>
                          <p className="text-sm text-gray-500">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center space-x-1.5">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${
                          u.role === 'admin' ? 'bg-red-100 text-red-700' :
                          u.role === 'lecturer' ? 'bg-blue-100 text-blue-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {u.role}
                        </span>
                        {u.is_guest && (
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                            Guest
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        u.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                      }`}>
                        {u.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {u.date_joined ? new Date(u.date_joined).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleOpenEditUser(u)}
                          className="p-1 hover:bg-gray-100 rounded text-gray-600"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setShowDeleteModal(u)}
                          className="p-1 hover:bg-red-100 rounded text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {allUsers.length === 0 && (
                <tr>
                  <td colSpan="6" className="px-4 py-8 text-center text-gray-400">No users found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="p-4 border-t">
          <p className="text-sm text-gray-600">Showing {allUsers.length} users</p>
        </div>
      </div>
    </>
  );

  // Render Storage Management Content
  const renderStorageManagement = () => {
    const totalUsedBytes = storageStats?.total_used_bytes || 0;
    const effectiveLimitBytes = storageStats?.effective_limit_bytes || storageStats?.total_quota_bytes || 0;
    const percentageUsed = storageStats?.percentage_used || 0;
    const systemLimitGb = storageStats?.system_limit_gb;
    const byType = storageStats?.by_type || [];

    const typeIcons = { image: Image, document: FileText, video: Video, other: Folder, board_content: Layout };
    const typeColors = { image: 'blue', document: 'green', video: 'purple', other: 'gray', board_content: 'indigo' };

    return (
      <>
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Storage Management</h1>
            <p className="text-gray-600 mt-1">Monitor and manage system storage</p>
          </div>
          <button
            onClick={() => { loadStorageStats(); loadLargeFiles(); loadUserStorage(); toast.info('Storage data refreshed'); }}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 transition flex items-center space-x-2 self-start"
          >
            <RefreshCw className="w-5 h-5" />
            <span>Refresh</span>
          </button>
        </div>

        {/* Storage Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Total Storage</h3>
            <div className="relative w-32 h-32 mx-auto mb-4">
              <svg className="w-32 h-32 transform -rotate-90">
                <circle cx="64" cy="64" r="56" stroke="#e5e7eb" strokeWidth="12" fill="none" />
                <circle
                  cx="64" cy="64" r="56"
                  stroke="url(#storageGradient)" strokeWidth="12" fill="none"
                  strokeDasharray={`${percentageUsed * 3.52} ${100 * 3.52}`}
                  strokeLinecap="round"
                />
                <defs>
                  <linearGradient id="storageGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#3b82f6" />
                    <stop offset="100%" stopColor="#8b5cf6" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <span className="text-2xl font-bold text-gray-900">{Math.round(percentageUsed)}%</span>
                  <p className="text-xs text-gray-500">Used</p>
                </div>
              </div>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">{formatStorageSize(totalUsedBytes)}</p>
              <p className="text-gray-500">of {formatStorageSize(effectiveLimitBytes)} used</p>
            </div>
            {systemLimitGb && systemLimitGb > 0 && (
              <div className="mt-4 pt-4 border-t">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>System Limit</span>
                  <span>{formatStorageSize(totalUsedBytes)} / {systemLimitGb} GB</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      percentageUsed >= 90
                        ? 'bg-red-500'
                        : percentageUsed >= 70
                        ? 'bg-amber-500'
                        : 'bg-indigo-500'
                    }`}
                    style={{ width: `${Math.min(100, percentageUsed)}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-sm border p-6 lg:col-span-2">
            <h3 className="font-semibold text-gray-900 mb-4">Storage by Type</h3>
            {byType.length === 0 ? (
              <p className="text-gray-400 text-center py-4">No files uploaded yet</p>
            ) : (
              <div className="space-y-4">
                {byType.map((item, idx) => {
                  const Icon = typeIcons[item.file_type] || Folder;
                  const color = typeColors[item.file_type] || 'gray';
                  return (
                    <div key={idx}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-3">
                          <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
                            <Icon className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{item.type}</p>
                            <p className="text-sm text-gray-500">{item.files.toLocaleString()} files</p>
                          </div>
                        </div>
                        <span className="font-semibold text-gray-900">{formatStorageSize(item.size_bytes)}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            color === 'blue' ? 'bg-blue-500' :
                            color === 'green' ? 'bg-green-500' :
                            color === 'purple' ? 'bg-purple-500' : 'bg-gray-400'
                          }`}
                          style={{ width: totalUsedBytes > 0 ? `${(item.size_bytes / totalUsedBytes) * 100}%` : '0%' }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* User Storage Usage */}
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden mb-8">
          <div className="p-6 border-b flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <h3 className="font-semibold text-gray-900">User Storage Usage</h3>
            <div className="flex items-center space-x-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search users..."
                  value={storageSearchQuery}
                  onChange={(e) => setStorageSearchQuery(e.target.value)}
                  className="pl-9 pr-3 py-1.5 border border-gray-300 rounded-lg text-sm w-48 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              <select
                value={userStorageSort}
                onChange={(e) => setUserStorageSort(e.target.value)}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
              >
                <option value="storage_used">Sort by Used</option>
                <option value="percentage_used">Sort by % Used</option>
                <option value="file_count">Sort by File Count</option>
                <option value="display_name">Sort by Name</option>
              </select>
            </div>
          </div>
          <div className="p-6 space-y-4 max-h-[500px] overflow-y-auto">
            {(() => {
              const filteredStorageData = storageSearchQuery
                ? userStorageData.filter(u =>
                    u.display_name.toLowerCase().includes(storageSearchQuery.toLowerCase()) ||
                    u.username.toLowerCase().includes(storageSearchQuery.toLowerCase()) ||
                    (u.email && u.email.toLowerCase().includes(storageSearchQuery.toLowerCase()))
                  )
                : userStorageData;
              return filteredStorageData.length === 0 ? (
                <p className="text-gray-400 text-center py-4">{storageSearchQuery ? 'No matching users found' : 'No users found'}</p>
              ) : (
              filteredStorageData.map((u) => {
                const pct = u.percentage_used;
                const barColor = pct >= 90 ? 'bg-red-500' : pct >= 80 ? 'bg-yellow-500' : 'bg-blue-500';
                return (
                  <div key={u.id} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-gray-900 text-sm">{u.display_name}</span>
                        <span className={`px-1.5 py-0.5 rounded text-xs capitalize ${
                          u.role === 'admin' ? 'bg-red-100 text-red-700' :
                          u.role === 'lecturer' ? 'bg-blue-100 text-blue-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>{u.role}</span>
                      </div>
                      <span className="text-sm text-gray-600">{formatStorageSizeShort(u.storage_used)} / {formatStorageSizeShort(u.storage_quota)} ({pct}%)</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div className={`h-2.5 rounded-full ${barColor} transition-all`} style={{ width: `${Math.min(pct, 100)}%` }} />
                    </div>
                    <p className="text-xs text-gray-500">{u.file_count} files</p>
                  </div>
                );
              })
            );})()}
          </div>
        </div>

        {/* Large Files */}
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="p-6 border-b">
            <h3 className="font-semibold text-gray-900">Large Files (Top 20)</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-600">File Name</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-600">Size</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-600">Owner</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-600">Type</th>
                  <th className="px-6 py-3 text-right text-sm font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {largeFiles.map((file, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <FileText className="w-5 h-5 text-gray-400" />
                        <span className="font-medium text-gray-900">{file.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-600">{file.size_display}</td>
                    <td className="px-6 py-4 text-gray-600">{file.owner}</td>
                    <td className="px-6 py-4 text-gray-500 capitalize">{file.file_type}</td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => {
                          setShowFileDeleteModal(file);
                          setFileDeleteReason('');
                          setFileDeleteCustomMessage('');
                        }}
                        className="text-red-600 hover:text-red-800 transition p-1 rounded hover:bg-red-50"
                        aria-label={`Delete file ${file.name}`}
                        title="Delete file"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {largeFiles.length === 0 && (
                  <tr>
                    <td colSpan="5" className="px-6 py-8 text-center text-gray-400">No files found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* File Delete Modal */}
        {showFileDeleteModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-backdropFade" role="dialog" aria-modal="true" onKeyDown={(e) => { if (e.key === 'Escape') setShowFileDeleteModal(null); }}>
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md animate-scaleIn">
              <div className="p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                    <Trash2 className="w-5 h-5 text-red-600" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">Delete File</h3>
                </div>
                <p className="text-gray-600 mb-1">
                  You are about to delete <strong>{showFileDeleteModal.name}</strong> ({showFileDeleteModal.size_display}) owned by <strong>{showFileDeleteModal.owner}</strong>.
                </p>
                <p className="text-sm text-gray-500 mb-4">The owner will receive a notification with the reason.</p>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Reason *</label>
                    <select
                      value={fileDeleteReason}
                      onChange={(e) => setFileDeleteReason(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    >
                      <option value="">Select a reason...</option>
                      <option value="Pornography or sexually explicit content">Pornography or sexually explicit content</option>
                      <option value="Violence or graphic content">Violence or graphic content</option>
                      <option value="Copyright infringement">Copyright infringement</option>
                      <option value="Harassment or hate speech">Harassment or hate speech</option>
                      <option value="Spam or misleading content">Spam or misleading content</option>
                      <option value="Malware or security threat">Malware or security threat</option>
                      <option value="Inappropriate content">Inappropriate content</option>
                      <option value="Storage policy violation">Storage policy violation</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Additional message (optional)</label>
                    <textarea
                      value={fileDeleteCustomMessage}
                      onChange={(e) => setFileDeleteCustomMessage(e.target.value)}
                      placeholder="Provide additional details for the user..."
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none"
                    />
                  </div>
                </div>

                <div className="flex space-x-3 mt-6">
                  <button
                    onClick={() => setShowFileDeleteModal(null)}
                    className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAdminDeleteFile}
                    disabled={!fileDeleteReason || deletingFile}
                    className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {deletingFile ? 'Deleting...' : 'Delete File'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </>
    );
  };

  // Render System Settings Content
  const renderSystemSettings = () => (
    <>
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">System Settings</h1>
          <p className="text-gray-600 mt-1">Configure system-wide settings and preferences</p>
        </div>
        {settingsSaved && (
          <div className="flex items-center space-x-2 bg-green-100 text-green-700 px-4 py-2 rounded-lg">
            <CheckCircle className="w-5 h-5" />
            <span>Settings saved successfully!</span>
          </div>
        )}
      </div>

      <div className="space-y-6">
        {/* General Settings */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center space-x-3 mb-6">
            <Globe className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-bold text-gray-900">General Settings</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Site Name</label>
              <input
                type="text"
                value={systemSettings.siteName}
                onChange={(e) => setSystemSettings({...systemSettings, siteName: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Site URL</label>
              <input
                type="text"
                value={systemSettings.siteUrl}
                onChange={(e) => setSystemSettings({...systemSettings, siteUrl: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Admin Email</label>
              <input
                type="email"
                value={systemSettings.adminEmail}
                onChange={(e) => setSystemSettings({...systemSettings, adminEmail: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Default Storage Quota (GB)</label>
              <input
                type="number"
                min="0.1"
                step="0.5"
                value={systemSettings.defaultStorageQuota}
                onChange={(e) => setSystemSettings({...systemSettings, defaultStorageQuota: parseFloat(e.target.value) || 5})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
              <p className="text-xs text-gray-500 mt-1">Applied to newly registered users</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">System Storage Limit (GB)</label>
              <input
                type="number"
                min="0"
                step="1"
                value={systemSettings.systemStorageLimit}
                onChange={(e) => setSystemSettings({...systemSettings, systemStorageLimit: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                placeholder="No limit"
              />
              <p className="text-xs text-gray-500 mt-1">Maximum total storage across all users (leave empty for unlimited)</p>
            </div>
          </div>
        </div>

        {/* Security Settings */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center space-x-3 mb-6">
            <Lock className="w-6 h-6 text-red-600" />
            <h2 className="text-xl font-bold text-gray-900">Security Settings</h2>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b">
              <div>
                <p className="font-medium text-gray-900">Allow User Registration</p>
                <p className="text-sm text-gray-500">Enable new users to create accounts</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={systemSettings.allowRegistration}
                  onChange={(e) => setSystemSettings({...systemSettings, allowRegistration: e.target.checked})}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>
            <div className="flex items-center justify-between py-3 border-b">
              <div>
                <p className="font-medium text-gray-900">Require Email Verification</p>
                <p className="text-sm text-gray-500">Users must verify email before accessing</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={systemSettings.requireEmailVerification}
                  onChange={(e) => setSystemSettings({...systemSettings, requireEmailVerification: e.target.checked})}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>
            <div className="flex items-center justify-between py-3">
              <div>
                <p className="font-medium text-gray-900">Session Timeout (minutes)</p>
                <p className="text-sm text-gray-500">Auto-logout after inactivity</p>
              </div>
              <input
                type="number"
                value={systemSettings.sessionTimeout}
                onChange={(e) => setSystemSettings({...systemSettings, sessionTimeout: parseInt(e.target.value) || 30})}
                className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* System Toggles */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center space-x-3 mb-6">
            <Settings className="w-6 h-6 text-purple-600" />
            <h2 className="text-xl font-bold text-gray-900">System Toggles</h2>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b">
              <div>
                <p className="font-medium text-gray-900">Maintenance Mode</p>
                <p className="text-sm text-gray-500">Disable access for non-admin users</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={systemSettings.maintenanceMode}
                  onChange={(e) => setSystemSettings({...systemSettings, maintenanceMode: e.target.checked})}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
              </label>
            </div>
            <div className="flex items-center justify-between py-3 border-b">
              <div>
                <p className="font-medium text-gray-900">Enable Notifications</p>
                <p className="text-sm text-gray-500">Send system notifications to users</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={systemSettings.enableNotifications}
                  onChange={(e) => setSystemSettings({...systemSettings, enableNotifications: e.target.checked})}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>
            <div className="flex items-center justify-between py-3">
              <div>
                <p className="font-medium text-gray-900">Enable Analytics</p>
                <p className="text-sm text-gray-500">Collect usage statistics</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={systemSettings.enableAnalytics}
                  onChange={(e) => setSystemSettings({...systemSettings, enableAnalytics: e.target.checked})}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Username & Email Change Policy */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center space-x-3 mb-6">
            <Settings className="w-6 h-6 text-orange-600" />
            <h2 className="text-xl font-bold text-gray-900">Username & Email Change Policy</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {/* Username Policy */}
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-700">Username Changes</h3>
              <div className="flex items-center justify-between py-2">
                <p className="text-sm text-gray-600">Allow username changes</p>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={systemSettings.allowUsernameChange}
                    onChange={(e) => setSystemSettings({...systemSettings, allowUsernameChange: e.target.checked})}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>
              <div>
                <label className="text-sm text-gray-600">Cooldown (days)</label>
                <input
                  type="number"
                  min="0"
                  value={systemSettings.usernameChangeCooldownDays}
                  onChange={(e) => setSystemSettings({...systemSettings, usernameChangeCooldownDays: parseInt(e.target.value) || 0})}
                  className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="text-sm text-gray-600">Max changes per user</label>
                <input
                  type="number"
                  min="1"
                  value={systemSettings.maxUsernameChanges}
                  onChange={(e) => setSystemSettings({...systemSettings, maxUsernameChanges: parseInt(e.target.value) || 1})}
                  className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
            {/* Email Policy */}
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-700">Email Changes</h3>
              <div className="flex items-center justify-between py-2">
                <p className="text-sm text-gray-600">Allow email changes</p>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={systemSettings.allowEmailChange}
                    onChange={(e) => setSystemSettings({...systemSettings, allowEmailChange: e.target.checked})}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>
              <div>
                <label className="text-sm text-gray-600">Cooldown (days)</label>
                <input
                  type="number"
                  min="0"
                  value={systemSettings.emailChangeCooldownDays}
                  onChange={(e) => setSystemSettings({...systemSettings, emailChangeCooldownDays: parseInt(e.target.value) || 0})}
                  className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="text-sm text-gray-600">Max changes per user</label>
                <input
                  type="number"
                  min="1"
                  value={systemSettings.maxEmailChanges}
                  onChange={(e) => setSystemSettings({...systemSettings, maxEmailChanges: parseInt(e.target.value) || 1})}
                  className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>
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

  // Render Logs & Audit Content
  const renderLogs = () => {
    const filteredLogs = logFilter === 'all' ? auditLogs : auditLogs.filter(l => l.type === logFilter);
    return (
      <>
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Logs & Audit</h1>
            <p className="text-gray-600 mt-1">View system activity logs and audit trail</p>
          </div>
          <div className="flex items-center space-x-3 flex-wrap gap-2">
            <select
              value={logFilter}
              onChange={(e) => setLogFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg"
            >
              <option value="all">All Types</option>
              <option value="info">Info</option>
              <option value="success">Success</option>
              <option value="warning">Warning</option>
              <option value="error">Error</option>
            </select>
            <button
              onClick={async () => { await loadLogs(); toast.info('Logs refreshed'); }}
              className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 flex items-center space-x-2"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Refresh</span>
            </button>
            <button
              onClick={async () => {
                try {
                  const res = await adminApi.exportLogs({ limit: 1000 });
                  const url = URL.createObjectURL(res.data);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'audit_logs.csv';
                  a.click();
                  URL.revokeObjectURL(url);
                  toast.success('Logs exported');
                } catch { toast.error('Failed to export logs'); }
              }}
              className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 flex items-center space-x-2"
            >
              <Download className="w-4 h-4" />
              <span>Export</span>
            </button>
            <button
              onClick={() => setShowDeleteLogsModal(true)}
              className="border border-red-300 text-red-600 px-4 py-2 rounded-lg hover:bg-red-50 flex items-center space-x-2"
            >
              <Trash2 className="w-4 h-4" />
              <span>Clear Logs</span>
            </button>
          </div>
        </div>

        {/* Log Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm border p-4">
            <p className="text-sm text-gray-600">Total Logs</p>
            <p className="text-2xl font-bold text-gray-900">{auditLogs.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border p-4">
            <p className="text-sm text-gray-600">Info</p>
            <p className="text-2xl font-bold text-blue-600">{auditLogs.filter(l => l.type === 'info').length}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border p-4">
            <p className="text-sm text-gray-600">Success</p>
            <p className="text-2xl font-bold text-green-600">{auditLogs.filter(l => l.type === 'success').length}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border p-4">
            <p className="text-sm text-gray-600">Warning</p>
            <p className="text-2xl font-bold text-yellow-600">{auditLogs.filter(l => l.type === 'warning').length}</p>
          </div>
        </div>

        {/* Logs List */}
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="p-4 border-b">
            <h3 className="font-semibold text-gray-900">Activity Log</h3>
          </div>
          <div className="max-h-[600px] overflow-y-auto">
            {filteredLogs.length === 0 ? (
              <div className="p-8 text-center text-gray-500">No logs to display</div>
            ) : (
              filteredLogs.map((log) => (
                <div key={log.id} className={`px-4 py-3 border-b border-l-4 ${
                  log.type === 'error' ? 'border-l-red-500 bg-red-50' :
                  log.type === 'warning' ? 'border-l-yellow-500 bg-yellow-50' :
                  log.type === 'success' ? 'border-l-green-500 bg-green-50' :
                  'border-l-blue-500 bg-blue-50'
                }`}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium mt-0.5 ${
                        log.type === 'error' ? 'bg-red-200 text-red-800' :
                        log.type === 'warning' ? 'bg-yellow-200 text-yellow-800' :
                        log.type === 'success' ? 'bg-green-200 text-green-800' :
                        'bg-blue-200 text-blue-800'
                      }`}>
                        {log.type.toUpperCase()}
                      </span>
                      <div>
                        <p className="text-gray-900">{log.message}</p>
                        {log.user && <p className="text-xs text-gray-500 mt-0.5">User: {log.user}</p>}
                      </div>
                    </div>
                    <span className="text-xs text-gray-500 flex-shrink-0 ml-4">{formatTimeAgo(log.time)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Delete Logs Confirmation Modal */}
        {showDeleteLogsModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <Trash2 className="w-5 h-5 text-red-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">Clear All Logs</h3>
              </div>
              <p className="text-gray-600 mb-6">Are you sure you want to delete all audit logs? This action cannot be undone. Consider exporting logs first.</p>
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowDeleteLogsModal(false)}
                  className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    setDeletingLogs(true);
                    try {
                      const res = await adminApi.deleteLogs();
                      toast.success(res.data.message);
                      setShowDeleteLogsModal(false);
                      loadLogs();
                    } catch { toast.error('Failed to delete logs'); }
                    finally { setDeletingLogs(false); }
                  }}
                  disabled={deletingLogs}
                  className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium disabled:opacity-50"
                >
                  {deletingLogs ? 'Deleting...' : 'Delete All Logs'}
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  };

  // Render Guest Accounts Management
  const renderGuestManagement = () => {
    const guests = guestAccounts.guests || [];
    return (
      <>
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Guest Accounts</h1>
            <p className="text-gray-600 mt-1">Monitor and manage temporary guest accounts</p>
          </div>
          <div className="flex items-center space-x-3 self-start">
            <button
              onClick={async () => { await loadGuestAccounts(); toast.info('Guest accounts refreshed'); }}
              className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 flex items-center space-x-2"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Refresh</span>
            </button>
            {guestAccounts.expired > 0 && (
              <button
                onClick={handleCleanupGuests}
                disabled={cleaningGuests}
                className="bg-red-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-700 transition flex items-center space-x-2 disabled:opacity-50"
              >
                <Trash2 className="w-5 h-5" />
                <span>{cleaningGuests ? 'Cleaning...' : `Delete ${guestAccounts.expired} Expired`}</span>
              </button>
            )}
          </div>
        </div>

        {/* Guest Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm border p-4">
            <p className="text-sm text-gray-600">Total Guests</p>
            <p className="text-2xl font-bold text-gray-900">{guestAccounts.total}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border p-4">
            <p className="text-sm text-gray-600">Active (not expired)</p>
            <p className="text-2xl font-bold text-green-600">{guestAccounts.total - guestAccounts.expired}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border p-4">
            <p className="text-sm text-gray-600">Expired</p>
            <p className="text-2xl font-bold text-red-600">{guestAccounts.expired}</p>
          </div>
        </div>

        {/* Info Banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 flex items-start space-x-3">
          <Clock className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-blue-900">Guest accounts expire after 30 days</p>
            <p className="text-sm text-blue-700 mt-0.5">
              Guest users are prompted to create a permanent account. Expired accounts and their boards
              can be deleted using the cleanup button above.
            </p>
          </div>
        </div>

        {/* Guest Accounts Table */}
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Username</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Created</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Expires</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Time Remaining</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Boards</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {guests.map((guest) => {
                  const isExpired = guest.is_expired;
                  const isUrgent = !isExpired && guest.days_remaining !== null && guest.days_remaining <= 7;
                  return (
                    <tr key={guest.id} className={`hover:bg-gray-50 ${isExpired ? 'bg-red-50' : ''}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center space-x-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-medium text-sm ${
                            isExpired ? 'bg-red-400' : 'bg-gray-400'
                          }`}>
                            G
                          </div>
                          <span className="font-medium text-gray-900">{guest.username}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {new Date(guest.date_joined).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {guest.guest_expires_at
                          ? new Date(guest.guest_expires_at).toLocaleDateString()
                          : 'No expiry set'
                        }
                      </td>
                      <td className="px-4 py-3">
                        {isExpired ? (
                          <span className="text-red-600 font-medium text-sm">Expired</span>
                        ) : guest.days_remaining !== null ? (
                          <div className="flex items-center space-x-2">
                            {isUrgent && <AlertTriangle className="w-4 h-4 text-amber-500" />}
                            <span className={`text-sm font-medium ${
                              isUrgent ? 'text-amber-600' : 'text-gray-700'
                            }`}>
                              {guest.days_remaining} day{guest.days_remaining !== 1 ? 's' : ''}
                            </span>
                            {/* Progress bar */}
                            <div className="w-20 bg-gray-200 rounded-full h-1.5">
                              <div
                                className={`h-1.5 rounded-full transition-all ${
                                  guest.days_remaining <= 3 ? 'bg-red-500' :
                                  guest.days_remaining <= 7 ? 'bg-amber-500' :
                                  'bg-green-500'
                                }`}
                                style={{ width: `${Math.min(100, (guest.days_remaining / 30) * 100)}%` }}
                              />
                            </div>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">N/A</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">{guest.boards_count}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          isExpired
                            ? 'bg-red-100 text-red-700'
                            : isUrgent
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-green-100 text-green-700'
                        }`}>
                          {isExpired ? 'Expired' : isUrgent ? 'Expiring Soon' : 'Active'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {guests.length === 0 && (
                  <tr>
                    <td colSpan="6" className="px-4 py-8 text-center text-gray-400">
                      No guest accounts found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="p-4 border-t">
            <p className="text-sm text-gray-600">Showing {guests.length} guest account{guests.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
      </>
    );
  };

  // Render content based on active menu
  const renderContent = () => {
    switch (activeMenu) {
      case 'dashboard': return renderDashboard();
      case 'users': return renderUserManagement();
      case 'guests': return renderGuestManagement();
      case 'storage': return renderStorageManagement();
      case 'settings': return renderSystemSettings();
      case 'logs': return renderLogs();
      default: return renderDashboard();
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
              <span className="px-2 py-1 bg-white bg-opacity-20 rounded text-xs font-medium">Admin</span>
            </div>
            <div className="flex items-center space-x-4">
              <button onClick={() => onNavigate('home')} className="hover:text-blue-200 transition">
                Exit Admin
              </button>
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
              {!sidebarCollapsed && (
                <div className="flex items-center space-x-2">
                  <Shield className="w-6 h-6 text-indigo-600" />
                  <h2 className="text-lg font-bold text-gray-900">Admin Panel</h2>
                </div>
              )}
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

      {/* User Modal */}
      {showUserModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900">
                  {showUserModal.mode === 'add' ? 'Add New User' : 'Edit User'}
                </h3>
                <button onClick={() => setShowUserModal(null)} className="p-1 hover:bg-gray-100 rounded">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              {userError && (
                <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{userError}</div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                  <input
                    type="text"
                    value={userForm.first_name}
                    onChange={(e) => setUserForm({...userForm, first_name: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                  <input
                    type="text"
                    value={userForm.last_name}
                    onChange={(e) => setUserForm({...userForm, last_name: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                <input
                  type="text"
                  value={userForm.username}
                  onChange={(e) => setUserForm({...userForm, username: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={userForm.email}
                  onChange={(e) => setUserForm({...userForm, email: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select
                  value={userForm.role}
                  onChange={(e) => setUserForm({...userForm, role: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="student">Student</option>
                  <option value="lecturer">Lecturer</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Storage Quota (GB)</label>
                <input
                  type="number"
                  min="0.1"
                  step="0.5"
                  value={userForm.storage_quota_gb}
                  onChange={(e) => setUserForm({...userForm, storage_quota_gb: parseFloat(e.target.value) || 5})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              {showUserModal.mode === 'add' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                  <input
                    type="password"
                    value={userForm.password}
                    onChange={(e) => setUserForm({...userForm, password: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="Set initial password"
                  />
                </div>
              )}
            </div>
            <div className="p-6 border-t flex space-x-3">
              <button
                onClick={() => setShowUserModal(null)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveUser}
                disabled={savingUser}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-medium disabled:opacity-50"
              >
                {savingUser ? 'Saving...' : (showUserModal.mode === 'add' ? 'Add User' : 'Save Changes')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete User Modal */}
      {/* Bulk Import Modal */}
      {showBulkImport && (
        <BulkImportModal
          showCourseSelector={false}
          onClose={() => setShowBulkImport(false)}
          onComplete={() => { setShowBulkImport(false); loadUsers(); }}
        />
      )}

      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-red-600">Delete User</h3>
              <button onClick={() => setShowDeleteModal(null)} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="flex items-center space-x-4 bg-red-50 p-4 rounded-lg mb-6">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-medium">
                {showDeleteModal.first_name && showDeleteModal.last_name
                  ? `${showDeleteModal.first_name[0]}${showDeleteModal.last_name[0]}`
                  : showDeleteModal.username?.[0]?.toUpperCase() || '?'}
              </div>
              <div>
                <p className="font-semibold text-gray-900">
                  {showDeleteModal.first_name && showDeleteModal.last_name
                    ? `${showDeleteModal.first_name} ${showDeleteModal.last_name}`
                    : showDeleteModal.username}
                </p>
                <p className="text-sm text-gray-500">{showDeleteModal.email}</p>
              </div>
            </div>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this user? This action cannot be undone and all associated data will be permanently removed.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowDeleteModal(null)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteUser}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium"
              >
                Delete User
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Modal */}
      {showBulkDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-backdropFade">
          <div className="bg-white rounded-xl w-full max-w-md p-6 animate-scaleIn">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-red-600">Delete {selectedUsers.size} Users</h3>
              <button onClick={() => setShowBulkDeleteModal(false)} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete <span className="font-semibold">{selectedUsers.size}</span> selected user{selectedUsers.size !== 1 ? 's' : ''}? This action cannot be undone and all associated data will be permanently removed.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowBulkDeleteModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkDelete}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium"
              >
                Delete {selectedUsers.size} Users
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminPage;
