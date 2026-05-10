#!/usr/bin/env node

// index.js
import { Command } from 'commander';
import WebSocketClient from './utils/websocket_client.js';
import inquirer from 'inquirer';
import logger from './utils/logger.js';
import fs from 'fs';
import path from 'path';
import os from 'os';

import linkCommand from './commands/v1/link.js';
import restartCommand from './commands/v1/restart.js';
import unlinkCommand from './commands/v1/unlink.js';
import debugCommand from './commands/v1/debug.js';
import listCommand from './commands/v1/list.js';
import packCommand from './commands/v1/pack.js';
import installCommand from './commands/v1/install.js';
import uninstallCommand from './commands/v1/uninstall.js';
import validateCommand from './commands/v1/validate.js';
import createCommand from './commands/v1/create.js';
import killCommand from './commands/v1/kill.js';
import createV2Command from './commands/v2/create.js';
import { createV2Client } from './commands/v2/control.js';
import { buildV2Command } from './commands/v2/build.js';
import { packV2Command } from './commands/v2/pack.js';
import { runV2DevCommand } from './commands/v2/dev.js';
import { validateV2PluginCommand } from './commands/v2/validate-plugin.js';
import { HOST_APP_V1, HOST_APP_V2 } from './constants/host-app.js';

// Get port number from user data directory (v1 host: FlexDesigner)
function getPortFromFile() {
  try {
    let userDataDir;
    
    // Determine user data directory based on operating system
    if (process.platform === 'win32') {
      userDataDir = path.join(process.env.APPDATA, HOST_APP_V1, 'data', 'temp');
    } else if (process.platform === 'darwin') {
      userDataDir = path.join(os.homedir(), 'Library', 'Application Support', HOST_APP_V1, 'data', 'temp');
    } else {
      // Linux and other systems
      userDataDir = path.join(os.homedir(), '.config', HOST_APP_V1, 'data', 'temp');
    }
    
    const portFilePath = path.join(userDataDir, 'plugin_port.txt');
    
    if (fs.existsSync(portFilePath)) {
      const port = fs.readFileSync(portFilePath, 'utf8').trim();
      // logger.debug(`Port read from file: ${port}`);
      return port;
    }
  } catch (error) {
    logger.error(`Error reading port file: ${error.message}`);
  }
  
  return '0'; // Return default value if reading fails
}

// Get actual port number
function getPort(specifiedPort) {
  if (specifiedPort === '0') {
    return getPortFromFile();
  }
  return specifiedPort;
}

const program = new Command();

program
  .version('1.0.0')
  .option('--port <number>', 'WebSocket server port', '0');

// Define 'plugin' command
const plugin = program.command('plugin').description('Plugin operations');

plugin
  .command('link')
  .description('Link a plugin')
  .requiredOption('--path <path>', 'Path to the folder')
  .requiredOption('--uuid <uuid>', 'UUID string')
  .option('--debug <debug>', 'Debug mode (true/false)', 'false')
  .option('--skip-validate', 'Skip validation', false)
  .option('--force', 'Override existed plugin', false)
  .option('--start <start>', 'Start the plugin after linking', 'true')
  .action(async (options) => {
    try {
      const port = getPort(program.opts().port);
      const wsClient = new WebSocketClient(port);
      await wsClient.connect();
      if (!options.skipValidate) {
        await validateCommand(null, { path: options.path });
      }
      await linkCommand(wsClient, options);
      wsClient.close();
    } catch (error) {
      logger.error(`Error executing link command: ${error.message}`);
      process.exit(1);
    }
  });

plugin
  .command('restart')
  .description('Restart a plugin')
  .requiredOption('--uuid <uuid>', 'UUID string')
  .action(async (options) => {
    try {
      const port = getPort(program.opts().port);
      const wsClient = new WebSocketClient(port);
      await wsClient.connect();
      await restartCommand(wsClient, options);
      wsClient.close();
    } catch (error) {
      logger.error(`Error executing restart command: ${error.message}`);
      process.exit(1);
    }
  });

plugin
  .command('unlink')
  .description('Unlink a plugin')
  .requiredOption('--uuid <uuid>', 'UUID string')
  .option('--silent', 'Silent mode', false)
  .action(async (options) => {
    try {
      const port = getPort(program.opts().port);
      const wsClient = new WebSocketClient(port);
      await wsClient.connect();
      await unlinkCommand(wsClient, options);
      wsClient.close();
    } catch (error) {
      logger.error(`Error executing unlink command: ${error.message}`);
      process.exit(1);
    }
  });

