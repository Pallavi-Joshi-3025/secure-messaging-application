import { ReactNode } from 'react';
import Avatar from './Avatar';
import Logo from './Logo';
import { ChatIcon, PhoneIcon } from './Icons';
import type { Profile } from '@/lib/mockData';

export type View = 'chats' | 'calls' | 'settings';

// The narrow column on the far left (like WhatsApp Web):
// Chats and Calls at the top, your profile picture (opens Settings) at the bottom.
export default function Sidebar({ view, onChange, unread, profile }: { view: View; onChange: (v: View) => void; unread: number; profile: Profile }) {
  return (
    <nav aria-label="Main" className="flex w-16 shrink-0 flex-col items-center gap-2 border-r border-slate-200 bg-slate-100 py-3">
      <div className="mb-3"><Logo size={36} /></div>
      <RailButton label="Chats" active={view === 'chats'} onClick={() => onChange('chats')} badge={unread}>
        <ChatIcon />
      </RailButton>
      <RailButton label="Calls" active={view === 'calls'} onClick={() => onChange('calls')}>
        <PhoneIcon />
      </RailButton>

      <div className="mt-auto flex flex-col items-center gap-2">
        <div className="mb-1 h-px w-8 bg-slate-300" />
        <button
          type="button"
          onClick={() => onChange('settings')}
          aria-label="Profile and settings"
          aria-current={view === 'settings' ? 'page' : undefined}
          title="Profile & settings"
          className={`rounded-full p-0.5 ${view === 'settings' ? 'ring-2 ring-primary' : ''}`}
        >
          <Avatar name={profile.name} photo={profile.photo} variant="me" size="sm" />
        </button>
      </div>
    </nav>
  );
}

function RailButton({ label, active, onClick, badge, children }: { label: string; active: boolean; onClick: () => void; badge?: number; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-current={active ? 'page' : undefined}
      title={label}
      className={`relative flex h-11 w-11 items-center justify-center rounded-full transition ${
        active ? 'bg-slate-300/70 text-ink' : 'text-slate-600 hover:bg-slate-200'
      }`}
    >
      {children}
      {!!badge && (
        <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[11px] font-semibold text-white">
          {badge}
        </span>
      )}
    </button>
  );
}
