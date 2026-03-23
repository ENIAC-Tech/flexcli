// commands/link.js
import logger from '../../utils/logger.js';
import path from 'path';
/**
 * Handles the 'link' command.
 * @param {WebSocketClient} wsClient - The WebSocket client instance.
 * @param {Object} options - The command options.
 */
export default async function linkCommand(wsClient, options) {
  const uuid = options.uuid;
  const pluginPath = path.resolve(options.path);

  const cmd = {
    cmd: 'plugin',
    operation: 'link',
    path: pluginPath,
    uuid,
    debug: options.debug === 'true',
  }

  const response = await wsClient.sendCommand(cmd);
  if (response.status === 'success') {
    logger.info(`Link command successful: ${JSON.stringify(response, null, 2)}`);
  } else {
    logger.error(`Link command failed: ${JSON.stringify(response, null, 2)}`);
  }
}
