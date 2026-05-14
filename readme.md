# FlexCLI Tool Documentation

This document describes the FlexCLI (`@eniac/flexcli`) tool for developing and managing plugins. Commands are split by **plugin API version** and the **host desktop app** they talk to.

## Host applications

| API | Host app | CLI command group | Notes |
|-----|----------|-------------------|--------|
| **v1** (legacy) | **FlexDesigner** | `flexcli plugin …` | Uses the legacy WebSocket bridge; port can be read from FlexDesigner user data when `--port` is `0`. |
| **v2** | **FlexStudio** | `flexcli plugin-v2 …` | Connects to FlexStudio’s v2 plugin control WebSocket (default port `34579`). |

Use **`plugin`** with FlexDesigner running. Use **`plugin-v2`** with FlexStudio running.

## Installation

### Prerequisites

- Node.js 18 or higher
- **v1 commands:** FlexDesigner 1.0.0 or higher (running when you use `plugin` commands)
- **v2 commands:** FlexStudio with the v2 plugin API (running when you use `plugin-v2` commands)

### Setup

Install FlexCLI globally:

```
npm install -g @eniac/flexcli
```

---

## `plugin` — v1 plugin commands (FlexDesigner)

These commands manage **legacy (v1)** plugins against **FlexDesigner**.

### `plugin link`

Links a plugin to FlexDesigner.

#### Options

- `--path <path>`: Path to the plugin directory (required)
- `--uuid <uuid>`: UUID of the plugin (required)
- `--debug <debug>`: Enable or disable debug mode (default: false)
- `--skip-validate`: Skip the validation step (default: false)
- `--force`: Force override of an existing plugin (default: false)
- `--start <start>`: Whether to start the plugin after linking (default: true)

#### Description

Links a plugin by path and UUID, with optional debug, validation skip, force, and auto-start.

---

### `plugin restart`

Restarts a plugin.

#### Options

- `--uuid <uuid>`: UUID of the plugin to restart (required)

---

### `plugin unlink`

Unlinks a plugin from FlexDesigner.

#### Options

- `--uuid <uuid>`: UUID of the plugin to unlink (required)
- `--silent`: Run in silent mode without output (default: false)

---

### `plugin debug`

Debugs a plugin.

#### Options

- `--uuid <uuid>`: UUID of the plugin to debug (required)

---

### `plugin list`

Lists all installed plugins in FlexDesigner.

---

### `plugin pack`

Packs a plugin into a `.flexplugin` file.

#### Options

- `--path <path>`: Path to the plugin directory (required)
- `--output <output>`: Output path for the `.flexplugin` file
- `--skip-validate`: Skip validation (default: false)

---

### `plugin install`

Installs a plugin from a `.flexplugin` file.

#### Options

- `--path <path>`: Path to the `.flexplugin` file (required)
- `--force`: Force the installation (default: false)

---

### `plugin uninstall`

Uninstalls a plugin.

#### Options

- `--uuid <uuid>`: UUID of the plugin to uninstall (required)

---

### `plugin validate`

Validates the structure and manifest of a plugin.

#### Options

- `--path <path>`: Path to the plugin directory (required)

---

### `plugin create`

Creates a plugin workspace. You will be prompted for **v1** (FlexDesigner, legacy JS/Rollup) or **v2** (FlexStudio, TypeScript / FlexSDK2). Default is v2.

For v2 projects, FlexCLI clones the shared plugin template repository and then applies the prompted identity fields. FlexCLI does not maintain a separate v2 scaffold.

Default v2 template:

```text
https://github.com/icyqwq/flex-plugin-template.git#master
```

The generated v2 project includes a local agent skill at `.agents/skills/flexstudio-plugin-developer/SKILL.md`. Ask your agent to use that skill when developing the plugin; it includes a bundled snapshot of the FlexStudio plugin docs.

#### v2 template overrides

- `FLEX_PLUGIN_TEMPLATE_PATH`: copy from a local template directory instead of cloning Git.
- `FLEX_PLUGIN_TEMPLATE_REPO`: clone a different Git template repository.
- `FLEX_PLUGIN_TEMPLATE_REF`: clone a different branch or tag. Defaults to `master`.

#### Prompted fields (varies by version)

- Plugin path, name, author, UUID, version, description
- v1 only: repository URL (optional)

---

### `plugin kill`

Terminates a running plugin (v1).

#### Options

- `--uuid <uuid>`: UUID of the plugin to kill (required)

---

### General options (`plugin` commands)

- `--port <number>`: WebSocket port for FlexDesigner’s v1 bridge. Default `0` means: read the port from FlexDesigner user data (`plugin_port.txt` under the app data temp folder for FlexDesigner).

---

## `plugin-v2` — v2 plugin commands (FlexStudio)

These commands talk to **FlexStudio** over the v2 plugin control WebSocket.

### Common options (where applicable)

- `--host <host>`: WebSocket host (default: `127.0.0.1`)
- `--port <port>`: WebSocket port (default: `34579`)
- `--token <token>`: Auth token; optional in some dev setups. Can also use env vars `FLEX_WS_TOKEN` or `PLUGIN_WS_TOKEN`.

### Subcommands

| Subcommand | Description |
|------------|-------------|
| `list` | List all v2 plugins |
| `install <source>` | Install from a directory or zip |
| `uninstall <uuid>` | Uninstall a plugin |
| `enable <uuid>` | Enable a plugin |
| `disable <uuid>` | Disable a plugin |
| `reload <uuid>` | Hot-reload a plugin |
| `logs <uuid>` | Stream live logs |
| `dev <plugin-dir>` | Build, watch, and mount a plugin for development |
| `validate` | Validate `manifest.json` and/or definitions JSON |
| `build` | Build a v2 plugin for distribution |
| `pack` | Package built output into a `.flexplugin` archive |
| `diagnostics` | Print v2 plugin system diagnostics |

Run `flexcli plugin-v2 --help` and `flexcli plugin-v2 <subcommand> --help` for full flags.

---

## Example usage

Link a v1 plugin (FlexDesigner):

```bash
flexcli plugin link --path /path/to/plugin --uuid com.example.plugin --debug true
```

Restart a v1 plugin:

```bash
flexcli plugin restart --uuid com.example.plugin
```

List v1 plugins:

```bash
flexcli plugin list
```

Create a new plugin workspace (prompts v1 vs v2):

```bash
flexcli plugin create
```

List v2 plugins (FlexStudio):

```bash
flexcli plugin-v2 list
```

Install a v2 plugin from a folder:

```bash
flexcli plugin-v2 install /path/to/built-plugin
```
