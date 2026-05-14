/**
 * @file commands/v2/create.js
 * @brief Scaffold a FlexStudio v2 plugin project (Vue3 + Vuetify3 + TypeScript)
 */

import fs from 'fs';
import path from 'path';

export default async function createV2Command(answers) {
  const { name, pluginPath, author, uuid, version, description } = answers;
  const baseDir = path.resolve(pluginPath);

  if (fs.existsSync(baseDir)) {
    throw new Error(`Directory already exists: ${baseDir}`);
  }

  const dirs = [
    baseDir,
    path.join(baseDir, '.github', 'workflows'),
    path.join(baseDir, '.marketplace'),
    path.join(baseDir, 'src', 'backend'),
    path.join(baseDir, 'src', 'frontend'),
    path.join(baseDir, 'locales')
  ];
  dirs.forEach((dir) => fs.mkdirSync(dir, { recursive: true }));

  const safeName = name.replace(/[^a-zA-Z0-9]/g, '');
  const packageName = name.toLowerCase().replace(/\s+/g, '-');

  const manifestDescription = description || 'A short description of your plugin.';
  const packageDescription = description || 'A FlexStudio plugin';

  /** GitHub repo URL for manifest.repo (supports marketplace UUID @org/repo-name). */
  const repoUrlFromUuid = (id) => {
    if (id.startsWith('@')) {
      const rest = id.slice(1);
      if (!rest.includes('/')) {
        throw new Error(`Invalid marketplace UUID "${id}". Expected @owner/repo-name`);
      }
      return `https://github.com/${rest}`;
    }
    return `https://github.com/${id}`;
  };

  const manifest = {
    schemaVersion: '1.0',
    uuid,
    name,
    repo: repoUrlFromUuid(uuid),
    description: manifestDescription,
    author: { name: author, email: '' },
    minHostVersion: '1.0.0',
    native: false,
    platforms: ['win32-x64', 'darwin-arm64', 'darwin-x64', 'linux-x64'],
    devices: ['flow2pro', 'flexbar', 'flex2'],
    requiredCapabilities: [],
    permissions: ['store', 'logger', 'device', 'definitions', 'bus', 'unit', 'ui'],
    dependencies: [],
    hasConfigPage: true,
    entry: {
      backend: 'src/backend/index.js',
      unitFunctionEditor: 'src/frontend/unit-function-editor.html',
      unitAppearanceEditor: 'src/frontend/unit-appearance-editor.html',
      unitView: 'src/frontend/unit-view.html',
      configPage: 'src/frontend/config-page.html'
    },
    defaultLocale: 'en',
    supportedLocales: ['en']
  };
  writeJson(path.join(baseDir, 'manifest.json'), manifest);

  const packageJson = {
    name: packageName,
    version,
    private: true,
    description: packageDescription,
    scripts: {
      build: 'flexcli plugin-v2 build',
      dev: 'flexcli plugin-v2 dev .',
      pack: 'flexcli plugin-v2 pack'
    },
    dependencies: {
      '@flexsdk/runtime': '^2.1.0',
      '@flexsdk/types': '^2.1.0'
    },
    devDependencies: {
      '@eniac/flexcli': '^1.0.7',
      '@mdi/font': '^7.4.47',
      '@types/node': '^20.0.0',
      '@vitejs/plugin-vue': '^5.0.0',
      typescript: '^5.3.0',
      vite: '^5.0.0',
      'vite-plugin-vuetify': '^2.0.0',
      vue: '^3.4.0',
      vuetify: '^3.6.0'
    }
  };
  writeJson(path.join(baseDir, 'package.json'), packageJson);

  const tsconfig = {
    compilerOptions: {
      target: 'ES2020',
      lib: ['ES2020', 'DOM'],
      module: 'ESNext',
      moduleResolution: 'Bundler',
      strict: true,
      esModuleInterop: true,
      allowSyntheticDefaultImports: true,
      skipLibCheck: true,
      resolveJsonModule: true,
      types: ['node']
    },
    include: ['src/**/*.ts', 'src/**/*.vue'],
    exclude: ['node_modules', 'dist']
  };
  writeJson(path.join(baseDir, 'tsconfig.json'), tsconfig);

  const viteConfig = `import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import vuetify, { transformAssetUrls } from 'vite-plugin-vuetify';
import { resolve } from 'path';

export default defineConfig({
  root: resolve(__dirname, 'src/frontend'),
  base: './',
  plugins: [
    vue({ template: { transformAssetUrls } }),
    vuetify({ autoImport: true })
  ],
  build: {
    outDir: resolve(__dirname, 'dist/src/frontend'),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        'unit-function-editor': resolve(__dirname, 'src/frontend/unit-function-editor.html'),
        'unit-appearance-editor': resolve(__dirname, 'src/frontend/unit-appearance-editor.html'),
        'unit-view': resolve(__dirname, 'src/frontend/unit-view.html'),
        'config-page': resolve(__dirname, 'src/frontend/config-page.html')
      }
    }
  }
});
`;
  fs.writeFileSync(path.join(baseDir, 'vite.config.ts'), viteConfig, 'utf-8');

  const backend = `import { FlexPluginBase } from '@flexsdk/runtime';
import type { PluginDefinitionsPayload, PluginEventEnvelope, PluginLoadContext } from '@flexsdk/types';

const PLUGIN_UUID = '${uuid}';
const UNIT_TYPE_ID = \`\${PLUGIN_UUID}.example-unit\`;

export default class ${safeName}Plugin extends FlexPluginBase {
  async getDefinitions(): Promise<PluginDefinitionsPayload> {
    return {
      libraries: [this.createDefaultLibrary({ name: '${name}' })],
      units: [
        this.createUnitTemplate({
          unitId: 'example-unit',
          typeId: UNIT_TYPE_ID,
          name: 'Example Unit',
          categoryId: 'plugin',
          icon: 'mdi-puzzle',
          hasFunctionEditor: true,
          hasAppearanceEditor: true,
          hasView: false,
          defaultData: { message: 'Hello from plugin!' }
        })
      ],
      revision: '${version}'
    };
  }

  async onLoad(ctx: PluginLoadContext): Promise<void> {
    await super.onLoad(ctx);
    this.logger.info('Plugin loaded');

    this.registerRendererRpc('getMessage', async () => {
      return ctx.hostApi.store.get('message', 'Hello from plugin!');
    });

    this.registerRendererRpc('setMessage', async (message: string) => {
      await ctx.hostApi.store.set('message', message);
      return { success: true };
    });

    await this.on(
      \`device.plugin.\${UNIT_TYPE_ID}.pressed\`,
      async (event: PluginEventEnvelope) => {
        this.logger.info('Key pressed', { payload: event.payload });
      }
    );

    await this.on(
      'device.connection.changed',
      (event: PluginEventEnvelope) => {
        this.logger.info('Device connection changed', event.payload);
      },
      { snapshot: true }
    );
  }
}
`;
  fs.writeFileSync(path.join(baseDir, 'src/backend/index.ts'), backend, 'utf-8');

  fs.writeFileSync(
    path.join(baseDir, 'src/frontend/unit-function-editor.html'),
    htmlEntry(`${name} - Unit Function Editor`, 'main.ts'),
    'utf-8'
  );
  fs.writeFileSync(
    path.join(baseDir, 'src/frontend/unit-appearance-editor.html'),
    htmlEntry(`${name} - Unit Appearance Editor`, 'main.ts'),
    'utf-8'
  );
  fs.writeFileSync(path.join(baseDir, 'src/frontend/unit-view.html'), htmlEntry(`${name} - Unit View`, 'main.ts'), 'utf-8');
  fs.writeFileSync(path.join(baseDir, 'src/frontend/config-page.html'), htmlEntry(`${name} - Config`, 'main.ts'), 'utf-8');
  fs.writeFileSync(path.join(baseDir, 'src/frontend/main.ts'), frontendMainTsEntry(), 'utf-8');

  fs.writeFileSync(path.join(baseDir, 'src/frontend/UnitFunctionEditor.vue'), unitFunctionEditorVue(), 'utf-8');
  fs.writeFileSync(path.join(baseDir, 'src/frontend/UnitAppearanceEditor.vue'), unitAppearanceEditorVue(), 'utf-8');
  fs.writeFileSync(path.join(baseDir, 'src/frontend/UnitView.vue'), unitViewVue(), 'utf-8');
  fs.writeFileSync(path.join(baseDir, 'src/frontend/ConfigPage.vue'), configPageVue(), 'utf-8');

  writeJson(path.join(baseDir, 'locales/en.json'), {
    [`${uuid}.exampleUnit.name`]: 'Example Unit',
    [`${uuid}.config.title`]: 'Plugin Settings'
  });

  fs.writeFileSync(path.join(baseDir, '.gitignore'), 'node_modules/\ndist/\n*.log\n*.flexplugin\n', 'utf-8');

  fs.writeFileSync(
    path.join(baseDir, '.github', 'workflows', 'publish.yml'),
    pluginPublishWorkflowYml(),
    'utf-8'
  );

  fs.writeFileSync(path.join(baseDir, '.marketplace', 'README.en.md'), marketplaceReadmeEn(name, manifestDescription), 'utf-8');
  fs.writeFileSync(path.join(baseDir, '.marketplace', 'README.zh.md'), marketplaceReadmeZh(), 'utf-8');
  fs.writeFileSync(path.join(baseDir, 'README.md'), rootReadme(name, manifestDescription), 'utf-8');

  return { name, baseDir };
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

/**
 * @brief Root README.md (matches flex-plugin-template wording; title/blurb from user input).
 */
function rootReadme(name, blurb) {
  return `# ${name}

${blurb}

## Development

\`\`\`bash
npm install
npm run dev
\`\`\`

\`npm run dev\` starts a local dev server and connects to FlexDesigner via WebSocket. Changes to backend code are hot-reloaded automatically.

## Building

\`\`\`bash
npm run build
\`\`\`

Compiles TypeScript and bundles frontend pages into \`dist/\`.

## Publishing to the Marketplace

Releases are automated via GitHub Actions.

### First-time setup

1. Register your plugin in FlexDesigner Marketplace (Settings → My Uploads → Publish Plugin)
2. Copy the generated webhook secret
3. Add it to your GitHub repo: **Settings → Secrets → Actions** → \`FLEX_MARKETPLACE_WEBHOOK_SECRET\`

### Releasing a new version

1. Push your changes to \`main\`
2. Create a new GitHub Release with a semver tag (e.g. \`v1.0.0\`)
3. The workflow builds, packs, and notifies the marketplace server automatically
4. If no permission or platform changes, the update goes live immediately
5. If permissions or platforms changed, it enters the review queue

### Native plugins

If your plugin requires native Node.js addons (\`native: true\` in manifest.json), the workflow runs a matrix build across all declared platforms. Each platform produces a separate \`.flexplugin\` artifact.

## Manifest fields

| Field | Description |
|---|---|
| \`uuid\` | \`@username/plugin-name\` — must match your marketplace account |
| \`minHostVersion\` | Minimum FlexDesigner version required |
| \`native\` | Set \`true\` if the plugin uses native addons |
| \`platforms\` | Supported OS+arch combinations |
| \`devices\` | Target device models |
| \`requiredCapabilities\` | Device capabilities the plugin needs at runtime |
| \`permissions\` | Host API permissions (sensitive ones require review) |
| \`dependencies\` | Other marketplace plugins this plugin depends on |

## Project structure

\`\`\`
├── .github/workflows/publish.yml   # Automated release workflow
├── .marketplace/
│   ├── README.en.md                # Marketplace listing (English)
│   └── README.zh.md                # Marketplace listing (Chinese, optional)
├── src/
│   ├── backend/index.ts            # Plugin backend entry point
│   └── frontend/                   # UI pages (Vue 3 + Vuetify 3)
├── locales/en.json                 # i18n strings
├── manifest.json                   # Plugin manifest
├── package.json
├── tsconfig.json
└── vite.config.ts
\`\`\`
`;
}

function marketplaceReadmeEn(name, blurb) {
  return `# ${name}

${blurb}

## Features

- Describe what your plugin does
- List key features

## Installation

Install directly from FlexDesigner Marketplace.

## Usage

Describe how to use the plugin after installation.

## Configuration

Describe any configuration options available in the config page.
`;
}

function marketplaceReadmeZh() {
  return `# 插件名称

插件的简短描述。

## 功能

- 描述插件的功能
- 列出主要特性

## 安装

直接在 FlexDesigner 插件市场中安装。

## 使用方法

描述安装后如何使用插件。

## 配置

描述配置页面中可用的配置项。
`;
}

/**
 * @brief GitHub Actions workflow for tag-triggered build, pack, and release of the .flexplugin artifact.
 * @return {string} Workflow YAML (escape ${{ }} for use inside JS template literals).
 */
function pluginPublishWorkflowYml() {
  return `name: Publish to FlexStudio Marketplace

on:
  release:
    types: [published]

jobs:
  publish:
    uses: ENIAC-Tech/flex-plugin-actions/.github/workflows/publish.yml@v1.2.0
    with:
      flexcli-package: "https://github.com/ENIAC-Tech/flexcli/tarball/refs/heads/v2"
    secrets:
      webhook-secret: \${{ secrets.FLEX_MARKETPLACE_WEBHOOK_SECRET }}
`;
}

function htmlEntry(title, moduleFile) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
</head>
<body>
  <div id="app"></div>
  <script type="module" src="./${moduleFile}"></script>
</body>
</html>
`;
}

function frontendMainTsEntry() {
  return `import { createVuetify } from 'vuetify';
import { aliases, mdi } from 'vuetify/iconsets/mdi';
import * as components from 'vuetify/components';
import * as directives from 'vuetify/directives';
import 'vuetify/styles';
import '@mdi/font/css/materialdesignicons.css';
import { mountFlexPage } from '@flexsdk/runtime';
import UnitFunctionEditor from './UnitFunctionEditor.vue';
import UnitAppearanceEditor from './UnitAppearanceEditor.vue';
import UnitView from './UnitView.vue';
import ConfigPage from './ConfigPage.vue';

const vuetify = createVuetify({
  components,
  directives,
  icons: { defaultSet: 'mdi', aliases, sets: { mdi } }
});

void mountFlexPage({
  components: {
    unitFunctionEditor: UnitFunctionEditor,
    unitAppearanceEditor: UnitAppearanceEditor,
    unitView: UnitView,
    configPage: ConfigPage
  },
  setupApp(app) {
    app.use(vuetify);
  },
  themeSync: { vuetify }
});
`;
}

function unitFunctionEditorVue() {
  return `<script setup lang="ts">
import { ref, watch } from 'vue';
import { useFlexBridge } from '@flexsdk/runtime';

const { isReady, unitData, setUnitData } = useFlexBridge();
const message = ref('Hello from plugin!');

watch(unitData, (v) => {
  message.value = v?.message ?? 'Hello from plugin!';
}, { immediate: true });

async function save() {
  await setUnitData({ ...unitData.value, message: message.value });
}
</script>

<template>
  <v-app>
    <v-main>
      <v-container class="pa-4">
        <v-text-field v-model="message" label="Message" variant="outlined" />
        <v-btn :disabled="!isReady" color="primary" @click="save">Save</v-btn>
      </v-container>
    </v-main>
  </v-app>
</template>
`;
}

function unitAppearanceEditorVue() {
  return `<script setup lang="ts">
import { ref, watch } from 'vue';
import { useFlexBridge } from '@flexsdk/runtime';

const { isReady, bridge } = useFlexBridge();
const unitName = ref('');

watch(isReady, async (ready) => {
  if (!ready || !bridge.value) return;
  const u = await bridge.value.getUnit().catch(() => null);
  if (u) unitName.value = u.name ?? '';
  bridge.value.onHostEvent('unit-updated', async () => {
    const next = await bridge.value!.getUnit().catch(() => null);
    if (next) unitName.value = next.name ?? '';
  });
});

async function save() {
  if (!bridge.value) return;
  const u = await bridge.value.getUnit().catch(() => null);
  if (!u) return;
  await bridge.value.setUnit({ ...u, name: unitName.value.trim() || u.name });
}
</script>

<template>
  <v-app>
    <v-main>
      <v-container class="pa-4">
        <v-text-field v-model="unitName" label="Unit name" variant="outlined" />
        <v-btn :disabled="!isReady" color="primary" @click="save">Save appearance</v-btn>
      </v-container>
    </v-main>
  </v-app>
</template>
`;
}

function unitViewVue() {
  return `<script setup lang="ts">
import { ref, watch, nextTick } from 'vue';
import { useFlexBridge } from '@flexsdk/runtime';

const { isReady, bridge, typeId } = useFlexBridge();
const title = ref('');

watch(isReady, async (ready) => {
  if (!ready || !bridge.value) return;
  bridge.value.onHostEvent('unit-updated', () => { void refresh(); });
  await refresh();
});

async function refresh() {
  if (!bridge.value) return;
  const u = await bridge.value.getUnit().catch(() => null);
  title.value = u?.name ?? typeId.value ?? '';
  await nextTick();
  bridge.value.notifyViewReady();
}
</script>

<template>
  <div class="pa-2 text-caption">{{ title }}</div>
</template>
`;
}

function configPageVue() {
  return `<script setup lang="ts">
import { ref, watch } from 'vue';
import { useFlexBridge } from '@flexsdk/runtime';

const { isReady, backendRpc } = useFlexBridge();
const message = ref('Hello from plugin!');

watch(isReady, async (ready) => {
  if (!ready) return;
  message.value = await backendRpc('getMessage');
}, { immediate: true });

async function save() {
  await backendRpc('setMessage', [message.value]);
}
</script>

<template>
  <v-app>
    <v-main>
      <v-container class="pa-4">
        <v-text-field v-model="message" label="Default Message" variant="outlined" />
        <v-btn :disabled="!isReady" color="primary" @click="save">Save Settings</v-btn>
      </v-container>
    </v-main>
  </v-app>
</template>
`;
}

export function formatV2CreateSuccessMessage({ name, baseDir }) {
  return [
    '',
    `Created FlexStudio v2 plugin "${name}"`,
    '',
    'Path:',
    `  ${baseDir}`,
    '',
    'Next steps:',
    `  cd ${path.basename(baseDir)}`,
    '  npm install',
    '  npm run build',
    '  npm run dev'
  ].join('\n');
}
