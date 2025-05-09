// commands/pack.js
import fs from 'fs';
import path from 'path';
import archiver from 'archiver'; 
import logger from '../utils/logger.js';
import Ajv from 'ajv';
import manifestSchema from '../assets/manifest_schema.json' with { type: 'json' };


const ajv = new Ajv();
const validateManifest = ajv.compile(manifestSchema);

/**
 * Handles the 'pack' command.
 * @param {WebSocketClient} wsClient - The WebSocket client instance.
 * @param {Object} options - The command options.
 */
export default async function packCommand(wsClient, options) {
  const { path: pluginPath } = options;
  const pluginDir = path.resolve(pluginPath);

  // Validate directory structure
  const requiredDirs = ['backend', 'resources', 'ui'];
  const requiredFile = 'manifest.json';
  
  if (!fs.existsSync(pluginDir)) {
    throw new Error(`Plugin directory ${pluginDir} does not exist.`);
  }

  // Validate subdirectories
  const missingDirs = requiredDirs.filter((dir) => !fs.existsSync(path.join(pluginDir, dir)));
  if (missingDirs.length > 0) {
    throw new Error(`Missing required directories: ${missingDirs.join(', ')}`);
  }

  // Validate manifest.json file
  const manifestPath = path.join(pluginDir, requiredFile);
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`Missing required file: ${requiredFile}`);
  }

  const manifestData = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  const valid = validateManifest(manifestData);
  if (!valid) {
    throw new Error(`Invalid manifest.json: ${ajv.errorsText(validateManifest.errors)}`);
  }
  
  const zipFilePath = path.join(path.dirname(pluginDir), `${manifestData.uuid}.flexplugin`);

  // Compress the plugin directory into a zip file using archiver
  logger.info(`Packing plugin directory: ${pluginDir}`);
  const output = fs.createWriteStream(zipFilePath);
  const archive = archiver('zip', { zlib: { level: 9 } });

  output.on('close', () => {
    logger.info(`Plugin packed successfully to: ${zipFilePath}`);
  });

  archive.on('error', (err) => {
    logger.error(`Error while packing: ${err.message}`);
    throw new Error(err);
  });

  archive.pipe(output);

  // Exclude the 'logs' folder via filter
  archive.directory(pluginDir, false, (file) => {
    // file.name is the relative path; exclude if it contains the 'logs' folder
    if (file.name.startsWith(`logs`)) {
      return false;
    }
    return file;
  });

  await archive.finalize();
}
