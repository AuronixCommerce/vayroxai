# Vayrox AI — By Chohan Gen AI

AI chat workspace with Swift, Code, Research, Studio and Think modes, Firebase email/password authentication, signed-in chat history, guest quotas, and an administrator dashboard with project API keys.

## Deployment architecture

The repository contains the complete application source. The existing application runs on Sites / Cloudflare Workers with a protected D1 database. Vercel hosts a Node.js streaming gateway to that application. **The Sites backend remains required.** This preserves existing accounts, saved chats, encrypted provider credentials, API keys and admin settings without a database migration or Firebase service-account upload.

Vercel routes all paths to `api/gateway.mjs`. The gateway forwards cookies, streams AI responses, translates same-origin requests and redirects, strips platform identity headers, and signs visitor IPs for independent backend rate limits. It does not contain or expose the provider API key. All responses are private and uncached.

## Vercel setup

Import this repository into Vercel. `vercel.json` supplies the build configuration. Set `VAYROX_GATEWAY_SECRET` as a sensitive environment variable, matching the secret configured on the Sites backend. Do not commit its value. After changing it, redeploy both applications. The gateway uses only Node built-ins and needs no dependency installation.

The production branch is `main`. Vercel deployment protection is controlled in the Vercel dashboard; protected deployments require Vercel authentication.

## Original application development

The UI and backend are in `app/`, `components/`, `lib/`, `db/` and `drizzle/`. They use Vinext, React and Cloudflare Workers. Run `pnpm install` then `pnpm dev` for local application development, with the runtime bindings and environment configured. `pnpm build` builds the original Worker application. The Vercel build does not rebuild the Worker; application changes must also be deployed to Sites to take effect.

Required backend secrets: `GROQ_API_KEY`, `HARIUM_ENCRYPTION_KEY`, `ADMIN_ACCESS_KEY`, `VAYROX_GATEWAY_SECRET`. Never change the encryption key without migrating encrypted records. Firebase web configuration is public configuration; Firebase Auth owns passwords. Private RTDB storage remains optional until protected rules are configured.

## Verification

`node --experimental-strip-types --test tests/*.test.mjs` runs application and gateway tests. `node scripts/build-vercel.mjs` verifies gateway packaging.

The public AI endpoint is `POST /admin/api` with a project API key issued in `/admin`. Provider credentials and the admin access key belong in secret storage, never browser code.