plugin
  .command('debug')
  .description('Debug a plugin')
  .requiredOption('--uuid <uuid>', 'UUID string')
  .action(async (options) => {
    try {
      const port = getPort(program.opts().port);
      const wsClient = new WebSocketClient(port);
      await wsClient.connect();
      await debugCommand(wsClient, options);
    } catch (error) {
      logger.error(`Error executing debug command: ${error.message}`);
      process.exit(1);
    }
  });

plugin
  .command('list')
  .description('List all plugins')
  .action(async () => {
    try {
      const port = getPort(program.opts().port);
      const wsClient = new WebSocketClient(port);
      await wsClient.connect();
      await listCommand(wsClient);
      wsClient.close();
    } catch (error) {
      logger.error(`Error executing list command: ${error.message}`);
      process.exit(1);
    }
  });

  plugin
  .command('pack')
  .description('Pack a plugin')
  .requiredOption('--path <path>', 'Path to the plugin directory')
  .option('--output <output>', 'Output path for the .flexplugin file')
  .option('--skip-validate', 'Skip validation', false)
  .action(async (options) => {
    try {
      if (!options.skipValidate) {
        await validateCommand(null, options);
      }
      await packCommand(null, options);
    } catch (error) {
      logger.error(`Error executing pack command: ${error.message}`);
      process.exit(1);
    }
  });

  plugin
  .command('install')
  .description('Install a plugin')
  .requiredOption('--path <path>', 'Path to the .flexplugin file')
  .option('--force', 'Force install', false)
  .action(async (options) => {
    try {
      if (!options.path.endsWith('.flexplugin')) {
        throw new Error('Invalid file extension. Please provide a .flexplugin file.');
      }
      const port = getPort(program.opts().port);
      const wsClient = new WebSocketClient(port);
      await wsClient.connect();
      await installCommand(wsClient, options);
      wsClient.close();
    } catch (error) {
      logger.error(`Error executing install command: ${error.message}`);
      process.exit(1);
    }
  });

  plugin
  .command('uninstall')
  .description('Uninstall a plugin')
  .requiredOption('--uuid <uuid>', 'Plugin UUID')
  .action(async (options) => {
    try {
      const port = getPort(program.opts().port);
      const wsClient = new WebSocketClient(port);
      await wsClient.connect();
      await uninstallCommand(wsClient, options);
      wsClient.close();
    } catch (error) {
      logger.error(`Error executing uninstall command: ${error.message}`);
      process.exit(1);
    }
  });

  plugin
  .command('validate')
  .description('Validate plugin structure and manifest')
  .requiredOption('--path <path>', 'Path to the plugin directory')
  .action(async (options) => {
    try {
      await validateCommand(null, options);
    } catch (error) {
      logger.error(`Error executing validate command: ${error.message}`);
      process.exit(1);
    }
  });

  plugin
  .command('create')
  .description('Create a plugin workspace (v1 or v2, default: v2)')
  .action(async () => {
    try {
      // Ask for version first
      const { sdkVersion } = await inquirer.prompt([
        {
          type: 'list',
          name: 'sdkVersion',
          message: `Plugin SDK version (v1: ${HOST_APP_V1}, v2: ${HOST_APP_V2}):`,
          choices: [
            { name: 'v2 (recommended: TypeScript + FlexSDK2, does not support flexbar v1)', value: 'v2' },
            { name: 'v1 (legacy: JavaScript + Rollup, only for flexbar v1)', value: 'v1' }
          ],
          default: 'v2'
        }
      ]);

      const commonQuestions = [
        {
          type: 'input',
          name: 'name',
          message: 'Plugin name (e.g. "MyPlugin"):',
          default: 'MyPlugin'
        },
        {
          type: 'input',
          name: 'pluginPath',
          message: 'Plugin directory path:',
          default: (ans) => ans.name.toLowerCase().replace(/\s+/g, '-')
        },
        {
          type: 'input',
          name: 'author',
          message: 'Author (e.g. "Author"):',
          default: 'Author'
        },
        {
          type: 'input',
          name: 'uuid',
          message:
            'Plugin UUID (marketplace: @owner/repo-name, or legacy reverse-domain com.author.plugin):',
          default: (ans) => {
            const slug = ans.name
              .toLowerCase()
              .replace(/\s+/g, '-')
              .replace(/[^a-z0-9._-]/g, '');
            const owner =
              String(ans.author || 'owner')
                .toLowerCase()
                .replace(/\s+/g, '-')
                .replace(/[^a-z0-9._-]/g, '') || 'owner';
            return `@${owner}/${slug}`;
          },
          validate: (input) => {
            if (input.startsWith('@')) {
              if (!/^@[a-zA-Z0-9_-]+\/[a-zA-Z0-9._-]+$/.test(input)) {
                return 'Invalid marketplace UUID. Use @owner/repo-name (e.g. @ENIAC-Tech/my-plugin).';
              }
              if (input.length > 150) {
                return 'Invalid UUID. Too long.';
              }
              return true;
            }
            if (!/^[a-zA-Z0-9._-]+$/.test(input)) {
              return 'Invalid UUID. Use letters, numbers, dots, hyphens, and underscores only.';
            }
            if (input.split('.').length < 2) {
              return 'Invalid UUID. Must have at least 2 domain parts (e.g. com.author.name).';
            }
            if (input.length > 100) {
              return 'Invalid UUID. Too long (max 100 chars).';
            }
            return true;
          }
        },
        {
          type: 'input',
          name: 'version',
          message: 'Version (e.g. "1.0.0"):',
          default: '1.0.0',
          validate: (input) => {
            if (!/^\d+\.\d+\.\d+$/.test(input)) {
              return 'Invalid version. Must be in the format "x.y.z".';
            }
            return true;
          }
        },
        {
          type: 'input',
          name: 'description',
          message: 'Description (optional):'
        }
      ];

      if (sdkVersion === 'v1') {
        // v1 also needs repo field
        commonQuestions.push({
          type: 'input',
          name: 'repo',
          message: 'Repository URL (optional):'
        });
      }

      const answers = await inquirer.prompt(commonQuestions);
      answers.sdkVersion = sdkVersion;

      if (sdkVersion === 'v2') {
        await createV2Command(answers);
        logger.info(`\n✓ v2 Plugin workspace "${answers.name}" created at: ${answers.pluginPath}`);
        logger.info('Run: cd ' + answers.pluginPath + ' && npm install && npm run build');
      } else {
        await createCommand(answers);
        logger.info(`Workspace for plugin "${answers.name}" created successfully.`);
      }
    } catch (error) {
      logger.error(`Error creating plugin workspace: ${error.message}`);
      process.exit(1);
    }
  });

