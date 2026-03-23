// commands/validate.js
import fs from 'fs';
import path from 'path';
import Ajv from 'ajv';
import logger from '../../utils/logger.js';

import manifestSchema from '../../assets/manifest_schema.json' with { type: 'json' };
import defaultKeySchema from '../../assets/defaultkey_schema.json' with { type: 'json' };
import stateKeySchema from '../../assets/statekey_schema.json' with { type: 'json' };
import sliderKeySchema from '../../assets/sliderkey_schema.json' with { type: 'json' };
import wheelKeySchema from '../../assets/wheelkey_schema.json' with { type: 'json' };

const ajv = new Ajv();

export default async function validateCommand(wsClient, options) {
  const { path: pluginPath } = options;
  const fullPath = path.resolve(pluginPath);

  // 1. Check required files and directories
  const uiDir = path.join(fullPath, 'ui');
  const resourcesDir = path.join(fullPath, 'resources');
  const manifestFile = path.join(fullPath, 'manifest.json');

  if (!fs.existsSync(uiDir)) {
    throw new Error(`Missing ui folder: ${uiDir}`);
  }
  if (!fs.existsSync(manifestFile)) {
    throw new Error(`Missing manifest file: ${manifestFile}`);
  }
  if (!fs.existsSync(resourcesDir)) {
    throw new Error(`Missing resources folder: ${resourcesDir}`);
  }

  // 2. Parse and validate manifest.json
  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf-8'));
  } catch (e) {
    throw new Error(`Failed to parse manifest.json: ${e.message}`);
  }

  const validateManifest = ajv.compile(manifestSchema);
  if (!validateManifest(manifest)) {
    throw new Error(`Invalid manifest.json: ${ajv.errorsText(validateManifest.errors)}`);
  }

  // check if entry exists
  const backendJs = path.join(fullPath, manifest.entry);
  if (!fs.existsSync(backendJs)) {
    throw new Error(`Missing entry file: ${backendJs}`);
  }
  
  // 3. If manifest contains keyLibrary, validate each key
  if (Array.isArray(manifest.keyLibrary)) {
    try {
      manifest.keyLibrary.forEach((item) => {
        validateKeyItem(item, manifest);
      });
    } catch (error) {
      throw new Error(`Key validation error: ${error.message}`);
    }
  }

  logger.info(`Validation succeeded for plugin: ${fullPath}`);
    return true;
}

/**
 * Validates a single key item in keyLibrary based on its config.keyType.
 * @param {Object} item - The key item to validate.
 * @param {Object} manifest - The entire manifest content.
 */
function validateKeyItem(item, manifest) {
  if (!item.config || !item.config.keyType) {
    // Default key if no keyType
    assertSchema(item, defaultKeySchema, 'defaultKey');
  } else {
    const keyType = item.config.keyType;
    switch (keyType) {
      case 'multiState':
        assertSchema(item, stateKeySchema, 'stateKey');
        break;
      case 'slider':
        assertSchema(item, sliderKeySchema, 'sliderKey');
        break;
      case 'wheel':
        assertSchema(item, wheelKeySchema, 'wheelKey');
        break;
      default:
        // Fall back to default key
        assertSchema(item, defaultKeySchema, 'defaultKey');
        break;
    }
  }

  if (Array.isArray(item.children)) {
    item.children.forEach((child) => validateKeyItem(child, manifest));
  }
}

/**
 * Asserts that the data object is valid against the given schema.
 * @param {Object} data - The object to validate.
 * @param {Object} schema - The AJV schema.
 * @param {string} typeDesc - A short description or name for logging.
 * @throws {Error} If validation fails.
 */
function assertSchema(data, schema, typeDesc) {
  const validate = ajv.compile(schema);
  if (!validate(data)) {
    throw new Error(`Validation failed for ${typeDesc}: ${ajv.errorsText(validate.errors)}`);
  }
}
