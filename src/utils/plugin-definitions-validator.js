/**
 * @file plugin-definitions-validator.js
 * @brief AJV validation + cross-field rules for PluginDefinitionsPayload
 *
 * Keep aligned with FlexSDK2 packages/runtime/src/plugin-definitions-schema.ts
 * and FlexDesigner2 src/main/plugin/definition-registry.ts (validatePayloadConsistency).
 */

import Ajv from 'ajv';

/** @type {import('ajv').ErrorObject[]} */
let lastAjvErrors = [];

/**
 * Full JSON Schema draft-07 for plugin.registerDefinitions payload.
 * pluginUnit.type includes standard | custom | canvas.
 */
export const PLUGIN_DEFINITIONS_JSON_SCHEMA = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  $id: 'https://flexsdk.local/schemas/plugin-definitions-payload.json',
  type: 'object',
  required: ['libraries', 'units'],
  additionalProperties: false,
  properties: {
    libraries: {
      type: 'array',
      items: { $ref: '#/definitions/pluginLibraryDefinition' }
    },
    units: {
      type: 'array',
      items: { $ref: '#/definitions/pluginUnitDefinitionRuntime' }
    },
    revision: { type: 'string' }
  },
  definitions: {
    pluginUnit: {
      type: 'object',
      required: ['type', 'pluginUUID', 'pluginVersion', 'unitId'],
      additionalProperties: false,
      properties: {
        type: { type: 'string', enum: ['standard', 'custom', 'canvas'] },
        pluginUUID: { type: 'string', minLength: 1 },
        pluginVersion: { type: 'string', minLength: 1 },
        unitId: { type: 'string', minLength: 1 }
      }
    },
    pluginLibraryDefinition: {
      type: 'object',
      required: ['libraryUUID', 'name'],
      additionalProperties: false,
      properties: {
        libraryUUID: { type: 'string', minLength: 1 },
        name: { type: 'string', minLength: 1 },
        icon: { type: 'string' },
        categoryId: { type: 'string' }
      }
    },
    pluginUnitDefinitionRuntime: {
      type: 'object',
      required: ['unitId', 'typeId', 'name', 'categoryId', 'plugin'],
      additionalProperties: false,
      properties: {
        unitId: { type: 'string', minLength: 1 },
        typeId: { type: 'string', minLength: 1 },
        name: { type: 'string', minLength: 1 },
        categoryId: { type: 'string', minLength: 1 },
        plugin: { $ref: '#/definitions/pluginUnit' },
        icon: { type: 'string' },
        hasFunctionEditor: { type: 'boolean' },
        hasAppearanceEditor: { type: 'boolean' },
        hasView: { type: 'boolean' },
        platforms: {
          type: 'array',
          items: { type: 'string', enum: ['win32', 'darwin', 'linux'] }
        },
        libraryUUID: { type: 'string' },
        defaultData: { $ref: '#/definitions/unitDefaultData' }
      }
    },
    unitDefaultData: {
      type: 'object',
      additionalProperties: true,
      properties: {
        appearance: {
          type: 'array',
          items: { $ref: '#/definitions/appearance' }
        }
      }
    },
    appearance: {
      type: 'object',
      required: ['background', 'elements'],
      additionalProperties: false,
      properties: {
        background: { $ref: '#/definitions/backgroundStyle' },
        elements: {
          type: 'array',
          items: { $ref: '#/definitions/element' }
        },
        _appliedThemeId: { type: 'string' }
      }
    },
    backgroundStyle: {
      type: 'object',
      required: ['borderWidth', 'borderColor', 'borderStyle', 'backgroundColor'],
      additionalProperties: false,
      properties: {
        borderWidth: { type: 'number' },
        borderColor: { type: 'string' },
        borderStyle: { type: 'string' },
        backgroundColor: { type: 'string' },
        backgroundImage: { type: 'string' },
        borderRadius: { type: 'number' }
      }
    },
    geometry: {
      type: 'object',
      required: ['x', 'y', 'width', 'height'],
      additionalProperties: true,
      properties: {
        x: { type: 'number' },
        y: { type: 'number' },
        width: { type: 'number' },
        height: { type: 'number' },
        rotate: { type: 'number' },
        config: { type: 'object', additionalProperties: true }
      }
    },
    elementConfig: {
      type: 'object',
      additionalProperties: false,
      properties: {
        pinned: { type: 'boolean' },
        removable: { type: 'boolean' }
      }
    },
    element: {
      oneOf: [
        { $ref: '#/definitions/textElement' },
        { $ref: '#/definitions/iconElement' },
        { $ref: '#/definitions/imageElement' }
      ]
    },
    textElement: {
      type: 'object',
      required: ['typeId', 'uuid', 'config', 'geometry', 'style', 'data'],
      additionalProperties: false,
      properties: {
        typeId: { const: 'text' },
        uuid: { type: 'string', minLength: 1 },
        name: { type: 'string' },
        identifier: { type: 'string' },
        config: { $ref: '#/definitions/elementConfig' },
        geometry: { $ref: '#/definitions/geometry' },
        style: {
          type: 'object',
          required: [
            'backgroundColor',
            'color',
            'fontFamily',
            'fontSize',
            'fontWeight',
            'fontStyle',
            'textShadow',
            'background'
          ],
          additionalProperties: true,
          properties: {
            backgroundColor: { type: 'string' },
            color: { type: 'string' },
            fontFamily: { type: 'string' },
            fontSize: { type: 'number' },
            fontWeight: { type: 'string' },
            fontStyle: { type: 'string' },
            textShadow: { type: 'string' },
            background: { $ref: '#/definitions/backgroundStyle' }
          }
        },
        data: {
          type: 'object',
          required: ['text'],
          additionalProperties: false,
          properties: {
            text: { type: 'string' }
          }
        }
      }
    },
    iconElement: {
      type: 'object',
      required: ['typeId', 'uuid', 'config', 'geometry', 'style', 'data'],
      additionalProperties: false,
      properties: {
        typeId: { const: 'icon' },
        uuid: { type: 'string', minLength: 1 },
        name: { type: 'string' },
        identifier: { type: 'string' },
        config: { $ref: '#/definitions/elementConfig' },
        geometry: { $ref: '#/definitions/geometry' },
        style: {
          type: 'object',
          required: ['backgroundColor', 'color', 'fontSize', 'textShadow', 'background'],
          additionalProperties: true,
          properties: {
            backgroundColor: { type: 'string' },
            color: { type: 'string' },
            fontSize: { type: 'number' },
            textShadow: { type: 'string' },
            background: { $ref: '#/definitions/backgroundStyle' }
          }
        },
        data: {
          type: 'object',
          required: ['value', 'type'],
          additionalProperties: true,
          properties: {
            value: { type: 'string' },
            type: { type: 'string', enum: ['icon', 'emoji', 'custom'] },
            emojiSet: { type: 'string', enum: ['native', 'apple', 'google', 'twitter', 'facebook'] },
            emojiUnified: { type: 'string' },
            emojiSheetX: { type: 'number' },
            emojiSheetY: { type: 'number' }
          }
        }
      }
    },
    imageElement: {
      type: 'object',
      required: ['typeId', 'uuid', 'config', 'geometry', 'style', 'data'],
      additionalProperties: false,
      properties: {
        typeId: { const: 'image' },
        uuid: { type: 'string', minLength: 1 },
        name: { type: 'string' },
        identifier: { type: 'string' },
        config: { $ref: '#/definitions/elementConfig' },
        geometry: { $ref: '#/definitions/geometry' },
        style: {
          type: 'object',
          required: ['backgroundColor', 'background'],
          additionalProperties: true,
          properties: {
            backgroundColor: { type: 'string' },
            background: { $ref: '#/definitions/backgroundStyle' }
          }
        },
        data: {
          type: 'object',
          required: ['value'],
          additionalProperties: false,
          properties: {
            value: { type: 'string' }
          }
        }
      }
    }
  }
};

