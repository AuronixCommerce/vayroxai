import { env } from "cloudflare:workers";
export async function consumePublicRequest(req:Request){
 if(!env.DB)throw Error("Database unavailable");
 const period=10*60*1000,now=Date.now();
 const ip=req.headers.get("cf-connecting-ip")||"unknown";
 const digest=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(ip+((env as unknown as Record<string,string>).HARIUM_ENCRYPTION_KEY||"harium")));
 const hash=Array.from(new Uint8Array(digest)).map(x=>x.toString(16).padStart(2,"0")).join("");
 const id=`${Math.floor(now/period)}:${hash}`;
 const result=await env.DB.prepare("INSERT INTO usage_windows (id,hits,expires) VALUES (?,1,?) ON CONFLICT(id) DO UPDATE SET hits=usage_windows.hits+1 WHERE usage_windows.hits < 20 RETURNING hits").bind(id,now+period).first();
 if(Math.random()<.03)await env.DB.prepare("DELETE FROM usage_windows WHERE expires < ?").bind(now).run();
 return !!result;
}
