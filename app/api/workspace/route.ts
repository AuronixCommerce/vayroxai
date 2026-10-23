import { workspaceIdentity } from "@/lib/workspace-identity";
import { firebaseActive,firebaseRead,firebaseWrite } from "@/lib/firebase-admin";
import { providerKey } from "@/lib/admin-server";
import type { Conversation,Bookmark } from "@/lib/types";
import { getChatGPTUser } from "../../chatgpt-auth";
import { getDb } from "@/db";
import { conversations, bookmarks } from "@/db/schema";
import { and, eq, desc } from "drizzle-orm";
import { z } from "zod";
import { hariumModelIds } from "@/lib/harium-models";
import { getProvider } from "@/lib/provider";
const message = z.object({ id:z.string().max(100), role:z.enum(["user","assistant"]), content:z.string().max(150000),model:z.enum(hariumModelIds).optional() });
const conversation = z.object({ id:z.string().uuid(), title:z.string().trim().min(1).max(120), mode:z.enum(["General","Write","Code","Analyze","Brainstorm"]), model:z.enum(hariumModelIds).default("swift"),messages:z.array(message).max(200) });
export async function GET(req:Request) {
 const user=await workspaceIdentity(req); if(!user) return Response.json({error:"Sign in to access your workspace."},{status:401});
 try {
 if(await firebaseActive()){const data=await firebaseRead<{conversations?:Record<string,Conversation>;bookmarks?:Record<string,Bookmark>}>(`users/${user.path}`)||{};return Response.json({conversations:Object.values(data.conversations||{}).sort((a,b)=>b.updated-a.updated),bookmarks:Object.values(data.bookmarks||{}).sort((a,b)=>b.created-a.created),configured:!!await providerKey(),model:"swift",personal:false},{headers:{"Cache-Control":"no-store",...(user.cookie?{"Set-Cookie":user.cookie}:{})}});}
 const db=getDb();
 const [chats,saved] = await Promise.all([db.select().from(conversations).where(eq(conversations.owner,user.owner)).orderBy(desc(conversations.updated)),db.select().from(bookmarks).where(eq(bookmarks.owner,user.owner)).orderBy(desc(bookmarks.created))]);
 const provider=await getProvider(user.owner);
 return Response.json({conversations:chats.map(c=>({...c,owner:undefined,messages:JSON.parse(c.messages)})), bookmarks:saved.map(b=>({...b,owner:undefined})), configured:!!provider.apiKey, model:provider.model, personal:provider.personal},{headers:{"Cache-Control":"no-store"}});
 } catch { return Response.json({error:"Your workspace could not be loaded. Please try again."},{status:500}); }
}
export async function POST(req:Request) {
 const user=await workspaceIdentity(req); if(!user) return Response.json({error:"Please sign in again."},{status:401});
 if(req.headers.get("origin")!==new URL(req.url).origin) return Response.json({error:"Request not allowed."},{status:403});
 if(Number(req.headers.get("content-length")||0)>2000000) return Response.json({error:"This conversation is too large."},{status:413});
 try {
 const body=z.object({action:z.string(),conversation:z.unknown().optional(),id:z.unknown().optional(),bookmark:z.unknown().optional()}).parse(await req.json());
 if(await firebaseActive()){
 const path=`users/${user.path}`;
 if(body.action==="save"){const c=conversation.parse(body.conversation);await firebaseWrite(`${path}/conversations/${c.id}`,{...c,updated:Date.now()});}
 else if(body.action==="delete"){const id=z.string().uuid().parse(body.id);await firebaseWrite(`${path}/conversations/${id}`,null);}
 else if(body.action==="bookmark"){const b=z.object({id:z.string().uuid(),title:z.string().min(1).max(120),content:z.string().min(1).max(150000)}).parse(body.bookmark);await firebaseWrite(`${path}/bookmarks/${b.id}`,{...b,created:Date.now()});}
 else if(body.action==="unbookmark"){const id=z.string().uuid().parse(body.id);await firebaseWrite(`${path}/bookmarks/${id}`,null);}
 else return Response.json({error:"Unknown action."},{status:400});
 return Response.json({ok:true},{headers:{"Cache-Control":"no-store",...(user.cookie?{"Set-Cookie":user.cookie}:{})}});
 }const db=getDb();
 if(body.action==="save") {
  const c=conversation.parse(body.conversation);
  const existing=await db.select().from(conversations).where(eq(conversations.id,c.id)).get();
  if(existing&&existing.owner!==user.owner) return Response.json({error:"Conversation unavailable."},{status:404});
  const values={...c,owner:user.owner,messages:JSON.stringify(c.messages),updated:Date.now()};
  await db.insert(conversations).values(values).onConflictDoUpdate({target:conversations.id,set:values});
 } else if(body.action==="delete") {
  const id=z.string().uuid().parse(body.id); await db.delete(conversations).where(and(eq(conversations.id,id),eq(conversations.owner,user.owner)));
 } else if(body.action==="bookmark") {
  const b=z.object({id:z.string().uuid(),title:z.string().min(1).max(120),content:z.string().min(1).max(150000)}).parse(body.bookmark);
  await db.insert(bookmarks).values({...b,owner:user.owner,created:Date.now()});
 } else if(body.action==="unbookmark") {
  const id=z.string().uuid().parse(body.id);await db.delete(bookmarks).where(and(eq(bookmarks.id,id),eq(bookmarks.owner,user.owner)));
 } else return Response.json({error:"Unknown action."},{status:400});
 return Response.json({ok:true});
 }catch(error) { return Response.json({error:error instanceof z.ZodError?"Please check your input. Conversations support up to 200 messages.":"Your changes could not be saved. Please try again."},{status:error instanceof z.ZodError?400:500}); }
}
