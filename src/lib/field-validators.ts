/**
 * Field validator definitions for chat widget FieldInputWidget.
 * Exported so they can be tested independently from the React component.
 */

export type FieldType =
  | 'text' | 'email' | 'phone' | 'number' | 'url' | 'cron' | 'date'
  | 'textarea' | 'password' | 'integer' | 'percentage' | 'port' | 'currency'
  | 'time' | 'datetime' | 'timezone' | 'duration'
  | 'uuid' | 'ip-address' | 'json' | 'slug' | 'regex' | 'template' | 'jwt'
  | 'color' | 'csv-emails' | 'country-code';

export const VALIDATORS: Record<FieldType, (v: string) => string | null> = {
  text:         () => null,
  textarea:     () => null,
  password:     () => null,
  template:     () => null,
  color:        v => /^#[0-9a-f]{6}$/i.test(v.trim()) ? null : 'Must be a hex color (#RRGGBB)',
  number:       v => /^-?\d+(\.\d+)?$/.test(v.trim()) ? null : 'Must be a valid number',
  integer:      v => /^-?\d+$/.test(v.trim()) ? null : 'Must be a whole number',
  percentage:   v => { const n = parseFloat(v); return (!isNaN(n) && n >= 0 && n <= 100) ? null : 'Must be 0–100'; },
  port:         v => { const n = parseInt(v); return (!isNaN(n) && n >= 1 && n <= 65535) ? null : 'Must be a port number (1–65535)'; },
  currency:     v => /^\d+(\.\d{1,2})?$/.test(v.trim()) ? null : 'Must be a monetary value (e.g. 9.99)',
  email:        v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) ? null : 'Must be a valid email address',
  'csv-emails': v => v.split(',').map(e => e.trim()).every(e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) ? null : 'Must be comma-separated valid email addresses',
  phone:        v => /^\+?[\d\s\-().]{7,}$/.test(v.trim()) ? null : 'Must be a valid phone number',
  url:          v => { try { new URL(v.trim()); return null; } catch { return 'Must be a valid URL (include https://)'; } },
  cron:         v => /^(\S+\s){4}\S+$/.test(v.trim()) ? null : 'Must be a valid cron expression (5 fields)',
  date:         v => isNaN(Date.parse(v.trim())) ? 'Must be a valid date' : null,
  time:         v => /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(v.trim()) ? null : 'Must be a time (HH:MM)',
  datetime:     v => isNaN(Date.parse(v.trim())) ? 'Must be a valid date and time' : null,
  timezone:     v => { try { new Intl.DateTimeFormat(undefined, { timeZone: v.trim() }); return null; } catch { return 'Must be a valid IANA timezone (e.g. America/New_York)'; } },
  duration:     v => /^(\d+\s*[dhms]\s*)+$/i.test(v.trim()) ? null : 'Must be a duration (e.g. 5m, 2h30m, 1d)',
  uuid:         v => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v.trim()) ? null : 'Must be a valid UUID',
  'ip-address': v => {
    const s = v.trim();
    const ipv4 = /^((25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(25[0-5]|2[0-4]\d|[01]?\d\d?)$/;
    const ipv6 = /^([0-9a-f]{1,4}:){1,7}[0-9a-f]{0,4}$/i;
    return ipv4.test(s) || ipv6.test(s) ? null : 'Must be a valid IPv4 or IPv6 address';
  },
  json:         v => { try { JSON.parse(v.trim()); return null; } catch { return 'Must be valid JSON'; } },
  slug:         v => /^[a-z0-9]+(-[a-z0-9]+)*$/.test(v.trim()) ? null : 'Must be a slug (lowercase letters, numbers, hyphens)',
  regex:        v => { try { new RegExp(v.trim()); return null; } catch { return 'Must be a valid regular expression'; } },
  jwt:          v => /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(v.trim()) ? null : 'Must be a valid JWT (three base64url parts)',
  'country-code': v => /^[A-Z]{2}$/.test(v.trim()) ? null : 'Must be a 2-letter ISO country code (e.g. US)',
};

export const HTML_TYPE: Record<FieldType, string> = {
  text: 'text', textarea: 'textarea', password: 'password', color: 'color',
  email: 'email', phone: 'tel', number: 'number', integer: 'number',
  percentage: 'number', port: 'number', currency: 'text',
  url: 'url', cron: 'text', date: 'date', time: 'time', datetime: 'datetime-local',
  timezone: 'text', duration: 'text', uuid: 'text', 'ip-address': 'text',
  json: 'textarea', slug: 'text', regex: 'text', template: 'textarea',
  jwt: 'text', 'csv-emails': 'textarea', 'country-code': 'text',
};

export const TEXTAREA_TYPES = new Set<FieldType>(['textarea', 'json', 'template', 'csv-emails']);
