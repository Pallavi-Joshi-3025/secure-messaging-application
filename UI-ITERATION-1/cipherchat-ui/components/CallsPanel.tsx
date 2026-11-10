import Avatar from './Avatar';
import { ArrowIcon, PhoneIcon, VideoIcon } from './Icons';
import { calls, getContact } from '@/lib/mockData';

// Middle column for the Calls tab. UI only — calls are outside the project's crypto scope.
export default function CallsPanel() {
  return (
    <>
      <div className="px-5 pb-3 pt-5">
        <h1 className="font-display text-2xl font-bold">Calls</h1>
      </div>
      <p className="px-5 pb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Recent</p>
      <div className="flex-1 overflow-y-auto px-2 pb-4">
        {calls.map((call) => {
          const c = getContact(call.contactId)!;
          const missed = call.kind === 'missed';
          return (
            <div key={call.id} className="flex items-center gap-3 rounded-xl px-3 py-3 hover:bg-slate-100">
              <Avatar name={c.name} />
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className={`font-semibold ${missed ? 'text-danger' : ''}`}>{c.name}</span>
                <span className="flex items-center gap-1 text-sm text-slate-600">
                  <ArrowIcon direction={call.kind === 'outgoing' ? 'out' : 'in'} className={`h-4 w-4 ${missed ? 'text-danger' : 'text-primary'}`} />
                  {call.kind === 'missed' ? 'Missed' : call.kind === 'incoming' ? 'Incoming' : 'Outgoing'} · {call.when}
                </span>
              </div>
              <button type="button" aria-label={`Call ${c.name}`} className="flex h-10 w-10 items-center justify-center rounded-full text-slate-600 hover:bg-slate-200">
                {call.video ? <VideoIcon /> : <PhoneIcon className="h-5 w-5" />}
              </button>
            </div>
          );
        })}
      </div>
    </>
  );
}
