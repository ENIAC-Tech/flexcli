// assets/templates.js
import Handlebars from 'handlebars';

// 模板：.gitignore
export const gitignoreTemplate = `node_modules
logs
.vscode
.env
package-lock.json
{{uuid}}.plugin/backend
`;

// 模板：package.json
export const packageJsonTemplate = `{
  "scripts": {
    "build": "rollup -c",
    "dev": "npm-run-all plugin:unlink plugin:link -p plugin:watch plugin:debug",
    "plugin:watch": "rollup -c -w --watch.onEnd=\\"npm run plugin:restart\\"",
    "plugin:unlink": "flexcli plugin unlink --uuid {{uuid}} --silent",
    "plugin:link": "flexcli plugin link --path {{uuid}}.plugin --uuid {{uuid}} --start false",
    "plugin:restart": "flexcli plugin restart --uuid={{uuid}}",
    "plugin:debug": "flexcli plugin debug --uuid={{uuid}}",
    "plugin:validate": "flexcli plugin validate --path {{uuid}}.plugin",
    "plugin:pack": "flexcli plugin pack --path {{uuid}}.plugin",
    "plugin:install": "flexcli plugin install --path ./{{uuid}}.flexplugin --force"
  },
  "type": "commonjs",
  "devDependencies": {
    "@rollup/plugin-commonjs": "^28.0.0",
    "@rollup/plugin-node-resolve": "^15.2.2",
    "@rollup/plugin-terser": "^0.4.4",
    "@rollup/plugin-typescript": "^12.1.0",
    "@rollup/plugin-json": "^6.1.0",
    "glob": "^11.0.1",
    "npm-run-all": "^4.1.5",
    "rollup": "^4.0.2"
  },
  "dependencies": {
    "@eniac/flexdesigner": "^1.0.7"
  }
}
`;

// 模板：rollup.config.mjs
export const rollupConfigTemplate = `import commonjs from "@rollup/plugin-commonjs";
import nodeResolve from "@rollup/plugin-node-resolve";
import terser from "@rollup/plugin-terser";
import path from "node:path";
import url from "node:url";
import json from '@rollup/plugin-json';
import { glob } from 'glob'
const isWatching = !!process.env.ROLLUP_WATCH;
const flexPlugin = "{{uuid}}.plugin";

/**
 * @type {import('rollup').RollupOptions}
 */
const config = {
  input: "src/plugin.js",
  output: {
    file: \`\${flexPlugin}/backend/plugin.cjs\`,
    format: "cjs",
    sourcemap: isWatching,
    sourcemapPathTransform: (relativeSourcePath, sourcemapPath) => {
      return url.pathToFileURL(path.resolve(path.dirname(sourcemapPath), relativeSourcePath)).href;
    },
  },
  plugins: [
    json(),
    {
      name: "watch-externals",
      buildStart: function () {
        this.addWatchFile(\`\${flexPlugin}/manifest.json\`);
        const vueFiles = glob.sync(\`\${flexPlugin}/ui/*.vue\`);
        vueFiles.forEach((file) => {
          this.addWatchFile(file);
        });
      },
    },
    nodeResolve({
      browser: false,
      exportConditions: ["node"],
      preferBuiltins: true
    }),
    commonjs(),
    !isWatching && terser(),
    {
      name: "emit-module-package-file",
      generateBundle() {
        this.emitFile({ fileName: "package.json", source: \`{ "type": "module" }\`, type: "asset" });
      }
    }
  ],
  external: id => id.endsWith('.node')
};

export default config;
`;

// 模板：manifest.json
export const manifestJsonTemplate = `{
    "name": "{{name}}",
    "uuid": "{{uuid}}",
    "version": "{{version}}",
    "author": "{{author}}",
    "entry": "backend/plugin.cjs",
    "description": "{{description}}",
    "repo": "{{repo}}",
    "sdk": {
        "version": "1.0.7"
    },
    "software": {
        "minimumVersion": "1.3.0"
    },
    "os": [
        {
            "platform": "mac",
            "minimumVersion": "10.15"
        },
        {
            "platform": "windows",
            "minimumVersion": "10"
        }
    ],
    "device": [
        {
            "name": "flexbar",
            "version": "1.0.0"
        }
    ],
    "configPage": "",
    "keyLibrary": {
        "title": "$PluginName",
        "style": {
            "icon": "mdi mdi-puzzle"
        },
        "children": [
          {
              "title": "$Counter.Title",
              "tip": "$Counter.Tip",
              "cid": "{{uuid}}.counter",
              "config": {
                  "keyType": "default",
                  "clickable": true,
                  "platform": [
                      "windows",
                      "mac"
                  ]
              },
              "style": {
                  "icon": "mdi mdi-gesture-tap-button",
                  "width": 240
              },
              "data": {
                  "rangeMin": "0",
                  "rangeMax": "100"
              }
          }
        ]
    },
    "local": {
        "en": {
            "PluginName": "{{name}}",
            "Counter": {
                "Title": "Tap Counter",
                "Tip": "Default keys with customizable drawable content",
                "UI": {
                    "RangeMin": "Minimum Value",
                    "RangeMax": "Maximum Value"
                }
            }
        }
    }
}
`;

