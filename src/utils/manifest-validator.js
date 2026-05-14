/**
 * @file manifest-validator.js
 * @brief Plugin manifest validation
 */

import fs from 'fs';
import Ajv from 'ajv';

const ajv = new Ajv({ allErrors: true });

const permissionEnum = [
  'file',
  'http',
  'system',
  'store',
  'logger',
  'device',
  'project',
  'resource',
  'bus',
  'unit',
  'definitions',
  'ui',
  'pluginApi',
  'electron.app',
  'electron.browserWindow',
  'electron.clipboard',
  'electron.globalShortcut',
  'electron.powerMonitor',
  'electron.dialog',
  'electron.pushNotifications',
  'electron.screen'
];

const platformEnum = ['win32-x64', 'darwin-arm64', 'darwin-x64', 'linux-x64'];

const capabilityEnum = ['encoder', 'touchscreen', 'knob', 'slider', 'lcd', 'vibration'];

const manifestSchema = {
  type: 'object',
  required: ['schemaVersion', 'uuid', 'name', 'entry'],
  properties: {
    schemaVersion: { type: 'string', const: '1.0' },
    uuid: {
      type: 'string',
      pattern: '^@[a-zA-Z0-9_-]+/[a-zA-Z0-9._-]+$'
    },
    name: { type: 'string', minLength: 1 },
    repo: { type: 'string', minLength: 1 },
    description: { type: 'string' },
    author: {
      type: 'object',
      required: ['name'],
      properties: {
        name: { type: 'string' },
        email: { type: 'string' },
        url: { type: 'string' }
      }
    },
    minHostVersion: { type: 'string' },
    native: { type: 'boolean' },
    platforms: {
      type: 'array',
      items: { type: 'string', enum: platformEnum }
    },
    devices: {
      type: 'array',
      items: { type: 'string' }
    },
    requiredCapabilities: {
      type: 'array',
      items: { type: 'string', enum: capabilityEnum }
    },
    permissions: {
      type: 'array',
      items: { type: 'string', enum: permissionEnum }
    },
    dependencies: {
      type: 'array',
      items: {
        type: 'object',
        required: ['uuid', 'minVersion'],
        properties: {
          uuid: { type: 'string', pattern: '^@[a-zA-Z0-9_-]+/[a-zA-Z0-9._-]+$' },
          minVersion: { type: 'string' }
        }
      }
    },
    hasConfigPage: { type: 'boolean' },
    entry: {
      type: 'object',
      required: ['backend'],
      properties: {
        backend: { type: 'string', minLength: 1 },
        unitFunctionEditor: { type: 'string' },
        unitAppearanceEditor: { type: 'string' },
        unitView: { type: 'string' },
        unitViewOverrides: {
          type: 'object',
          additionalProperties: { type: 'string' }
        },
        configPage: { type: 'string' }
      }
    },
    defaultLocale: { type: 'string' },
    supportedLocales: { type: 'array', items: { type: 'string' } }
  },
  additionalProperties: true
};

const validate = ajv.compile(manifestSchema);

/**
 * Validate a plugin manifest object
 * @param {any} manifest
 * @returns {{ valid: boolean, errors: string[], warnings: string[] }}
 */
export function validateManifest(manifest) {
  const warnings = [];
  if (!manifest || typeof manifest !== 'object') {
    return { valid: false, errors: ['manifest must be an object'], warnings };
  }
  const valid = validate(manifest);
  if (!valid) {
    const errors = (validate.errors ?? []).map((err) => {
      const p = err.instancePath || '(root)';
      return `${p}: ${err.message}`;
    });
    return { valid: false, errors, warnings };
  }

  if (manifest.repo != null && String(manifest.repo).trim() !== '') {
    try {
      void new URL(manifest.repo);
    } catch {
      return { valid: false, errors: ['/repo: must be a valid URL'], warnings };
    }
  }

  return { valid: true, errors: [], warnings };
}

/**
 * @param {any} raw
 * @returns {{ manifest: object|null, errors: string[], warnings: string[] }}
 */
export function parseAndValidateManifest(raw) {
  const result = validateManifest(raw);
  if (!result.valid) return { manifest: null, errors: result.errors, warnings: result.warnings ?? [] };
  return { manifest: raw, errors: [], warnings: result.warnings ?? [] };
}

/**
 * Read manifest.json from disk and validate it.
 * @param {string} manifestPath - Absolute path to manifest.json
 * @returns {{ ok: true, manifest: object, warnings: string[] } | { ok: false, manifest?: object, errors: string[], warnings: string[], missing?: boolean }}
 */
export function readValidateManifestFile(manifestPath) {
  if (!fs.existsSync(manifestPath)) {
    return {
      ok: false,
      errors: [`manifest.json not found: ${manifestPath}`],
      warnings: [],
      missing: true
    };
  }
  let raw;
  try {
    raw = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  } catch (e) {
    return {
      ok: false,
      errors: [`Invalid manifest JSON: ${e.message}`],
      warnings: []
    };
  }
  const { valid, errors, warnings } = validateManifest(raw);
  if (!valid) {
    return { ok: false, manifest: raw, errors, warnings: warnings ?? [] };
  }
  return { ok: true, manifest: raw, warnings: warnings ?? [] };
}
