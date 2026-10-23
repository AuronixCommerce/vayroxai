import { z } from "zod";
export async function POST(req:Request){
 if(req.headers.get("origin")!==new URL(req.url).origin)return Response.json({error:"Request not allowed."},{status:403});
 try{
  const {apiKey,model}=z.object({apiKey:z.string().trim().min(20).max(400),model:z.string().trim().min(1).max(120)}).parse(await req.json());
  const r=await fetch("https://api.groq.com/openai/v1/models",{headers:{Authorization:`Bearer ${apiKey}`},signal:AbortSignal.timeout(15000)});
  if(!r.ok)return Response.json({error:r.status===401?"That key was not accepted by Groq. Check it and try again.":"Groq is unavailable. Please try again."},{status:400});
  const data=await r.json() as {data:{id:string}[]};
  if(!data.data.some(m=>m.id===model))return Response.json({error:"This model is not available for your Groq account."},{status:400});
  return Response.json({ok:true},{headers:{"Cache-Control":"no-store"}});
 }catch{return Response.json({error:"Check your Groq API key and model ID, then try again."},{status:400});}
}
