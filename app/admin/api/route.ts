import { keysList,findKey,touchKey } from "@/lib/admin-store";
import { apiInputSchema } from "@/lib/app-config";
import { allowedOrigin,hashKey } from "@/lib/admin-security";
import { db,getConfig,providerKey,takeLimit,ipLimit,logRequest } from "@/lib/admin-server";
import { completeWithGroq } from "@/lib/completion";
const baseHeaders={"Cache-Control":"no-store","X-Content-Type-Options":"nosniff"};
type Key={id:string;models:string;origins:string;rpm:number;daily_limit:number;enabled:number};
export function GET(req:Request){return Response.redirect(new URL("/admin?tab=api",req.url),303);}
export async function OPTIONS(req:Request){const origin=req.headers.get("origin");if(!origin)return new Response(null,{status:400});const rows=(await keysList()).filter(k=>k.enabled);if(origin!==new URL(req.url).origin&&!rows.some(r=>(JSON.parse(r.origins) as string[]).includes(origin)))return new Response(null,{status:403});return new Response(null,{status:204,headers:{...baseHeaders,"Access-Control-Allow-Origin":origin,"Access-Control-Allow-Methods":"POST, OPTIONS","Access-Control-Allow-Headers":"Authorization, Content-Type","Access-Control-Max-Age":"600","Vary":"Origin"}});}
export async function POST(req:Request){
 const start=Date.now();let keyId:string|null=null,model="swift";let headers:Record<string,string>={...baseHeaders,"Vary":"Origin"};
 const fail=async(error:string,status:number)=>{if(keyId)await logRequest("api",keyId,model,status,start);return Response.json({error:{message:error,type:status===429?"rate_limit_error":"api_error"}},{status,headers});};
 try{
  if(!await ipLimit(req,"api-auth",180,60000))return fail("Too many requests.",429);
  const token=req.headers.get("authorization")?.match(/^Bearer (cga_[a-f0-9]{64})$/)?.[1];if(!token)return fail("Provide a project API key as Authorization: Bearer <key>.",401);
  const key=await findKey(await hashKey(token));
  if(!key||!key.enabled)return fail("This project API key is invalid or revoked.",401);keyId=key.id;
  const origin=req.headers.get("origin");if(!allowedOrigin(origin,new URL(req.url).origin,JSON.parse(key.origins)))return fail("This browser origin is not allowed for this key.",403);if(origin)headers["Access-Control-Allow-Origin"]=origin;
  const config=await getConfig();if(!config.apiEnabled)return fail("The project API is temporarily paused.",503);
  if(Number(req.headers.get("content-length")||0)>600000)return fail("Request is too large.",413);
  const raw=await req.text();if(raw.length>600000)return fail("Request is too large.",413);
  const parsed=apiInputSchema.safeParse(JSON.parse(raw));if(!parsed.success)return fail("Send a valid model, messages array, and optional stream, instructions, or max_tokens.",400);const body=parsed.data;model=body.model;
  if(!config.models[body.model].enabled||!(JSON.parse(key.models) as string[]).includes(body.model))return fail("This model is not available to this project key.",403);
  if(!await takeLimit(`key-minute:${key.id}`,key.rpm,60000)){headers["Retry-After"]="60";return fail("The project key has reached its minute request limit.",429);}
  if(!await takeLimit(`key-day:${key.id}`,key.daily_limit,86400000)){headers["Retry-After"]=String(Math.ceil((86400000-Date.now()%86400000)/1000));return fail("The project key has reached its daily request limit (resets at 00:00 UTC).",429);}
  const secret=await providerKey();if(!secret)return fail("The AI provider has not been configured.",503);
  await touchKey(key.id);
  const {response,searchUnavailable}=await completeWithGroq({model:body.model,messages:body.messages,instructions:body.instructions,mode:"General",stream:body.stream,maxTokens:body.max_tokens,config},secret,AbortSignal.any([req.signal,AbortSignal.timeout(120000)]));
  if(!response.ok||!response.body){await response.body?.cancel();return fail(response.status===429?"The AI provider is busy. Try again shortly.":"The model could not complete this request.",response.status===429?429:502);}
  headers["X-Chohan-Model"]=model;
  if(body.stream&&model!=="research"){
   await logRequest("api",key.id,model,200,start);return new Response(response.body,{headers:{...headers,"Content-Type":"text/event-stream","X-Accel-Buffering":"no"}});
  }
  const result=await response.json() as {id?:string;choices?:{message?:{content?:string};finish_reason?:string}[];usage?:{total_tokens?:number}};
  let content=result.choices?.[0]?.message?.content||"";if(!content)return fail("The model returned no text. Try again.",502);content=content.replace(/【[^】]+】/g,"");if(searchUnavailable)content="Web search is temporarily unavailable; this answer is not verified against live sources.\n\n"+content;
  const normalized={id:result.id||`chatcmpl-${crypto.randomUUID()}`,object:"chat.completion",created:Math.floor(Date.now()/1000),model,message:content,choices:[{index:0,message:{role:"assistant",content},finish_reason:result.choices?.[0]?.finish_reason||"stop"}],usage:result.usage||null};
  await logRequest("api",key.id,model,200,start,result.usage?.total_tokens||0);
  if(body.stream){const encoded=`data: ${JSON.stringify({id:normalized.id,model,choices:[{index:0,delta:{role:"assistant",content},finish_reason:null}]})}\n\ndata: ${JSON.stringify({id:normalized.id,model,choices:[{index:0,delta:{},finish_reason:normalized.choices[0].finish_reason}],usage:normalized.usage})}\n\ndata: [DONE]\n\n`;return new Response(encoded,{headers:{...headers,"Content-Type":"text/event-stream"}});}
  return Response.json(normalized,{headers});
 }catch{return fail("The request could not be completed. Check the JSON body and try again.",400);}
}
