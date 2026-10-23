import { env } from "cloudflare:workers";
import { getDb } from "@/db";
import { providers } from "@/db/schema";
import { eq } from "drizzle-orm";
export const defaultModel="openai/gpt-oss-20b";
export function runtime(){return env as unknown as Record<string,string|undefined>;}
async function encryptionKey(){const secret=runtime().HARIUM_ENCRYPTION_KEY;if(!secret)throw Error("Secure key storage is not configured.");const bytes=Uint8Array.from(atob(secret),c=>c.charCodeAt(0));return crypto.subtle.importKey("raw",bytes,"AES-GCM",false,["encrypt","decrypt"]);}
export async function encrypt(value:string,owner:string){const iv=crypto.getRandomValues(new Uint8Array(12));const ciphertext=await crypto.subtle.encrypt({name:"AES-GCM",iv,additionalData:new TextEncoder().encode(owner)},await encryptionKey(),new TextEncoder().encode(value));return btoa(String.fromCharCode(...iv))+"."+btoa(String.fromCharCode(...new Uint8Array(ciphertext)));}
export async function decrypt(value:string,owner:string){const [iv,data]=value.split(".");const bytes=Uint8Array.from(atob(data),c=>c.charCodeAt(0));const plaintext=await crypto.subtle.decrypt({name:"AES-GCM",iv:Uint8Array.from(atob(iv),c=>c.charCodeAt(0)),additionalData:new TextEncoder().encode(owner)},await encryptionKey(),bytes);return new TextDecoder().decode(plaintext);}
export async function getProvider(owner:string){const row=await getDb().select().from(providers).where(eq(providers.owner,owner)).get();const settings=runtime();return {apiKey:row?await decrypt(row.encryptedKey,owner):settings.GROQ_API_KEY||"",model:row?.model||settings.GROQ_MODEL||defaultModel,personal:!!row};}
