/**
 * @file commands/v2/control.js
 * @brief v2 plugin control commands for FlexCLI
 *
 * Connects to the FlexStudio (v2) WS control server and provides
 * management commands for v2 plugins.
 */

import WebSocket from 'ws';
import crypto from 'crypto';
import logger from '../../utils/logger.js';
import { HOST_APP_V2 } from '../../constants/host-app.js';

const DEFAULT_PORT = 34579;

/**
 * Create a v2 WS control client
 */
export class V2ControlClient {
  constructor(options = {}) {
    this.host = options.host ?? '127.0.0.1';
    this.port = options.port ?? DEFAULT_PORT;
    this.token = options.token;
    this.ws = null;
    this.pending = new Map();
    this.connected = false;
  }

  async connect() {
    const url = `ws://${this.host}:${this.port}`;
    
    await new Promise((resolve, reject) => {
      this.ws = new WebSocket(url);

      this.ws.on('open', async () => {
        try {
          if (this.token) {
            const result = await this._sendAuth();
            this.connected = true;
            logger.debug(`Connected. Session: ${result?.sessionId}`);
          } else {
            this.connected = true;
            logger.debug('Connected (no token auth)');
          }
          resolve();
        } catch (err) {
          reject(err);
        }
      });

      this.ws.on('message', (raw) => {
        try {
          const msg = JSON.parse(raw.toString());
          this._handleMessage(msg);
        } catch {}
      });

      this.ws.on('error', (err) => {
        if (!this.connected) {
          reject(new Error(
            `Cannot connect to ${HOST_APP_V2} (v2 plugin API) at ${url}: ${err.message}\n` +
            `Make sure ${HOST_APP_V2} is running.`
          ));
        }
      });

      this.ws.on('close', () => {
        this.connected = false;
      });
    });
  }

  async command(cmd, params) {
    if (!this.connected) throw new Error('Not connected');
    const id = crypto.randomUUID();
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`Command '${cmd}' timed out`));
      }, 30000);

      this.pending.set(id, {
        resolve: (v) => { clearTimeout(timeout); resolve(v); },
        reject: (e) => { clearTimeout(timeout); reject(e); }
      });

      this.ws.send(JSON.stringify({ id, command: cmd, params }));
    });
  }

  disconnect() {
    this.ws?.close();
  }

  _sendAuth() {
    return new Promise((resolve, reject) => {
      const id = crypto.randomUUID();
      const timeout = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error('Auth timed out'));
      }, 10000);

      this.pending.set(id, {
        resolve: (v) => { clearTimeout(timeout); resolve(v); },
        reject: (e) => { clearTimeout(timeout); reject(e); }
      });

      this.ws.send(JSON.stringify({ id, command: 'auth', params: { token: this.token } }));
    });
  }

  _handleMessage(msg) {
    if (msg.id && this.pending.has(msg.id)) {
      const { resolve, reject } = this.pending.get(msg.id);
      this.pending.delete(msg.id);
      if (msg.success === false) {
        reject(new Error(msg.error ?? 'Command failed'));
      } else {
        resolve(msg.data);
      }
    }
  }
}

/**
 * Get token from environment or options
 */
export function getV2Token(options) {
  return options.token ?? process.env.FLEX_WS_TOKEN ?? process.env.PLUGIN_WS_TOKEN ?? null;
}

/**
 * Create a connected v2 client, printing helpful errors on failure
 */
export async function createV2Client(options) {
  const token = getV2Token(options);
  if (!token) {
    logger.warn('No WS token provided; continuing without auth (dev mode expected).');
  }

  const parsedPort = parseInt(options.port ?? String(DEFAULT_PORT), 10);
  if (!Number.isFinite(parsedPort) || parsedPort <= 0 || parsedPort > 65535) {
    logger.error(`Invalid port: ${options.port}`);
    process.exit(1);
  }

  const client = new V2ControlClient({
    host: options.host ?? '127.0.0.1',
    port: parsedPort,
    token
  });

  try {
    await client.connect();
    return client;
  } catch (err) {
    logger.error(`Failed to connect to ${HOST_APP_V2} (v2 plugin API): ${err.message}`);
    process.exit(1);
  }
}
