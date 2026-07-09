/**
 * @file commands/v2/create.js
 * @brief Create a FlexStudio v2 plugin project from the shared plugin template.
 */

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const DEFAULT_TEMPLATE_REPO = 'https://github.com/ENIAC-Tech/flex-plugin-template.git';
const DEFAULT_TEMPLATE_REF = 'master';
const TEMPLATE_UUID = '@your-username/your-plugin-name';
const TEMPLATE_NAME = 'Your Plugin Name';
const TEMPLATE_LIBRARY_NAME = 'Your Plugin';
const TEMPLATE_DESCRIPTION = 'A short description of your plugin.';

export default async function createV2Command(answers) {
  const { name, pluginPath } = answers;
  const baseDir = path.resolve(pluginPath);

  if (fs.existsSync(baseDir)) {
    throw new Error(`Directory already exists: ${baseDir}`);
  }

  const templateSource = resolveTemplateSource();

  try {
    materializeTemplate(templateSource, baseDir);
    parameterizeTemplate(baseDir, answers);
  } catch (error) {
    if (fs.existsSync(baseDir)) {
      fs.rmSync(baseDir, { recursive: true, force: true });
    }
    throw error;
  }

  return { name, baseDir, template: templateSource.label };
}

function resolveTemplateSource() {
  const localTemplatePath = process.env.FLEX_PLUGIN_TEMPLATE_PATH;
  if (localTemplatePath) {
    const templatePath = path.resolve(localTemplatePath);
    if (!fs.existsSync(templatePath)) {
      throw new Error(`Template path does not exist: ${templatePath}`);
    }
    return {
      type: 'local',
      path: templatePath,
      label: templatePath
    };
  }

  return {
    type: 'git',
    repo: process.env.FLEX_PLUGIN_TEMPLATE_REPO || DEFAULT_TEMPLATE_REPO,
    ref: process.env.FLEX_PLUGIN_TEMPLATE_REF || DEFAULT_TEMPLATE_REF,
    label: `${process.env.FLEX_PLUGIN_TEMPLATE_REPO || DEFAULT_TEMPLATE_REPO}#${process.env.FLEX_PLUGIN_TEMPLATE_REF || DEFAULT_TEMPLATE_REF}`
  };
}

function materializeTemplate(templateSource, targetDir) {
  if (templateSource.type === 'local') {
    copyLocalTemplate(templateSource.path, targetDir);
    return;
  }

  const args = ['clone', '--depth', '1'];
  if (templateSource.ref) {
    args.push('--branch', templateSource.ref);
  }
  args.push(templateSource.repo, targetDir);

  try {
    execFileSync('git', args, { stdio: 'inherit' });
  } catch (error) {
    throw new Error(`Failed to clone plugin template from ${templateSource.label}: ${error.message}`);
  }

  fs.rmSync(path.join(targetDir, '.git'), { recursive: true, force: true });
}

function copyLocalTemplate(templatePath, targetDir) {
  fs.cpSync(templatePath, targetDir, {
    recursive: true,
    filter: (source) => {
      const relative = path.relative(templatePath, source);
      if (!relative) return true;

      const parts = relative.split(path.sep);
      if (parts.some((part) => ['.git', 'node_modules', 'dist', '.tmp'].includes(part))) {
        return false;
      }

      return !source.endsWith('.flexplugin');
    }
  });
}

function parameterizeTemplate(baseDir, answers) {
  const { name, author, uuid, version, description } = answers;
  const manifestDescription = description || TEMPLATE_DESCRIPTION;
  const packageDescription = description || 'A FlexStudio plugin';
  const className = `${toPascalIdentifier(name)}Plugin`;

  updateJson(path.join(baseDir, 'manifest.json'), (manifest) => ({
    ...manifest,
    uuid,
    name,
    repo: repoUrlFromUuid(uuid),
    description: manifestDescription,
    author: {
      ...(manifest.author || {}),
      name: author,
      email: manifest.author?.email || ''
    }
  }));

  updateJson(path.join(baseDir, 'package.json'), (packageJson) => ({
    ...packageJson,
    name: toPackageName(name, uuid),
    version,
    description: packageDescription
  }));

  updateBackendEntry(path.join(baseDir, 'src', 'backend', 'index.ts'), {
    uuid,
    name,
    version,
    className
  });

  writeJson(path.join(baseDir, 'locales', 'en.json'), {
    [`${uuid}.exampleUnit.name`]: 'Example Unit',
    [`${uuid}.config.title`]: 'Plugin Settings',
    'actions.save': 'Save',
    'actions.saveAppearance': 'Save appearance',
    'actions.saveSettings': 'Save Settings',
    'appearance.unitNameLabel': 'Unit name',
    'config.defaultMessageLabel': 'Default Message',
    'message.default': 'Hello from plugin!',
    'unit.messageLabel': 'Message'
  });

  updateRootReadme(path.join(baseDir, 'README.md'), name, manifestDescription);
}

function repoUrlFromUuid(id) {
  if (id.startsWith('@')) {
    const rest = id.slice(1);
    if (!rest.includes('/')) {
      throw new Error(`Invalid marketplace UUID "${id}". Expected @owner/repo-name`);
    }
    return `https://github.com/${rest}`;
  }
  return `https://github.com/${id}`;
}

function updateJson(filePath, updater) {
  const current = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  writeJson(filePath, updater(current));
}

function writeJson(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

function updateBackendEntry(filePath, values) {
  if (!fs.existsSync(filePath)) return;

  let source = fs.readFileSync(filePath, 'utf8');
  source = source
    .replaceAll(TEMPLATE_UUID, values.uuid)
    .replaceAll(TEMPLATE_LIBRARY_NAME, values.name)
    .replaceAll('YourPlugin', values.className)
    .replace(/revision(\s*[:=]\s*)'[^']*'/, `revision$1'${values.version}'`);

  fs.writeFileSync(filePath, source, 'utf8');
}

function updateRootReadme(filePath, name, description) {
  if (!fs.existsSync(filePath)) return;

  let content = fs.readFileSync(filePath, 'utf8');
  content = content.replace(/^# .+$/m, `# ${name}`);
  content = content.replace(TEMPLATE_DESCRIPTION, description);
  content = content.replaceAll('FlexDesigner', 'FlexStudio');

  fs.writeFileSync(filePath, content, 'utf8');
}

function toPackageName(name, uuid) {
  const slug = slugify(name) || slugify(uuid.split('/').pop() || '') || 'flexstudio-plugin';
  return slug;
}

function slugify(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function toPascalIdentifier(value) {
  const words = String(value || '')
    .split(/[^a-zA-Z0-9]+/g)
    .filter(Boolean);

  const identifier = words
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
    .join('')
    .replace(/^[0-9]+/, '');

  return identifier || 'FlexStudio';
}

export function formatV2CreateSuccessMessage({ name, baseDir, template }) {
  const lines = [
    '',
    `Created FlexStudio v2 plugin "${name}"`,
    '',
    'Path:',
    `  ${baseDir}`
  ];

  if (template) {
    lines.push('', 'Template:', `  ${template}`);
  }

  lines.push(
    '',
    'Agent skill:',
    '  .agents/skills/flexstudio-plugin-developer/SKILL.md',
    '',
    'Next steps:',
    `  cd ${path.basename(baseDir)}`,
    '  npm install',
    '  npm run build',
    '  npm run dev'
  );

  return lines.join('\n');
}
