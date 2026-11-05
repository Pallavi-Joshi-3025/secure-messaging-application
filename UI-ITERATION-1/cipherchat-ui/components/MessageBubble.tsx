import type { Message } from '@/lib/mockData';
import { AlertIcon } from './Icons';

// A single message. Shows ciphertext when showCipher is on,
// and a red "rejected" card when the message failed its integrity check.
export default function MessageBubble({ message, showCipher }: { message: Message; showCipher: boolean }) {
  if (message.status === 'tampered') {
    return (
      <div className="flex max-w-[85%] items-start gap-2.5 self-start rounded-xl border border-red-300 bg-red-50 px-3 py-2.5">
        <AlertIcon className="mt-0.5 h-5 w-5 shrink-0 text-danger" />
        <div>
          <p className="text-sm font-semibold text-danger">Message rejected</p>
          <p className="text-xs text-red-900">AES-GCM tag check failed — this message was changed in transit.</p>
        </div>
      </div>
    );
  }

  const mine = message.fromMe;
  return (
    <div className={`flex flex-col gap-1 ${mine ? 'items-end' : 'items-start'}`}>
      <div
        className={`max-w-[78%] break-words rounded-2xl px-3.5 py-2.5 leading-snug ${
          mine ? 'rounded-br-md bg-primary text-white' : 'rounded-bl-md bg-white text-ink shadow-sm'
        } ${showCipher ? 'break-all font-mono text-xs' : 'text-[15px]'}`}
      >
        {showCipher ? message.ciphertext : message.text}
      </div>
      <span className="text-[11px] text-slate-500">
        {message.time}
        {mine && ' · Encrypted'}
      </span>
    </div>
  );
}
