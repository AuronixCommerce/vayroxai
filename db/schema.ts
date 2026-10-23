import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
export const conversations = sqliteTable("conversations", {
  id: text("id").primaryKey(), owner: text("owner").notNull(), title: text("title").notNull(),
  mode: text("mode").notNull().default("General"), model: text("model").notNull().default("swift"), messages: text("messages").notNull().default("[]"), updated: integer("updated").notNull(),
});
export const bookmarks = sqliteTable("bookmarks", {
  id: text("id").primaryKey(), owner: text("owner").notNull(), title: text("title").notNull(), content: text("content").notNull(), created: integer("created").notNull(),
});
export const providers = sqliteTable("providers", {
 owner: text("owner").primaryKey(), encryptedKey: text("encrypted_key").notNull(), model: text("model").notNull(),
});
export const usageWindows=sqliteTable("usage_windows",{id:text("id").primaryKey(),hits:integer("hits").notNull(),expires:integer("expires").notNull()});
export const appSettings=sqliteTable("app_settings",{id:text("id").primaryKey(),value:text("value").notNull(),updated:integer("updated").notNull()});
export const projectApiKeys=sqliteTable("project_api_keys",{id:text("id").primaryKey(),name:text("name").notNull(),hash:text("hash").notNull().unique(),preview:text("preview").notNull(),models:text("models").notNull(),origins:text("origins").notNull(),rpm:integer("rpm").notNull(),dailyLimit:integer("daily_limit").notNull(),enabled:integer("enabled").notNull().default(1),created:integer("created").notNull(),lastUsed:integer("last_used")});
export const requestLogs=sqliteTable("request_logs",{id:text("id").primaryKey(),channel:text("channel").notNull(),keyId:text("key_id"),model:text("model").notNull(),status:integer("status").notNull(),tokens:integer("tokens").notNull().default(0),duration:integer("duration").notNull(),created:integer("created").notNull()});
export const adminAudit=sqliteTable("admin_audit",{id:text("id").primaryKey(),action:text("action").notNull(),detail:text("detail").notNull(),created:integer("created").notNull()});
export const guestAllowances=sqliteTable("guest_allowances",{id:text("id").primaryKey(),used:integer("used").notNull().default(0),resetsAt:integer("resets_at").notNull().default(0),updated:integer("updated").notNull()});
