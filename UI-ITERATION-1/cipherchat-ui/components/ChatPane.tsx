import { FormEvent, useEffect, useRef, useState } from 'react';
import Avatar from './Avatar';
import MessageBubble from './MessageBubble';
import { AlertIcon, BackIcon, SearchIcon, SendIcon, ShieldCheckIcon, VideoIcon } from './Icons';
import type { Contact, Message } from '@/lib/mockData';

// Right column: the open conversation.
export default function ChatPane({
  contact, verified, labMode, messages, onSend, onBack,
}: {
  contact: Contact;
  verified: boolean;
  labMode: boolean;
  messages: Message[];
  onSend: (text: string) => void;
  onBack: () => void; // only shown on small screens
}) {
  const [draft, setDraft] = useState('');
  const [showCipher, setShowCipher] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, contact.id]);

  useEffect(() => {
    setDraft('');
    setShowCipher(false);
  }, [contact.id]);

  function submit(e: FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    onSend(text);
    setDraft('');
  }

  return (
    <section className="flex h-full min-w-0 flex-1 flex-col" aria-label={`Chat with ${contact.name}`}>
      <header className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-2.5">
        <button type="button" onClick={onBack} aria-label="Back to chats" className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-slate-100 md:hidden">
          <BackIcon />
        </button>
        <Avatar name={contact.name} size="sm" />
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate font-semibold">{contact.name}</span>
          {verified ? (
            <span className="truncate text-xs font-medium text-primary">Verified · end-to-end encrypted</span>
          ) : (
            <span className="truncate text-xs font-medium text-warn">Not verified · check fingerprint in Settings</span>
          )}
        </div>
        <button
          type="button"
          onClick={() => setShowCipher((s) => !s)}
          aria-pressed={showCipher}
          className={`h-9 shrink-0 rounded-full border px-3.5 text-xs font-semibold ${showCipher ? 'border-ink bg-ink text-white' : 'border-slate-300 bg-white text-ink hover:bg-slate-50'}`}
        >
          {showCipher ? 'Plain text' : 'Ciphertext'}
        </button>
        <button type="button" aria-label="Video call" title="Video call (UI only)" className="hidden h-10 w-10 items-center justify-center rounded-full text-slate-600 hover:bg-slate-100 sm:flex">
          <VideoIcon />
        </button>
        <button type="button" aria-label="Search in chat" title="Search" className="hidden h-10 w-10 items-center justify-center rounded-full text-slate-600 hover:bg-slate-100 sm:flex">
          <SearchIcon />
        </button>
      </header>

      <div className="chat-bg flex flex-1 flex-col overflow-y-auto">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-2.5 px-4 py-4 md:px-8">
          {labMode ? (
            <div className="mx-auto flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs text-amber-900">
              <AlertIcon className="h-3.5 w-3.5" /> Lab test mode: this session is NOT authenticated
            </div>
          ) : verified ? (
            <div className="mx-auto flex items-center gap-2 rounded-lg bg-primary-soft px-3 py-1.5 text-xs text-primary-dark">
              <ShieldCheckIcon className="h-3.5 w-3.5" /> Session key set up · X25519 + Ed25519 signed
            </div>
          ) : (
            <div className="mx-auto flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs text-amber-900">
              <AlertIcon className="h-3.5 w-3.5" /> Compare fingerprints before sharing anything sensitive
            </div>
          )}
          {messages.length === 0 && <p className="mt-10 text-center text-sm text-slate-500">No messages yet. Say hi.</p>}
          {messages.map((m) => (
            <MessageBubble key={m.id} message={m} showCipher={showCipher} />
          ))}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* TODO (crypto teammate): onSend should encrypt with AES-256-GCM and save to Supabase */}
      <form onSubmit={submit} className="flex items-center gap-2 border-t border-slate-200 bg-white px-4 py-3">
        <label htmlFor="msg" className="sr-only">Message</label>
        <input
          id="msg"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Type a message"
          autoComplete="off"
          className="h-11 min-w-0 flex-1 rounded-full border border-slate-300 bg-slate-50 px-4 text-[15px] outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
        <button type="submit" aria-label="Send encrypted message" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-white hover:bg-primary-dark">
          <SendIcon />
        </button>
      </form>
    </section>
  );
}
