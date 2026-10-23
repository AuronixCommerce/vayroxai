import { workspaceIdentity } from "@/lib/workspace-identity";
import { guestAccess,guestAllowance,reserveGuestMessage,releaseGuestMessage } from "@/lib/guest-quota";
import { GUEST_MESSAGE_LIMIT } from "@/lib/guest-policy";
import { z } from "zod";
import { getConfig,providerKey,ipLimit,logRequest } from "@/lib/admin-server";
import { completeWithGroq } from "@/lib/completion";
import { hariumModelIds } from "@/lib/harium-models";
import { getProvider } from "@/lib/provider";
const schema=z.object({messages:z.array(z.object({role:z.enum(["user","assistant"]),content:z.string().max(150000)})).min(1).max(100),mode:z.enum(["General","Write","Code","Analyze","Brainstorm"]),model:z.enum(hariumModelIds).default("swift"),instructions:z.string().max(3000).optional()});
export async function GET(req:Request){const user=await workspaceIdentity(req);if(user)return Response.json({guest:false,limit:GUEST_MESSAGE_LIMIT,remaining:null},{headers:{"Cache-Control":"no-store",...(user.cookie?{"Set-Cookie":user.cookie}:{})}});const access=await guestAccess(req);return Response.json({guest:true,limit:GUEST_MESSAGE_LIMIT,...await guestAllowance(access.id)},{headers:{"Cache-Control":"no-store",...(access.cookie?{"Set-Cookie":access.cookie}:{})}});}
export async function POST(req:Request) {
 const user=await workspaceIdentity(req);
 let reservation:{id:string;resetsAt:number}|undefined;let accepted=false;const quotaHeaders:Record<string,string>={};if(user?.cookie)quotaHeaders["Set-Cookie"]=user.cookie;
 if(req.headers.get("origin")!==new URL(req.url).origin) return Response.json({error:"Request not allowed."},{status:403});
 if(Number(req.headers.get("content-length")||0)>1000000) return Response.json({error:"Please shorten the conversation or start a new chat."},{status:413});
 try {
 const suppliedKey=req.headers.get("x-groq-session-key");
 const config=await getConfig();if(!config.publicChat)return Response.json({error:"Chat is temporarily paused. Please return shortly."},{status:503});
 const sharedKey=await providerKey();
 const provider=sharedKey?{apiKey:sharedKey}:suppliedKey ? {apiKey:z.string().trim().min(20).max(400).parse(suppliedKey),model:z.string().min(1).max(120).parse(req.headers.get("x-groq-model")||"llama-3.3-70b-versatile")} : user ? await getProvider(user.owner) : null;
 if(!provider)return Response.json({error:"Connect your Groq API key in Settings to start chatting.",code:"SETUP_REQUIRED"},{status:401});
 if(!provider.apiKey) return Response.json({error:"Connect your Groq API key in Settings to start chatting.",code:"SETUP_REQUIRED"},{status:503});
 const body=schema.parse(await req.json());if(!config.models[body.model].enabled)return Response.json({error:"This model is paused. Choose another model."},{status:503});
 const started=Date.now();
 if(body.messages.reduce((n,m)=>n+m.content.length,0)>120000)return Response.json({error:"Please start a new conversation; this one has reached the context limit."},{status:413});
 if(sharedKey&&!await ipLimit(req,"public-chat",config.publicLimit,600000))return Response.json({error:"You’ve reached the short-term message limit. Please try again in a few minutes."},{status:429,headers:{"Retry-After":"600"}});
 if(!user){const access=await guestAccess(req);if(access.cookie)quotaHeaders["Set-Cookie"]=access.cookie;const quota=await reserveGuestMessage(access.id);quotaHeaders["X-Guest-Remaining"]=String(quota.remaining);if(quota.resetsAt)quotaHeaders["X-Guest-Reset"]=String(quota.resetsAt);if(!quota.allowed)return Response.json({error:"You’ve used your 14 free messages for this four-hour window. Sign in or wait for your allowance to reset.",code:"GUEST_LIMIT_REACHED",remaining:0,resetsAt:quota.resetsAt},{status:403,headers:{...quotaHeaders,"Cache-Control":"no-store"}});reservation={id:access.id,resetsAt:quota.resetsAt!};}
 const {response:upstream,searchUnavailable}=await completeWithGroq({...body,config},provider.apiKey,AbortSignal.any([req.signal,AbortSignal.timeout(120000)]));
 await logRequest("chat",null,body.model,upstream.ok?200:upstream.status,started);
 if(!upstream.ok||!upstream.body){
  const error=await upstream.json().catch(()=>({})) as {error?:{code?:string}};
  console.warn("Vayrox provider request rejected",{model:body.model,status:upstream.status,code:/^[a-z0-9_]{1,80}$/.test(error.error?.code||"")?error.error?.code:"unknown"});
  const message=upstream.status===429?"Vayrox’s shared allowance is busy right now. Please try again shortly.":upstream.status===401?"Vayrox’s AI connection needs attention. Please try again later.":error.error?.code==="model_decommissioned"||upstream.status===404?"This Vayrox model is temporarily unavailable. Please choose another model.":"This Vayrox model could not complete your request. Please try again.";
  if(reservation){quotaHeaders["X-Guest-Remaining"]=String((await releaseGuestMessage(reservation.id,reservation.resetsAt)).remaining);reservation=undefined;}
  return Response.json({error:message},{status:upstream.status===429?429:502,headers:quotaHeaders});
 }
 if(body.model==="research"){
  const result=await upstream.json() as {choices?:{message?:{content?:string};finish_reason?:string}[]};
  const answer=result.choices?.[0]?.message?.content?.replace(/【[^】]+】/g,"");
  if(!answer)throw Error("Research returned no answer");
  const content=(searchUnavailable?"**Web search is temporarily unavailable.** This reply uses the conversation context and has not been verified against live sources.\n\n":"")+answer;
  const encoder=new TextEncoder();
  const stream=new ReadableStream<Uint8Array>({start(controller){controller.enqueue(encoder.encode(`data: ${JSON.stringify({choices:[{delta:{content}}]})}\n\n`));if(result.choices?.[0]?.finish_reason==="length")controller.enqueue(encoder.encode(`data: ${JSON.stringify({choices:[{delta:{},finish_reason:"length"}]})}\n\n`));controller.enqueue(encoder.encode("data: [DONE]\n\n"));controller.close();}});
  accepted=true;return new Response(stream,{headers:{...quotaHeaders,"Content-Type":"text/event-stream","Cache-Control":"no-cache, no-transform","X-Vayrox-Model":body.model}});
 }
 accepted=true;return new Response(upstream.body,{headers:{...quotaHeaders,"Content-Type":"text/event-stream","Cache-Control":"no-cache, no-transform","X-Accel-Buffering":"no","X-Vayrox-Model":body.model}});
 }catch(error){if(reservation&&!accepted){quotaHeaders["X-Guest-Remaining"]=String((await releaseGuestMessage(reservation.id,reservation.resetsAt)).remaining);}return Response.json({error:error instanceof z.ZodError?"Please shorten your message or start a new conversation.":"The connection was interrupted. Please try again."},{status:400,headers:quotaHeaders});}
}
