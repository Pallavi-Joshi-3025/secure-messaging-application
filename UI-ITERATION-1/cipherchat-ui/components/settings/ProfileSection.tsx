import { ChangeEvent, useRef } from 'react';
import Avatar from '../Avatar';
import { CameraIcon } from '../Icons';
import { Card } from './ui';
import { me, Profile } from '@/lib/mockData';

// Profile: profile picture, name, username (email shown read-only).
export default function ProfileSection({ profile, onChange }: { profile: Profile; onChange: (p: Profile) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);

  function pickPhoto(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    // UI only: shows the photo locally. TODO (backend teammate): upload to Supabase Storage.
    onChange({ ...profile, photo: URL.createObjectURL(file) });
  }

  return (
    <>
      <div className="flex flex-col items-center gap-3 py-2">
        <div className="relative">
          <Avatar name={profile.name} photo={profile.photo} variant="me" size="xl" />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            aria-label="Change profile photo"
            className="absolute bottom-1 right-1 flex h-10 w-10 items-center justify-center rounded-full border-2 border-white bg-primary text-white shadow hover:bg-primary-dark"
          >
            <CameraIcon />
          </button>
          <input ref={fileRef} type="file" accept="image/*" onChange={pickPhoto} className="sr-only" tabIndex={-1} aria-hidden="true" />
        </div>
        {profile.photo && (
          <button type="button" onClick={() => onChange({ ...profile, photo: null })} className="text-sm font-semibold text-danger hover:underline">
            Remove photo
          </button>
        )}
      </div>

      <Card>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="pname" className="text-sm font-medium">Name</label>
          <input
            id="pname"
            value={profile.name}
            maxLength={25}
            onChange={(e) => onChange({ ...profile, name: e.target.value })}
            className="h-11 rounded-[10px] border border-slate-300 bg-white px-3.5 text-[15px] outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
          <p className="text-xs text-slate-600">This is the name your contacts will see.</p>
        </div>
      </Card>

      <Card>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="puser" className="text-sm font-medium">Username</label>
          <div className="flex h-11 items-center rounded-[10px] border border-slate-300 bg-white focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
            <span className="pl-3.5 text-[15px] text-slate-500">@</span>
            <input
              id="puser"
              value={profile.username}
              maxLength={20}
              onChange={(e) => onChange({ ...profile, username: e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, '') })}
              className="h-full flex-1 rounded-r-[10px] bg-transparent pr-3.5 text-[15px] outline-none"
            />
          </div>
          <p className="text-xs text-slate-600">People can start a chat with you by searching this username. Letters, numbers, dots and underscores only.</p>
        </div>
      </Card>

      <Card>
        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium">Email</span>
          <span className="text-[15px] text-slate-700">{me.email}</span>
          <p className="text-xs text-slate-600">Used to sign in. Not shown to contacts.</p>
        </div>
      </Card>
    </>
  );
}