const ajv = new Ajv({ allErrors: true });
const validateSchema = ajv.compile(PLUGIN_DEFINITIONS_JSON_SCHEMA);

/**
 * Cross-field rules (matches host PluginDefinitionRegistry.validatePayloadConsistency).
 * @param {object} payload
 * @returns {string[]} error messages (empty if ok)
 */
export function validateDefinitionsConsistency(payload) {
  const errors = [];
  if (!payload || typeof payload !== 'object') {
    return ['payload must be an object'];
  }

  const libSeen = new Set();
  for (const lib of payload.libraries ?? []) {
    if (libSeen.has(lib.libraryUUID)) {
      errors.push(`Duplicate libraryUUID in payload: ${lib.libraryUUID}`);
    }
    libSeen.add(lib.libraryUUID);
  }

  const unitIdSeen = new Set();
  const libIds = new Set((payload.libraries ?? []).map((l) => l.libraryUUID));

  for (const u of payload.units ?? []) {
    if (unitIdSeen.has(u.unitId)) {
      errors.push(`Duplicate unitId in payload: ${u.unitId}`);
    }
    unitIdSeen.add(u.unitId);

    if (u.libraryUUID && !libIds.has(u.libraryUUID)) {
      errors.push(`Unit ${u.typeId} references unknown libraryUUID ${u.libraryUUID}`);
    }
  }

  for (const u of payload.units ?? []) {
    const p = u.plugin;
    if (!p) continue;
    if (p.pluginUUID === undefined) continue;

    if (p.type === 'custom' && !u.hasView) {
      errors.push(`Unit ${u.typeId}: plugin.type 'custom' requires hasView: true`);
    }
    if (p.type === 'canvas' && u.hasView) {
      errors.push(`Unit ${u.typeId}: plugin.type 'canvas' cannot have hasView: true`);
    }
    if (p.type === 'canvas' && u.hasAppearanceEditor) {
      errors.push(`Unit ${u.typeId}: plugin.type 'canvas' cannot have hasAppearanceEditor: true`);
    }
  }

  return errors;
}

/**
 * @param {unknown} payload
 * @returns {{ ok: true } | { ok: false, errors: string[] }}
 */
export function validatePluginDefinitionsPayload(payload) {
  lastAjvErrors = [];
  const schemaOk = validateSchema(payload);
  const ajvErrors = (validateSchema.errors ?? []).map((err) => {
    const p = err.instancePath || '(root)';
    return `${p}: ${err.message}`;
  });

  const consistencyErrors = validateDefinitionsConsistency(
    payload && typeof payload === 'object' ? payload : {}
  );

  const errors = [...ajvErrors, ...consistencyErrors];
  if (!schemaOk || consistencyErrors.length > 0) {
    return { ok: false, errors };
  }
  return { ok: true };
}
