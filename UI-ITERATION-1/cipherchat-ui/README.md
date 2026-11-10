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

| URL | What it shows |
|---|---|
| `/` | Home / Sign in / Create account (`pages/index.tsx`) |
| `/chats` | Main app, WhatsApp-style 3 columns (`pages/chats.tsx`) |

The main app has three columns:

1. **Left icon bar** (`components/Sidebar.tsx`) — Chats and Calls at the top; your profile picture at the bottom opens Settings.
2. **Middle column** — changes with the icon you pick:
   - Chats: search, filters (All / Unread / Not verified), list of contacts (`ChatListPanel.tsx`)
   - Calls: recent calls, UI only (`CallsPanel.tsx`)
   - Settings: your profile card + menu (`settings/SettingsMenu.tsx`)
3. **Right column** — the open chat (`ChatPane.tsx`), the settings section you picked
   (`settings/SettingsDetail.tsx`), or a welcome screen (`EmptyPane.tsx`).

Settings sections (`components/settings/`):

| Section | File | Contents |
|---|---|---|
| Profile | `ProfileSection.tsx` | Profile picture (change/remove), name, username, email |
| Account | `AccountSection.tsx` | Security notifications, account info, request info / delete account |
| Privacy | `PrivacySection.tsx` | WhatsApp-style list. *Who can see my personal info*: Last seen and online ›, Profile picture › (Everyone / My contacts / Nobody), Read receipts switch. *Encryption and keys*: Identity key fingerprint › and Verify contacts › (fingerprints always masked; Show is future development), Lab (MITM) test mode switch |
| Agents | — | Future development (menu item only) |
| Notifications | — | Future development (menu item only) |
| Help and feedback | `HelpSection.tsx` | FAQ, send feedback, app info |

The on/off settings live in `lib/settings.ts`.

On a phone the list and the chat take turns filling the screen (with a back arrow).
Direct links also work: `/chats?c=bob`, `/chats?view=calls`, `/chats?view=settings`, `/chats?view=settings&s=privacy`.

## Where things are

- `tailwind.config.js` — colours and fonts (design tokens). Change them here once.
  Current theme: **Keys and locks** — cream background, steel-blue accent (#2F5D8A).
  The logo colour is also set in `components/Logo.tsx` and `public/favicon.svg`.
- `styles/globals.css` — includes the chat wallpaper (`.chat-bg`): faint hex digits, like ciphertext.
- `components/` — all the building blocks listed above, plus `Logo`, `Avatar` (monogram), `MessageBubble`, `Icons`.
- `lib/mockData.ts` — fake users, messages and calls. Teammates replace this with real data.
- `public/favicon.svg` — the logo icon.

## Hand-off points for teammates (search for `TODO`)

- `pages/index.tsx` → Supabase sign-in / sign-up and key generation.
- `pages/chats.tsx` (`send`) → encrypt on send (AES-256-GCM) and save to Supabase.
- `components/ChatListPanel.tsx` → "New chat" dialog and key exchange.
- `components/settings/PrivacySection.tsx` → save the "verified" flag; lab test mode switch.
- `components/settings/ProfileSection.tsx` → upload the profile photo, save name/username.
- `components/settings/SettingsMenu.tsx` → sign out with Supabase.
