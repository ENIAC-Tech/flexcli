// commands/restart.js
import logger from '../../utils/logger.js';

/**
 * Handles the 'restart' command.
 * @param {WebSocketClient} wsClient - The WebSocket client instance.
 * @param {Object} options - The command options.
 */
export default async function restartCommand(wsClient, options) {
  const { uuid } = options;
  const cmd = {
    cmd: 'plugin',
    operation: 'restart',
    uuid,
  }

  const response = await wsClient.sendCommand(cmd);
  if (response.status === 'success') {
    logger.info(`Restart command successful: ${JSON.stringify(response, null, 2)}`);
  } else {
    logger.error(`Restart command failed: ${JSON.stringify(response, null, 2)}`);
  }
}
