/**
 * @file plugin-definitions-validator.js
 * @brief AJV validation + cross-field rules for PluginDefinitionsPayload.
 *
 * Keep aligned with FlexSDK2 packages/runtime/src/plugin-definitions-schema.ts
 * and FlexDesigner2 src/main/plugin/definition-registry.ts.
 */

import Ajv from 'ajv';

const PLUGIN_UNIT_TYPES = ['standard', 'custom', 'canvas', 'cycled', 'slider', 'value-label', 'label'];
const EPSILON = 1e-9;
const MAX_DECIMALS = 6;

/**
 * JSON Schema draft-07 for plugin.registerDefinitions payload.
 * Semantic checks below enforce cross-field rules that are clearer in code.
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
    builtinUnits: {
      type: 'array',
      items: { $ref: '#/definitions/builtinUnitTemplate' }
    },
    revision: { type: 'string' }
  },
  definitions: {
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
    pluginUnit: {
      type: 'object',
      required: ['type', 'pluginUUID', 'pluginVersion', 'unitId'],
      additionalProperties: false,
      properties: {
        type: { type: 'string', enum: PLUGIN_UNIT_TYPES },
        pluginUUID: { type: 'string', minLength: 1 },
        pluginVersion: { type: 'string', minLength: 1 },
        unitId: { type: 'string', minLength: 1 }
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
        defaultData: {
          type: 'object',
          additionalProperties: true,
          not: { required: ['appearance'] }
        },
        appearanceOverride: { type: 'object', additionalProperties: true },
        functions: {
          type: 'array',
          minItems: 2,
          items: {
            type: 'object',
            required: ['functionId'],
            additionalProperties: false,
            properties: {
              functionId: { type: 'string', minLength: 1 },
              name: { type: 'string' },
              data: { type: 'object', additionalProperties: true },
              appearanceOverride: { type: 'object', additionalProperties: true }
            }
          }
        },
        slider: {
          type: 'object',
          required: ['format', 'min', 'max'],
          additionalProperties: false,
          properties: {
            format: { type: 'string', minLength: 1 },
            min: { type: 'number' },
            max: { type: 'number' },
            step: { type: 'number' }
          }
        },
        valueLabel: {
          oneOf: [
            {
              type: 'object',
              required: ['mode', 'format'],
              additionalProperties: false,
              properties: {
                mode: { const: 'format' },
                format: { type: 'string', minLength: 1 },
                customCharacters: { type: 'string' }
              }
            },
            {
              type: 'object',
              required: ['mode'],
              additionalProperties: false,
              properties: {
                mode: { const: 'custom' },
                customCharacters: { type: 'string' }
              }
            }
          ]
        },
        label: {
          type: 'object',
          required: ['fontFamily'],
          additionalProperties: false,
          properties: {
            fontFamily: { type: 'string', enum: ['puhuiti', 'consola'] }
          }
        }
      }
    },
    builtinUnitTemplate: {
      type: 'object',
      required: ['uuid', 'typeId', 'name', 'icon', 'config', 'geometry', 'appearance', 'data'],
      additionalProperties: false,
      properties: {
        uuid: { type: 'string', minLength: 1 },
        typeId: { type: 'string', minLength: 1 },
        name: { type: 'string', minLength: 1 },
        icon: { type: 'string' },
        config: { type: 'object', additionalProperties: true },
        geometry: { $ref: '#/definitions/geometry' },
        appearance: {
          type: 'array',
          items: {
            type: 'object',
            required: ['background', 'elements'],
            additionalProperties: false,
            properties: {
              background: { type: 'object', additionalProperties: true },
              elements: {
                type: 'array',
                items: {
                  type: 'object',
                  required: ['typeId', 'uuid', 'config', 'geometry', 'style', 'data'],
                  additionalProperties: true,
                  properties: {
                    typeId: { type: 'string', minLength: 1 },
                    uuid: { type: 'string', minLength: 1 },
                    name: { type: 'string' },
                    identifier: { type: 'string' },
                    config: { type: 'object', additionalProperties: true },
                    geometry: { $ref: '#/definitions/geometry' },
                    style: { type: 'object', additionalProperties: true },
                    data: { type: 'object', additionalProperties: true }
                  }
                }
              },
              _appliedThemeId: { type: 'string' },
              _appliedThemeVariantKey: { type: 'string' },
              _appliedUnitThemeVariantId: { type: 'string' }
            }
          }
        },
        data: { type: 'object', additionalProperties: true },
        _metadata: { type: 'object', additionalProperties: true }
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
    }
  }
};

const ajv = new Ajv({ allErrors: true });
const validateSchema = ajv.compile(PLUGIN_DEFINITIONS_JSON_SCHEMA);

function pushThrown(errors, fn) {
  try {
    fn();
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
  }
}

function parseNumericFormat(format, subject) {
  let placeholder;
  let decimals = 0;

  for (let index = 0; index < format.length;) {
    if (format[index] !== '%') {
      index++;
      continue;
    }
    if (format[index + 1] === '%') {
      index += 2;
      continue;
    }

    const match = format.slice(index).match(/^%(?:0)?(?:\d+)?(?:\.(\d+))?f/);
    if (!match) {
      throw new Error(`Unsupported ${subject} format placeholder at position ${index}`);
    }
    if (placeholder) {
      throw new Error(`${subject} format must contain exactly one supported %f placeholder`);
    }
    placeholder = match[0];
    decimals = match[1] ? Number(match[1]) : 0;
    if (!Number.isInteger(decimals) || decimals < 0 || decimals > MAX_DECIMALS) {
      throw new Error(`${subject} format precision must be between 0 and ${MAX_DECIMALS} decimals`);
    }
    index += placeholder.length;
  }

  if (!placeholder) {
    throw new Error(`${subject} format must contain exactly one supported %f placeholder`);
  }
  return { decimals };
}

function isNearlyInteger(value) {
  return Math.abs(value - Math.round(value)) <= EPSILON;
}

function validateSliderConfig(slider) {
  const { decimals } = parseNumericFormat(slider.format, 'slider');
  const min = slider.min;
  const max = slider.max;
  const step = slider.step ?? (decimals === 0 ? 1 : 1 / 10 ** decimals);
  const range = max - min;

  if (!Number.isFinite(min) || !Number.isFinite(max)) throw new Error('Slider min and max must be finite numbers');
  if (max <= min) throw new Error('Slider max must be greater than min');
  if (!Number.isFinite(step) || step <= 0) throw new Error('Slider step must be a finite number greater than 0');
  if (step - range > EPSILON) throw new Error('Slider step must not exceed range');
  if (!isNearlyInteger(min * 10 ** decimals) || !isNearlyInteger(max * 10 ** decimals)) {
    throw new Error('Slider min and max must be represented by display precision');
  }
  if (!isNearlyInteger(range / step)) throw new Error('Slider step must evenly divide range');
  if (!isNearlyInteger(step * 10 ** decimals)) {
    throw new Error('Slider step cannot be represented by display precision');
  }
}

function validateValueLabelConfig(valueLabel) {
  if (valueLabel.mode === 'format') {
    parseNumericFormat(valueLabel.format, 'value-label');
    return;
  }
  const graphemes = Array.from(valueLabel.customCharacters ?? '');
  if (new Set(graphemes).size > 128) {
    throw new Error('Value-label customCharacters must contain at most 128 unique graphemes');
  }
}

function validateBuiltinUnitTree(unit, path) {
  if (!unit || typeof unit !== 'object' || Array.isArray(unit)) {
    throw new Error(`builtinUnits entry ${path} must be an object`);
  }
  const label = typeof unit.uuid === 'string' && unit.uuid.length > 0 ? unit.uuid : path;
  if (Object.prototype.hasOwnProperty.call(unit, 'plugin')) {
    throw new Error(`Builtin unit ${label}: plugin metadata is not allowed`);
  }
  const nested = unit.data?.layoutData;
  if (Array.isArray(nested)) {
    nested.forEach((child, index) => validateBuiltinUnitTree(child, `${label}.data.layoutData[${index}]`));
  }
}

function validateUnitTypeFields(unit) {
  const type = unit.plugin?.type;
  if (!PLUGIN_UNIT_TYPES.includes(type)) {
    throw new Error(`Unit ${unit.typeId}: unsupported plugin.type '${type}'`);
  }

  if (type === 'custom') {
    if (!unit.hasView) throw new Error(`Unit ${unit.typeId}: plugin.type 'custom' requires hasView: true`);
    if (unit.appearanceOverride || unit.functions || unit.slider || unit.valueLabel || unit.label) {
      throw new Error(`Unit ${unit.typeId}: custom unit has incompatible runtime fields`);
    }
    return;
  }

  if (unit.hasView) throw new Error(`Unit ${unit.typeId}: plugin.type '${type}' cannot have hasView: true`);
  if (unit.hasAppearanceEditor) {
    throw new Error(`Unit ${unit.typeId}: hasAppearanceEditor is only allowed for plugin.type 'custom'`);
  }

  if (type === 'canvas') {
    if (unit.appearanceOverride || unit.functions || unit.slider || unit.valueLabel || unit.label) {
      throw new Error(`Unit ${unit.typeId}: canvas unit has incompatible runtime fields`);
    }
    return;
  }

  if (type === 'standard') {
    if (unit.functions || unit.slider || unit.valueLabel || unit.label) {
      throw new Error(`Unit ${unit.typeId}: standard unit has incompatible runtime fields`);
    }
    return;
  }

  if (type === 'cycled') {
    const seen = new Set();
    if (!Array.isArray(unit.functions) || unit.functions.length < 2) {
      throw new Error(`Unit ${unit.typeId}: plugin.type 'cycled' requires at least 2 functions`);
    }
    for (const fn of unit.functions) {
      if (typeof fn.functionId !== 'string' || fn.functionId.trim() !== fn.functionId || fn.functionId.length === 0) {
        throw new Error(`Unit ${unit.typeId}: cycled functionId must be a non-empty string without surrounding whitespace`);
      }
      if (seen.has(fn.functionId)) throw new Error(`Unit ${unit.typeId}: Duplicate functionId '${fn.functionId}'`);
      seen.add(fn.functionId);
    }
    if (unit.slider || unit.valueLabel || unit.label) {
      throw new Error(`Unit ${unit.typeId}: cycled unit has incompatible runtime fields`);
    }
    return;
  }

  if (type === 'slider') {
    if (!unit.slider) throw new Error(`Unit ${unit.typeId}: plugin.type 'slider' requires slider`);
    validateSliderConfig(unit.slider);
    if (unit.functions || unit.valueLabel || unit.label) {
      throw new Error(`Unit ${unit.typeId}: slider unit has incompatible runtime fields`);
    }
    return;
  }

  if (type === 'value-label') {
    if (!unit.valueLabel) throw new Error(`Unit ${unit.typeId}: plugin.type 'value-label' requires valueLabel`);
    validateValueLabelConfig(unit.valueLabel);
    if (unit.functions || unit.slider || unit.label) {
      throw new Error(`Unit ${unit.typeId}: value-label unit has incompatible runtime fields`);
    }
    return;
  }

  if (!unit.label) throw new Error(`Unit ${unit.typeId}: plugin.type 'label' requires label`);
  if (unit.functions || unit.slider || unit.valueLabel) {
    throw new Error(`Unit ${unit.typeId}: label unit has incompatible runtime fields`);
  }
}

/**
 * Cross-field rules matching host definition registration semantics.
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
    if (libSeen.has(lib.libraryUUID)) errors.push(`Duplicate libraryUUID in payload: ${lib.libraryUUID}`);
    libSeen.add(lib.libraryUUID);
  }

  const unitIdSeen = new Set();
  const typeIdSeen = new Set();
  const libIds = new Set((payload.libraries ?? []).map((library) => library.libraryUUID));

  for (const unit of payload.units ?? []) {
    if (unitIdSeen.has(unit.unitId)) errors.push(`Duplicate unitId in payload: ${unit.unitId}`);
    unitIdSeen.add(unit.unitId);
    if (typeIdSeen.has(unit.typeId)) errors.push(`Duplicate typeId in payload: ${unit.typeId}`);
    typeIdSeen.add(unit.typeId);
    if (unit.libraryUUID && !libIds.has(unit.libraryUUID)) {
      errors.push(`Unit ${unit.typeId} references unknown libraryUUID ${unit.libraryUUID}`);
    }
    if (unit.plugin?.unitId !== unit.unitId) errors.push(`Unit ${unit.typeId}: plugin.unitId must match unitId`);
    pushThrown(errors, () => validateUnitTypeFields(unit));
  }

  const pluginTemplateUuids = new Set((payload.units ?? []).map((unit) => `plugin-template-${unit.typeId}`));
  const builtinUuids = new Set();
  for (const unit of payload.builtinUnits ?? []) {
    if (builtinUuids.has(unit.uuid)) errors.push(`Duplicate builtin unit template uuid in payload: ${unit.uuid}`);
    builtinUuids.add(unit.uuid);
    if (pluginTemplateUuids.has(unit.uuid)) {
      errors.push(`Builtin unit template uuid ${unit.uuid} collides with plugin-owned unit template uuid`);
    }
    pushThrown(errors, () => validateBuiltinUnitTree(unit, `builtinUnits.${unit.uuid || '<unknown>'}`));
  }

  return errors;
}

/**
 * @param {unknown} payload
 * @returns {{ ok: true } | { ok: false, errors: string[] }}
 */
export function validatePluginDefinitionsPayload(payload) {
  const schemaOk = validateSchema(payload);
  const ajvErrors = (validateSchema.errors ?? []).map((err) => {
    const path = err.instancePath || '(root)';
    return `${path}: ${err.message}`;
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
