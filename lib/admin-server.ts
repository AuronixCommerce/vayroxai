import { readSetting,writeSetting,addAudit,addLog } from "./admin-store";
import { firebaseActive,firebaseLimit } from "./firebase-admin";
import { gatewayVisitorIp } from "./gateway-identity";
import { env } from "cloudflare:workers";
import { runtime,encrypt,decrypt } from "./provider";
import { configSchema,defaultConfig,type AppConfig } from "./app-config";
import { hashKey,validSession } from "./admin-security";
export function db(){if(!env.DB)throw Error("Database unavailable");return env.DB;}
export const setting=readSetting;
export const putSetting=writeSetting;
export async function getConfig():Promise<AppConfig>{const raw=await setting("config");if(!raw)return structuredClone(defaultConfig);const parsed=configSchema.safeParse(JSON.parse(raw));return parsed.success?parsed.data:structuredClone(defaultConfig);}
export async function providerKey(){const stored=await setting("provider_key");return stored?decrypt(stored,"chohan-provider"):runtime().GROQ_API_KEY||"";}
export async function accessKey(){const stored=await setting("admin_key");return stored?decrypt(stored,"chohan-admin"):runtime().ADMIN_ACCESS_KEY||"";}
export async function sessionSecret(){return `${runtime().HARIUM_ENCRYPTION_KEY}:${await hashKey(await accessKey())}`;}
export async function isAdmin(req:Request){const token=req.headers.get("cookie")?.split(";").map(v=>v.trim()).find(v=>v.startsWith("chohan_admin="))?.slice(13);return !!token&&validSession(token,await sessionSecret());}
export function sameOrigin(req:Request){return req.headers.get("origin")===new URL(req.url).origin;}
export async function audit(action:string,detail=""){await addAudit(action,detail);}
export async function takeLimit(id:string,limit:number,period:number){if(await firebaseActive())return firebaseLimit(id,limit,period);const now=Date.now(),window=`${id}:${Math.floor(now/period)}`;const result=await db().prepare("INSERT INTO usage_windows(id,hits,expires) VALUES(?,1,?) ON CONFLICT(id) DO UPDATE SET hits=hits+1 WHERE hits < ? RETURNING hits").bind(window,now+period,limit).first();return !!result;}
export async function ipLimit(req:Request,scope:string,limit:number,period:number){const hashed=await hashKey((await gatewayVisitorIp(req,runtime().VAYROX_GATEWAY_SECRET))+runtime().HARIUM_ENCRYPTION_KEY);return takeLimit(`${scope}:${hashed}`,limit,period);}
export async function logRequest(channel:string,keyId:string|null,model:string,status:number,start:number,tokens=0){await addLog({id:crypto.randomUUID(),channel,key_id:keyId,model,status,tokens,duration:Date.now()-start,created:Date.now()});if(Math.random()<.03&&!await firebaseActive())await db().batch([db().prepare("DELETE FROM request_logs WHERE created < ?").bind(Date.now()-30*86400000),db().prepare("DELETE FROM usage_windows WHERE expires < ?").bind(Date.now()),db().prepare("DELETE FROM admin_audit WHERE created < ?").bind(Date.now()-90*86400000)]);}
export {encrypt};
