// SCREEN 3 — Chat screen
import { FormEvent, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import AppShell from '@/components/AppShell';
import Avatar from '@/components/Avatar';
import TopBar from '@/components/TopBar';
import MessageBubble from '@/components/MessageBubble';
import { SendIcon, ShieldCheckIcon, AlertIcon } from '@/components/Icons';
import { fakeCiphertext, getContact, Message, messagesByContact } from '@/lib/mockData';

export default function ChatScreen() {
  const router = useRouter();
  const id = String(router.query.id ?? '');
  const contact = getContact(id);

  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [showCipher, setShowCipher] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (id) setMessages(messagesByContact[id] ?? []);
  }, [id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function send(e: FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    // TODO (crypto teammate): encrypt with AES-256-GCM using the session key,
    // then insert the ciphertext + nonce into Supabase instead of this local update.
    const now = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    setMessages((m) => [...m, { id: String(Date.now()), fromMe: true, text, ciphertext: fakeCiphertext(text), time: now, status: 'ok' }]);
    setDraft('');
  }

  if (!contact) {
    return (
      <AppShell title="Chat">
        <TopBar backHref="/chats"><span className="font-semibold">Chat not found</span></TopBar>
      </AppShell>
    );
  }

  return (
    <AppShell title={`Chat with ${contact.name}`}>
      <TopBar
        backHref="/chats"
        right={
          <button
            type="button"
            onClick={() => setShowCipher((s) => !s)}
            aria-pressed={showCipher}
            className={`h-9 rounded-full border px-3 text-xs font-semibold ${showCipher ? 'border-ink bg-ink text-white' : 'border-slate-300 bg-white text-ink'}`}
          >
            {showCipher ? 'Show text' : 'Show ciphertext'}
          </button>
        }
      >
        <Avatar name={contact.name} size="sm" />
        <div className="flex min-w-0 flex-col">
          <span className="truncate font-semibold">{contact.name}</span>
          {contact.verified ? (
            <span className="text-xs font-medium text-primary">Verified · E2E encrypted</span>
          ) : (
            <span className="text-xs font-medium text-warn">Not verified · check fingerprint</span>
          )}
        </div>
      </TopBar>

      {contact.verified ? (
        <div className="mx-5 mt-3.5 flex items-center justify-center gap-2 rounded-[10px] bg-primary-soft px-3 py-2 text-xs text-primary-dark">
          <ShieldCheckIcon className="h-3.5 w-3.5" /> Session key set up · X25519 + Ed25519 signed
        </div>
      ) : (
        <div className="mx-5 mt-3.5 flex items-center justify-center gap-2 rounded-[10px] border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          <AlertIcon className="h-3.5 w-3.5" /> Compare fingerprints in Profile before sharing anything sensitive
        </div>
      )}

      <main className="flex flex-1 flex-col gap-2.5 overflow-y-auto px-4 py-3">
        {messages.length === 0 && <p className="mt-10 text-center text-sm text-slate-500">No messages yet. Say hi.</p>}
        {messages.map((m) => (
          <MessageBubble key={m.id} message={m} showCipher={showCipher} />
        ))}
        <div ref={bottomRef} />
      </main>

      <form onSubmit={send} className="sticky bottom-0 flex items-center gap-2 border-t border-slate-200 bg-white px-3 pb-6 pt-3">
        <label htmlFor="msg" className="sr-only">Message</label>
        <input
          id="msg"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Type a message"
          autoComplete="off"
          className="h-[46px] flex-1 rounded-full border border-slate-300 bg-slate-50 px-4 text-[15px] outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
        <button type="submit" aria-label="Send encrypted message" className="flex h-[46px] w-[46px] items-center justify-center rounded-full bg-primary text-white hover:bg-primary-dark">
          <SendIcon />
        </button>
      </form>
    </AppShell>
  );
}
