import test from 'node:test';
import assert from 'node:assert/strict';
import { validatePluginDefinitionsPayload as validate } from '../src/utils/plugin-definitions-validator.js';
import { validatePanelModel, validatePanelDelivery } from '../src/utils/plugin-panel-model.js';
const panel=(fields={})=>({libraries:[],units:[{unitId:'panel',typeId:'test.panel',name:'Panel',categoryId:'plugin',plugin:{type:'panel',pluginUUID:'test',pluginVersion:'1',unitId:'panel'},panel:{},...fields}]});
test('native panel and label definitions validate and reject removed tapAction',()=>{
 assert.equal(validate(panel()).ok,true);
 const label=panel({panel:undefined,label:{fontFamily:'puhuiti'}});label.units[0].plugin.type='label';delete label.units[0].panel;
 assert.equal(validate(label).ok,true);
 label.units[0].tapAction='page';assert.equal(validate(label).ok,false);
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

test('localized panel and display label names match the runtime definition contract',()=>{
 const input=panel({name:{default:'Console',translations:{'zh-CN':'控制台'}}});assert.equal(validate(input).ok,true);
 input.units[0].interactionMode='display';assert.equal(validate(input).ok,false);
 const label=panel({name:{default:'Status'},panel:undefined,label:{fontFamily:'puhuiti'},interactionMode:'display'});delete label.units[0].panel;label.units[0].plugin.type='label';assert.equal(validate(label).ok,true);
 label.units[0].name.translations={'zh-CN':42};assert.equal(validate(label).ok,false);
});
