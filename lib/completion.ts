import { inferenceRequest } from "./inference.ts";
import type { AppConfig } from "./app-config.ts";
import type { HariumModelId } from "./harium-models.ts";
type CompletionInput={model:HariumModelId;messages:{role:string;content:string}[];instructions?:string;mode:string;stream?:boolean;maxTokens?:number;config?:AppConfig};
/** Retry only a rejected search tool call, with explicit disclosure and no tools. */
export async function completeWithGroq(input:CompletionInput,key:string,signal:AbortSignal,fetcher:typeof fetch=fetch){
 const call=(webSearch=true)=>fetcher("https://api.groq.com/openai/v1/chat/completions",{method:"POST",headers:{Authorization:`Bearer ${key}`,"Content-Type":"application/json"},body:JSON.stringify(inferenceRequest(input.model,input.messages,input.instructions,input.mode,{webSearch,stream:input.stream,maxTokens:input.maxTokens,config:input.config})),signal});
 let response=await call();let searchUnavailable=false;
 if(input.model==="research"&&response.status===400){
  const error=await response.clone().json().catch(()=>null) as {error?:{code?:string}}|null;
  if(error?.error?.code==="tool_use_failed"){
   await response.body?.cancel();
   response=await call(false);searchUnavailable=true;
  }
 }
 return {response,searchUnavailable};
}
