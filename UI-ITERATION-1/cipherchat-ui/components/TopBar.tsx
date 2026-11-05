import Link from 'next/link';
import { ReactNode } from 'react';
import { BackIcon } from './Icons';

// Header with a back arrow. Used on the chat and profile screens.
export default function TopBar({ backHref, children, right }: { backHref: string; children: ReactNode; right?: ReactNode }) {
  return (
    <header className="sticky top-0 z-10 flex items-center gap-2 border-b border-slate-200 bg-white px-3 py-3">
      <Link href={backHref} aria-label="Back" className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-slate-100">
        <BackIcon />
      </Link>
      <div className="flex min-w-0 flex-1 items-center gap-3">{children}</div>
      {right}
    </header>
  );
}
