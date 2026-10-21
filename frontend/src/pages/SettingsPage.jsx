import React, { useState, useEffect } from 'react';
import { Bell, Lock, Palette, Globe, Download, Trash2, Eye, EyeOff, AlertTriangle } from 'lucide-react';
import Navigation from '../components/Navigation';
import { useAuth } from '../contexts/AuthContext';
import { authApi } from '../services/api';
import {
  ClassroomShell, ChalkboardHeader, ClassroomAlert, ClassroomButton, ClassroomDialog, ClassroomField, PaperPanel,
} from '../components/classroom';
import cx from '../components/classroom/cx';

/** One settings section: a white panel with a heading. */
function Section({ id, icon: Icon, title, titleClassName = 'text-ink', children }) {
  return (
    <PaperPanel as="section" tone="white" padded={false} aria-labelledby={id} className="p-4 md:p-6">
      <h2 id={id} className={cx('mb-3 flex items-center gap-2 text-lg font-semibold', titleClassName)}>
        <Icon className="h-4 w-4 flex-none" strokeWidth={1.5} aria-hidden="true" />
        <span>{title}</span>
      </h2>
      {children}
    </PaperPanel>
  );
}

/**
 * Switch row. The whole row is the label, so the name is the text and the hit area is at least 44 px.
 * The track is a sibling of the checkbox so the peer selectors can style it.
 */
function ToggleRow({ id, title, description, checked, onChange }) {
  return (
    <label className="flex min-h-[44px] cursor-pointer items-center justify-between gap-4 border-t border-line py-3">
      <span className="min-w-0">
        <span className="block text-sm font-medium text-ink">{title}</span>
        <span className="block text-xs text-ink-2">{description}</span>
      </span>
      <span className="relative flex h-11 w-11 flex-none items-center justify-center md:h-8">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={onChange}
          className="peer sr-only"
        />
        <span
          aria-hidden="true"
          className={cx(
            'relative h-6 w-11 rounded-full border border-line-strong bg-surface-hover transition-colors duration-150 ease-ui',
            'after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-line-strong after:bg-surface after:transition-transform after:duration-150 after:content-[""]',
            'peer-checked:border-accent peer-checked:bg-accent peer-checked:after:translate-x-5 peer-checked:after:border-accent',
            'peer-focus-visible:ring-2 peer-focus-visible:ring-accent peer-focus-visible:ring-offset-2',
            'motion-reduce:transition-none motion-reduce:after:transition-none'
          )}
        />
      </span>
    </label>
  );
}

