import { firebaseUser } from "./firebase-auth";
import { getChatGPTUser } from "../app/chatgpt-auth";
export async function workspaceIdentity(req:Request){const firebase=await firebaseUser(req);if(firebase)return {owner:"firebase:"+firebase.user.uid,path:firebase.user.uid,name:firebase.user.name,email:firebase.user.email,firebase:true,cookie:firebase.cookie};const sites=await getChatGPTUser();return sites?{owner:sites.userId,path:"sites_"+sites.userId,name:sites.fullName||sites.displayName,email:sites.email,firebase:false,cookie:undefined}:null;}