// ── v2 plugin management commands ─────────────────────────────────────────────
const pluginV2 = program.command('plugin-v2').description(`${HOST_APP_V2} plugin management (v2 API)`);

pluginV2
  .command('list')
  .description('List all v2 plugins')
  .option('--host <host>', 'WS host', '127.0.0.1')
  .option('--port <port>', 'WS port', '34579')
  .option('--token <token>', 'Auth token (optional in dev; or FLEX_WS_TOKEN / PLUGIN_WS_TOKEN)')
  .action(async (options) => {
    try {
      const client = await createV2Client(options);
      const plugins = await client.command('listPlugins');
      console.log(JSON.stringify(plugins, null, 2));
      client.disconnect();
    } catch (err) {
      logger.error(`Error: ${err.message}`);
      process.exit(1);
    }
  });

pluginV2
  .command('install <source>')
  .description('Install a v2 plugin from directory or zip')
  .option('--host <host>', 'WS host', '127.0.0.1')
  .option('--port <port>', 'WS port', '34579')
  .option('--token <token>', 'Auth token (or FLEX_WS_TOKEN / PLUGIN_WS_TOKEN env var)')
  .action(async (source, options) => {
    try {
      const client = await createV2Client(options);
      const result = await client.command('installPlugin', { sourcePath: path.resolve(source) });
      if (result?.success === false) {
        logger.error(`Installation failed: ${result.error}`);
      } else {
        logger.info('Plugin installed successfully');
      }
      client.disconnect();
    } catch (err) {
      logger.error(`Error: ${err.message}`);
      process.exit(1);
    }
  });

