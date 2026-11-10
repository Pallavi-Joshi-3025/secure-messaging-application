// Settings sections and the on/off preferences (UI only for now).
export type SectionId = 'profile' | 'account' | 'privacy' | 'agents' | 'notifications' | 'help';

export const sectionTitles: Record<SectionId, string> = {
  profile: 'Profile',
  account: 'Account',
  privacy: 'Privacy',
  agents: 'Agents',
  notifications: 'Notifications',
  help: 'Help and feedback',
};

export type Visibility = 'everyone' | 'contacts' | 'nobody';

export const visibilityLabels: Record<Visibility, string> = {
  everyone: 'Everyone',
  contacts: 'My contacts',
  nobody: 'Nobody',
};

export type Prefs = {
  securityNotifications: boolean; // alert when a contact's identity key changes
  readReceipts: boolean;
  labMode: boolean; // skip Ed25519 signatures (MITM experiment)
  lastSeen: Visibility; // who can see "last seen and online"
  profilePhoto: Visibility; // who can see your profile picture
};

// Only the on/off settings (used by switches).
export type BoolPref = { [K in keyof Prefs]: Prefs[K] extends boolean ? K : never }[keyof Prefs];

export const defaultPrefs: Prefs = {
  securityNotifications: true,
  readReceipts: true,
  labMode: false,
  lastSeen: 'contacts',
  profilePhoto: 'everyone',
};
