import test from 'node:test';
import assert from 'node:assert/strict';
import { validatePluginDefinitionsPayload as validate } from '../src/utils/plugin-definitions-validator.js';
import { validatePanelModel, validatePanelDelivery } from '../src/utils/plugin-panel-model.js';
const panel=(fields={})=>({libraries:[],units:[{unitId:'panel',typeId:'test.panel',name:'Panel',categoryId:'plugin',plugin:{type:'panel',pluginUUID:'test',pluginVersion:'1',unitId:'panel'},panel:{},...fields}]});
test('native panel and label tapAction definitions validate',()=>{
 assert.equal(validate(panel()).ok,true);
 const label=panel({panel:undefined,label:{fontFamily:'puhuiti'},tapAction:'page'});label.units[0].plugin.type='label';delete label.units[0].panel;
 assert.equal(validate(label).ok,true);
});
test('incompatible panel fields and malformed embedded model are rejected',()=>{
 for(const fields of [{hasView:true},{hasAppearanceEditor:true},{tapAction:'page'},{panel:{exampleModel:{v:1,items:[{}]}}},{panel:undefined}]){
  const input=panel(fields);if(fields.panel===undefined&&Object.hasOwn(fields,'panel'))delete input.units[0].panel;
  assert.equal(validate(input).ok,false);
 }
 const input=panel();input.units[0].plugin.type='standard';assert.equal(validate(input).ok,false);
});
test('model limits and event delivery ceiling fail before native submission',()=>{
 const model={v:1,items:[{id:'i'.repeat(1000),title:'Item',state:'idle',pages:[]}]};
 assert.doesNotThrow(()=>validatePanelModel(model));
 assert.throws(()=>validatePanelDelivery(model,'unit','test.panel'),/panel-event-size-exceeded/);
 model.items[0].id='item';assert.doesNotThrow(()=>validatePanelDelivery(model,'unit','test.panel'));
 model.items[0].title='中'.repeat(81);assert.throws(()=>validatePanelModel(model),/panel-line-too-large/);
});
