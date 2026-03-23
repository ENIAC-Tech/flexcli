// commands/v1/create.js
import fs from 'fs';
import path from 'path';
import Handlebars from 'handlebars';
import { 
  gitignoreTemplate,
  packageJsonTemplate,
  rollupConfigTemplate,
  manifestJsonTemplate,
  configJsonTemplate,
  pluginJsTemplate,
  counterUITemplate,
  readmeTemplate,
  githubCITemplate
} from '../../assets/templates.js';
import { exec } from 'child_process';
import ora from 'ora';

import logger from '../../utils/logger.js';

/**
 * Creates a basic workspace for a plugin.
 * @param {Object} answers - The user inputs from inquirer.
 */
export default async function createCommand(answers) {
  const { pluginPath, name, author, uuid, version, description, repo } = answers;

  const baseDir = path.resolve(pluginPath); 
  const pluginDir = path.join(baseDir, `${uuid}.plugin`);
  const srcDir = path.join(baseDir, 'src');
  const githubCIDir = path.join(baseDir, '.github', 'workflows');
  const resourcesDir = path.join(pluginDir, 'resources');

  fs.mkdirSync(pluginDir, { recursive: true });
  fs.mkdirSync(githubCIDir, { recursive: true });
  fs.mkdirSync(path.join(pluginDir, 'backend'), { recursive: true });
  fs.mkdirSync(path.join(pluginDir, 'logs'), { recursive: true });
  fs.mkdirSync(resourcesDir, { recursive: true });
  fs.mkdirSync(path.join(pluginDir, 'ui'), { recursive: true });
  fs.mkdirSync(srcDir, { recursive: true });

  createFile(baseDir, '.gitignore', gitignoreTemplate, { uuid });
  createFile(resourcesDir, '.gitkeep', '');
  createFile(githubCIDir, 'release.yml', githubCITemplate, { uuid });
  createFile(baseDir, 'package.json', packageJsonTemplate, { uuid });
  createFile(baseDir, 'rollup.config.mjs', rollupConfigTemplate, { uuid });
  createFile(pluginDir, 'manifest.json', manifestJsonTemplate, { name, author, uuid, version, description, repo });
  createFile(pluginDir, 'config.json', configJsonTemplate);
  createFile(srcDir, 'plugin.js', pluginJsTemplate, { uuid});
  createFile(path.join(pluginDir, 'ui'), 'counter.vue', counterUITemplate);
  createFile(baseDir, 'README.md', readmeTemplate, { name, description, author, repo });

  await installDependencies(baseDir);
}

function installDependencies(baseDir) {
  const spinner = ora('Installing dependencies').start();


  return new Promise((resolve, reject) => {
    exec('npm install', { cwd: baseDir }, (err, stdout, stderr) => {
      if (err) {
        logger.error(`Error installing dependencies: ${stderr || err.message}`);
        reject(err);
        spinner.fail('Failed to install dependencies');
        return;
      }
      resolve(stdout);
      spinner.succeed('Dependencies installed');
    });
  });
}

function createFile(basePath, filename, template, data = {}) {
  const compiledTemplate = Handlebars.compile(template);
  const content = compiledTemplate(data);
  fs.writeFileSync(path.join(basePath, filename), content, 'utf-8');
}
