/** Parse Groq SSE without assuming network chunks align with event boundaries. */
export async function* groqText(body: ReadableStream<Uint8Array>): AsyncGenerator<string> {
 const reader=body.getReader(), decoder=new TextDecoder();let buffer="",finished=false;
 function parse(event:string):{text?:string;done?:boolean;error?:string}{
  const data=event.split(/\r?\n/).filter(line=>line.startsWith("data:")).map(line=>line.slice(5).trimStart()).join("\n");
  if(!data)return {};
  if(data==="[DONE]")return {done:true};
  let chunk;try{chunk=JSON.parse(data);}catch{throw Error("The provider returned an unreadable response. Please retry.");}
  if(chunk.error)return {error:"The provider interrupted this response. Please try again."};
  const choice=chunk.choices?.[0];
  if(choice?.finish_reason==="length")return {text:choice.delta?.content,error:"The response reached its length limit. Ask Harium to continue."};
  return {text:choice?.delta?.content};
 }
 try{
  while(true){
   const {done,value}=await reader.read();buffer+=decoder.decode(value,{stream:!done});
   const events=buffer.split(/\r?\n\r?\n/);buffer=events.pop()||"";
   if(done&&buffer.trim()){events.push(buffer);buffer="";}
   for(const event of events){const parsed=parse(event);if(parsed.text)yield parsed.text;if(parsed.error)throw Error(parsed.error);if(parsed.done){finished=true;return;}}
   if(done)break;
  }
  if(!finished)throw Error("The connection ended before the response finished. Please retry.");
 }finally{await reader.cancel().catch(()=>{});reader.releaseLock();}
}
