// Small building blocks shared by all settings sections.
import { ReactNode } from 'react';
import { BackIcon, ChevronIcon } from '../Icons';

// Header of the right column: section title, with a back arrow
// (on phones only for a section; always for a sub-page inside a section).
export function SectionHeader({ title, onBack, alwaysShowBack = false, backLabel = 'Back to settings' }: { title: string; onBack: () => void; alwaysShowBack?: boolean; backLabel?: string }) {
  return (
    <header className="flex items-center gap-2 border-b border-slate-200 bg-white px-4 py-3.5">
      <button type="button" onClick={onBack} aria-label={backLabel} className={`flex h-10 w-10 items-center justify-center rounded-full hover:bg-slate-100 ${alwaysShowBack ? '' : 'md:hidden'}`}>
        <BackIcon />
      </button>
      <h2 className="font-display text-xl font-bold">{title}</h2>
    </header>
  );
}

// Scrollable body of a section, centred like WhatsApp's settings pages.
export function SectionBody({ children }: { children: ReactNode }) {
  return (
    <div className="flex-1 overflow-y-auto bg-ground">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 py-6 md:px-8">{children}</div>
    </div>
  );
}

export function Card({ title, right, children }: { title?: string; right?: ReactNode; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3 rounded-[14px] border border-slate-200 bg-white p-4">
      {(title || right) && (
        <div className="flex items-center justify-between gap-3">
          {title && <h3 className="text-sm font-semibold">{title}</h3>}
          {right}
        </div>
      )}
      {children}
    </section>
  );
}

// On/off switch with a title and description. Accessible as role="switch".
// variant "list" = WhatsApp-style row text (regular title, grey line under it).
export function ToggleRow({ id, title, description, checked, onChange, tone = 'primary', variant = 'card' }: { id: string; title: string; description?: ReactNode; checked: boolean; onChange: () => void; tone?: 'primary' | 'warn'; variant?: 'card' | 'list' }) {
  const on = tone === 'warn' ? 'bg-warn' : 'bg-primary';
  const list = variant === 'list';
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1">
        <p id={id} className={list ? 'text-[15px]' : 'text-sm font-semibold'}>{title}</p>
        {description && <p className={list ? 'text-sm leading-snug text-slate-600' : 'text-xs leading-snug text-slate-600'}>{description}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={id}
        onClick={onChange}
        className={`flex h-8 w-[52px] shrink-0 items-center rounded-full p-[3px] transition ${checked ? `justify-end ${on}` : 'justify-start bg-slate-300'}`}
      >
        <span className="h-[26px] w-[26px] rounded-full bg-white shadow" />
      </button>
    </div>
  );
}

// "Label ......... value" line used for account info.
export function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-slate-100 py-2.5 last:border-0 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <span className="text-sm text-slate-600">{label}</span>
      <span className={`break-all text-sm font-medium ${mono ? 'font-mono text-[13px]' : ''}`}>{value}</span>
    </div>
  );
}

// Placeholder for sections planned for a future version (nothing else is shown).
export function FutureSection() {
  return <p className="py-16 text-center text-sm text-slate-500">This section is planned for a future version.</p>;
}

// WhatsApp-style grouped list: a grey heading, then rows separated by thin lines.
export function ListGroup({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="px-1 text-sm font-semibold text-slate-600">{heading}</h3>
      <div className="divide-y divide-slate-100 overflow-hidden rounded-[14px] border border-slate-200 bg-white">{children}</div>
    </section>
  );
}

// A row that opens a sub-page: title, current value underneath, chevron on the right.
export function LinkRow({ title, value, onClick, valueTone }: { title: string; value: string; onClick: () => void; valueTone?: 'warn' | 'ok' }) {
  const tone = valueTone === 'warn' ? 'text-warn font-medium' : valueTone === 'ok' ? 'text-primary font-medium' : 'text-slate-600';
  return (
    <button type="button" onClick={onClick} className="flex w-full items-center gap-3 px-4 py-3.5 text-left hover:bg-slate-50">
      <span className="min-w-0 flex-1">
        <span className="block text-[15px]">{title}</span>
        <span className={`block text-sm ${tone}`}>{value}</span>
      </span>
      <ChevronIcon className="h-5 w-5 shrink-0 text-slate-400" />
    </button>
  );
}

// Padding wrapper so a ToggleRow lines up with LinkRows inside a ListGroup.
export function RowBox({ children }: { children: ReactNode }) {
  return <div className="px-4 py-3.5">{children}</div>;
}
