import test from 'node:test';
import assert from 'node:assert/strict';
import { validatePluginDefinitionsPayload } from '../src/utils/plugin-definitions-validator.js';
import { presentation, title } from './unit-presentation-fixtures.js';

function payload() {
  const owner = '@test/contract';
  return { libraries: [{ libraryUUID: owner, name: { default: 'Contract' } }], units: [{
    unitId: 'one', typeId: `${owner}.one`, name: { default: 'One' }, categoryId: 'plugin',
    plugin: { type: 'standard', pluginUUID: owner, pluginVersion: '1.0.0', unitId: 'one' },
    layouts: { default: { preferredSize: { width: 1, height: 1 }, appearance: { elements: [title()] } } },
    requirements: { deviceCapabilities: [] },
    presentation: presentation('captured-unit', [{ kind: 'plugin', pluginUUID: owner, typeId: `${owner}.one`, scope: 'unit' }]),
    requirements: { deviceCapabilities: [] },
    visibleInLibrary: false,
    interactionMode: 'click', defaultActivation: { mode: 'hold', holdDurationMs: 800 }
  }] };
}
function builtin(uuid, extra = {}) {
  return { uuid, typeId: '@eniacelec/layout:container', name: 'Container', icon: '', config: {}, requirements: { deviceCapabilities: [] }, presentation: presentation(), requirements: { deviceCapabilities: [] },
    geometry: { x: 0, y: 0, width: 1, height: 1 }, elements: [], appearance: [{ stateId: 'default',
      background: { backgroundColor: 'transparent', borderWidth: 0, borderColor: 'transparent', borderStyle: 'none' },
      elementValues: {} }], data: {}, ...extra };
}

test('accepts independent device layouts and rejects removed Unit fields or missing defaults', () => {
  const definitions = payload();
  definitions.units[0].layouts.devices = {
    FlexbarV2: { preferredSize: { width: 2, height: 1 }, appearance: {
      elements: [{ ...title(), geometry: { x: 35, y: 10, width: 60, height: 80 } }]
    } }
  };
  assert.equal(validatePluginDefinitionsPayload(definitions).ok, true);
  for (const edit of [
    unit => { delete unit.layouts; },
    unit => { delete unit.layouts.default; },
    unit => { unit.layouts.devices.FlexbarV2.preferredSize.width = 0; },
    unit => { unit.defaultGeometry = { x: 0, y: 0, width: 1, height: 1 }; },
    unit => { unit.appearanceOverride = {}; }
  ]) {
    const invalid = structuredClone(definitions);
    edit(invalid.units[0]);
    assert.equal(validatePluginDefinitionsPayload(invalid).ok, false);
  }
});
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
  delete unit.layouts.default.appearance;
  unit.buttonGroup = { presentationVersion: 1, buttons: [{ buttonId: 'a' }, { buttonId: 'b' }] };
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
  unit.layouts.default.appearance = { _appliedThemeId: 'legacy' };
  assert.equal(validatePluginDefinitionsPayload(definitions).ok, false);
  unit.layouts.default.appearance = { elements: [{ identifier: 'missing', data: { text: 'x' } }] };
  assert.equal(validatePluginDefinitionsPayload(definitions).ok, false);
  delete unit.layouts.default.appearance;
  unit.plugin.type = 'cycled';
  unit.functions = [{ functionId: 'a', data: { appearance: {} } }, { functionId: 'b' }];
  assert.equal(validatePluginDefinitionsPayload(definitions).ok, false);
});

test('cycled indicator values address one shared declared layout and reject obsolete root declarations', () => {
  const owner = '@test/contract';
  const cycled = (extra = {}) => ({ libraries: [{ libraryUUID: owner, name: { default: 'Contract' } }], units: [{
    unitId: 'toggle', typeId: `${owner}.toggle`, name: { default: 'Toggle' }, categoryId: 'plugin',
    plugin: { type: 'cycled', pluginUUID: owner, pluginVersion: '1.0.0', unitId: 'toggle' },
    requirements: { deviceCapabilities: [] },
    presentation: presentation(), requirements: { deviceCapabilities: [] },
    layouts: { default: { preferredSize: { width: 1, height: 1 }, appearance: { elements: [{
      typeId: 'indicator', uuid: 'light', identifier: 'state-light', config: {}, geometry: { x: 5, y: 90, width: 30, height: 4 },
      style: { color: '#777777' }, data: {},
    }] } } },
    functions: [{ functionId: 'off' }, { functionId: 'on' }], ...extra
  }] });
  assert.deepEqual(validatePluginDefinitionsPayload(cycled()), { ok: true, errors: [] });
  const styled = cycled();
  styled.units[0].functions[1].appearanceOverride = { elementValues: { 'state-light': { style: { color: '#66bb6a' } } } };
  assert.equal(validatePluginDefinitionsPayload(styled).ok, true);
  styled.units[0].functions[1].appearanceOverride.elementValues['state-light'].geometry = { x: 20 };
  assert.equal(validatePluginDefinitionsPayload(styled).ok, false);
  const unknown = cycled();
  unknown.units[0].functions[1].appearanceOverride = { elementValues: { missing: { style: { color: '#66bb6a' } } } };
  assert.equal(validatePluginDefinitionsPayload(unknown).ok, false);
  for (const indicator of [{ onFunctionIds: ['on'] }, { onFunctionIds: [] }, { onFunctionIds: ['missing'] }, {}]) {
    assert.equal(validatePluginDefinitionsPayload(cycled({ indicator })).ok, false, JSON.stringify(indicator));
  }
  const standard = cycled({ indicator: { onFunctionIds: ['on'] } });
  standard.units[0].plugin.type = 'standard';
  delete standard.units[0].functions;
  assert.equal(validatePluginDefinitionsPayload(standard).ok, false);
});

test('saved builtin Units reject superseded state-local elements', () => {
  const definitions = payload(), unit = builtin('root');
  definitions.builtinUnits = [unit];
  delete unit.elements;
  unit.appearance = [{ background: unit.appearance[0].background, elements: [] }];
  assert.equal(validatePluginDefinitionsPayload(definitions).ok, false);
});
