/**
 * @file commands/v2/build.js
 * @brief `flexcli plugin-v2 build` - compile and assemble a v2 plugin package
 *
 * Steps:
 * 1) Validate manifest
 * 2) Clean output directory
 * 3) Compile backend with esbuild
 * 4) Build frontend:
 *    - If vite config exists: run `vite build`
 *    - Otherwise: copy plain HTML assets
 * 5) Copy manifest + locales + assets
 */

import path from 'path';
import fs from 'fs';
import fsp from 'fs/promises';
import { spawnSync } from 'child_process';
import { readValidateManifestFile } from '../../utils/manifest-validator.js';
import { buildBackend, copyManifest, copyDir } from '../../utils/builder.js';
import logger from '../../utils/logger.js';

const RM_RECURSIVE = {
  recursive: true,
  force: true,
  maxRetries: 15,
  retryDelay: 100
};

/**
 * Remove a file or directory tree; retries on transient Windows lock errors.
 * @param {string} targetPath
 */
async function removePathRobust(targetPath) {
  await fsp.rm(targetPath, RM_RECURSIVE);
}

/**
 * Empty plugin output directory for a fresh build.
 * @param {string} outDir
 * @param {object} [opts]
 * @param {boolean} [opts.preserveDistLogs] If true, keep `outDir/logs` (dev: host may hold log files open on Windows).
 */
async function cleanOutputDirectory(outDir, { preserveDistLogs = false } = {}) {
  if (!fs.existsSync(outDir)) {
    return;
  }
  if (preserveDistLogs) {
    const entries = await fsp.readdir(outDir, { withFileTypes: true });
    for (const ent of entries) {
      if (ent.name === 'logs') {
        continue;
      }
      await removePathRobust(path.join(outDir, ent.name));
    }
  } else {
    await removePathRobust(outDir);
  }
}

function listManifestHtmlEntries(manifest) {
  const e = manifest?.entry ?? {};
  return [e.unitFunctionEditor, e.unitAppearanceEditor, e.unitView, e.configPage].filter(Boolean);
}

/**
 * @param {object} options
 * @param {string} [options.pluginDir]  - Plugin root (default: cwd)
 * @param {string} [options.outDir]     - Output directory (default: pluginDir/dist)
 * @param {boolean} [options.minify]    - Minify backend bundle
 * @param {boolean} [options.preserveDistLogs] - Dev: do not delete outDir/logs (avoids ENOTEMPTY while plugin runs)
 */
export async function buildV2Command(options = {}) {
  const pluginDir = path.resolve(options.pluginDir ?? process.cwd());
  const outDir = path.resolve(options.outDir ?? path.join(pluginDir, 'dist'));

  logger.info(`Building plugin at ${pluginDir}`);

  // 1) Validate manifest
  const manifestPath = path.join(pluginDir, 'manifest.json');
  const manifestResult = readValidateManifestFile(manifestPath);
  if (!manifestResult.ok) {
    if (manifestResult.missing) {
      logger.error(`manifest.json not found in ${pluginDir}`);
      logger.error('Fix: Make sure you are in the plugin root directory, or use --plugin-dir <path>');
    } else {
      logger.error('manifest.json validation failed:');
      for (const e of manifestResult.errors) logger.error(`  - ${e}`);
      logger.error('Fix: Review manifest.json against the FlexSDK2 documentation');
    }
    return false;
  }
  const rawManifest = manifestResult.manifest;
  for (const w of manifestResult.warnings ?? []) {
    logger.warn(`manifest.json: ${w}`);
  }

  logger.info(`[1/5] Manifest valid: ${rawManifest.name} v${rawManifest.version}`);

  // 2) Clean output directory
  await cleanOutputDirectory(outDir, { preserveDistLogs: options.preserveDistLogs ?? false });
  await fsp.mkdir(outDir, { recursive: true });
  logger.info('[2/5] Output directory cleaned');

  // 3) Compile backend
  const buildResult = await buildBackend({
    pluginDir,
    outDir,
    minify: options.minify ?? false
  });

  if (!buildResult.success) {
    logger.error(`Backend compilation failed: ${buildResult.error}`);
    logger.error('Fix: Check TypeScript errors in your backend source');
    return false;
  }
  logger.info('[3/5] Backend compiled');

  // 4) Build frontend
  const hasFrontendEntries = listManifestHtmlEntries(rawManifest).length > 0;

  if (hasFrontendEntries) {
    const hasViteConfig = ['vite.config.ts', 'vite.config.js', 'vite.config.mjs'].some(
      (f) => fs.existsSync(path.join(pluginDir, f))
    );

    if (hasViteConfig) {
      logger.info('[4/5] Building frontend with Vite (Vue3 + Vuetify3)...');
      const success = await runViteBuild(pluginDir);
      if (!success) {
        logger.error('Vite frontend build failed');
        logger.error('Fix: Check for Vue/TypeScript errors in your frontend components');
        return false;
      }
      logger.info('[4/5] Frontend built with Vite');
    } else {
      // No Vite config - copy plain HTML/CSS/JS assets
      logger.info('[4/5] Copying plain frontend assets...');
      const copied = await copyPlainFrontendAssets(pluginDir, outDir, rawManifest);
      if (!copied.success) {
        logger.error(copied.error);
        return false;
      }
      logger.info('[4/5] Frontend assets copied');
    }
  } else {
    logger.info('[4/5] No frontend entries declared, skipping');
  }

  // 5) Copy manifest + locales + static assets
  await copyManifest(pluginDir, outDir);
  await ensureRootHtmlAliases(outDir, rawManifest);
  logger.info('[5/5] Manifest and locales copied');

  logger.info(`Build complete -> ${outDir}`);
  return true;
}

