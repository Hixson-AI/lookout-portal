import { describe, it, expect } from 'vitest';
import { VALIDATORS, HTML_TYPE, TEXTAREA_TYPES } from '../lib/field-validators';
import type { FieldType } from '../lib/field-validators';

// Helper: assert valid input returns null, invalid input returns a string
function valid(type: FieldType, value: string) {
  expect(VALIDATORS[type](value)).toBeNull();
}
function invalid(type: FieldType, value: string) {
  expect(VALIDATORS[type](value)).toBeTypeOf('string');
}

// ── Always-valid types ────────────────────────────────────────────────────

describe('text / textarea / password / template', () => {
  it.each(['text', 'textarea', 'password', 'template'] as FieldType[])(
    '%s accepts any value',
    type => {
      valid(type, '');
      valid(type, 'hello world');
      valid(type, '{{variable}}');
      valid(type, '   spaces   ');
    },
  );
});

// ── Email ─────────────────────────────────────────────────────────────────

describe('email', () => {
  it('accepts valid emails', () => {
    valid('email', 'user@example.com');
    valid('email', 'user+tag@subdomain.example.co.uk');
    valid('email', 'a@b.io');
  });
  it('rejects invalid emails', () => {
    invalid('email', 'notanemail');
    invalid('email', '@missing.com');
    invalid('email', 'missing@');
    invalid('email', 'no spaces@allowed.com');
  });
});

// ── csv-emails ────────────────────────────────────────────────────────────

describe('csv-emails', () => {
  it('accepts single and multiple valid emails', () => {
    valid('csv-emails', 'a@b.com');
    valid('csv-emails', 'a@b.com,c@d.com');
    valid('csv-emails', 'a@b.com, c@d.com, e@f.com');
  });
  it('rejects lists containing any invalid email', () => {
    invalid('csv-emails', 'a@b.com,invalid');
    invalid('csv-emails', 'bad,a@b.com');
    invalid('csv-emails', 'notanemail');
  });
});

// ── Phone ─────────────────────────────────────────────────────────────────

describe('phone', () => {
  it('accepts valid phone formats', () => {
    valid('phone', '+12025551234');
    valid('phone', '(555) 123-4567');
    valid('phone', '+44 20 7946 0958');
    valid('phone', '555-867-5309');
  });
  it('rejects too-short or non-phone values', () => {
    invalid('phone', '123');
    invalid('phone', 'call me');
  });
});

// ── URL ───────────────────────────────────────────────────────────────────

describe('url', () => {
  it('accepts valid URLs with scheme', () => {
    valid('url', 'https://example.com');
    valid('url', 'http://localhost:3000');
    valid('url', 'https://api.example.com/v1/path?q=1');
  });
  it('rejects URLs without scheme', () => {
    invalid('url', 'example.com');
    invalid('url', 'notaurl');
  });
});

// ── Number ────────────────────────────────────────────────────────────────

describe('number', () => {
  it('accepts integers and decimals', () => {
    valid('number', '42');
    valid('number', '-3.14');
    valid('number', '0');
    valid('number', '1000000');
  });
  it('rejects non-numeric strings', () => {
    invalid('number', 'abc');
    invalid('number', '1.2.3');
    invalid('number', '');
  });
});

// ── Integer ───────────────────────────────────────────────────────────────

describe('integer', () => {
  it('accepts whole numbers', () => {
    valid('integer', '0');
    valid('integer', '42');
    valid('integer', '-10');
  });
  it('rejects decimals and non-numeric', () => {
    invalid('integer', '3.14');
    invalid('integer', 'abc');
    invalid('integer', '1e5');
  });
});

// ── Percentage ────────────────────────────────────────────────────────────

describe('percentage', () => {
  it('accepts 0 to 100', () => {
    valid('percentage', '0');
    valid('percentage', '50');
    valid('percentage', '100');
    valid('percentage', '99.9');
  });
  it('rejects out-of-range values', () => {
    invalid('percentage', '-1');
    invalid('percentage', '101');
    invalid('percentage', 'abc');
  });
});

// ── Port ─────────────────────────────────────────────────────────────────

describe('port', () => {
  it('accepts valid port numbers', () => {
    valid('port', '80');
    valid('port', '443');
    valid('port', '3000');
    valid('port', '65535');
  });
  it('rejects 0, out-of-range, and non-numeric', () => {
    invalid('port', '0');
    invalid('port', '65536');
    invalid('port', 'abc');
    invalid('port', '-1');
  });
});

