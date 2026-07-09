import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import createV2Command, { formatV2CreateSuccessMessage } from '../src/commands/v2/create.js';
import { validateManifest } from '../src/utils/manifest-validator.js';
import { copyManifest } from '../src/utils/builder.js';


test('accepts chart permission in v2 manifest validation', () => {
  const result = validateManifest({
    schemaVersion: '1.0',
    uuid: '@tester/chart-plugin',
    name: 'Chart Plugin',
    permissions: ['chart'],
    entry: { backend: 'src/backend/index.js' }
  });

  assert.equal(result.valid, true, result.errors.join('\n'));
});

test('accepts websocket permission in v2 manifest validation', () => {
  const result = validateManifest({
    schemaVersion: '1.0',
    uuid: '@tester/websocket-plugin',
    name: 'WebSocket Plugin',
    permissions: ['websocket'],
    entry: { backend: 'src/backend/index.js' }
  });

  assert.equal(result.valid, true, result.errors.join('\n'));
});

test('accepts new sensitive permissions in v2 manifest validation', () => {
  const result = validateManifest({
    schemaVersion: '1.0',
    uuid: '@tester/sensitive-plugin',
    name: 'Sensitive Plugin',
    permissions: ['secrets', 'oauth', 'jobs'],
    entry: { backend: 'src/backend/index.js' }
  });

  assert.equal(result.valid, true, result.errors.join('\n'));
  assert.deepEqual(result.warnings, []);
});

test('accepts requiresNetwork and runtime metadata in v2 manifest validation', () => {
  const result = validateManifest({
    schemaVersion: '1.0',
    uuid: '@tester/runtime-plugin',
    name: 'Runtime Plugin',
    requiresNetwork: true,
    runtime: {
      startupTimeoutMs: 15000,
      expectedIdleMemoryMb: 96,
      expectedActiveMemoryMb: 256,
      backgroundService: true
    },
    entry: { backend: 'src/backend/index.js' }
  });

  assert.equal(result.valid, true, result.errors.join('\n'));
  assert.deepEqual(result.warnings, []);
});

test('rejects native plugins without explicit platforms', () => {
  const missingPlatforms = validateManifest({
    schemaVersion: '1.0',
    uuid: '@tester/native-plugin-missing-platforms',
    name: 'Native Plugin Missing Platforms',
    native: true,
    entry: { backend: 'src/backend/index.js' }
  });

  assert.equal(missingPlatforms.valid, false);
  assert.match(missingPlatforms.errors[0], /native/i);
  assert.match(missingPlatforms.errors[0], /platforms/i);

  const emptyPlatforms = validateManifest({
    schemaVersion: '1.0',
    uuid: '@tester/native-plugin-empty-platforms',
    name: 'Native Plugin Empty Platforms',
    native: true,
    platforms: [],
    entry: { backend: 'src/backend/index.js' }
  });

  assert.equal(emptyPlatforms.valid, false);
  assert.match(emptyPlatforms.errors[0], /native/i);
  assert.match(emptyPlatforms.errors[0], /platforms/i);
});

test('warns when network permissions are declared without requiresNetwork', () => {
  const result = validateManifest({
    schemaVersion: '1.0',
    uuid: '@tester/network-warning-plugin',
    name: 'Network Warning Plugin',
    permissions: ['http', 'websocket'],
    entry: { backend: 'src/backend/index.js' }
  });

  assert.equal(result.valid, true, result.errors.join('\n'));
  assert.equal(result.warnings.length, 1);
  assert.match(result.warnings[0], /requiresNetwork/);
  assert.match(result.warnings[0], /http/);
  assert.match(result.warnings[0], /websocket/);
});

test('warns when runtime startup timeout is outside the documented range', () => {
  const result = validateManifest({
    schemaVersion: '1.0',
    uuid: '@tester/runtime-warning-plugin',
    name: 'Runtime Warning Plugin',
    runtime: {
      startupTimeoutMs: 999999
    },
    entry: { backend: 'src/backend/index.js' }
  });

  assert.equal(result.valid, true, result.errors.join('\n'));
  assert.equal(result.warnings.length, 1);
  assert.match(result.warnings[0], /runtime\.startupTimeoutMs/);
  assert.match(result.warnings[0], /documented range/i);
});

test('accepts MassX and oled capability in v2 manifest validation', () => {
  const result = validateManifest({
    schemaVersion: '1.0',
    uuid: '@tester/massx-plugin',
    name: 'MassX Plugin',
    devices: ['MassX'],
    capabilities: ['oled'],
    entry: { backend: 'src/backend/index.js' }
  });

  assert.equal(result.valid, true, result.errors.join('\n'));
});

test('reports invalid manifest enum values with the rejected value and allowed values', () => {
  const result = validateManifest({
    schemaVersion: '1.0',
    uuid: '@tester/bad-permission-plugin',
    name: 'Bad Permission Plugin',
    permissions: ['http', 'badPermission'],
    entry: { backend: 'src/backend/index.js' }
  });

  assert.equal(result.valid, false);
  assert.equal(result.errors.length, 1);
  assert.match(result.errors[0], /\/permissions\/1/);
  assert.match(result.errors[0], /value "badPermission"/);
  assert.match(result.errors[0], /allowed values:/);
  assert.match(result.errors[0], /"http"/);
  assert.match(result.errors[0], /"websocket"/);
  assert.match(result.errors[0], /"pluginApi"/);
});

