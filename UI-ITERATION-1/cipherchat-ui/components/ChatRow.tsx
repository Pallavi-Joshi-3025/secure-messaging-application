import type { Contact } from '@/lib/mockData';
import Avatar from './Avatar';
import { LockIcon, ShieldCheckIcon } from './Icons';

// One row in the chat list. Clicking it opens the chat on the right.
export default function ChatRow({ contact, verified, active, onSelect }: { contact: Contact; verified: boolean; active: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={active ? 'true' : undefined}
      className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition ${active ? 'bg-slate-200/70' : 'hover:bg-slate-100'}`}
    >
      <Avatar name={contact.name} />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex items-center gap-1.5">
          <span className="font-semibold">{contact.name}</span>
          {verified && (
            <span className="text-primary" title="Verified"><ShieldCheckIcon /></span>
          )}
          <span className={`ml-auto text-xs ${contact.unread ? 'font-semibold text-primary' : 'text-slate-500'}`}>{contact.lastTime}</span>
        </div>
        <div className="flex items-center gap-1.5 text-sm text-slate-600">
          <LockIcon className="h-3.5 w-3.5 shrink-0 text-slate-500" />
          <span className="truncate">{contact.lastMessage}</span>
          {!!contact.unread && (
            <span className="ml-auto flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-semibold text-white">
              {contact.unread}
            </span>
          )}
        </div>
        {!verified && <span className="text-xs font-semibold text-warn">Keys not verified yet</span>}
      </div>
    </button>
  );
}
