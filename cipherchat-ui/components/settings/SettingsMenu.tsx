import { ReactNode } from 'react';
import Link from 'next/link';
import Avatar from '../Avatar';
import { BellIcon, BotIcon, ChevronIcon, HelpIcon, KeyIcon, LockIcon, LogoutIcon } from '../Icons';
import type { Profile } from '@/lib/mockData';
import type { SectionId } from '@/lib/settings';

// Middle column when you click your profile picture (like WhatsApp's Settings list).
export default function SettingsMenu({ profile, active, onOpen }: { profile: Profile; active: SectionId | null; onOpen: (s: SectionId) => void }) {
  return (
    <>
      <div className="px-5 pb-3 pt-5">
        <h1 className="font-display text-2xl font-bold">Settings</h1>
      </div>
      <div className="flex-1 overflow-y-auto px-2 pb-4">
        <button
          type="button"
          onClick={() => onOpen('profile')}
          aria-current={active === 'profile' ? 'true' : undefined}
          className={`mb-2 flex w-full items-center gap-4 rounded-xl px-3 py-4 text-left transition ${active === 'profile' ? 'bg-slate-200/70' : 'hover:bg-slate-100'}`}
        >
          <Avatar name={profile.name} photo={profile.photo} variant="me" size="lg" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-lg font-semibold">{profile.name || 'Add your name'}</p>
            <p className="truncate text-sm text-slate-600">@{profile.username}</p>
          </div>
          <ChevronIcon className="h-4 w-4 text-slate-400" />
        </button>

        <div className="mx-3 mb-1 h-px bg-slate-200" />

        <Row icon={<KeyIcon />} title="Account" subtitle="Security notifications, account info" active={active === 'account'} onClick={() => onOpen('account')} />
        <Row icon={<LockIcon className="h-5 w-5" />} title="Privacy" subtitle="Last seen, profile picture, keys, verify contacts" active={active === 'privacy'} onClick={() => onOpen('privacy')} />
        <Row icon={<BotIcon />} title="Agents" subtitle="Coming in a future version" active={active === 'agents'} onClick={() => onOpen('agents')} />
        <Row icon={<BellIcon />} title="Notifications" subtitle="Coming in a future version" active={active === 'notifications'} onClick={() => onOpen('notifications')} />
        <Row icon={<HelpIcon />} title="Help and feedback" subtitle="Help centre, send feedback, app info" active={active === 'help'} onClick={() => onOpen('help')} />

        <div className="mx-3 my-1 h-px bg-slate-200" />

        {/* TODO (auth teammate): call supabase.auth.signOut() before leaving */}
        <Link href="/" className="flex items-center gap-4 rounded-xl px-3 py-3.5 text-danger hover:bg-red-50">
          <span className="flex h-10 w-10 items-center justify-center"><LogoutIcon /></span>
          <span className="font-semibold">Log out</span>
        </Link>
      </div>
    </>
  );
}

function Row({ icon, title, subtitle, active, onClick }: { icon: ReactNode; title: string; subtitle: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? 'true' : undefined}
      className={`flex w-full items-center gap-4 rounded-xl px-3 py-3 text-left transition ${active ? 'bg-slate-200/70' : 'hover:bg-slate-100'}`}
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center text-slate-600">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block font-medium">{title}</span>
        <span className="block truncate text-sm text-slate-600">{subtitle}</span>
      </span>
    </button>
  );
}
