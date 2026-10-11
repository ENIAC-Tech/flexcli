import test from 'node:test';
import assert from 'node:assert/strict';
import { validatePluginDefinitionsPayload } from '../src/utils/plugin-definitions-validator.js';

function payload() {
  const owner = '@test/contract';
  return { libraries: [{ libraryUUID: owner, name: { default: 'Contract' } }], units: [{
    unitId: 'one', typeId: `${owner}.one`, name: { default: 'One' }, categoryId: 'plugin',
    plugin: { type: 'standard', pluginUUID: owner, pluginVersion: '1.0.0', unitId: 'one' },
    visibleInLibrary: false, hasFunctionEditor: true,
    interactionMode: 'click', defaultActivation: { mode: 'hold', holdDurationMs: 800 }
  }] };
}
function builtin(uuid, extra = {}) {
  return { uuid, typeId: '@eniacelec/layout:container', name: 'Container', icon: '', config: {},
    geometry: { x: 0, y: 0, width: 1, height: 1 }, appearance: [], data: {}, ...extra };
}
test('accepts host localized names, hidden definitions, activation and builtin editor binding', () => {
  const definitions = payload();
  definitions.builtinUnits = [builtin('root', {
    pluginTemplate: { pluginUUID: '@test/contract', unitId: 'panel', editorTypeId: '@test/contract.one' }
  })];
  assert.deepEqual(validatePluginDefinitionsPayload(definitions), { ok: true, errors: [] });
  definitions.builtinUnits[0].fixedAppearance = false;
  assert.equal(validatePluginDefinitionsPayload(definitions).ok, true);
  definitions.builtinUnits[0].fixedAppearance = 'false';
  assert.equal(validatePluginDefinitionsPayload(definitions).ok, false);
});
test('accepts matched nested plugin units and rejects mismatched ownership or duplicate UUIDs', () => {
  const definitions = payload();
  const child = builtin('child', { typeId: definitions.units[0].typeId, plugin: { ...definitions.units[0].plugin } });
  definitions.builtinUnits = [builtin('root', { data: { layoutData: [child] } })];
  assert.equal(validatePluginDefinitionsPayload(definitions).ok, true);
  child.plugin.pluginVersion = 'wrong';
  assert.equal(validatePluginDefinitionsPayload(definitions).ok, false);
  child.plugin.pluginVersion = '1.0.0';
  definitions.builtinUnits[0].data.layoutData.push(structuredClone(child));
  assert.equal(validatePluginDefinitionsPayload(definitions).ok, false);
});
test('accepts button groups but rejects duplicate IDs and unknown defaults', () => {
  const definitions = payload();
  const unit = definitions.units[0];
  delete unit.interactionMode;
  delete unit.defaultActivation;
  unit.plugin.type = 'button-group';
  unit.buttonGroup = { buttons: [{ buttonId: 'a' }, { buttonId: 'b' }] };
  assert.equal(validatePluginDefinitionsPayload(definitions).ok, true);
  unit.buttonGroup.defaultActiveButtonIds = ['missing'];
  assert.equal(validatePluginDefinitionsPayload(definitions).ok, false);
  delete unit.buttonGroup.defaultActiveButtonIds;
  unit.buttonGroup.buttons[1].buttonId = 'a';
  assert.equal(validatePluginDefinitionsPayload(definitions).ok, false);
});
test('rejects legacy theme metadata, unknown appearance references and appearance in business data', () => {
  const definitions = payload();
  const unit = definitions.units[0];
  unit.appearanceOverride = { _appliedThemeId: 'legacy' };
  assert.equal(validatePluginDefinitionsPayload(definitions).ok, false);
  unit.appearanceOverride = { elements: [{ identifier: 'missing', data: { text: 'x' } }] };
  assert.equal(validatePluginDefinitionsPayload(definitions).ok, false);
  delete unit.appearanceOverride;
  unit.plugin.type = 'cycled';
  unit.functions = [{ functionId: 'a', data: { appearance: {} } }, { functionId: 'b' }];
  assert.equal(validatePluginDefinitionsPayload(definitions).ok, false);
});
