// SCREEN 2 — Chat list
import { useState } from 'react';
import Link from 'next/link';
import AppShell from '@/components/AppShell';
import Avatar from '@/components/Avatar';
import ChatRow from '@/components/ChatRow';
import { PlusIcon } from '@/components/Icons';
import { contacts, me } from '@/lib/mockData';

export default function Chats() {
  const [query, setQuery] = useState('');
  const shown = contacts.filter(
    (c) => c.name.toLowerCase().includes(query.toLowerCase()) || c.email.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <AppShell title="Chats">
      <header className="flex items-center justify-between px-5 pb-3 pt-6">
        <h1 className="font-display text-[28px] font-bold">Chats</h1>
        <Link href="/profile" aria-label="Your profile and keys" className="rounded-full">
          <Avatar name={me.name} variant="me" size="sm" />
        </Link>
      </header>

      <div className="px-5 pb-3">
        <label htmlFor="search" className="sr-only">Search chats</label>
        <input
          id="search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or email"
          className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-[15px] outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
      </div>

      <main className="relative flex-1 border-t border-slate-200 bg-white">
        {shown.map((c) => (
          <ChatRow key={c.id} contact={c} />
        ))}
        {shown.length === 0 && <p className="p-8 text-center text-sm text-slate-500">No chats match “{query}”.</p>}
      </main>

      {/* TODO (backend teammate): open a "new chat" dialog — pick a user by email, then start the key exchange */}
      <div className="pointer-events-none fixed inset-x-0 bottom-7 mx-auto flex max-w-md justify-end px-5">
        <button
          type="button"
          aria-label="New chat"
          onClick={() => alert('New chat — to be connected by the backend teammate')}
          className="pointer-events-auto flex h-[60px] w-[60px] items-center justify-center rounded-full bg-primary text-white shadow-lg hover:bg-primary-dark"
        >
          <PlusIcon />
        </button>
      </div>
    </AppShell>
  );
}