// ── Currency ──────────────────────────────────────────────────────────────

describe('currency', () => {
  it('accepts valid monetary values', () => {
    valid('currency', '10');
    valid('currency', '9.99');
    valid('currency', '0.50');
    valid('currency', '1000');
  });
  it('rejects negative, 3 decimals, and non-numeric', () => {
    invalid('currency', '-5');
    invalid('currency', '1.234');
    invalid('currency', 'abc');
  });
});

// ── Cron ──────────────────────────────────────────────────────────────────

describe('cron', () => {
  it('accepts 5-field cron expressions', () => {
    valid('cron', '0 9 * * 1');
    valid('cron', '*/5 * * * *');
    valid('cron', '0 0 1 * *');
  });
  it('rejects wrong field count', () => {
    invalid('cron', '* * * *');
    invalid('cron', '0 9 * * 1 extra');
    invalid('cron', 'every monday');
  });
});

// ── Date ─────────────────────────────────────────────────────────────────

describe('date', () => {
  it('accepts parseable date strings', () => {
    valid('date', '2026-01-15');
    valid('date', 'January 15, 2026');
    valid('date', '2026/04/20');
  });
  it('rejects unparseable values', () => {
    invalid('date', 'notadate');
    invalid('date', '32/13/2026');
  });
});

// ── Time ─────────────────────────────────────────────────────────────────

describe('time', () => {
  it('accepts HH:MM and HH:MM:SS', () => {
    valid('time', '09:30');
    valid('time', '23:59');
    valid('time', '00:00:00');
    valid('time', '23:59:59');
  });
  it('rejects invalid formats', () => {
    invalid('time', '9:30');
    invalid('time', '25:00');
    invalid('time', '99:99');
    invalid('time', 'noon');
  });
});

// ── Datetime ─────────────────────────────────────────────────────────────

describe('datetime', () => {
  it('accepts ISO datetime strings', () => {
    valid('datetime', '2026-01-15T09:30:00');
    valid('datetime', '2026-04-20T00:00:00Z');
  });
  it('rejects non-datetime values', () => {
    invalid('datetime', 'not a datetime');
    invalid('datetime', '');
  });
});

// ── Timezone ─────────────────────────────────────────────────────────────

describe('timezone', () => {
  it('accepts valid IANA timezone strings', () => {
    valid('timezone', 'America/New_York');
    valid('timezone', 'UTC');
    valid('timezone', 'Europe/London');
    valid('timezone', 'Asia/Tokyo');
  });
  it('rejects invalid timezones', () => {
    invalid('timezone', 'Invalid/Timezone');
    invalid('timezone', 'NotReal');
    invalid('timezone', 'Moon/Base_Alpha');
  });
});

// ── Duration ─────────────────────────────────────────────────────────────

describe('duration', () => {
  it('accepts single and compound durations', () => {
    valid('duration', '5m');
    valid('duration', '2h');
    valid('duration', '1d');
    valid('duration', '30s');
    valid('duration', '2h30m');
    valid('duration', '1d4h30m');
  });
  it('rejects plain numbers and full words', () => {
    invalid('duration', '5');
    invalid('duration', '2hours');
    invalid('duration', 'abc');
  });
});

// ── UUID ─────────────────────────────────────────────────────────────────

describe('uuid', () => {
  it('accepts valid UUID v4', () => {
    valid('uuid', '550e8400-e29b-41d4-a716-446655440000');
    valid('uuid', '00000000-0000-0000-0000-000000000000');
    valid('uuid', 'A0EEBC99-9C0B-4EF8-BB6D-6BB9BD380A11');
  });
  it('rejects malformed UUIDs', () => {
    invalid('uuid', 'notauuid');
    invalid('uuid', '550e8400-e29b-41d4-a716');
    invalid('uuid', '550e8400e29b41d4a716446655440000');
  });
});

// ── IP Address ────────────────────────────────────────────────────────────

describe('ip-address', () => {
  it('accepts valid IPv4 addresses', () => {
    valid('ip-address', '192.168.1.1');
    valid('ip-address', '10.0.0.1');
    valid('ip-address', '127.0.0.1');
  });
  it('rejects non-IP values', () => {
    invalid('ip-address', 'example.com');
    invalid('ip-address', 'not-an-ip');
    invalid('ip-address', '999.999.999.999');
  });
});

// ── JSON ─────────────────────────────────────────────────────────────────