test('formats v2 create success output without logger prefixes', () => {
  const output = formatV2CreateSuccessMessage({
    name: 'Test',
    baseDir: 'C:\\Users\\tongy\\Desktop\\test',
    template: 'https://github.com/ENIAC-Tech/flex-plugin-template.git#master'
  });

  assert.equal(
    output,
    [
      '',
      'Created FlexStudio v2 plugin "Test"',
      '',
      'Path:',
      '  C:\\Users\\tongy\\Desktop\\test',
      '',
      'Template:',
      '  https://github.com/ENIAC-Tech/flex-plugin-template.git#master',
      '',
      'Agent skill:',
      '  .agents/skills/flexstudio-plugin-developer/SKILL.md',
      '',
      'Next steps:',
      '  cd test',
      '  npm install',
      '  npm run build',
      '  npm run dev'
    ].join('\n')
  );
  assert.equal(output.includes('> LOG'), false);
});

test('creates v2 project from a local template path', async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'flexcli-create-'));
  const template = path.join(root, 'template');
  const target = path.join(root, 'target-plugin');
  const previousTemplatePath = process.env.FLEX_PLUGIN_TEMPLATE_PATH;

  fs.mkdirSync(path.join(template, 'src', 'backend'), { recursive: true });
  fs.mkdirSync(path.join(template, 'locales'), { recursive: true });
  fs.mkdirSync(path.join(template, '.git'), { recursive: true });
  fs.writeFileSync(path.join(template, '.git', 'HEAD'), 'ref: refs/heads/main\n');
  fs.writeFileSync(
    path.join(template, 'manifest.json'),
    JSON.stringify({
      uuid: '@your-username/your-plugin-name',
      name: 'Your Plugin Name',
      repo: 'https://github.com/your-username/your-plugin-name',
      description: 'A short description of your plugin.',
      author: { name: 'Your Name', email: 'you@example.com' }
    }, null, 2)
  );
  fs.writeFileSync(
    path.join(template, 'package.json'),
    JSON.stringify({
      name: 'your-plugin-name',
      version: '1.0.0',
      description: 'A FlexStudio plugin'
    }, null, 2)
  );
  fs.writeFileSync(
    path.join(template, 'src', 'backend', 'index.ts'),
    [
      "const PLUGIN_UUID = '@your-username/your-plugin-name';",
      'export default class YourPlugin {',
      "  revision = '1';",
      "  libraryName = 'Your Plugin';",
      '}'
    ].join('\n')
  );
  fs.writeFileSync(
    path.join(template, 'README.md'),
    ['# Your Plugin Name', '', 'A short description of your plugin.', '', 'FlexDesigner dev notes.'].join('\n')
  );
  fs.writeFileSync(path.join(template, 'locales', 'en.json'), '{}');

  process.env.FLEX_PLUGIN_TEMPLATE_PATH = template;
  t.after(() => {
    if (previousTemplatePath === undefined) {
      delete process.env.FLEX_PLUGIN_TEMPLATE_PATH;
    } else {
      process.env.FLEX_PLUGIN_TEMPLATE_PATH = previousTemplatePath;
    }
    fs.rmSync(root, { recursive: true, force: true });
  });

  const result = await createV2Command({
    name: 'My Plugin',
    pluginPath: target,
    author: 'Tester',
    uuid: '@tester/my-plugin',
    version: '2.3.4',
    description: 'Created from the shared template.'
  });

  assert.equal(result.baseDir, target);
  assert.equal(result.template, template);
  assert.equal(fs.existsSync(path.join(target, '.git')), false);

  const manifest = JSON.parse(fs.readFileSync(path.join(target, 'manifest.json'), 'utf8'));
  assert.equal(manifest.uuid, '@tester/my-plugin');
  assert.equal(manifest.name, 'My Plugin');
  assert.equal(manifest.repo, 'https://github.com/tester/my-plugin');
  assert.deepEqual(manifest.author, { name: 'Tester', email: 'you@example.com' });

  const packageJson = JSON.parse(fs.readFileSync(path.join(target, 'package.json'), 'utf8'));
  assert.equal(packageJson.name, 'my-plugin');
  assert.equal(packageJson.version, '2.3.4');

  const backend = fs.readFileSync(path.join(target, 'src', 'backend', 'index.ts'), 'utf8');
  assert.match(backend, /@tester\/my-plugin/);
  assert.match(backend, /class MyPluginPlugin/);
  assert.match(backend, /revision = '2.3.4'/);

  const readme = fs.readFileSync(path.join(target, 'README.md'), 'utf8');
  assert.match(readme, /^# My Plugin/m);
  assert.match(readme, /Created from the shared template\./);
  assert.equal(readme.includes('FlexDesigner'), false);

  const locale = JSON.parse(fs.readFileSync(path.join(target, 'locales', 'en.json'), 'utf8'));
  assert.equal(locale['@tester/my-plugin.exampleUnit.name'], 'Example Unit');
  assert.equal(locale['actions.saveSettings'], 'Save Settings');
});

test('copies package.json into v2 build output metadata', async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'flexcli-copy-metadata-'));
  const pluginDir = path.join(root, 'plugin');
  const outDir = path.join(root, 'dist');
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));

  fs.mkdirSync(pluginDir, { recursive: true });
  fs.writeFileSync(
    path.join(pluginDir, 'manifest.json'),
    JSON.stringify({
      schemaVersion: '1.0',
      uuid: '@tester/plugin',
      name: 'Plugin',
      permissions: [],
      entry: { backend: 'backend.js' }
    }),
    'utf8'
  );
  fs.writeFileSync(
    path.join(pluginDir, 'package.json'),
    JSON.stringify({ name: 'plugin', version: '1.2.3' }),
    'utf8'
  );

  await copyManifest(pluginDir, outDir);

  const packageJson = JSON.parse(fs.readFileSync(path.join(outDir, 'package.json'), 'utf8'));
  assert.equal(packageJson.version, '1.2.3');
});
