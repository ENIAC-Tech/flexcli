/** Host-generated contract with the CLI's structured validation result. */
import { validatePluginDefinitionsPayload as validateContract } from './plugin-definitions-contract.js';
export { PLUGIN_DEFINITIONS_JSON_SCHEMA } from './plugin-definitions-contract.js';

export function validatePluginDefinitionsPayload(payload) {
  try {
    validateContract(payload);
    return { ok: true, errors: [] };
  } catch (error) {
    return { ok: false, errors: [error instanceof Error ? error.message : String(error)] };
  }
}
