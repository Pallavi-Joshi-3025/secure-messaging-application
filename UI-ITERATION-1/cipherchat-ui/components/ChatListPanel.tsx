import { useState } from 'react';
import ChatRow from './ChatRow';
import { PlusIcon, SearchIcon } from './Icons';
import type { Contact } from '@/lib/mockData';

type Filter = 'all' | 'unread' | 'unverified';

// Middle column: title, search, filter chips and the list of chats.
export default function ChatListPanel({ contacts, selectedId, verified, onSelect }: { contacts: Contact[]; selectedId: string | null; verified: Record<string, boolean>; onSelect: (id: string) => void }) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  const q = query.toLowerCase();
  const shown = contacts
    .filter((c) => c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q))
    .filter((c) => (filter === 'unread' ? c.unread > 0 : filter === 'unverified' ? !verified[c.id] : true));

  const unreadCount = contacts.filter((c) => c.unread > 0).length;
  const unverifiedCount = contacts.filter((c) => !verified[c.id]).length;

  return (
    <>
      <div className="flex items-center justify-between px-5 pb-3 pt-5">
        <h1 className="font-display text-2xl font-bold text-primary">CipherChat</h1>
        {/* TODO (backend teammate): open a "new chat" dialog — pick a user by email, then start the key exchange */}
        <button
          type="button"
          aria-label="New chat"
          title="New chat"
          onClick={() => alert('New chat — to be connected by the backend teammate')}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white hover:bg-primary-dark"
        >
          <PlusIcon className="h-5 w-5" />
        </button>
      </div>

      <div className="px-4">
        <label htmlFor="search" className="sr-only">Search chats</label>
        <div className="flex h-10 items-center gap-2 rounded-full bg-slate-100 px-4 focus-within:ring-2 focus-within:ring-primary/30">
          <SearchIcon className="h-4 w-4 text-slate-500" />
          <input
            id="search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search or start a new chat"
            className="h-full flex-1 bg-transparent text-sm outline-none"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2 px-4 py-3" role="group" aria-label="Filter chats">
        <Chip active={filter === 'all'} onClick={() => setFilter('all')}>All</Chip>
        <Chip active={filter === 'unread'} onClick={() => setFilter('unread')}>Unread {unreadCount}</Chip>
        <Chip active={filter === 'unverified'} onClick={() => setFilter('unverified')}>Not verified {unverifiedCount}</Chip>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-4">
        {shown.map((c) => (
          <ChatRow key={c.id} contact={c} verified={verified[c.id]} active={c.id === selectedId} onSelect={() => onSelect(c.id)} />
        ))}
        {shown.length === 0 && <p className="p-8 text-center text-sm text-slate-500">No chats found.</p>}
      </div>
    </>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`h-8 rounded-full border px-3.5 text-sm transition ${
        active ? 'border-primary/30 bg-primary-soft font-semibold text-primary-dark' : 'border-slate-200 text-slate-600 hover:bg-slate-100'
      }`}
    >
      {children}
    </button>
  );
}
