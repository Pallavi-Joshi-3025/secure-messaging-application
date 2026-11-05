import Link from 'next/link';
import type { Contact } from '@/lib/mockData';
import Avatar from './Avatar';
import { LockIcon, ShieldCheckIcon } from './Icons';

// One row in the chat list.
export default function ChatRow({ contact }: { contact: Contact }) {
  return (
    <Link href={`/chat/${contact.id}`} className="flex items-center gap-3 border-b border-slate-100 px-5 py-3.5 hover:bg-slate-50">
      <Avatar name={contact.name} />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-center gap-1.5">
          <span className="font-semibold">{contact.name}</span>
          {contact.verified && (
            <span className="text-primary" title="Verified"><ShieldCheckIcon /></span>
          )}
          <span className="ml-auto text-xs text-slate-500">{contact.lastTime}</span>
        </div>
        <div className="flex items-center gap-1.5 text-sm text-slate-600">
          <LockIcon className="h-3.5 w-3.5 shrink-0 text-slate-500" />
          <span className="truncate">{contact.lastMessage}</span>
        </div>
        {!contact.verified && <span className="text-xs font-semibold text-warn">Keys not verified yet</span>}
      </div>
    </Link>
  );
}
