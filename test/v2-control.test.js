import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { execFile, spawn } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs/promises';
import path from 'node:path';
import { WebSocketServer } from 'ws';
import { V2ControlClient, getV2ConnectionSettings, saveV2ConnectionPort, parseV2Port } from '../src/commands/v2/control.js';

const run = promisify(execFile);
const outputRoot = path.resolve('work/v2-control-tests');
async function fixture(t) {
  await fs.mkdir(outputRoot, { recursive: true });
  const folder = await fs.mkdtemp(path.join(outputRoot, 'run-'));
  const config = path.join(folder, 'config.json');
  const previous = process.env.FLEXCLI_CONFIG_PATH;
  process.env.FLEXCLI_CONFIG_PATH = config;
  t.after(async () => {
    if (previous === undefined) delete process.env.FLEXCLI_CONFIG_PATH;
    else process.env.FLEXCLI_CONFIG_PATH = previous;
    assert.equal(path.dirname(folder), outputRoot);
    await fs.rm(folder, { recursive: true, force: true });
  });
  return { config, env: { ...process.env, FLEXCLI_CONFIG_PATH: config } };
}
async function cli(args, env) {
  return run(process.execPath, [path.resolve('src/index.js'), 'plugin-v2', ...args], { env, timeout: 10000 });
}
async function server(t, respond = true) {
  const ws = new WebSocketServer({ host: '127.0.0.1', port: 0 });
  await once(ws, 'listening');
  const messages = [];
  ws.on('connection', socket => socket.on('message', raw => {
    const request = JSON.parse(raw.toString()); messages.push(request);
    if (respond) socket.send(JSON.stringify({ id: request.id, success: true, data: [] }));
  }));
  t.after(async () => {
    for (const client of ws.clients) client.terminate();
    await new Promise(resolve => ws.close(resolve));
  });
  return { ws, messages, port: ws.address().port };
}

test('defaults to 34579 and persists an offline CLI port across new processes', async t => {
  const { config, env } = await fixture(t);
  assert.deepEqual(getV2ConnectionSettings(), { port: 34579 });
  await cli(['config', '--port', '45678'], env);
  assert.deepEqual(JSON.parse((await cli(['config'], env)).stdout), { port: 45678 });
  assert.equal(JSON.parse(await fs.readFile(config, 'utf8')).pluginV2.port, 45678);
});

test('explicit list --port is saved and the next CLI process directly uses it without a handshake', async t => {
  const { env } = await fixture(t);
  const endpoint = await server(t);
  await cli(['list', '--port', String(endpoint.port)], env);
  await cli(['list'], env);
  assert.deepEqual(endpoint.messages.map(message => message.command), ['listPlugins', 'listPlugins']);
  assert.deepEqual(getV2ConnectionSettings(), { port: endpoint.port });
});

test('dev --port builds and mounts through the requested port and saves it', async t => {
  const { config, env } = await fixture(t);
  const endpoint = await server(t);
  const plugin = path.join(path.dirname(config), 'plugin');
  await fs.mkdir(path.join(plugin, 'src/backend'), { recursive: true });
  await fs.writeFile(path.join(plugin, 'src/backend/index.ts'), 'export default class DevPortFixture {}', 'utf8');
  await fs.writeFile(path.join(plugin, 'manifest.json'), JSON.stringify({
    schemaVersion: '1.0', uuid: '@tester/dev-port', name: 'Dev Port Fixture', entry: { backend: 'backend/index.js' }
  }), 'utf8');
  await fs.writeFile(path.join(plugin, 'package.json'), JSON.stringify({ name: 'dev-port', version: '1.0.0' }), 'utf8');
  const child = spawn(process.execPath, [path.resolve('src/index.js'), 'plugin-v2', 'dev', plugin, '--port', String(endpoint.port)], { env });
  let output = '';
  child.stdout.on('data', chunk => { output += chunk; });
  child.stderr.on('data', chunk => { output += chunk; });
  try {
    await new Promise((resolve, reject) => {
      const deadline = setTimeout(() => done(Error('Dev session did not mount: ' + output)), 8000);
      const timer = setInterval(() => {
        if (endpoint.messages.some(message => message.command === 'subscribeLogs')) done();
        else if (child.exitCode !== null) done(Error('Dev process exited: ' + output));
      }, 20);
      function done(error) { clearTimeout(deadline); clearInterval(timer); error ? reject(error) : resolve(); }
    });
    assert.deepEqual(endpoint.messages.slice(0, 2).map(message => message.command), ['mountDevSource', 'subscribeLogs']);
    assert.equal(endpoint.messages[0].params.devDir, path.join(plugin, 'dist'));
    assert.deepEqual(getV2ConnectionSettings(), { port: endpoint.port });
    assert.equal(JSON.parse((await cli(['config'], env)).stdout).port, endpoint.port);
  } finally {
    if (child.exitCode === null) {
      const exited = once(child, 'exit');
      child.kill();
      await exited;
    }
  }
});

test('invalid ports never replace the saved port and corrupt configuration is visible', async t => {
  const { config, env } = await fixture(t);
  saveV2ConnectionPort(34579);
  for (const port of ['', '0', '-1', '1.5', '65536', '34579abc', '3e4']) assert.throws(() => parseV2Port(port), /Invalid/);
  await assert.rejects(cli(['config', '--port', '65536'], env));
  assert.deepEqual(getV2ConnectionSettings(), { port: 34579 });
  await fs.writeFile(config, '{bad-json', 'utf8');
  assert.throws(() => getV2ConnectionSettings(), /Cannot read FlexCLI configuration/);
  assert.throws(() => saveV2ConnectionPort(34580), /Cannot read FlexCLI configuration/);
  assert.equal(await fs.readFile(config, 'utf8'), '{bad-json');
});

test('closing a real listener rejects outstanding commands promptly', async t => {
  const endpoint = await server(t, false);
  const client = new V2ControlClient({ port: endpoint.port });
  await client.connect();
  const pending = client.command('getState');
  const rejection = assert.rejects(pending, /connection closed/);
  await once([...endpoint.ws.clients][0], 'message');
  for (const peer of endpoint.ws.clients) peer.close(1001, 'Disabled');
  await rejection;
  assert.equal(client.pending.size, 0);
  assert.equal(client.connected, false);
});

test('removed token option is rejected and unavailable listener errors name the setting and port', async t => {
  const { env } = await fixture(t);
  await assert.rejects(cli(['list', '--token', 'obsolete-option'], env), error => /unknown option/.test(error.stderr));
  const endpoint = await server(t);
  await new Promise(resolve => endpoint.ws.close(resolve));
  const client = new V2ControlClient({ port: endpoint.port });
  await assert.rejects(client.connect(), /Settings > Plugins.*same port/);
});
