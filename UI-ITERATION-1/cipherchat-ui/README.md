# CipherChat — UI (INSE 6110 Secure Messaging)

The front-end screens only, built with **Next.js (Pages Router) + TypeScript + Tailwind CSS**.
All data is fake (`lib/mockData.ts`) so the UI works without Supabase or crypto.

## Run it

You need Node.js 18 or newer (https://nodejs.org).

```bash
npm install
npm run dev
```

Open http://localhost:3000 in your browser.
Tip: press F12 → toggle device toolbar to see it as a phone.

## Screens

| URL | File | What it shows |
|---|---|---|
| `/` | `pages/index.tsx` | Home / Sign in / Create account |
| `/chats` | `pages/chats.tsx` | Chat list, search, verified badges, new-chat button |
| `/chat/bob` | `pages/chat/[id].tsx` | Chat screen, "Show ciphertext" toggle, tampered-message card |
| `/profile` | `pages/profile.tsx` | Your fingerprint, verify a contact, lab (MITM) test mode, sign out |

## Where things are

- `tailwind.config.js` — colours and fonts (design tokens). Change them here once.
- `components/` — reusable parts: `Logo`, `Avatar` (monogram), `ChatRow`, `MessageBubble`, `TopBar`, `AppShell`, `Icons`.
- `lib/mockData.ts` — fake users and messages. Teammates replace this with real data.
- `public/favicon.svg` — the logo icon.

## Hand-off points for teammates (search for `TODO`)

- `pages/index.tsx` → Supabase sign-in / sign-up and key generation.
- `pages/chat/[id].tsx` → encrypt on send (AES-256-GCM) and save to Supabase.
- `pages/chats.tsx` → "New chat" dialog and key exchange.
- `pages/profile.tsx` → save the "verified" flag; lab test mode switch.
