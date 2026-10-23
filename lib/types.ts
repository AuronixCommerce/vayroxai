export type Message = { id: string; role: "user" | "assistant"; content: string; model?:string };
export type Conversation = { id: string; title: string; mode: string; model?:string; messages: Message[]; updated: number };
export type Bookmark = { id: string; title: string; content: string; created: number };
