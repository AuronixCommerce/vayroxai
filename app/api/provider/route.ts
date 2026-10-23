import { getChatGPTUser } from "../../chatgpt-auth";
import { getDb } from "@/db";
import { providers } from "@/db/schema";
import { encrypt, defaultModel } from "@/lib/provider";
import { eq } from "drizzle-orm";
import { z } from "zod";
export async function POST(req:Request){
 const user=await getChatGPTUser();if(!user)return Response.json({error:"Please sign in again."},{status:401});
 if(req.headers.get("origin")!==new URL(req.url).origin)return Response.json({error:"Request not allowed."},{status:403});
 try{
 const body=z.object({apiKey:z.string().trim().min(20).max(400),model:z.string().trim().min(1).max(120).default(defaultModel)}).parse(await req.json());
 const check=await fetch("https://api.groq.com/openai/v1/models",{headers:{Authorization:`Bearer ${body.apiKey}`},signal:AbortSignal.timeout(15000)});
 if(!check.ok)return Response.json({error:check.status===401?"That API key was not accepted by Groq. Check the key and try again.":"Groq could not validate the connection. Please try again."},{status:400});
 const data=await check.json() as {data:{id:string}[]};if(!data.data.some(m=>m.id===body.model))return Response.json({error:"This model is not available for your Groq account. Check its model ID in the Groq Console."},{status:400});
 const values={owner:user.userId,encryptedKey:await encrypt(body.apiKey,user.userId),model:body.model};
 await getDb().insert(providers).values(values).onConflictDoUpdate({target:providers.owner,set:values});
 return Response.json({ok:true,model:body.model});
 }catch(e){return Response.json({error:e instanceof z.ZodError?"Enter a valid Groq API key and model ID.":"The secure connection could not be saved. Please try again."},{status:400});}
}
export async function DELETE(req:Request){const user=await getChatGPTUser();if(!user)return Response.json({error:"Please sign in again."},{status:401});if(req.headers.get("origin")!==new URL(req.url).origin)return Response.json({error:"Request not allowed."},{status:403});await getDb().delete(providers).where(eq(providers.owner,user.userId));return Response.json({ok:true});}
