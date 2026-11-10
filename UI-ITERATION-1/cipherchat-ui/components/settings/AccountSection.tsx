import { Card, InfoRow, ToggleRow } from './ui';
import { me, Profile } from '@/lib/mockData';
import type { BoolPref, Prefs } from '@/lib/settings';

// Account: security notifications + account info.
export default function AccountSection({ profile, prefs, toggle }: { profile: Profile; prefs: Prefs; toggle: (k: BoolPref) => void }) {
  return (
    <>
      <Card title="Security notifications">
        <ToggleRow
          id="sec-notif"
          title="Show security notifications on this computer"
          description="Get an alert in the chat when a contact's identity key changes — for example after they reinstall, or if someone is trying to sit in the middle."
          checked={prefs.securityNotifications}
          onChange={() => toggle('securityNotifications')}
        />
        <div className="rounded-[10px] bg-slate-50 p-3 text-xs leading-relaxed text-slate-700">
          Messages and calls stay end-to-end encrypted. Only you and the person you talk to can read them — not the server, not the CipherChat team.
        </div>
      </Card>

      <Card title="Account info">
        <div className="flex flex-col">
          <InfoRow label="Name" value={profile.name || '—'} />
          <InfoRow label="Username" value={`@${profile.username}`} />
          <InfoRow label="Email" value={me.email} />
          <InfoRow label="Member since" value={me.memberSince} />
          <InfoRow label="Identity key created" value={me.keyCreated} />
          <InfoRow label="User ID" value={me.userId} mono />
        </div>
      </Card>

      {/* TODO (backend teammate): wire these to Supabase */}
      <div className="flex flex-col gap-2 sm:flex-row">
        <button type="button" className="h-11 flex-1 rounded-[10px] border border-slate-300 bg-white text-sm font-semibold hover:bg-slate-50">Request account info</button>
        <button type="button" className="h-11 flex-1 rounded-[10px] border border-red-200 bg-white text-sm font-semibold text-danger hover:bg-red-50">Delete my account</button>
      </div>
    </>
  );
}