/**
 * Run `vite build` in the plugin directory.
 * Vite outputs to outDir as configured in vite.config.ts.
 */
async function runViteBuild(pluginDir) {
  // Resolve vite binary: prefer local install, then global fallback
  const localBinDir = path.join(pluginDir, 'node_modules', '.bin');
  const localCandidates = process.platform === 'win32'
    ? ['vite.cmd', 'vite.exe', 'vite']
    : ['vite'];
  const localVite = localCandidates
    .map((name) => path.join(localBinDir, name))
    .find((p) => fs.existsSync(p));
  const viteBin = localVite ?? 'vite';

  const result = spawnSync(viteBin, ['build'], {
    cwd: pluginDir,
    stdio: 'inherit',
    shell: process.platform === 'win32'
  });

  return result.status === 0;
}

/**
 * Copy HTML/CSS/JS frontend assets for plugins without a Vite config.
 * Falls back to copying files declared in the manifest entry paths.
 */
async function copyPlainFrontendAssets(pluginDir, outDir, manifest) {
  const htmlFiles = listManifestHtmlEntries(manifest);
  let copiedCount = 0;

  for (const relPath of htmlFiles) {
    const fileName = path.basename(relPath);
    // Try src/frontend/<fileName> first, then the manifest path directly
    const candidates = [
      path.join(pluginDir, 'src', 'frontend', fileName),
      path.join(pluginDir, relPath)
    ];

    for (const srcFile of candidates) {
      if (fs.existsSync(srcFile)) {
        const destFile = path.join(outDir, relPath);
        await fsp.mkdir(path.dirname(destFile), { recursive: true });
        await fsp.copyFile(srcFile, destFile);
        copiedCount++;
        break;
      }
    }
  }

  if (htmlFiles.length > 0 && copiedCount === 0) {
    return {
      success: false,
      error: 'Frontend entries declared in manifest but no source HTML files were found.'
    };
  }
  return { success: true };
}

async function ensureRootHtmlAliases(outDir, manifest) {
  const entries = listManifestHtmlEntries(manifest);
  for (const relPath of entries) {
    const from = path.join(outDir, relPath);
    if (!fs.existsSync(from)) {
      logger.warn(
        `Entry HTML missing in build output: "${relPath}" (expected ${from}). ` +
          'Verify manifest.entry paths match Vite outDir.'
      );
      continue;
    }
    const to = path.join(outDir, path.basename(relPath));
    if (from === to) continue;
    await fsp.copyFile(from, to);
  }

  // Copy Vite-generated assets (including nested subdirs) to dist/assets for host URL compatibility.
  const nestedAssetsDir = path.join(outDir, 'src', 'frontend', 'assets');
  const rootAssetsDir = path.join(outDir, 'assets');
  if (fs.existsSync(nestedAssetsDir)) {
    await fsp.mkdir(rootAssetsDir, { recursive: true });
    await copyDir(nestedAssetsDir, rootAssetsDir);
    logger.debug(`Merged Vite assets recursively: ${nestedAssetsDir} -> ${rootAssetsDir}`);
  }
}
