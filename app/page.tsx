import Workspace from "./workspace";
import { workspaceIdentity } from "@/lib/workspace-identity";
import { headers } from "next/headers";
import { firebaseActive } from "@/lib/firebase-admin";
import { getConfig,providerKey } from "@/lib/admin-server";
import { publicConfig } from "@/lib/app-config";
export const dynamic = "force-dynamic";
export default async function Home() {
  const requestHeaders=await headers();
  const [user,config,key,realtime] = await Promise.all([workspaceIdentity(new Request("https://local/",{headers:requestHeaders})),getConfig(),providerKey(),firebaseActive()]);
  return <Workspace authType={user?.firebase?"firebase":user?"sites":"guest"} realtime={realtime} config={publicConfig(config)} sharedConfigured={!!key} guest={!user} name={user?.name||"Guest"} />;
}
