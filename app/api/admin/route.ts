import { dashboardData,keysList,addKey,revokeKey,clearLogs } from "@/lib/admin-store";
import { connectFirebase,prepareFirebase,connectionInfo } from "@/lib/firebase-admin";
import { z } from "zod";
import { configSchema,projectKeySchema } from "@/lib/app-config";
import { hashKey,equalText,createSession,newProjectKey } from "@/lib/admin-security";
import { db,getConfig,providerKey,accessKey,sessionSecret,isAdmin,sameOrigin,ipLimit,putSetting,encrypt,audit } from "@/lib/admin-server";
const noCache={"Cache-Control":"no-store"};
export async function GET(req:Request){
 if(!await isAdmin(req))return Response.json({authenticated:false},{headers:noCache});
 const [config,dashboard,firebaseConnection,models]=await Promise.all([getConfig(),dashboardData(),connectionInfo(),providerKey().then(async key=>{if(!key)return [];try{const r=await fetch("https://api.groq.com/openai/v1/models",{headers:{Authorization:`Bearer ${key}`},signal:AbortSignal.timeout(10000)});if(!r.ok)return [];const data=await r.json() as {data?:{id:string}[]};return (data.data||[]).map(m=>m.id);}catch{return [];}})]);
 return Response.json({authenticated:true,config,...dashboard,firebaseConnection,providerConfigured:!!await providerKey(),providerModels:models},{headers:noCache});
}

export async function POST(req:Request){
 if(!sameOrigin(req))return Response.json({error:"Request not allowed."},{status:403,headers:noCache});
 if(Number(req.headers.get("content-length")||0)>100000)return Response.json({error:"Request too large."},{status:413});
 try{
  const body=await req.json() as Record<string,unknown>;
  if(body.action==="login"){
   if(!await ipLimit(req,"admin-login",5,15*60000))return Response.json({error:"Too many attempts. Try again in 15 minutes."},{status:429,headers:{...noCache,"Retry-After":"900"}});
   const key=z.string().min(1).max(200).parse(body.key);const expected=await accessKey();
   if(!expected||!equalText(await hashKey(key),await hashKey(expected)))return Response.json({error:"Access key is incorrect."},{status:401,headers:noCache});
   const token=await createSession(await sessionSecret());await audit("Admin signed in");
   return Response.json({ok:true},{headers:{...noCache,"Set-Cookie":`chohan_admin=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=43200`}});
  }
  if(!await isAdmin(req))return Response.json({error:"Admin access required."},{status:401,headers:noCache});
  if(body.action==="logout")return Response.json({ok:true},{headers:{...noCache,"Set-Cookie":"chohan_admin=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0"}});
  if(body.action==="config"){const config=configSchema.parse(body.config);await putSetting("config",JSON.stringify(config));await audit("Settings updated");return Response.json({ok:true},{headers:noCache});}
  if(body.action==="create-key"){
   const count=(await keysList()).filter(k=>k.enabled).length;if(count>=50)return Response.json({error:"Revoke an unused key before adding another (50 active keys maximum)."},{status:400});
   const v=projectKeySchema.parse(body.key);const key=newProjectKey(),id=crypto.randomUUID();await addKey({id,name:v.name,hash:await hashKey(key),preview:key.slice(0,10)+"…"+key.slice(-4),models:JSON.stringify(v.models),origins:JSON.stringify(v.origins),rpm:v.rpm,daily_limit:v.dailyLimit,enabled:1,created:Date.now(),last_used:null});await audit("Project API key created",v.name);return Response.json({key,id},{headers:noCache});
  }
  if(body.action==="revoke-key"){const id=z.string().uuid().parse(body.id);await revokeKey(id);await audit("Project API key revoked",id);return Response.json({ok:true},{headers:noCache});}
  if(body.action==="firebase-prepare"){const connection=await prepareFirebase();await audit("Firebase connection prepared");return Response.json({ok:true,connection},{headers:noCache});}
  if(body.action==="firebase"){await connectFirebase();await audit("Firebase real-time storage connected");return Response.json({ok:true},{headers:noCache});}
  if(body.action==="provider"){
   const key=z.string().trim().min(20).max(400).parse(body.key);const response=await fetch("https://api.groq.com/openai/v1/models",{headers:{Authorization:`Bearer ${key}`},signal:AbortSignal.timeout(15000)});if(!response.ok)return Response.json({error:"The provider rejected this key. Check it and try again."},{status:400});
   await putSetting("provider_key",await encrypt(key,"chohan-provider"));await audit("Provider key updated");return Response.json({ok:true},{headers:noCache});
  }
  if(body.action==="admin-key"){const key=z.string().min(8).max(200).parse(body.key);await putSetting("admin_key",await encrypt(key,"chohan-admin"));await audit("Admin access key changed");return Response.json({ok:true},{headers:{...noCache,"Set-Cookie":"chohan_admin=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0"}});}
  if(body.action==="clear-logs"){await clearLogs();await audit("Request logs cleared");return Response.json({ok:true},{headers:noCache});}
  return Response.json({error:"Unknown operation."},{status:400});
 }catch(error){return Response.json({error:error instanceof z.ZodError?error.issues.map(i=>`${i.path.join(".")}: ${i.message}`).join("; "):error instanceof Error?error.message:"The change could not be saved. Please try again."},{status:400,headers:noCache});}
}