pluginV2
  .command('uninstall <uuid>')
  .description('Uninstall a v2 plugin')
  .option('--host <host>', 'WS host', '127.0.0.1')
  .option('--port <port>', 'WS port', '34579')
  .option('--token <token>', 'Auth token (or FLEX_WS_TOKEN / PLUGIN_WS_TOKEN env var)')
  .action(async (uuid, options) => {
    try {
      const client = await createV2Client(options);
      const result = await client.command('uninstallPlugin', { pluginUUID: uuid });
      if (result?.success === false) {
        logger.error(`Uninstall failed: ${result.error ?? 'unknown error'}`);
        process.exitCode = 1;
      } else {
        logger.info(`Plugin ${uuid} uninstalled`);
      }
      client.disconnect();
    } catch (err) {
      logger.error(`Error: ${err.message}`);
      process.exit(1);
    }
  });

pluginV2
  .command('enable <uuid>')
  .description('Enable a v2 plugin')
  .option('--host <host>', 'WS host', '127.0.0.1')
  .option('--port <port>', 'WS port', '34579')
  .option('--token <token>', 'Auth token (optional in dev; or FLEX_WS_TOKEN / PLUGIN_WS_TOKEN)')
  .action(async (uuid, options) => {
    try {
      const client = await createV2Client(options);
      await client.command('enablePlugin', { pluginUUID: uuid });
      logger.info(`Plugin ${uuid} enabled`);
      client.disconnect();
    } catch (err) {
      logger.error(`Error: ${err.message}`);
      process.exit(1);
    }
  });

pluginV2
  .command('disable <uuid>')
  .description('Disable a v2 plugin')
  .option('--host <host>', 'WS host', '127.0.0.1')
  .option('--port <port>', 'WS port', '34579')
  .option('--token <token>', 'Auth token (optional in dev; or FLEX_WS_TOKEN / PLUGIN_WS_TOKEN)')
  .action(async (uuid, options) => {
    try {
      const client = await createV2Client(options);
      await client.command('disablePlugin', { pluginUUID: uuid });
      logger.info(`Plugin ${uuid} disabled`);
      client.disconnect();
    } catch (err) {
      logger.error(`Error: ${err.message}`);
      process.exit(1);
    }
  });

pluginV2
  .command('reload <uuid>')
  .description('Hot-reload a v2 plugin')
  .option('--host <host>', 'WS host', '127.0.0.1')
  .option('--port <port>', 'WS port', '34579')
  .option('--token <token>', 'Auth token (optional in dev; or FLEX_WS_TOKEN / PLUGIN_WS_TOKEN)')
  .action(async (uuid, options) => {
    try {
      const client = await createV2Client(options);
      await client.command('reloadPlugin', { pluginUUID: uuid });
      logger.info(`Plugin ${uuid} reloaded`);
      client.disconnect();
    } catch (err) {
      logger.error(`Error: ${err.message}`);
      process.exit(1);
    }
  });

pluginV2
  .command('logs <uuid>')
  .description('Stream live logs from a v2 plugin')
  .option('--host <host>', 'WS host', '127.0.0.1')
  .option('--port <port>', 'WS port', '34579')
  .option('--token <token>', 'Auth token (optional in dev; or FLEX_WS_TOKEN / PLUGIN_WS_TOKEN)')
  .action(async (uuid, options) => {
    try {
      const client = await createV2Client(options);

      const result = await client.command('subscribeLogs', { pluginUUID: uuid });

      // Print ring buffer replay
      if (result?.replay?.length > 0) {
        logger.info(`--- Last ${result.replay.length} log entries ---`);
        for (const entry of result.replay) {
          const ts = new Date(entry.timestamp).toLocaleTimeString();
          const line = `${ts} [${entry.source}] ${entry.message}`;
          const level = ['debug', 'info', 'warn', 'error'].includes(entry.level) ? entry.level : 'info';
          logger[level](line);
          if (entry.data !== undefined) {
            logger[level]('  ' + JSON.stringify(entry.data));
          }
        }
        logger.info('--- Live logs follow ---');
      }

      // Set up live handler
      client.ws.on('message', (raw) => {
        try {
          const msg = JSON.parse(raw.toString());
          if (msg.type === 'log' && msg.data?.pluginUUID === uuid) {
            const entry = msg.data;
            const ts = new Date(entry.timestamp).toLocaleTimeString();
            const line = `${ts} [${entry.source}] ${entry.message}`;
            const level = ['debug', 'info', 'warn', 'error'].includes(entry.level) ? entry.level : 'info';
            logger[level](line);
            if (entry.data !== undefined) logger[level]('  ' + JSON.stringify(entry.data));
          }
        } catch {}
      });

      logger.info(`Streaming logs for ${uuid}. Press Ctrl+C to stop.`);
      process.on('SIGINT', () => { client.disconnect(); process.exit(0); });
      await new Promise(() => {});
    } catch (err) {
      logger.error(`Error: ${err.message}`);
      process.exit(1);
    }
  });

