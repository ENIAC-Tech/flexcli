/**
 * @file commands/v2/dev.js
 * @brief `flexcli plugin-v2 dev` — build, mount dev dist, watch sources, rebuild and reload
 */

import path from 'path';
import fs from 'fs';
import chokidar from 'chokidar';
import logger from '../../utils/logger.js';
import { createV2Client } from './control.js';
import { buildV2Command } from './build.js';

const DEBOUNCE_MS = 300;

/**
 * @param {string} filePath
 * @returns {boolean}
 */
function isIgnoredPath(filePath) {
  const n = path.normalize(filePath);
  const sep = path.sep;
  return (
    n.includes(`${sep}node_modules${sep}`) ||
    n.includes(`${sep}dist${sep}`) ||
    n.includes(`${sep}.git${sep}`)
  );
}

/**
 * @param {string} pluginDir
 * @returns {string[]}
 */
function collectWatchTargets(pluginDir) {
  const targets = [path.join(pluginDir, 'manifest.json')];
  const backend = path.join(pluginDir, 'src', 'backend');
  const frontend = path.join(pluginDir, 'src', 'frontend');
  const locales = path.join(pluginDir, 'locales');
  const assets = path.join(pluginDir, 'assets');
  if (fs.existsSync(backend)) targets.push(backend);
  if (fs.existsSync(frontend)) targets.push(frontend);
  if (fs.existsSync(locales)) targets.push(locales);
  if (fs.existsSync(assets)) targets.push(assets);
  return targets;
}

/**
 * @param {string} pluginDir
 * @param {object} options
 * @param {string} [options.host]
 * @param {string|number} [options.port]
 * @param {string} [options.token]
 */
export async function runV2DevCommand(pluginDir, options) {
  const absDir = path.resolve(pluginDir);
  const manifestPath = path.join(absDir, 'manifest.json');
  const distDir = path.join(absDir, 'dist');

  if (!fs.existsSync(manifestPath)) {
    logger.error(`No manifest.json found in ${absDir}`);
    process.exit(1);
  }

  let manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  const sessionPluginUUID = manifest.uuid;

  const built = await buildV2Command({
    pluginDir: absDir,
    outDir: distDir,
    preserveDistLogs: true
  });
  if (!built) {
    logger.error('Build failed, aborting dev session.');
    process.exit(1);
  }

  const client = await createV2Client(options);

  await client.command('mountDevSource', {
    pluginUUID: sessionPluginUUID,
    devDir: distDir
  });

  await client.command('subscribeLogs', { pluginUUID: sessionPluginUUID });

  client.ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw.toString());
      if (msg.type === 'log' && msg.data?.pluginUUID === sessionPluginUUID) {
        const e = msg.data;
        const ts = new Date(e.timestamp).toLocaleTimeString();
        const line = `${ts} [${e.source ?? 'plugin'}] ${e.message}`;
        const level = ['debug', 'info', 'warn', 'error'].includes(e.level) ? e.level : 'info';
        logger[level](line);
        if (e.data !== undefined) logger[level]('  ' + JSON.stringify(e.data));
      }
    } catch {
      // ignore malformed WS frames
    }
  });

  let watcher = null;
  let debounceTimer = null;
  let running = false;
  let pending = false;
  let cleaned = false;

  async function runRebuildAndReload() {
    if (running) {
      pending = true;
      return;
    }
    running = true;
    try {
      if (fs.existsSync(manifestPath)) {
        manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
      }
      const ok = await buildV2Command({
        pluginDir: absDir,
        outDir: distDir,
        preserveDistLogs: true
      });
      if (!ok) {
        logger.error('Rebuild failed; fix errors to recover. Skipping reload.');
        return;
      }
      await client.command('reloadPlugin', { pluginUUID: manifest.uuid });
      logger.info('Plugin rebuilt and reloaded.');
    } catch (e) {
      logger.error(`Rebuild or reload failed: ${e.message}`);
    } finally {
      running = false;
      if (pending) {
        pending = false;
        void runRebuildAndReload();
      }
    }
  }

  function scheduleRebuild() {
    if (cleaned) return;
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      debounceTimer = null;
      void runRebuildAndReload();
    }, DEBOUNCE_MS);
  }

  const watchTargets = collectWatchTargets(absDir);
  watcher = chokidar.watch(watchTargets, {
    ignoreInitial: true,
    persistent: true,
    ignored: (p) => isIgnoredPath(p)
  });

  watcher.on('all', (event, changedPath) => {
    if (cleaned) return;
    if (event !== 'add' && event !== 'change' && event !== 'unlink') return;
    if (isIgnoredPath(changedPath)) return;
    logger.debug(`Dev watch: ${event} ${changedPath}`);
    scheduleRebuild();
  });

  watcher.on('error', (err) => {
    logger.error(`Watcher error: ${err.message}`);
  });

  logger.info(`Dev session started for ${manifest.name} (${sessionPluginUUID})`);
  logger.info('Watching for changes. Logs stream here. Press Ctrl+C to unmount and exit.');

  async function cleanup() {
    if (cleaned) return;
    cleaned = true;
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
    if (watcher) {
      await watcher.close();
      watcher = null;
    }
    try {
      await client.command('unmountDevSource', { pluginUUID: sessionPluginUUID });
      logger.info('Dev source unmounted, installed version restored');
    } catch {
      // host may already be gone
    }
    client.disconnect();
    process.exit(0);
  }

  process.on('SIGINT', () => {
    void cleanup();
  });
  process.on('SIGTERM', () => {
    void cleanup();
  });

  await new Promise(() => {});
}