/** Password input with a show and hide control inside the field. */
function PasswordField({ id, label, value, onChange, visible, onToggle, hint, autoComplete }) {
  return (
    <ClassroomField
      id={id}
      label={label}
      type={visible ? 'text' : 'password'}
      value={value}
      onChange={onChange}
      autoComplete={autoComplete}
      hint={hint}
      controlClassName="pr-12"
      endAdornment={(
        <button
          type="button"
          onClick={onToggle}
          aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
          aria-controls={id}
          className="absolute inset-y-0 right-0 inline-flex w-11 items-center justify-center rounded text-ink-2 hover:text-ink"
        >
          {visible ? <EyeOff className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" /> : <Eye className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />}
        </button>
      )}
    />
  );
}

/** Modal panel on the shared ClassroomDialog: white, focus moves in, Tab stays inside, Escape closes, focus returns. */
function Dialog({ titleId, title, titleClassName = 'text-ink', onClose, children, footer }) {
  return (
    <ClassroomDialog
      titleId={titleId}
      title={title}
      titleClassName={titleClassName}
      onClose={onClose}
      closeLabel="Close"
      size="md"
      footer={footer}
    >
      {children}
    </ClassroomDialog>
  );
}

const SettingsPage = ({ onNavigate }) => {
  const { user, logout } = useAuth();
  const [settings, setSettings] = useState({
    emailNotifications: true,
    pushNotifications: false,
    theme: 'light',
    language: 'en'
  });
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // Load preferences from user data
  useEffect(() => {
    if (user?.preferences) {
      setSettings(prev => ({
        ...prev,
        ...user.preferences,
      }));
    }
  }, [user]);

  const handleSaveSettings = async () => {
    try {
      await authApi.updateProfile({ preferences: settings });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to save settings:', err);
    }
  };

  const handlePasswordChange = async () => {
    setPasswordError('');
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }
    if (passwordData.newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters');
      return;
    }
    try {
      const res = await authApi.changePassword({
        old_password: passwordData.currentPassword,
        new_password: passwordData.newPassword,
        new_password2: passwordData.confirmPassword,
      });
      // Changing the password revokes every refresh token; the server returns fresh ones for this browser.
      if (res.data?.tokens?.access && res.data?.tokens?.refresh) {
        localStorage.setItem('access_token', res.data.tokens.access);
        localStorage.setItem('refresh_token', res.data.tokens.refresh);
      }
      setShowPasswordModal(false);
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      const errorData = err.response?.data;
      if (errorData?.old_password) {
        setPasswordError(Array.isArray(errorData.old_password) ? errorData.old_password[0] : errorData.old_password);
      } else if (errorData?.new_password) {
        setPasswordError(Array.isArray(errorData.new_password) ? errorData.new_password[0] : errorData.new_password);
      } else {
        setPasswordError('Failed to change password');
      }
    }
  };

  const handleExportData = async () => {
    setShowExportModal(false);
    try {
      const response = await authApi.exportData();
      const dataStr = JSON.stringify(response.data, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `opencanvas-data-${user?.username || 'export'}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export data:', err);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') return;
    try {
      await authApi.deleteAccount();
      setShowDeleteModal(false);
      if (logout) logout();
      onNavigate('home');
    } catch (err) {
      console.error('Failed to delete account:', err);
    }
  };

  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setDeleteConfirmText('');
  };

  return (
    <ClassroomShell>
      <Navigation onNavigate={onNavigate} />
      <main aria-labelledby="settings-title" className="mx-auto max-w-4xl space-y-6 px-4 py-8">
        <ChalkboardHeader size="compact" titleId="settings-title" title="Settings" />

        {saveSuccess && <ClassroomAlert tone="success">Settings saved successfully!</ClassroomAlert>}

        <Section id="settings-notifications" icon={Bell} title="Notifications">
          <ToggleRow
            id="settings-email-notifications"
            title="Email Notifications"
            description="Receive updates via email"
            checked={settings.emailNotifications}
            onChange={(e) => setSettings({...settings, emailNotifications: e.target.checked})}
          />
          <ToggleRow
            id="settings-push-notifications"
            title="Push Notifications"
            description="Receive browser notifications"
            checked={settings.pushNotifications}
            onChange={(e) => setSettings({...settings, pushNotifications: e.target.checked})}
          />
        </Section>

        <Section id="settings-appearance" icon={Palette} title="Appearance">
          <ClassroomField
            id="settings-theme"
            as="select"
            label="Theme"
            value={settings.theme}
            onChange={(e) => setSettings({...settings, theme: e.target.value})}
          >
            <option value="light">Light</option>
            <option value="dark">Dark</option>
            <option value="auto">Auto</option>
          </ClassroomField>
        </Section>

        <Section id="settings-privacy" icon={Lock} title="Privacy & Security">
          <div className="grid gap-3 sm:grid-cols-2">
            <ClassroomButton variant="secondary" icon={Lock} className="w-full" onClick={() => setShowPasswordModal(true)}>
              Change Password
            </ClassroomButton>
            <ClassroomButton variant="secondary" icon={Download} className="w-full" onClick={() => setShowExportModal(true)}>
              Export My Data
            </ClassroomButton>
          </div>
        </Section>

        <Section id="settings-language" icon={Globe} title="Language">
          <ClassroomField
            id="settings-language-select"
            as="select"
            label="Language"
            value={settings.language}
            onChange={(e) => setSettings({...settings, language: e.target.value})}
          >
            <option value="en">English</option>
            <option value="ms">Bahasa Melayu</option>
          </ClassroomField>
        </Section>

        <Section id="settings-danger" icon={AlertTriangle} title="Danger Zone" titleClassName="text-danger">
          <p className="mb-4 text-sm text-ink-2">
            Once you delete your account, there is no going back. Please be certain.
          </p>
          <ClassroomButton variant="danger" icon={Trash2} onClick={() => setShowDeleteModal(true)}>
            Delete Account
          </ClassroomButton>
        </Section>

        <div className="flex justify-end">
          <ClassroomButton variant="primary" onClick={handleSaveSettings}>
            Save All Changes
          </ClassroomButton>
        </div>
      </main>

      {/* Password Change Modal */}
      {showPasswordModal && (
        <Dialog
          titleId="settings-password-title"
          title="Change Password"
          onClose={() => setShowPasswordModal(false)}
          footer={(
            <>
              <ClassroomButton variant="secondary" onClick={() => { setShowPasswordModal(false); setPasswordError(''); }}>
                Cancel
              </ClassroomButton>
              <ClassroomButton variant="primary" onClick={handlePasswordChange}>
                Update Password
              </ClassroomButton>
            </>
          )}
        >
          <PasswordField
            id="settings-current-password"
            label="Current Password"
            autoComplete="current-password"
            value={passwordData.currentPassword}
            onChange={(e) => setPasswordData({...passwordData, currentPassword: e.target.value})}
            visible={showPasswords.current}
            onToggle={() => setShowPasswords({...showPasswords, current: !showPasswords.current})}
          />
          <PasswordField
            id="settings-new-password"
            label="New Password"
            autoComplete="new-password"
            hint="Must be at least 8 characters"
            value={passwordData.newPassword}
            onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
            visible={showPasswords.new}
            onToggle={() => setShowPasswords({...showPasswords, new: !showPasswords.new})}
          />
          <PasswordField
            id="settings-confirm-password"
            label="Confirm New Password"
            autoComplete="new-password"
            value={passwordData.confirmPassword}
            onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
            visible={showPasswords.confirm}
            onToggle={() => setShowPasswords({...showPasswords, confirm: !showPasswords.confirm})}
          />
          {passwordError && <ClassroomAlert>{passwordError}</ClassroomAlert>}
        </Dialog>
      )}

      {/* Export Data Modal */}
      {showExportModal && (
        <Dialog
          titleId="settings-export-title"
          title="Export My Data"
          onClose={() => setShowExportModal(false)}
          footer={(
            <>
              <ClassroomButton variant="secondary" onClick={() => setShowExportModal(false)}>
                Cancel
              </ClassroomButton>
              <ClassroomButton variant="primary" icon={Download} onClick={handleExportData}>
                Download JSON
              </ClassroomButton>
            </>
          )}
        >
          <p className="text-sm text-ink-2">
            Export all your data including boards, settings, and enrollments as a JSON file.
          </p>
        </Dialog>
      )}

      {/* Delete Account Modal */}
      {showDeleteModal && (
        <Dialog
          titleId="settings-delete-title"
          title="Delete Account"
          titleClassName="text-danger"
          onClose={closeDeleteModal}
          footer={(
            <>
              <ClassroomButton variant="secondary" onClick={closeDeleteModal}>
                Cancel
              </ClassroomButton>
              <ClassroomButton
                variant="danger"
                icon={Trash2}
                disabled={deleteConfirmText !== 'DELETE'}
                onClick={handleDeleteAccount}
              >
                Delete Account
              </ClassroomButton>
            </>
          )}
        >
          <ClassroomAlert>
            <strong className="font-semibold">Warning:</strong> This action cannot be undone. All your boards, files, and data will be permanently deleted.
          </ClassroomAlert>
          <ClassroomField
            id="settings-delete-confirm"
            label="Type DELETE to confirm"
            autoComplete="off"
            value={deleteConfirmText}
            onChange={(e) => setDeleteConfirmText(e.target.value)}
          />
        </Dialog>
      )}
    </ClassroomShell>
  );
};

export default SettingsPage;
