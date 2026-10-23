import test from 'node:test';
import assert from 'node:assert/strict';
import { validatePluginDefinitionsPayload } from '../src/utils/plugin-definitions-validator.js';

function payload() {
  return { libraries: [], units: [{ unitId: 'group', typeId: '@test/group', name: 'Group', categoryId: 'plugin',
    plugin: { type: 'button-group', pluginUUID: '@test/plugin', pluginVersion: '1.0.0', unitId: 'group' },
    layouts: { default: { preferredSize: { width: 2, height: 1 } } },
    buttonGroup: { presentationVersion: 1, displayMode: 'icon-top', fontFamily: 'builtin:font:ds-digital', fontSize: 32, iconSize: 48,
      buttons: [{ buttonId: 'a', name: { default: 'A' }, icon: 'builtin:icon:power' }, { buttonId: 'b', name: '', icon: '' }] },
  }] };
}
test('CLI admits the native button group definition', () => assert.equal(validatePluginDefinitionsPayload(payload()).ok, true));
for (const [name, edit] of [
  ['legacy presentation', group => { delete group.presentationVersion; }],
  ['legacy display mode', group => { group.displayMode = 'icon-text'; }],
  ['legacy per-button appearance', group => { group.buttons[0].appearanceOverride = {}; }],
  ['unknown builtin', group => { group.buttons[0].icon = 'builtin:icon:unknown-native-button'; }],
  ['source image icon', group => { group.buttons[0].icon = 'asset:icon'; }],
  ['unsupported tier', group => { group.fontSize = 19; }],
  ['a single button', group => { group.buttons = [group.buttons[0]]; }],
  ['duplicate button IDs', group => { group.buttons[1].buttonId = 'a'; }],
  ['an empty button ID', group => { group.buttons[0].buttonId = ''; }],
  ['a padded button ID', group => { group.buttons[0].buttonId = ' a'; }],
  ['an unknown default button', group => { group.defaultActiveButtonIds = ['c']; }],
  ['a duplicate default button', group => { group.defaultActiveButtonIds = ['a', 'a']; }],
  ['several defaults in single mode', group => { group.selectionMode = 'single'; group.defaultActiveButtonIds = ['a', 'b']; }],
  ['empty defaults in mandatory mode', group => { group.mandatory = true; group.defaultActiveButtonIds = []; }],
  ['a blank default button ID', group => { group.defaultActiveButtonIds = ['  ']; }],
]) test(`CLI rejects ${name}`, () => {
  const value = payload(); edit(value.units[0].buttonGroup);
  assert.equal(validatePluginDefinitionsPayload(value).ok, false);
});
