# FlexCLI Tool Documentation

This document provides an overview and guide for using the CLI tool that interacts with plugins and FlexDesigner. The tool provides various commands for managing plugins such as linking, restarting, debugging, installing, and uninstalling plugins. It also supports creating a plugin project and validating the plugin structure.

## Installation

### Prerequisites
- Node.js version 18 or higher
- FlexDesigner version 1.0.0 or higher.

### Setup

Install the FlexDesigner CLI Tool by running the following command.

```
npm install -g @eniac/flexcli
```



## Commands

### `plugin link`
Links a plugin to the FlexDesigner.

#### Options:
- `--path <path>`: Path to the plugin directory (required)
- `--uuid <uuid>`: UUID of the plugin (required)
- `--debug <debug>`: Enable or disable debug mode (default: false)
- `--skip-validate`: Skip the validation step (default: false)
- `--force`: Force override of an existing plugin (default: false)
- `--start <start>`: Whether to start the plugin after linking (default: true)

#### Description:
This command links a plugin to the FlexDesigner by specifying its path and UUID. It also provides options to enable debug mode, skip validation, force override, and start the plugin after linking.

---

### `plugin restart`
Restarts a plugin.

#### Options:
- `--uuid <uuid>`: UUID of the plugin to restart (required)

#### Description:
This command restarts a plugin using the provided UUID.

---

### `plugin unlink`
Unlinks a plugin from the FlexDesigner.

#### Options:
- `--uuid <uuid>`: UUID of the plugin to unlink (required)
- `--silent`: Run in silent mode without output (default: false)

#### Description:
This command unlinks a plugin from the FlexDesigner using the specified UUID.

---

### `plugin debug`
Debugs a plugin.

#### Options:
- `--uuid <uuid>`: UUID of the plugin to debug (required)

#### Description:
This command is used to debug a plugin using its UUID. It connects to the plugin and provides debugging information.

---

### `plugin list`
Lists all the installed plugins.

#### Description:
This command lists all the plugins currently installed in the FlexDesigner.

---

### `plugin pack`
Packs a plugin into a `.flexplugin` file.

#### Options:
- `--path <path>`: Path to the plugin directory (required)
- `--output <output>`: Output path for the `.flexplugin` file
- `--skip-validate`: Skip validation (default: false)

#### Description:
This command packages the plugin into a `.flexplugin` file, with options for specifying the output path and skipping validation.

---

### `plugin install`
Installs a plugin from a `.flexplugin` file.

#### Options:
- `--path <path>`: Path to the `.flexplugin` file (required)
- `--force`: Force the installation (default: false)

#### Description:
This command installs a plugin using the `.flexplugin` file. If the file extension is not `.flexplugin`, an error will be shown. The `--force` option allows forcing the installation.

---

### `plugin uninstall`
Uninstalls a plugin.

#### Options:
- `--uuid <uuid>`: UUID of the plugin to uninstall (required)

#### Description:
This command uninstalls the plugin using the specified UUID.

---

### `plugin validate`
Validates the structure and manifest of a plugin.

#### Options:
- `--path <path>`: Path to the plugin directory (required)

#### Description:
This command validates the plugin directory and its manifest to ensure that it follows the correct structure.

---

### `plugin create`
Creates a basic plugin workspace.

#### Description:
This command creates a basic workspace for a new plugin, allowing you to specify details like the plugin path, name, version, author, description, and repository URL.

It will prompt you for the following information:
- Plugin path
- Plugin name
- Author name
- Reversed domain UUID (e.g., `com.author.myplugin`)
- Version (in format `x.y.z`)
- Description
- Repository URL

The created workspace will be initialized with the provided information.

---

## General Options
- `--port <number>`: Specifies the WebSocket server port (default: 60109)

---

## Example Usage

To link a plugin:

```bash
flexcli plugin link --path /path/to/plugin --uuid com.example.plugin --debug true
```

To restart a plugin:

```bash
flexcli plugin restart --uuid com.example.plugin
```

To list all plugins:

```bash
flexcli plugin list
```

To create a new plugin workspace:

```bash
flexcli plugin create
```