pluginV2
  .command('dev <plugin-dir>')
  .description('Build and mount a v2 plugin directory for development (watch + auto reload)')
  .option('--host <host>', 'WS host', '127.0.0.1')
  .option('--port <port>', 'WS port', '34579')
  .option('--token <token>', 'Auth token (optional in dev; or FLEX_WS_TOKEN / PLUGIN_WS_TOKEN)')
  .action(async (pluginDir, options) => {
    try {
      await runV2DevCommand(pluginDir, options);
    } catch (err) {
      logger.error(`Error: ${err.message}`);
      process.exit(1);
    }
  });

pluginV2
  .command('validate')
  .description('Validate manifest.json and/or a PluginDefinitionsPayload JSON file (canvas/custom/standard rules)')
  .option('--plugin-dir <dir>', 'Plugin root directory (default: cwd)')
  .option('--definitions <file>', 'Path to definitions JSON (libraries + units) for schema + consistency checks')
  .option('--skip-manifest', 'Only validate --definitions (skip manifest.json)', false)
  .action(async (options) => {
    try {
      const ok = await validateV2PluginCommand({
        pluginDir: options.pluginDir,
        definitions: options.definitions,
        skipManifest: options.skipManifest
      });
      if (!ok) process.exit(1);
    } catch (err) {
      logger.error(`Validate failed: ${err.message}`);
      process.exit(1);
    }
  });

pluginV2
  .command('build')
  .description('Compile and assemble a v2 plugin for distribution')
  .option('--plugin-dir <dir>', 'Plugin root directory (default: cwd)')
  .option('--out-dir <dir>', 'Output directory (default: <plugin-dir>/dist)')
  .option('--minify', 'Minify backend bundle', false)
  .action(async (options) => {
    try {
      const success = await buildV2Command({
        pluginDir: options.pluginDir,
        outDir: options.outDir,
        minify: options.minify
      });
      if (!success) process.exit(1);
    } catch (err) {
      logger.error(`Build failed: ${err.message}`);
      process.exit(1);
    }
  });

pluginV2
  .command('pack')
  .description('Package a built v2 plugin into a .flexplugin archive (zip-based)')
  .option('--dist-dir <dir>', 'Built plugin directory (default: cwd/dist)')
  .option('--output <path>', 'Output .flexplugin path (overrides default naming)')
  .option('--platform <platform>', 'Target platform (win32-x64, darwin-arm64, darwin-x64, linux-x64). Defaults to "universal" for non-native plugins.')
  .action(async (options) => {
    try {
      const result = await packV2Command({
        distDir: options.distDir,
        output: options.output,
        platform: options.platform
      });
      if (!result) process.exit(1);
    } catch (err) {
      logger.error(`Pack failed: ${err.message}`);
      process.exit(1);
    }
  });

pluginV2
  .command('diagnostics')
  .description('Get diagnostics from the v2 plugin system')
  .option('--host <host>', 'WS host', '127.0.0.1')
  .option('--port <port>', 'WS port', '34579')
  .option('--token <token>', 'Auth token (optional in dev; or FLEX_WS_TOKEN / PLUGIN_WS_TOKEN)')
  .action(async (options) => {
    try {
      const client = await createV2Client(options);
      const diag = await client.command('getDiagnostics');
      console.log(JSON.stringify(diag, null, 2));
      client.disconnect();
    } catch (err) {
      logger.error(`Error: ${err.message}`);
      process.exit(1);
    }
  });

plugin
  .command('kill')
  .description('Kill a running plugin')
  .requiredOption('--uuid <uuid>', 'UUID of the plugin to kill')
  .action(async (options) => {
    try {
      const port = program.opts().port;
      const wsClient = new WebSocketClient(port);
      await wsClient.connect();
      await killCommand(wsClient, options);
      wsClient.close();
    } catch (error) {
      logger.error(`Error executing kill command: ${error.message}`);
    }
  });

program.parse(process.argv);
