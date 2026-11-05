import Head from 'next/head';
import { ReactNode } from 'react';

// Centers the app in a phone-width column. Looks like a mobile app on a laptop too.
export default function AppShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <>
      <Head><title>{`${title} · CipherChat`}</title></Head>
      <div className="mx-auto flex min-h-screen max-w-md flex-col bg-ground shadow-xl sm:border-x sm:border-slate-200">
        {children}
      </div>
    </>
  );
}
