import test from 'node:test';
import assert from 'node:assert/strict';
import { validatePluginDefinitionsPayload } from '../src/utils/plugin-definitions-validator.js';

function payload() {
  const background = { borderWidth: 0, borderColor: '#000000', borderStyle: 'solid', backgroundColor: '#242424' };
  return { libraries: [], units: [{ unitId: 'control', typeId: '@test/composite.control', name: 'Composite', categoryId: 'plugin',
    plugin: { type: 'composite', pluginUUID: '@test/composite', pluginVersion: '1.0.0', unitId: 'control' },
    layouts: { default: { preferredSize: { width: 2, height: 1 } } },
    composite: { requires: { host: 1, device: 1 }, appearance: { background, elements: [{
      typeId: 'button', identifier: 'power', config: { removable: false, enabled: true },
      geometry: { x: 0, y: 0, width: 100, height: 100 },
      style: { background, foregroundColor: '#ffffff', fontFamily: 'builtin:font:puhuiti' },
      data: { layout: 'icon-top', icon: 'builtin:icon:power', title: { default: 'Power', translations: { zh: '电源' } },
        interaction: { mode: 'toggle' }, initialStateId: 'off',
        states: [{ stateId: 'off', overrides: {} }, { stateId: 'on', overrides: { title: { default: 'On' } } }] },
    }] }, buttonConfigs: [{ identifier: 'power', settings: { scene: { type: 'text', label: { default: 'Scene' }, default: 'living-room' } } }] },
  }] };
}

test('generated CLI contract accepts native Composite templates without sizes or runtime UUIDs', () => {
  const value = payload(), before = structuredClone(value);
  assert.deepEqual(validatePluginDefinitionsPayload(value), { ok: true, errors: [] });
  assert.deepEqual(value, before);
});

const invalid = [
  ['unsupported capability', unit => { unit.composite.requires.device = 2; }],
  ['root hold', unit => { unit.defaultActivation = { mode: 'hold' }; }],
  ['custom view', unit => { unit.hasView = true; }],
  ['wrong owner', unit => { unit.plugin.type = 'standard'; }],
  ['unknown state', unit => { unit.composite.appearance.elements[0].data.initialStateId = 'missing'; }],
  ['duplicate identifiers', unit => { unit.composite.appearance.elements.push(structuredClone(unit.composite.appearance.elements[0])); }],
  ['unsupported font', unit => { unit.composite.appearance.elements[0].style.fontFamily = 'asset:font'; }],
  ['unsupported tier', unit => { unit.composite.appearance.elements[0].style.fontSize = 19; }],
  ['forbidden state override', unit => { unit.composite.appearance.elements[0].data.states[0].overrides.layout = 'none'; }],
  ['dangling configuration', unit => { unit.composite.buttonConfigs[0].identifier = 'missing'; }],
  ['invalid configuration default', unit => { unit.composite.buttonConfigs[0].settings.scene = { type: 'number', label: 'Number', min: 1, default: 0 }; }],
];
for (const [name, mutate] of invalid) test(`generated CLI contract rejects ${name}`, () => {
  const value = payload(); mutate(value.units[0]);
  const result = validatePluginDefinitionsPayload(value);
  assert.equal(result.ok, false);
  assert.ok(result.errors[0]);
});
