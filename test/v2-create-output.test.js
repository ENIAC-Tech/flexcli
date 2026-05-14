import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import createV2Command, { formatV2CreateSuccessMessage } from '../src/commands/v2/create.js';

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
});
