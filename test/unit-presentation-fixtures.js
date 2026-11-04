export function presentation(mode = 'captured-unit', editors = []) {
  return { appearance: { fields: [], fonts: [], theme: { mode: 'none', userThemes: 'none' },
    advanced: { mode: 'none' }, editor: null, styleTransfer: [] },
  function: { editors, commonSettings: [] }, surface: { mode, preview: mode === 'native' ? 'unit-capture' : 'composed' } };
}

export function title() {
  return { typeId: 'text', uuid: 'title', identifier: 'primary-text', config: {},
    geometry: { x: 0, y: 0, width: 100, height: 100 },
    style: { color: '#FFFFFF', fontFamily: 'builtin:font:puhuiti', fontSize: 12 }, data: { text: 'One' } };
}
