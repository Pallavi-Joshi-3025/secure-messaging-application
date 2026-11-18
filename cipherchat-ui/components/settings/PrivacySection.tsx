// Privacy — WhatsApp-style list with sub-pages.
//
//  Who can see my personal info
//    Last seen and online   ›   (Everyone / My contacts / Nobody)
//    Profile picture        ›   (Everyone / My contacts / Nobody)
//    Read receipts          [switch]
//  Encryption and keys
//    Identity key fingerprint ›  (masked; "Show" is future development)
//    Verify contacts          ›  (pick a contact, masked fingerprint, mark verified)
//    Lab test mode          [switch]
import { useState } from 'react';
import { EyeIcon } from '../Icons';
import { Card, LinkRow, ListGroup, RowBox, SectionBody, SectionHeader, ToggleRow } from './ui';
import { contacts, me } from '@/lib/mockData';
import { BoolPref, Prefs, Visibility, visibilityLabels } from '@/lib/settings';

type Sub = null | 'lastSeen' | 'profilePhoto' | 'myKey' | 'verify';

const subTitles: Record<Exclude<Sub, null>, string> = {
  lastSeen: 'Last seen and online',
  profilePhoto: 'Profile picture',
  myKey: 'Identity key fingerprint',
  verify: 'Verify contacts',
};

export default function PrivacySection({
  onBack, verified, onToggleVerified, prefs, toggle, setPref,
}: {
  onBack: () => void;
  verified: Record<string, boolean>;
  onToggleVerified: (id: string) => void;
  prefs: Prefs;
  toggle: (k: BoolPref) => void;
  setPref: <K extends keyof Prefs>(k: K, v: Prefs[K]) => void;
}) {
  const [sub, setSub] = useState<Sub>(null);
  const notVerified = contacts.filter((c) => !verified[c.id]).length;

  // ----- Sub-pages -----
  if (sub) {
    return (
      <section className="flex h-full min-w-0 flex-1 flex-col" aria-label={subTitles[sub]}>
        <SectionHeader title={subTitles[sub]} onBack={() => setSub(null)} alwaysShowBack backLabel="Back to privacy" />
        <SectionBody>
          {sub === 'lastSeen' && (
            <VisibilityPicker
              question="Who can see my last seen and online"
              value={prefs.lastSeen}
              onChange={(v) => setPref('lastSeen', v)}
              note="If you don't share your last seen and online, you won't be able to see other people's."
            />
          )}
          {sub === 'profilePhoto' && (
            <VisibilityPicker
              question="Who can see my profile picture"
              value={prefs.profilePhoto}
              onChange={(v) => setPref('profilePhoto', v)}
            />
          )}
          {sub === 'myKey' && <MyKeyPage />}
          {sub === 'verify' && <VerifyPage verified={verified} onToggleVerified={onToggleVerified} />}
        </SectionBody>
      </section>
    );
  }

  // ----- Main privacy list -----
  return (
    <section className="flex h-full min-w-0 flex-1 flex-col" aria-label="Privacy">
      <SectionHeader title="Privacy" onBack={onBack} />
      <SectionBody>
        <ListGroup heading="Who can see my personal info">
          <LinkRow title="Last seen and online" value={visibilityLabels[prefs.lastSeen]} onClick={() => setSub('lastSeen')} />
          <LinkRow title="Profile picture" value={visibilityLabels[prefs.profilePhoto]} onClick={() => setSub('profilePhoto')} />
          <RowBox>
            <ToggleRow
              id="read-receipts"
              variant="list"
              title="Read receipts"
              description="If turned off, you won't send or receive read receipts."
              checked={prefs.readReceipts}
              onChange={() => toggle('readReceipts')}
            />
          </RowBox>
        </ListGroup>

        <ListGroup heading="Encryption and keys">
          <LinkRow title="Identity key fingerprint" value="Hidden" onClick={() => setSub('myKey')} />
          <LinkRow
            title="Verify contacts"
            value={notVerified === 0 ? 'All contacts verified' : `${notVerified} contact${notVerified > 1 ? 's' : ''} not verified`}
            valueTone={notVerified === 0 ? 'ok' : 'warn'}
            onClick={() => setSub('verify')}
          />
          <RowBox>
            <ToggleRow
              id="lab-mode"
              variant="list"
              tone="warn"
              title="Lab test mode"
              description="Skip Ed25519 signatures to demo a MITM attack on an unauthenticated exchange."
              checked={prefs.labMode}
              onChange={() => toggle('labMode')}
            />
            {prefs.labMode && (
              <div className="mt-3 rounded-[10px] border border-amber-300 bg-amber-50 px-3 py-2.5 text-xs text-amber-900">
                Test mode on: new sessions are NOT authenticated. Use only for the experiment.
              </div>
            )}
          </RowBox>
        </ListGroup>
      </SectionBody>
    </section>
  );
}