describe('json', () => {
  it('accepts valid JSON values', () => {
    valid('json', '{}');
    valid('json', '[]');
    valid('json', '{"key": "value"}');
    valid('json', '"string"');
    valid('json', '42');
    valid('json', 'null');
    valid('json', 'true');
  });
  it('rejects invalid JSON', () => {
    invalid('json', '{invalid}');
    invalid('json', 'undefined');
    invalid('json', '{key: value}');
    invalid('json', '');
  });
});

// ── Slug ─────────────────────────────────────────────────────────────────

describe('slug', () => {
  it('accepts valid slugs', () => {
    valid('slug', 'my-slug');
    valid('slug', 'hello-world');
    valid('slug', 'abc123');
    valid('slug', 'a');
  });
  it('rejects uppercase, spaces, leading/trailing hyphens', () => {
    invalid('slug', 'My-Slug');
    invalid('slug', 'has space');
    invalid('slug', '-leading');
    invalid('slug', 'trailing-');
    invalid('slug', 'double--hyphen');
  });
});

// ── Regex ─────────────────────────────────────────────────────────────────

describe('regex', () => {
  it('accepts valid regex patterns', () => {
    valid('regex', '^\\d+$');
    valid('regex', '.*');
    valid('regex', '[a-z]+');
    valid('regex', '(?:foo|bar)');
  });
  it('rejects invalid regex patterns', () => {
    invalid('regex', '[invalid');
    invalid('regex', '(?<');
    invalid('regex', '\\');
  });
});

// ── JWT ───────────────────────────────────────────────────────────────────

describe('jwt', () => {
  it('accepts three-part base64url tokens', () => {
    valid('jwt', 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0In0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c');
    valid('jwt', 'aaa.bbb.ccc');
  });
  it('rejects tokens with wrong number of parts', () => {
    invalid('jwt', 'onlyone');
    invalid('jwt', 'not.enough');
    invalid('jwt', 'too.many.parts.here.wow');
  });
});

// ── Color ─────────────────────────────────────────────────────────────────

describe('color', () => {
  it('accepts 6-digit hex colors with hash', () => {
    valid('color', '#ff0000');
    valid('color', '#AABBCC');
    valid('color', '#000000');
    valid('color', '#ffffff');
  });
  it('rejects invalid color formats', () => {
    invalid('color', 'ff0000');
    invalid('color', '#fffff');
    invalid('color', '#ggg000');
    invalid('color', 'red');
  });
});

// ── Country Code ──────────────────────────────────────────────────────────

describe('country-code', () => {
  it('accepts 2-letter uppercase ISO codes', () => {
    valid('country-code', 'US');
    valid('country-code', 'GB');
    valid('country-code', 'DE');
    valid('country-code', 'AU');
  });
  it('rejects 3-letter, lowercase, and numeric', () => {
    invalid('country-code', 'USA');
    invalid('country-code', 'us');
    invalid('country-code', '12');
    invalid('country-code', 'U');
  });
});

// ── HTML_TYPE mapping ─────────────────────────────────────────────────────

describe('HTML_TYPE', () => {
  it('maps email to email input type', () => expect(HTML_TYPE.email).toBe('email'));
  it('maps phone to tel input type', () => expect(HTML_TYPE.phone).toBe('tel'));
  it('maps datetime to datetime-local', () => expect(HTML_TYPE.datetime).toBe('datetime-local'));
  it('maps color to color', () => expect(HTML_TYPE.color).toBe('color'));
  it('maps json to textarea', () => expect(HTML_TYPE.json).toBe('textarea'));
  it('maps cron to text (custom validation)', () => expect(HTML_TYPE.cron).toBe('text'));
  it('maps password to password', () => expect(HTML_TYPE.password).toBe('password'));
});

// ── TEXTAREA_TYPES set ────────────────────────────────────────────────────

describe('TEXTAREA_TYPES', () => {
  it('includes textarea, json, template, csv-emails', () => {
    expect(TEXTAREA_TYPES.has('textarea')).toBe(true);
    expect(TEXTAREA_TYPES.has('json')).toBe(true);
    expect(TEXTAREA_TYPES.has('template')).toBe(true);
    expect(TEXTAREA_TYPES.has('csv-emails')).toBe(true);
  });
  it('does not include single-line types', () => {
    expect(TEXTAREA_TYPES.has('email')).toBe(false);
    expect(TEXTAREA_TYPES.has('url')).toBe(false);
    expect(TEXTAREA_TYPES.has('cron')).toBe(false);
  });
});
