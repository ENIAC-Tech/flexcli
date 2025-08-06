#!/usr/bin/env node

// index.js
import { Command } from 'commander';
import WebSocketClient from './utils/websocket_client.js';
import inquirer from 'inquirer';
import logger from './utils/logger.js';
import fs from 'fs';
import path from 'path';
import os from 'os';

import linkCommand from './commands/link.js';
import restartCommand from './commands/restart.js';
import unlinkCommand from './commands/unlink.js';
import debugCommand from './commands/debug.js';
import listCommand from './commands/list.js';
import packCommand from './commands/pack.js';
import installCommand from './commands/install.js';
import uninstallCommand from './commands/uninstall.js';
import validateCommand from './commands/validate.js';
import createCommand from './commands/create.js';
import killCommand from './commands/kill.js';

// Get port number from user data directory
function getPortFromFile() {
  try {
    let userDataDir;
    
    // Determine user data directory based on operating system
    if (process.platform === 'win32') {
      userDataDir = path.join(process.env.APPDATA, 'FlexDesigner', 'data', 'temp');
    } else if (process.platform === 'darwin') {
      userDataDir = path.join(os.homedir(), 'Library', 'Application Support', 'FlexDesigner', 'data', 'temp');
    } else {
      // Linux and other systems
      userDataDir = path.join(os.homedir(), '.config', 'FlexDesigner', 'data', 'temp');
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
      const port = getPort(program.opts().port);
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
  .description('Create a basic plugin workspace')
  .action(async () => {
    try {
      const answers = await inquirer.prompt([
        {
          type: 'input',
          name: 'name',
          message: 'Plugin name (e.g. "MyPlugin"):',
          default: 'MyPlugin'
        },
        {
          type: 'input',
          name: 'pluginPath',
          message: 'Plugin path:',
          default: (ans) => {
            return ans.name
          }
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
          message: 'Reversed domain UUID (e.g. "com.author.myplugin"):',
          default: (ans) => {
            const sanitizedAuthor = ans.author.replace(/\s+/g, '_').replace(/[^a-zA-Z_]/g, '');
            const sanitizedName = ans.name.replace(/\s+/g, '_').replace(/[^a-zA-Z_]/g, '');
            return `com.${sanitizedAuthor.toLowerCase()}.${sanitizedName.toLowerCase()}`;
          },
          validate: (input) => {
            // only letters, underscores, and dots are allowed
            if (!/^[a-zA-Z._]+$/.test(input)) {
              return 'Invalid UUID. Only letters, underscores, and dots are allowed.';
            }
            // must have 3 domains
            if (input.split('.').length != 3) {
              return 'Invalid UUID. Must have 3 domains.';
            }
            // too long
            if (input.length > 50) {
              return 'Invalid UUID. Too long.';
            }
            // domain too short
            for (const domain of input.split('.').slice(1)) {
              if (domain.length < 2) {
                return `Invalid UUID. Domain "${domain}" is too short.`;
              }
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
          message: 'Description (e.g. "My Plugin Description"):'
        },
        {
          type: 'input',
          name: 'repo',
          message: 'Repo (e.g. "https://github.com/ENIAC-Tech/FlexDesigner-SDK"):'
        }
      ]);

      await createCommand(answers);
      logger.info(`Workspace for plugin "${answers.name}" created successfully.`);
    } catch (error) {
      logger.error(`Error creating plugin workspace: ${error.message}`);
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
