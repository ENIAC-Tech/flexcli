// commands/kill.js
import logger from '../utils/logger.js';

/**
 * Handles the 'kill' command.
 * @param {WebSocketClient} wsClient - The WebSocket client instance.
 * @param {Object} options - The command options.
 */
export default async function killCommand(wsClient, options) {
  const { uuid } = options;
  const cmd = {
    cmd: 'plugin',
    operation: 'kill',
    uuid,
  }

  try {
    const response = await wsClient.sendCommand(cmd);
    if (response.status === 'success') {
      logger.info(`Kill command successful: ${JSON.stringify(response, null, 2)}`);
    } else {
      logger.error(`Kill command failed: ${JSON.stringify(response, null, 2)}`);
    }
  } catch (error) {
    logger.error(`Error in kill command: ${error.message}`);
  }
} 