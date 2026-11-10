// MAIN SCREEN — WhatsApp-style layout:
// [ left icon bar ] [ chat list / calls / settings menu ] [ open chat / settings section ]
import { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Sidebar, { View } from '@/components/Sidebar';
import ChatListPanel from '@/components/ChatListPanel';
import ChatPane from '@/components/ChatPane';
import CallsPanel from '@/components/CallsPanel';
import EmptyPane from '@/components/EmptyPane';
import SettingsMenu from '@/components/settings/SettingsMenu';
import SettingsDetail from '@/components/settings/SettingsDetail';
import { contacts, fakeCiphertext, getContact, me, Message, messagesByContact, Profile } from '@/lib/mockData';
import { BoolPref, defaultPrefs, Prefs, SectionId, sectionTitles } from '@/lib/settings';

const sectionIds = Object.keys(sectionTitles) as SectionId[];

export default function Home() {
  const router = useRouter();
  const [view, setView] = useState<View>('chats');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [section, setSection] = useState<SectionId | null>(null);

  // Shared state (teammates: these will come from Supabase / local key storage).
  const [messages, setMessages] = useState<Record<string, Message[]>>(messagesByContact);
  const [verified, setVerified] = useState<Record<string, boolean>>(() => Object.fromEntries(contacts.map((c) => [c.id, c.verified])));
  const [unread, setUnread] = useState<Record<string, number>>(() => Object.fromEntries(contacts.map((c) => [c.id, c.unread])));
  const [profile, setProfile] = useState<Profile>({ name: me.name, username: me.username, photo: null });
  const [prefs, setPrefs] = useState<Prefs>(defaultPrefs);

  // Allow links like /chats?c=bob, /chats?view=calls, /chats?view=settings&s=privacy
  useEffect(() => {
    if (!router.isReady) return;
    const { c, view: v, s } = router.query;
    if (typeof c === 'string' && getContact(c)) openChat(c);
    if (v === 'calls') setView('calls');
    if (v === 'settings' || v === 'profile') setView('settings');
    if (typeof s === 'string' && sectionIds.includes(s as SectionId)) {
      setView('settings');
      setSection(s as SectionId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.isReady]);

  function openChat(id: string) {
    setView('chats');
    setSelectedId(id);
    setUnread((u) => ({ ...u, [id]: 0 }));
  }

  function changeView(v: View) {
    setView(v);
    if (v === 'settings') setSection(null); // land on the settings menu, like WhatsApp
  }

  function send(text: string) {
    if (!selectedId) return;
    // TODO (crypto teammate): encrypt + store in Supabase here.
    const now = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    const msg: Message = { id: String(Date.now()), fromMe: true, text, ciphertext: fakeCiphertext(text), time: now, status: 'ok' };
    setMessages((m) => ({ ...m, [selectedId]: [...(m[selectedId] ?? []), msg] }));
  }

  const togglePref = (k: BoolPref) => setPrefs((p) => ({ ...p, [k]: !p[k] }));
  const setPref = <K extends keyof Prefs>(k: K, v: Prefs[K]) => setPrefs((p) => ({ ...p, [k]: v }));

  const listContacts = contacts.map((c) => {
    const last = messages[c.id]?.[messages[c.id].length - 1];
    return { ...c, unread: unread[c.id], lastMessage: last && last.status === 'ok' ? last.text : c.lastMessage, lastTime: last?.time ?? c.lastTime };
  });
  const totalUnread = Object.values(unread).filter((n) => n > 0).length;
  const contact = selectedId ? listContacts.find((c) => c.id === selectedId)! : null;
  const chatOpen = view === 'chats' && !!contact;
  const sectionOpen = view === 'settings' && !!section;
  const detailOpen = chatOpen || sectionOpen; // on phones, the right column takes the whole screen

  let title = 'Chats';
  if (view === 'calls') title = 'Calls';
  if (view === 'settings') title = section ? sectionTitles[section] : 'Settings';
  if (chatOpen) title = contact!.name;

  return (
    <>
      <Head><title>{`${title} · CipherChat`}</title></Head>
      <div className="flex h-screen overflow-hidden bg-white">
        <Sidebar view={view} onChange={changeView} unread={totalUnread} profile={profile} />

        {/* Middle column */}
        <aside className={`${detailOpen ? 'hidden md:flex' : 'flex'} w-full shrink-0 flex-col border-r border-slate-200 bg-white md:w-[360px] lg:w-[400px]`}>
          {view === 'chats' && <ChatListPanel contacts={listContacts} selectedId={selectedId} verified={verified} onSelect={openChat} />}
          {view === 'calls' && <CallsPanel />}
          {view === 'settings' && <SettingsMenu profile={profile} active={section} onOpen={setSection} />}
        </aside>

        {/* Right column */}
        <main className={`${detailOpen ? 'flex' : 'hidden md:flex'} min-w-0 flex-1`}>
          {chatOpen ? (
            <ChatPane
              contact={contact!}
              verified={verified[contact!.id]}
              labMode={prefs.labMode}
              messages={messages[contact!.id] ?? []}
              onSend={send}
              onBack={() => setSelectedId(null)}
            />
          ) : sectionOpen ? (
            <SettingsDetail
              section={section!}
              onBack={() => setSection(null)}
              profile={profile}
              onProfileChange={setProfile}
              prefs={prefs}
              toggle={togglePref}
              setPref={setPref}
              verified={verified}
              onToggleVerified={(id) => setVerified((v) => ({ ...v, [id]: !v[id] }))}
            />
          ) : view === 'calls' ? (
            <EmptyPane title="Calls" text="Start a call from your chat list. Call history shows here." />
          ) : view === 'settings' ? (
            <EmptyPane title="Settings" text="Pick a setting on the left: your profile, account, privacy and key fingerprints, agents, notifications, or help." />
          ) : (
            <EmptyPane title="CipherChat for Web" text="Pick a chat on the left to start messaging. Messages are encrypted in your browser before they reach the server." />
          )}
        </main>
      </div>
    </>
  );
}
