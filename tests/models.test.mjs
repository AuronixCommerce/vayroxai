import {test} from 'node:test';
import assert from 'node:assert/strict';
import {hariumModels,getHariumModel,modelForCategory,revealBatch} from '../lib/harium-models.ts';
import {inferenceRequest} from '../lib/inference.ts';
const messages=[{role:'user',content:'Help me with this idea.'}];
test('Harium variants route across distinct Groq models',()=>{
 const routes=hariumModels.map(m=>inferenceRequest(m.id,messages));
 assert.equal(new Set(routes.map(r=>r.model)).size,3);
 assert.equal(inferenceRequest('swift',messages).model,'openai/gpt-oss-20b');
 assert.equal(inferenceRequest('code',messages).model,'qwen/qwen3.8-27b');
 assert.equal(inferenceRequest('think',messages).model,'openai/gpt-oss-120b');
});
test('only Research requests a real browsing tool',()=>{
 for(const model of hariumModels){const request=inferenceRequest(model.id,messages);if(model.id==='research'){assert.deepEqual(request.tools,[{type:'browser_search'}]);assert.equal(request.tool_choice,'auto');assert.equal(request.stream,false);}else{assert.equal(request.tools,undefined);assert.equal(request.stream,true);}}
});
test('each profile supplies a distinct writing instruction without revealing hidden reasoning',()=>{
 const instructions=hariumModels.map(m=>inferenceRequest(m.id,messages).messages[0].content);
 assert.equal(new Set(instructions).size,5);
 assert.match(instructions[1],/senior developer/);
 assert.match(instructions[2],/Never invent citations/);
 assert.match(instructions[3],/distinctive voice/);
 for(const model of hariumModels){const r=inferenceRequest(model.id,messages);assert.equal(model.id==='code'?r.reasoning_format:r.include_reasoning,model.id==='code'?'hidden':false);}
});
test('category selection and unknown historical models resolve safely',()=>{
 assert.equal(modelForCategory('Code'),'code');assert.equal(modelForCategory('Analyze'),'think');assert.equal(modelForCategory('Write'),'studio');assert.equal(getHariumModel('retired').id,'swift');
});
test('display rhythms vary and respect reduced motion',()=>{
 assert.ok(revealBatch('code')>revealBatch('studio'));
 for(const model of hariumModels)assert.equal(revealBatch(model.id,true),10000);
});

test('the reported decision prompt can ask for clarification without a forced tool call',()=>{
 const request=inferenceRequest('research',[{role:'user',content:'Help me analyze a complex decision. Ask for the situation, options, constraints, and what a good outcome looks like.'}]);
 assert.equal(request.tool_choice,'auto');assert.match(request.messages[0].content,/a tool call is not mandatory/);
 assert.equal(modelForCategory('Analyze'),'think');
});
test('search recovery removes tools and forbids claims of live verification',()=>{
 const request=inferenceRequest('research',messages,'','Analyze',{webSearch:false});
 assert.equal(request.tools,undefined);assert.equal(request.tool_choice,undefined);assert.equal(request.stream,false);
 assert.match(request.messages[0].content,/Web search is temporarily unavailable/);assert.match(request.messages[0].content,/Do not invent citations/);
});
