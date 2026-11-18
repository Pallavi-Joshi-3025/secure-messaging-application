// SCREEN 1 — Home / Sign in
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/router';
import AppShell from '@/components/AppShell';
import Logo from '@/components/Logo';
import { LockIcon } from '@/components/Icons';

export default function SignIn() {
  const router = useRouter();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    // TODO (auth teammate): call supabase.auth.signInWithPassword / signUp here,
    // and generate identity keys on first sign-up.
    router.push('/chats');
  }

  const tab = (active: boolean) =>
    `h-11 flex-1 rounded-[9px] text-[15px] transition ${active ? 'bg-white font-semibold text-ink shadow-sm' : 'font-medium text-slate-600'}`;

  return (
    <AppShell title={mode === 'signin' ? 'Sign in' : 'Create account'}>
      <main className="flex flex-1 flex-col gap-7 px-7 pb-8 pt-20">
        <div className="flex flex-col items-center gap-3.5 text-center">
          <Logo />
          <h1 className="font-display text-3xl font-bold">CipherChat</h1>
          <p className="text-[15px] leading-relaxed text-slate-600">
            Messages are encrypted in your browser. The server only ever sees ciphertext.
          </p>
        </div>

        <div className="flex rounded-xl bg-slate-200 p-1" role="tablist">
          <button type="button" role="tab" aria-selected={mode === 'signin'} className={tab(mode === 'signin')} onClick={() => setMode('signin')}>
            Sign in
          </button>
          <button type="button" role="tab" aria-selected={mode === 'signup'} className={tab(mode === 'signup')} onClick={() => setMode('signup')}>
            Create account
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {mode === 'signup' && (
            <Field id="name" label="Display name" type="text" placeholder="Alice" value="" onChange={() => {}} />
          )}
          <Field id="email" label="Email" type="email" placeholder="you@concordia.ca" value={email} onChange={setEmail} />
          <Field id="password" label="Password" type="password" placeholder="••••••••" value={password} onChange={setPassword} />
          <button type="submit" className="mt-2 h-[50px] rounded-xl bg-primary text-base font-semibold text-white hover:bg-primary-dark">
            {mode === 'signin' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <div className="mt-auto flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-3.5">
          <LockIcon className="h-5 w-5 shrink-0 text-primary" />
          <p className="text-[13px] leading-relaxed text-slate-700">
            On first sign-in your identity keys (Ed25519) are generated on this device. Your private key never leaves the browser.
          </p>
        </div>
      </main>
    </AppShell>
  );
}

function Field(props: { id: string; label: string; type: string; placeholder: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={props.id} className="text-sm font-medium">{props.label}</label>
      <input
        id={props.id}
        type={props.type}
        placeholder={props.placeholder}
        defaultValue={props.value || undefined}
        onChange={(e) => props.onChange(e.target.value)}
        className="h-12 rounded-[10px] border border-slate-300 bg-white px-3.5 text-[15px] outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
      />
    </div>
  );
}
