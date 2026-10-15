/** V2 loopback plugin management client and its persisted connection port. */
import WebSocket from 'ws';
import crypto from 'crypto';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { HOST_APP_V2 } from '../../constants/host-app.js';

export const DEFAULT_V2_PORT = 34579;

export function parseV2Port(value) {
  const text = String(value).trim();
  const port = Number(text);
  if (!/^\d+$/.test(text) || !Number.isInteger(port) || port < 1 || port > 65535)
    throw new Error(`Invalid plugin development port: ${value}. Expected 1–65535.`);
  return port;
}

export function v2ConnectionConfigPath() {
  if (process.env.FLEXCLI_CONFIG_PATH) return path.resolve(process.env.FLEXCLI_CONFIG_PATH);
  const base = process.platform === 'win32' ? (process.env.APPDATA || os.homedir())
    : (process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config'));
  return path.join(base, 'flexcli', 'config.json');
}

function readConfig() {
  try {
    const config = JSON.parse(fs.readFileSync(v2ConnectionConfigPath(), 'utf8'));
    if (!config || typeof config !== 'object' || Array.isArray(config)) throw new Error('Expected an object');
    return config;
  } catch (error) {
    if (error.code === 'ENOENT') return {};
    throw new Error(`Cannot read FlexCLI configuration: ${error.message}`);
  }
}

export function getV2ConnectionSettings() {
  return { port: parseV2Port(readConfig().pluginV2?.port ?? DEFAULT_V2_PORT) };
}

/** Persist an explicit port independently of whether the host is currently listening. */
export function saveV2ConnectionPort(value) {
  const port = parseV2Port(value);
  const config = readConfig();
  config.pluginV2 = { port };
  const filename = v2ConnectionConfigPath();
  fs.mkdirSync(path.dirname(filename), { recursive: true });
  const temporary = `${filename}.${crypto.randomUUID()}.tmp`;
  try {
    fs.writeFileSync(temporary, JSON.stringify(config, null, 2) + '\n', { encoding: 'utf8', mode: 0o600 });
    fs.renameSync(temporary, filename);
  } finally {
    if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
  }
  return { port };
}

export class V2ControlClient {
  constructor(options = {}) {
    this.host = options.host ?? '127.0.0.1';
    this.port = parseV2Port(options.port ?? DEFAULT_V2_PORT);
    this.ws = null;
    this.pending = new Map();
    this.connected = false;
  }

  async connect() {
    const url = `ws://${this.host}:${this.port}`;
    await new Promise((resolve, reject) => {
      this.ws = new WebSocket(url, { handshakeTimeout: 5000 });
      this.ws.on('open', () => { this.connected = true; resolve(); });
      this.ws.on('message', raw => {
        try { this._handleMessage(JSON.parse(raw.toString())); } catch {}
      });
      this.ws.on('error', error => {
        if (!this.connected) reject(new Error(
          `Cannot connect to ${HOST_APP_V2} (v2 plugin API) at ${url}: ${error.message}\n` +
          'Enable Debug mode in FlexStudio Settings > Plugins and use the same port. ' +
          'Set the saved CLI port with flexcli plugin-v2 config --port <port>.'
        ));
      });
      this.ws.on('close', () => {
        this.connected = false;
        for (const pending of this.pending.values()) pending.reject(new Error('Plugin development connection closed'));
        this.pending.clear();
        reject(new Error('Plugin development connection closed'));
      });
    });
  }

  async command(command, params) {
    if (!this.connected) throw new Error('Not connected');
    const id = crypto.randomUUID();
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`Command '${command}' timed out`));
      }, 30000);
      this.pending.set(id, {
        resolve: value => { clearTimeout(timeout); resolve(value); },
        reject: error => { clearTimeout(timeout); reject(error); }
      });
      this.ws.send(JSON.stringify({ id, command, params }), error => {
        if (!error) return;
        this.pending.delete(id); clearTimeout(timeout); reject(error);
      });
    });
  }

  disconnect() { this.ws?.close(); }

  _handleMessage(message) {
    if (!message.id || !this.pending.has(message.id)) return;
    const pending = this.pending.get(message.id);
    this.pending.delete(message.id);
    if (message.success === false) pending.reject(new Error(message.error ?? 'Command failed'));
    else pending.resolve(message.data);
  }
}

export async function createV2Client(options = {}) {
  const port = options.port === undefined ? getV2ConnectionSettings().port : saveV2ConnectionPort(options.port).port;
  const client = new V2ControlClient({ host: options.host ?? '127.0.0.1', port });
  await client.connect();
  return client;
}
