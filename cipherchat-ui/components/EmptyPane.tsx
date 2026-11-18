import Logo from './Logo';
import { LockIcon } from './Icons';

// Right column when nothing is open (like WhatsApp Web's welcome screen).
export default function EmptyPane({ title, text }: { title: string; text: string }) {
  return (
    <section className="flex flex-1 flex-col items-center justify-center gap-4 bg-ground px-8 text-center">
      <Logo size={88} />
      <h2 className="font-display text-3xl font-bold">{title}</h2>
      <p className="max-w-md text-[15px] leading-relaxed text-slate-600">{text}</p>
      <p className="mt-6 flex items-center gap-1.5 text-xs text-slate-500">
        <LockIcon className="h-3.5 w-3.5" /> Your messages are end-to-end encrypted
      </p>
    </section>
  );
}
