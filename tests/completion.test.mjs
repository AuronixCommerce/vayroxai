import {test} from 'node:test';
import assert from 'node:assert/strict';
import {completeWithGroq} from '../lib/completion.ts';
const input={model:'research',mode:'Analyze',messages:[{role:'user',content:'Help me analyze a complex decision. Ask for the situation, options, constraints, and what a good outcome looks like.'}]};
const signal=new AbortController().signal;
test('a rejected research tool call retries once without tools',async()=>{
 const requests=[];
 const fetcher=async(url,init)=>{requests.push({url,body:JSON.parse(init.body)});return requests.length===1?Response.json({error:{code:'tool_use_failed',message:'Tool choice is required, but model did not call a tool'}},{status:400}):Response.json({choices:[{message:{content:'What decision are you considering?'}}]});};
 const result=await completeWithGroq(input,'test-key',signal,fetcher);
 assert.equal(result.response.status,200);assert.equal(result.searchUnavailable,true);assert.equal(requests.length,2);
 assert.equal(requests[0].body.tool_choice,'auto');assert.equal(requests[1].body.tools,undefined);assert.equal(requests[1].body.tool_choice,undefined);
 assert.match(requests[1].body.messages[0].content,/Do not invent citations/);
});
test('successful research makes a single request',async()=>{
 let calls=0;const result=await completeWithGroq(input,'test-key',signal,async()=>{calls++;return Response.json({choices:[{message:{content:'Here are the results.'}}]});});
 assert.equal(calls,1);assert.equal(result.searchUnavailable,false);
});
test('authentication and allowance errors do not trigger extra provider calls',async()=>{
 for(const status of [401,429]){let calls=0;const result=await completeWithGroq(input,'test-key',signal,async()=>{calls++;return Response.json({error:{code:'tool_use_failed'}},{status});});assert.equal(calls,1);assert.equal(result.response.status,status);}
});
test('search recovery is bounded and never loops',async()=>{
 let calls=0;const result=await completeWithGroq(input,'test-key',signal,async()=>{calls++;return Response.json({error:{code:'tool_use_failed'}},{status:400});});assert.equal(calls,2);assert.equal(result.response.status,400);
});
test('code errors do not switch model or disable its tools',async()=>{
 let calls=0;const result=await completeWithGroq({...input,model:'code'},'test-key',signal,async()=>{calls++;return Response.json({error:{code:'tool_use_failed'}},{status:400});});assert.equal(calls,1);assert.equal(result.searchUnavailable,false);
});
