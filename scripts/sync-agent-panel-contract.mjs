import fs from 'node:fs';
import path from 'node:path';
import { transform } from 'esbuild';
const [source, mode]=process.argv.slice(2);
if(!source)throw new Error('Provide the tracked contracts/agent-center/v1 directory');
for(const [input,output] of [['panel-contract.ts','plugin-panel-model.js'],['panel-definition-schema.ts','plugin-panel-schema.js']]){
 const code=(await transform(fs.readFileSync(path.join(source,input),'utf8'),{loader:'ts',format:'esm',target:'node18'})).code;
 const file=new URL('../src/utils/'+output,import.meta.url);
 if(mode==='--check'){if(fs.readFileSync(file,'utf8').replaceAll('\r\n','\n')!==code)throw new Error('Generated panel contract differs: '+output);}
 else fs.writeFileSync(file,code,'utf8');
}
