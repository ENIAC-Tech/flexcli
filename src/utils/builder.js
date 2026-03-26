/**
 * @file builder.js
 * @brief Plugin build utilities — compiles backend TypeScript; manifest/locale/asset copy lives in build command
 *
 * Used by the `plugin-v2 build` command.
 */

import { build as esbuild } from 'esbuild';
import path from 'path';
import fs from 'fs';
import fsp from 'fs/promises';

/**
 * Compile the plugin backend using esbuild
 * @param {object} config
 * @param {string} config.pluginDir   - Plugin root directory
 * @param {string} config.outDir      - Build output directory
 * @param {boolean} [config.watch]    - Watch mode (returns esbuild context handle)
 * @param {boolean} [config.minify]   - Minify output
 * @returns {Promise<{success: boolean, error?: string, ctx?: import('esbuild').BuildContext}>}
 */
export async function buildBackend(config) {
  const { pluginDir, outDir, watch = false, minify = false } = config;

  const manifestPath = path.join(pluginDir, 'manifest.json');
  if (!fs.existsSync(manifestPath)) {
    return { success: false, error: `manifest.json not found in ${pluginDir}` };
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  const backendEntry = manifest.entry?.backend;
  if (!backendEntry) {
    return { success: false, error: 'manifest.entry.backend is not defined' };
  }

  // Resolve source entry: the manifest entry path is relative to the plugin root
  // But during development, we look for the TypeScript source
  const distRelative = backendEntry; // e.g. "src/backend/index.js"
  const srcRelative = distRelative.replace(/\.js$/, '.ts');

  // Try TypeScript source first, then JS
  const srcPaths = [
    path.join(pluginDir, 'src', 'backend', 'index.ts'),
    path.join(pluginDir, srcRelative),
    path.join(pluginDir, distRelative.replace(/\.js$/, '.ts'))
  ];

  let entryPoint = null;
  for (const p of srcPaths) {
    if (fs.existsSync(p)) { entryPoint = p; break; }
  }

  if (!entryPoint) {
    return { success: false, error: `Backend entry point not found. Tried: ${srcPaths.join(', ')}` };
  }

  const outFile = path.join(outDir, distRelative);
  await fsp.mkdir(path.dirname(outFile), { recursive: true });

  const buildOptions = {
    entryPoints: [entryPoint],
    outfile: outFile,
    bundle: true,
    platform: 'node',
    target: 'node18',
    format: 'cjs',
    sourcemap: !minify,
    minify,
    // Native .node binaries and native canvas are loaded at runtime, not bundled
    external: ['*.node', 'electron', '@napi-rs/canvas'],
    logLevel: 'silent'
  };

  try {
    if (watch) {
      const { context } = await import('esbuild');
      const ctx = await context(buildOptions);
      await ctx.watch();
      return { success: true, ctx };
    } else {
      await esbuild(buildOptions);
      return { success: true };
    }
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Copy manifest.json and locale files to output directory
 * @param {string} pluginDir
 * @param {string} outDir
 */
export async function copyManifest(pluginDir, outDir) {
  await fsp.mkdir(outDir, { recursive: true });
  await fsp.copyFile(path.join(pluginDir, 'manifest.json'), path.join(outDir, 'manifest.json'));

  // Copy locales if present
  const localesDir = path.join(pluginDir, 'locales');
  if (fs.existsSync(localesDir)) {
    const destLocales = path.join(outDir, 'locales');
    await fsp.mkdir(destLocales, { recursive: true });
    const files = await fsp.readdir(localesDir);
    for (const f of files) {
      await fsp.copyFile(path.join(localesDir, f), path.join(destLocales, f));
    }
  }

  // Copy assets if present
  const assetsDir = path.join(pluginDir, 'assets');
  if (fs.existsSync(assetsDir)) {
    await copyDir(assetsDir, path.join(outDir, 'assets'));
  }
}

/**
 * Recursively copy a directory tree (files and subdirectories).
 * @param {string} src
 * @param {string} dest
 */
export async function copyDir(src, dest) {
  await fsp.mkdir(dest, { recursive: true });
  const entries = await fsp.readdir(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      await copyDir(srcPath, destPath);
    } else {
      await fsp.copyFile(srcPath, destPath);
    }
  }
}
