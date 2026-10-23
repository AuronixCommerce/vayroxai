export const GUEST_MESSAGE_LIMIT=14;
const encoder=new TextEncoder();
function hex(bytes:ArrayBuffer){return Array.from(new Uint8Array(bytes)).map(n=>n.toString(16).padStart(2,"0")).join("");}
async function sign(id:string,secret:string){const key=await crypto.subtle.importKey("raw",encoder.encode(secret),{name:"HMAC",hash:"SHA-256"},false,["sign"]);return hex(await crypto.subtle.sign("HMAC",key,encoder.encode("vayrox-guest:"+id)));}
export async function issueGuestToken(secret:string){if(!secret)throw Error("Guest access is not configured");const id=crypto.randomUUID();return id+"."+await sign(id,secret);}
export async function verifyGuestToken(token:string,secret:string){if(!secret||!/^([a-f0-9-]{36})\.([a-f0-9]{64})$/.test(token))return false;const [id,sig]=token.split(".");const expected=await sign(id,secret);let difference=0;for(let i=0;i<expected.length;i++)difference|=sig.charCodeAt(i)^expected.charCodeAt(i);return difference===0;}
export const legacyGuestStorageKey="harium-guest-workspace-v1";
export function clearLegacyGuestChats(storage:Pick<Storage,"removeItem">){storage.removeItem(legacyGuestStorageKey);}
export const GUEST_WINDOW_MS=4*60*60*1000;
export const reserveGuestSQL="INSERT INTO guest_allowances(id,used,updated,resets_at) VALUES(?,1,?,?) ON CONFLICT(id) DO UPDATE SET used=CASE WHEN resets_at<=? THEN 1 ELSE used+1 END,resets_at=CASE WHEN resets_at<=? THEN ? ELSE resets_at END,updated=excluded.updated WHERE resets_at<=? OR used<? RETURNING used,resets_at";
export const releaseGuestSQL="UPDATE guest_allowances SET used=MAX(0,used-1),updated=? WHERE id=? AND resets_at=?";
export function reserveGuestArguments(id:string,now:number){return [id,now,now+GUEST_WINDOW_MS,now,now,now+GUEST_WINDOW_MS,now,GUEST_MESSAGE_LIMIT] as const;}
