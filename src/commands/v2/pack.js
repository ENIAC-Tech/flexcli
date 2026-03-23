/**
 * @file commands/v2/pack.js
 * @brief `flexcli plugin-v2 pack` - package a built plugin into a .flexplugin archive (zip container)
 */

import path from 'path';
import fs from 'fs';
import fsp from 'fs/promises';
import archiver from 'archiver';
import { readValidateManifestFile } from '../../utils/manifest-validator.js';
import logger from '../../utils/logger.js';

/**
 * @param {object} options
 * @param {string} [options.distDir]   - Built plugin directory (default: cwd/dist)
 * @param {string} [options.output]    - Output .flexplugin path (default: <plugin-root>/release/<name>-<version>.flexplugin)
 */
export async function packV2Command(options = {}) {
  const distDir = path.resolve(options.distDir ?? path.join(process.cwd(), 'dist'));
  const manifestPath = path.join(distDir, 'manifest.json');

  const manifestRead = readValidateManifestFile(manifestPath);
  if (!manifestRead.ok) {
    if (manifestRead.missing) {
      logger.error(`manifest.json not found in ${distDir}`);
      logger.error('Fix: Run "flexcli plugin-v2 build" first to compile the plugin');
    } else {
      logger.error('Built manifest is invalid:');
      for (const e of manifestRead.errors) logger.error(`  - ${e}`);
    }
    return false;
  }
  const manifest = manifestRead.manifest;
  for (const w of manifestRead.warnings ?? []) {
    logger.warn(`manifest.json: ${w}`);
  }

  const safeName = manifest.name.replace(/[^a-zA-Z0-9._-]/g, '-');
  const pluginRoot = path.dirname(distDir);
  const defaultOutputPath = path.join(
    pluginRoot,
    'release',
    `${safeName}-${manifest.version}.flexplugin`
  );
  const outputPath = options.output ? path.resolve(options.output) : defaultOutputPath;

  await fsp.mkdir(path.dirname(outputPath), { recursive: true });

  logger.info(`Packing ${manifest.name} v${manifest.version} to ${outputPath}`);

  await new Promise((resolve, reject) => {
    const output = fs.createWriteStream(outputPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', resolve);
    archive.on('error', reject);
    archive.pipe(output);
    archive.directory(distDir, false);
    archive.finalize();
  });

  const stat = fs.statSync(outputPath);
  logger.info(`Pack complete: ${outputPath} (${(stat.size / 1024).toFixed(1)} KB)`);
  return outputPath;
}
