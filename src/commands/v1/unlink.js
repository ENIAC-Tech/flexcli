// commands/unlink.js
import logger from '../../utils/logger.js';

/**
 * Handles the 'unlink' command.
 * @param {WebSocketClient} wsClient - The WebSocket client instance.
 * @param {Object} options - The command options.
 */
export default async function unlinkCommand(wsClient, options) {
  const { uuid } = options;
  const cmd = {
    cmd: 'plugin',
    operation: 'unlink',
    uuid,
  }

  const response = await wsClient.sendCommand(cmd);
  if (options.silent) {
    return;
  }
  if (response.status === 'success') {
    logger.info(`Unlink command successful: ${JSON.stringify(response, null, 2)}`);
  } else {
    logger.error(`Unlink command failed: ${JSON.stringify(response, null, 2)}`);
  }
}
