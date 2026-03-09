import React, { useState, useEffect } from 'react';
import { Bell, BookOpen, Users, Save, CheckCircle } from 'lucide-react';
import { authApi } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

export default function LecturerSettingsPage() {
  const { user } = useAuth();
  const [saved, setSaved] = useState(false);
  const [settings, setSettings] = useState({
    emailNotifications: true,
    boardActivityAlerts: true,
    weeklyReports: true,
    defaultBoardVisibility: 'students',
    allowStudentComments: true,
    officeHours: '',
    contactEmail: '',
  });

  useEffect(() => {
    if (user) {
      setSettings(prev => ({ ...prev, contactEmail: user.email || '' }));
    }
  }, [user]);

  const handleSave = async () => {
    try {
      await authApi.updateProfile({ preferences: settings });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error('Failed to save settings:', err);
    }
  };

  const Toggle = ({ checked, onChange }) => (
    <label className="relative inline-flex items-center cursor-pointer">
      <input type="checkbox" checked={checked} onChange={onChange} className="sr-only peer" />
      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600" />
    </label>
  );

  return (
    <>
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600 mt-1">Manage your preferences and course settings</p>
        </div>
        {saved && (
          <div className="flex items-center space-x-2 bg-green-100 text-green-700 px-4 py-2 rounded-lg">
            <CheckCircle className="w-5 h-5" /><span>Settings saved successfully!</span>
          </div>
        )}
      </div>

      <div className="space-y-6">
        {/* Notifications */}
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
              <Toggle checked={settings.emailNotifications} onChange={e => setSettings({...settings, emailNotifications: e.target.checked})} />
            </div>
            <div className="flex items-center justify-between py-3 border-b">
              <div>
                <p className="font-medium text-gray-900">Board Activity Alerts</p>
                <p className="text-sm text-gray-500">Get notified about board activity</p>
              </div>
              <Toggle checked={settings.boardActivityAlerts} onChange={e => setSettings({...settings, boardActivityAlerts: e.target.checked})} />
            </div>
            <div className="flex items-center justify-between py-3">
              <div>
                <p className="font-medium text-gray-900">Weekly Reports</p>
                <p className="text-sm text-gray-500">Receive weekly summary of student activities</p>
              </div>
              <Toggle checked={settings.weeklyReports} onChange={e => setSettings({...settings, weeklyReports: e.target.checked})} />
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
                value={settings.defaultBoardVisibility}
                onChange={e => setSettings({...settings, defaultBoardVisibility: e.target.value})}
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
              <Toggle checked={settings.allowStudentComments} onChange={e => setSettings({...settings, allowStudentComments: e.target.checked})} />
            </div>
          </div>
        </div>

        {/* Profile */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center space-x-3 mb-6">
            <Users className="w-6 h-6 text-green-600" />
            <h2 className="text-xl font-bold text-gray-900">Profile Settings</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Contact Email</label>
              <input
                type="email" value={settings.contactEmail}
                onChange={e => setSettings({...settings, contactEmail: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Office Hours</label>
              <input
                type="text" value={settings.officeHours}
                onChange={e => setSettings({...settings, officeHours: e.target.value})}
                placeholder="e.g., Mon, Wed 2:00 PM - 4:00 PM"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            onClick={handleSave}
            className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-3 rounded-lg font-semibold hover:shadow-lg transition flex items-center space-x-2"
          >
            <Save className="w-5 h-5" /><span>Save All Settings</span>
          </button>
        </div>
      </div>
    </>
  );
}
