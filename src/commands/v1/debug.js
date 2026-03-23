// commands/debug.js
import logger from '../../utils/logger.js';

/**
 * Handles the 'debug' command.
 * @param {WebSocketClient} wsClient - The WebSocket client instance.
 * @param {Object} options - The command options.
 */
export default async function debugCommand(wsClient, options) {
  const { uuid } = options;

  await wsClient.send({
    type: 'debugger',
    uuid: uuid,
    status: 'pending',
    payload: {
      pluginID: uuid,
    }
  })

  wsClient.ws.removeAllListeners('message');

  wsClient.ws.on('message', (message) => {
    logger.info(`Debugging at: ${message}`);
  });
}