// Radio list: Everyone / My contacts / Nobody.
function VisibilityPicker({ question, value, onChange, note }: { question: string; value: Visibility; onChange: (v: Visibility) => void; note?: string }) {
  return (
    <>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 px-1 text-sm font-semibold text-slate-600">{question}</legend>
        <div className="divide-y divide-slate-100 overflow-hidden rounded-[14px] border border-slate-200 bg-white">
          {(Object.keys(visibilityLabels) as Visibility[]).map((v) => (
            <label key={v} className="flex cursor-pointer items-center gap-3 px-4 py-3.5 hover:bg-slate-50">
              <input
                type="radio"
                name={question}
                value={v}
                checked={value === v}
                onChange={() => onChange(v)}
                className="h-5 w-5 accent-primary"
              />
              <span className="text-[15px]">{visibilityLabels[v]}</span>
            </label>
          ))}
        </div>
      </fieldset>
      {note && <p className="px-1 text-xs leading-relaxed text-slate-600">{note}</p>}
    </>
  );
}

// Your own fingerprint (always masked for now).
function MyKeyPage() {
  return (
    <Card title="Your identity key fingerprint" right={<RevealButton label="your fingerprint" />}>
      <Fingerprint value={me.fingerprint} />
      <p className="text-xs leading-relaxed text-slate-600">
        Read this to your contact over a trusted channel (in person or a call). If both sides match, nobody is in the middle.
      </p>
    </Card>
  );
}

// Pick a contact, compare their (masked) fingerprint, mark verified.
function VerifyPage({ verified, onToggleVerified }: { verified: Record<string, boolean>; onToggleVerified: (id: string) => void }) {
  const [selectedId, setSelectedId] = useState(contacts[0].id);
  const contact = contacts.find((c) => c.id === selectedId)!;
  const isVerified = verified[selectedId];

  return (
    <Card
      title="Verify a contact"
      right={<span className={`text-xs font-semibold ${isVerified ? 'text-primary' : 'text-warn'}`}>{isVerified ? 'Verified' : 'Not verified'}</span>}
    >
      <label htmlFor="contact" className="sr-only">Contact</label>
      <select id="contact" value={selectedId} onChange={(e) => setSelectedId(e.target.value)} className="h-11 rounded-[10px] border border-slate-300 bg-white px-3 text-sm">
        {contacts.map((c) => (
          <option key={c.id} value={c.id}>{c.name}{verified[c.id] ? '' : ' (not verified)'}</option>
        ))}
      </select>
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-600">{contact.name}&rsquo;s fingerprint</span>
        <RevealButton label={`${contact.name}'s fingerprint`} />
      </div>
      <Fingerprint value={contact.fingerprint} />
      {/* TODO (crypto teammate): persist this flag so the handshake can require it */}
      <button
        type="button"
        onClick={() => onToggleVerified(selectedId)}
        className={`h-11 rounded-[10px] text-sm font-semibold ${isVerified ? 'bg-primary-soft text-primary-dark' : 'bg-primary text-white hover:bg-primary-dark'}`}
      >
        {isVerified ? 'Verified ✓ (tap to undo)' : 'Fingerprints match — mark verified'}
      </button>
    </Card>
  );
}

// A fingerprint shown masked: two rows of four groups of dots.
// The real value is passed in so the reveal can be added later, but it is never displayed yet.
function Fingerprint({ value }: { value: string }) {
  return (
    <div aria-label="Fingerprint hidden" className="grid select-none grid-cols-4 gap-x-3 gap-y-1 rounded-[10px] bg-slate-50 px-3 py-2.5 font-mono text-[15px] tracking-wider text-slate-400">
      {value.split(' ').map((_, i) => (
        <span key={i}>••••</span>
      ))}
    </div>
  );
}

// "Show" button with an eye icon.
// FUTURE DEVELOPMENT: revealing the fingerprint (e.g. after re-entering the password).
// For now clicking it intentionally does nothing.
function RevealButton({ label }: { label: string }) {
  return (
    <button
      type="button"
      onClick={() => { /* future: reveal fingerprint */ }}
      aria-label={`Show ${label}`}
      className="flex h-8 items-center gap-1.5 rounded-full border border-slate-300 px-3 text-xs font-semibold text-ink hover:bg-slate-50"
    >
      <EyeIcon />
      Show
    </button>
  );
}
