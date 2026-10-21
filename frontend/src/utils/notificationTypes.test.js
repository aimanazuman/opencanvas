/**
 * Notification type mapping: every backend type resolves, unknown input falls back, every colour class is a
 * static literal from the approved hue families, and the touched pages carry no template-literal colour classes.
 */
import fs from 'fs';
import path from 'path';
import { NOTIFICATION_TYPES, DEFAULT_NOTIFICATION, getNotificationConfig } from './notificationTypes';

// Every type the backend can send (apps/accounts/models.py, Notification.TYPE_CHOICES).
const BACKEND_TYPES = [
  'board_shared',
  'course_enrolled',
  'system_announcement',
  'invite_accepted',
  'quota_changed',
  'storage_warning',
  'guest_account_expiry',
  'file_deleted',
];

const COLOUR_KEYS = ['iconClass', 'badge', 'bar', 'dot'];
// Static literal only: a family from the approved list, a shade from the scale, and text- or bg- prefix.
const ALLOWED_TOKEN = /^(?:text|bg)-(?:accent|teal|green|amber|orange|slate)-(?:50|100|400|500|600|700)$/;

const TOUCHED_FILES = [
  '../pages/NotificationsPage.jsx',
  '../components/NotificationDropdown.jsx',
  '../pages/ProfilePage.jsx',
  '../pages/SettingsPage.jsx',
  '../pages/JoinBoardPage.jsx',
  '../pages/JoinCoursePage.jsx',
];

describe('notification type mapping', () => {
  test.each(BACKEND_TYPES)('%s resolves to its own config with a label and an icon', (type) => {
    expect(Object.prototype.hasOwnProperty.call(NOTIFICATION_TYPES, type)).toBe(true);
    const config = getNotificationConfig(type);
    expect(config).toBe(NOTIFICATION_TYPES[type]);
    expect(config).not.toBe(DEFAULT_NOTIFICATION);
    expect(typeof config.label).toBe('string');
    expect(config.label.length).toBeGreaterThan(0);
    expect(config.icon).toBeTruthy();
  });

  test.each(['unknown_type', '', undefined, null, 'constructor', '__proto__', 'toString'])(
    'unknown input %p falls back to the default config',
    (type) => {
      expect(getNotificationConfig(type)).toBe(DEFAULT_NOTIFICATION);
    }
  );

  test('the map has no entries beyond the backend types', () => {
    expect(Object.keys(NOTIFICATION_TYPES).sort()).toEqual([...BACKEND_TYPES].sort());
  });

  test('every colour class is a static literal from the approved families', () => {
    const configs = [...Object.values(NOTIFICATION_TYPES), DEFAULT_NOTIFICATION];
    const violations = [];
    configs.forEach((config) => {
      COLOUR_KEYS.forEach((key) => {
        const value = config[key];
        expect(typeof value).toBe('string');
        if (value.includes('${') || /undefined|null/.test(value)) violations.push(`${key}: ${value}`);
        value.split(/\s+/).forEach((token) => {
          if (!ALLOWED_TOKEN.test(token)) violations.push(`${key}: ${token}`);
        });
      });
    });
    expect(violations).toEqual([]);
  });

  test('the touched pages contain no template-literal colour classes and no off-palette hues', () => {
    // The original bug: a colour prefix followed by an interpolation (text-${config.color}-500),
    // or an interpolated shade (${x}-500). A plain file name such as opencanvas-data-${user} is not a class.
    const dashedInterpolation = /\b(?:bg|text|border|ring|from|to|via|fill|stroke|outline)-\$\{|\$\{[^}]*\}-(?:50|100|200|300|400|500|600|700|800|900)\b/;
    const offPalette = /\b(?:bg|text|border|ring|from|to|via|outline|fill|stroke)-(?:red|yellow|blue|emerald|sky|cyan|purple|indigo|violet|pink|rose|fuchsia|magenta|lavender)-\d/i;
    const gradient = /\bbg-gradient-/;
    const findings = [];
    TOUCHED_FILES.forEach((rel) => {
      const file = path.join(__dirname, rel);
      fs.readFileSync(file, 'utf8').split('\n').forEach((line, i) => {
        if (dashedInterpolation.test(line) || offPalette.test(line) || gradient.test(line)) {
          findings.push(`${path.basename(file)}:${i + 1}: ${line.trim()}`);
        }
      });
    });
    expect(findings).toEqual([]);
  });
});
