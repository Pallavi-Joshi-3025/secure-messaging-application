// SCREEN 4 — Profile & keys (fingerprint verification + lab test mode)
import { useState } from 'react';
import Link from 'next/link';
import AppShell from '@/components/AppShell';
import Avatar from '@/components/Avatar';
import TopBar from '@/components/TopBar';
import { contacts, me } from '@/lib/mockData';

export default function Profile() {
  const [selectedId, setSelectedId] = useState(contacts[0].id);
  const [verified, setVerified] = useState<Record<string, boolean>>(
    Object.fromEntries(contacts.map((c) => [c.id, c.verified])),
  );
  const [labMode, setLabMode] = useState(false);
  const contact = contacts.find((c) => c.id === selectedId)!;
  const isVerified = verified[selectedId];

  return (
    <AppShell title="Profile & keys">
      <TopBar backHref="/chats">
        <h1 className="font-display text-xl font-bold">Profile &amp; keys</h1>
      </TopBar>

      <main className="flex flex-col gap-4 p-5">
        <div className="flex items-center gap-3.5">
          <Avatar name={me.name} variant="me" size="lg" />
          <div>
            <p className="text-lg font-semibold">{me.name}</p>
            <p className="text-sm text-slate-600">{me.email}</p>
          </div>
        </div>

        <Card title="Your identity key fingerprint">
          <Fingerprint value={me.fingerprint} />
          <p className="text-xs leading-relaxed text-slate-600">
            Read this to your contact over a trusted channel (in person or a call). If both sides match, nobody is in the middle.
          </p>
        </Card>

        <Card
          title="Verify a contact"
          right={
            <span className={`text-xs font-semibold ${isVerified ? 'text-primary' : 'text-warn'}`}>
              {isVerified ? 'Verified' : 'Not verified'}
            </span>
          }
        >
          <label htmlFor="contact" className="sr-only">Contact</label>
          <select
            id="contact"
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="h-11 rounded-[10px] border border-slate-300 bg-white px-3 text-sm"
          >
            {contacts.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <Fingerprint value={contact.fingerprint} />
          {/* TODO (crypto teammate): persist this flag so the handshake can require it */}
          <button
            type="button"
            onClick={() => setVerified((v) => ({ ...v, [selectedId]: !v[selectedId] }))}
            className={`h-11 rounded-[10px] text-sm font-semibold ${isVerified ? 'bg-primary-soft text-primary-dark' : 'bg-primary text-white hover:bg-primary-dark'}`}
          >
            {isVerified ? 'Verified ✓ (tap to undo)' : 'Fingerprints match — mark verified'}
          </button>
        </Card>

        <section className="flex items-center gap-3 rounded-[14px] border border-slate-200 bg-white p-4">
          <div className="flex-1">
            <h2 id="lab-label" className="text-sm font-semibold">Lab test mode</h2>
            <p className="text-xs leading-snug text-slate-600">
              Skip Ed25519 signatures to demo a MITM attack on an unauthenticated exchange.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={labMode}
            aria-labelledby="lab-label"
            onClick={() => setLabMode((m) => !m)}
            className={`flex h-8 w-[52px] shrink-0 items-center rounded-full p-[3px] transition ${labMode ? 'justify-end bg-warn' : 'justify-start bg-slate-300'}`}
          >
            <span className="h-[26px] w-[26px] rounded-full bg-white shadow" />
          </button>
        </section>
        {labMode && (
          <div className="rounded-[10px] border border-amber-300 bg-amber-50 px-3 py-2.5 text-xs text-amber-900">
            Test mode on: new sessions are NOT authenticated. Use only for the experiment.
          </div>
        )}

        <Link href="/" className="flex h-11 items-center justify-center rounded-[10px] border border-slate-300 bg-white text-sm font-semibold hover:bg-slate-50">
          Sign out
        </Link>
      </main>
    </AppShell>
  );
}

function Card({ title, right, children }: { title: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2.5 rounded-[14px] border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">{title}</h2>
        {right}
      </div>
      {children}
    </section>
  );
}

// Shows a fingerprint as two rows of four groups, easy to read aloud.
function Fingerprint({ value }: { value: string }) {
  const groups = value.split(' ');
  return (
    <div className="grid grid-cols-4 gap-x-3 gap-y-1 rounded-[10px] bg-slate-50 px-3 py-2.5 font-mono text-[15px] tracking-wider">
      {groups.map((g, i) => (
        <span key={i}>{g}</span>
      ))}
    </div>
  );
}
