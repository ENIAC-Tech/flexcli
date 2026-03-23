// commands/list.js
import logger from '../../utils/logger.js';

/**
 * Handles the 'list' command.
 * @param {WebSocketClient} wsClient - The WebSocket client instance.
 */
export default async function listCommand(wsClient) {
  const cmd = {
    cmd: 'plugin',
    operation: 'list',
  }

    const response = await wsClient.sendCommand(cmd);
  if (response.status === 'success') {
    logger.info(`List command successful: ${JSON.stringify(response, null, 2)}`);
  } else {
    logger.error(`List command failed: ${JSON.stringify(response, null, 2)}`);
  }
}
