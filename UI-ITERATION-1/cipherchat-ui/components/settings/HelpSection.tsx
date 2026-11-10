import { FormEvent, useState } from 'react';
import { Card } from './ui';

const faqs = [
  { q: 'What does end-to-end encrypted mean here?', a: 'Each message is encrypted in your browser with AES-256-GCM before it is sent. The server stores only ciphertext and never has the key.' },
  { q: 'Why should I compare fingerprints?', a: 'The fingerprint identifies a contact’s identity key. If it matches what they read to you over a call or in person, no attacker has swapped the keys (a man-in-the-middle attack).' },
  { q: 'What is the red “Message rejected” card?', a: 'The message failed its integrity check: someone changed it after it was encrypted, so the app refused to show it.' },
  { q: 'What happens if I lose my browser data?', a: 'Your private key lives only in this browser. If it is deleted, you will need new keys and your contacts will need to verify you again.' },
];

// Help and feedback: FAQ, feedback form, app info.
export default function HelpSection() {
  const [feedback, setFeedback] = useState('');
  const [sent, setSent] = useState(false);

  function send(e: FormEvent) {
    e.preventDefault();
    if (!feedback.trim()) return;
    // TODO (backend teammate): store feedback in Supabase
    setSent(true);
    setFeedback('');
  }

  return (
    <>
      <Card title="Help centre">
        <div className="flex flex-col divide-y divide-slate-100">
          {faqs.map((f) => (
            <details key={f.q} className="group py-2.5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium">
                {f.q}
                <span className="text-slate-400 transition group-open:rotate-90">›</span>
              </summary>
              <p className="pt-2 text-sm leading-relaxed text-slate-600">{f.a}</p>
            </details>
          ))}
        </div>
      </Card>

      <Card title="Send feedback">
        {sent ? (
          <div className="flex items-center justify-between rounded-[10px] bg-primary-soft p-3 text-sm text-primary-dark">
            Thanks! Your feedback was sent.
            <button type="button" onClick={() => setSent(false)} className="font-semibold underline">Send more</button>
          </div>
        ) : (
          <form onSubmit={send} className="flex flex-col gap-2">
            <label htmlFor="fb" className="sr-only">Your feedback</label>
            <textarea
              id="fb"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              rows={4}
              placeholder="Tell us what worked, what didn't, or report a bug"
              className="rounded-[10px] border border-slate-300 bg-white p-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
            <button type="submit" className="h-11 self-end rounded-[10px] bg-primary px-5 text-sm font-semibold text-white hover:bg-primary-dark">Send feedback</button>
          </form>
        )}
      </Card>

      <Card title="App info">
        <p className="text-sm text-slate-700">CipherChat 0.1 · INSE 6110 lab prototype</p>
        <p className="text-xs text-slate-600">X25519 · HKDF-SHA-256 · Ed25519 · AES-256-GCM. Educational prototype, not for real-world secrets.</p>
      </Card>
    </>
  );
}