// 模板：config.json
export const configJsonTemplate = `{}`;

// 模板：plugin.js
export const pluginJsTemplate = `const { plugin, logger, pluginPath, resourcesPath } = require("@eniac/flexdesigner")

// Store key data
const keyData = {}

/**
 * Called when current active window changes
 * {
 *    "status": "changed",
 *    "oldWin": OldWindow,
 *    "newWin": NewWindow
 * }
 */
plugin.on('system.actwin', (payload) => {
    logger.info('Active window changed:', payload)
})

/**
 * Called when received message from UI send by this.$fd.sendToBackend
 * @param {object} payload message sent from UI
 */
plugin.on('ui.message', async (payload) => {
    logger.info('Received message from UI:', payload)
    return 'Hello from plugin backend!'
})

/**
 * Called when device status changes
 * @param {object} devices device status data
 * [
 *  {
 *    serialNumber: '',
 *    deviceData: {
 *       platform: '',
 *       profileVersion: '',
 *       firmwareVersion: '',
 *       deviceName: '',
 *       displayName: ''
 *    }
 *  }
 * ]
 */
plugin.on('device.status', (devices) => {
    logger.info('Device status changed:', devices)
})


/**
 * Called when a plugin key is loaded
 * @param {Object} payload alive key data
 * {
 *  serialNumber: '',
 *  keys: []
 * }
 */
plugin.on('plugin.alive', (payload) => {
    logger.info('Plugin alive:', payload)
    for (let key of payload.keys) {
      keyData[key.uid] = key
      if (key.cid === '{{uuid}}.counter') {
          keyData[key.uid].counter = parseInt(key.data.rangeMin)
          key.style.showIcon = false
          key.style.showTitle = true
          key.title = 'Click Me!'
          plugin.draw(payload.serialNumber, key, 'draw')
      }
    }
})


/**
 * Called when user interacts with a key
 * @param {object} payload key data 
 * {
 *  serialNumber, 
 *  data
 * }
 */
plugin.on('plugin.data', (payload) => {
    logger.info('Received plugin.data:', payload)
    const data = payload.data
    if (data.key.cid === "{{uuid}}.counter") {
      const key = data.key
      key.style.showIcon = false
      key.style.showTitle = true
      keyData[key.uid].counter++
      if (keyData[key.uid].counter > parseInt(key.data.rangeMax)) {
          keyData[key.uid].counter = parseInt(key.data.rangeMin)
      }
      key.title = keyData[key.uid].counter.toString()
      plugin.draw(payload.serialNumber, key, 'draw')
    }
})

// Connect to flexdesigner and start the plugin
plugin.start()
`;

export const counterUITemplate = `
<template>
  <v-container>
    <v-row>
      <v-col cols="6">
        <v-text-field v-model="modelValue.data.rangeMin" :label="$t('Counter.UI.RangeMin')" type="number" hide-details
          outlined class="mx-2"></v-text-field>
      </v-col>
      <v-col cols="6">
        <v-text-field v-model="modelValue.data.rangeMax" :label="$t('Counter.UI.RangeMax')" type="number" hide-details
          outlined class="mx-2"></v-text-field>
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
export default {
  props: {
    modelValue: {
      type: Object,
      required: true,
    },
  },
  emits: ['update:modelValue'],
  data() {
    return {
    };
  },
  methods: {
  },
  mounted() {
    this.$fd.info("Hello from Counter Plugin");
  }
};
</script>

<style scoped></style>
`

export const readmeTemplate = `
# {{name}}

{{description}}

## Installation


### **Prerequisites**

- Node.js 18 or later  
- FlexDesigner v1.0.0 or later  
- A Flexbar device 
- Install FlexCLI  
  \`\`\`
  npm install -g @eniac/flexcli
  \`\`\`

### Clone & Setup

\`\`\`
git clone {{repo}}.git
cd {{name}}
npm install
\`\`\`

## Debug

\`\`\`
npm run dev
\`\`\`

## Build & Pack

\`\`\`
npm run build
npm run plugin:pack --path com.eniac.example.plugin
\`\`\`
  
`

export const githubCITemplate = `
name: Pack files and release

on:
  push:
    tags:
      - "v*"

jobs:
  build:
    permissions: write-all
    runs-on: ubuntu-latest

    steps:
      - name: Code checkout
        uses: actions/checkout@v3

      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: 20

      - name: Install dependencies
        run: npm i
    
      - name: Install FlexCli
        run: npm install -g @eniac/flexcli

      - name: Build Plugin
        run: npm run build

      - name: Pack Plugin
        run: npm run plugin:pack

      - name: Upload Release Asset
        uses: softprops/action-gh-release@v2
        with:
          files: {{uuid}}.flexplugin
`