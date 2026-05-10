/**
 * @file validate-plugin.js
 * @brief `flexcli plugin-v2 validate` — manifest.json and/or plugin definitions JSON
 */

import fs from 'fs';
import path from 'path';
import { readValidateManifestFile } from '../../utils/manifest-validator.js';
import { validatePluginDefinitionsPayload } from '../../utils/plugin-definitions-validator.js';
import logger from '../../utils/logger.js';

/**
 * @param {object} options
 * @param {string} [options.pluginDir] - Plugin root (default: cwd)
 * @param {string} [options.definitions] - Path to PluginDefinitionsPayload JSON file
 * @param {boolean} [options.skipManifest] - Only validate --definitions (no manifest.json)
 * @returns {Promise<boolean>} true if all requested validations passed
 */
export async function validateV2PluginCommand(options = {}) {
  const pluginDir = path.resolve(options.pluginDir ?? process.cwd());
  const definitionsPath = options.definitions ? path.resolve(options.definitions) : null;
  const skipManifest = options.skipManifest === true;

  let ok = true;

  if (!skipManifest) {
    const manifestPath = path.join(pluginDir, 'manifest.json');
    const manifestResult = readValidateManifestFile(manifestPath);
    if (!manifestResult.ok) {
      logger.error('manifest.json validation failed:');
      for (const e of manifestResult.errors ?? []) logger.error(`  - ${e}`);
      ok = false;
    } else {
      logger.info(`manifest.json OK: ${manifestResult.manifest.name} (${manifestResult.manifest.uuid})`);
    }
  }

  if (definitionsPath) {
    if (!fs.existsSync(definitionsPath)) {
      logger.error(`Definitions file not found: ${definitionsPath}`);
      return false;
    }
    let raw;
    try {
      raw = JSON.parse(fs.readFileSync(definitionsPath, 'utf-8'));
    } catch (e) {
      logger.error(`Invalid JSON in definitions file: ${e.message}`);
      return false;
    }
    const result = validatePluginDefinitionsPayload(raw);
    if (!result.ok) {
      logger.error('Plugin definitions validation failed:');
      for (const e of result.errors) logger.error(`  - ${e}`);
      ok = false;
    } else {
      logger.info(`definitions OK (${(raw.units ?? []).length} unit(s)): ${definitionsPath}`);
    }
  }

  return ok;
}
