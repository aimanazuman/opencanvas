import React, { useId, useState, useEffect } from 'react';
import { Bell, BookOpen, Users, Save } from 'lucide-react';
import { authApi } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import {
  ChalkboardHeader, ClassroomAlert, ClassroomButton, ClassroomField, PaperPanel,
} from '../../components/classroom';

// One switch row. The visible title and description are the switch's accessible name and description.
// The switch is a real checkbox; the track is its visual, and the whole track is the click target.
function SwitchRow({ label, description, checked, onChange }) {
  const id = useId();
  const labelId = `${id}-label`;
  const descId = `${id}-desc`;
  return (
    <div className="flex min-h-[44px] items-center justify-between gap-4 py-3">
      <div className="min-w-0">
        <p id={labelId} className="text-sm font-medium text-ink">{label}</p>
        <p id={descId} className="text-sm text-ink-2">{description}</p>
      </div>
      <label className="relative inline-flex min-h-[44px] min-w-[44px] flex-none cursor-pointer items-center justify-center">
        <input
          type="checkbox"
          checked={checked}
          onChange={onChange}
          aria-labelledby={labelId}
          aria-describedby={descId}
          className="peer sr-only"
        />
        <span
          aria-hidden="true"
          className="relative inline-block h-6 w-11 rounded-full bg-gray-300 transition-colors duration-150 peer-checked:bg-accent-600 peer-focus-visible:ring-2 peer-focus-visible:ring-accent peer-focus-visible:ring-offset-2 after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:border after:border-line-strong after:bg-white after:transition-transform after:content-[''] peer-checked:after:translate-x-5 peer-checked:after:border-white"
        />
      </label>
    </div>
  );
}

export default function LecturerSettingsPage() {
  const { user } = useAuth();
  const [saved, setSaved] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
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

  const set = (key, value) => setSettings(prev => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    setSaveFailed(false);
    try {
      await authApi.updateProfile({ preferences: settings });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error('Failed to save settings:', err);
      setSaveFailed(true);
    }
  };

  return (
    <>
      <ChalkboardHeader
        size="compact"
        title="Settings"
        subtitle="Manage your preferences and course settings"
      />

      <form
        className="mt-6 space-y-6"
        onSubmit={(e) => { e.preventDefault(); handleSave(); }}
      >
        <PaperPanel as="section" aria-labelledby="settings-notifications" tone="white" padded={false} className="p-4 md:p-5">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-accent-700" strokeWidth={1.5} aria-hidden="true" />
            <h2 id="settings-notifications" className="text-base font-semibold text-ink">Notifications</h2>
          </div>
          <div className="mt-2 divide-y divide-line">
            <SwitchRow
              label="Email Notifications"
              description="Receive updates via email"
              checked={settings.emailNotifications}
              onChange={(e) => set('emailNotifications', e.target.checked)}
            />
            <SwitchRow
              label="Board Activity Alerts"
              description="Get notified about board activity"
              checked={settings.boardActivityAlerts}
              onChange={(e) => set('boardActivityAlerts', e.target.checked)}
            />
            <SwitchRow
              label="Weekly Reports"
              description="Receive weekly summary of student activities"
              checked={settings.weeklyReports}
              onChange={(e) => set('weeklyReports', e.target.checked)}
            />
          </div>
        </PaperPanel>

        <PaperPanel as="section" aria-labelledby="settings-course" tone="white" padded={false} className="p-4 md:p-5">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-teal-700" strokeWidth={1.5} aria-hidden="true" />
            <h2 id="settings-course" className="text-base font-semibold text-ink">Course Settings</h2>
          </div>
          <div className="mt-4 space-y-4">
            <ClassroomField
              as="select"
              label="Default Board Visibility"
              hint="Who can see new boards by default"
              value={settings.defaultBoardVisibility}
              onChange={(e) => set('defaultBoardVisibility', e.target.value)}
            >
              <option value="students">Students Only</option>
              <option value="section">Section Only</option>
              <option value="course">Entire Course</option>
            </ClassroomField>
            <div className="divide-y divide-line">
              <SwitchRow
                label="Allow Student Comments"
                description="Let students comment on boards"
                checked={settings.allowStudentComments}
                onChange={(e) => set('allowStudentComments', e.target.checked)}
              />
            </div>
          </div>
        </PaperPanel>

        <PaperPanel as="section" aria-labelledby="settings-profile" tone="white" padded={false} className="p-4 md:p-5">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-green-700" strokeWidth={1.5} aria-hidden="true" />
            <h2 id="settings-profile" className="text-base font-semibold text-ink">Profile Settings</h2>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-6 md:grid-cols-2">
            <ClassroomField
              type="email"
              label="Contact Email"
              autoComplete="email"
              value={settings.contactEmail}
              onChange={(e) => set('contactEmail', e.target.value)}
            />
            <ClassroomField
              type="text"
              label="Office Hours"
              placeholder="e.g., Mon, Wed 2:00 PM - 4:00 PM"
              value={settings.officeHours}
              onChange={(e) => set('officeHours', e.target.value)}
            />
          </div>
        </PaperPanel>

        <div className="space-y-3">
          {saved && <ClassroomAlert tone="success">Settings saved successfully!</ClassroomAlert>}
          {saveFailed && <ClassroomAlert tone="danger">Could not save your settings. Try again.</ClassroomAlert>}
          <div className="flex justify-end">
            <ClassroomButton type="submit" variant="primary" icon={Save}>Save All Settings</ClassroomButton>
          </div>
        </div>
      </form>
    </>
  );
}
