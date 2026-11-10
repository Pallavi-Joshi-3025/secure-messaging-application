import { FutureSection, SectionBody, SectionHeader } from './ui';
import ProfileSection from './ProfileSection';
import AccountSection from './AccountSection';
import PrivacySection from './PrivacySection';
import HelpSection from './HelpSection';
import type { Profile } from '@/lib/mockData';
import { BoolPref, Prefs, SectionId, sectionTitles } from '@/lib/settings';

// Right column for settings: shows the section picked in the menu.
export default function SettingsDetail(props: {
  section: SectionId;
  onBack: () => void;
  profile: Profile;
  onProfileChange: (p: Profile) => void;
  prefs: Prefs;
  toggle: (k: BoolPref) => void;
  setPref: <K extends keyof Prefs>(k: K, v: Prefs[K]) => void;
  verified: Record<string, boolean>;
  onToggleVerified: (id: string) => void;
}) {
  const { section, prefs, toggle } = props;

  // Privacy has its own sub-pages, so it draws its own header.
  if (section === 'privacy') {
    return (
      <PrivacySection
        onBack={props.onBack}
        verified={props.verified}
        onToggleVerified={props.onToggleVerified}
        prefs={prefs}
        toggle={toggle}
        setPref={props.setPref}
      />
    );
  }

  return (
    <section className="flex h-full min-w-0 flex-1 flex-col" aria-label={sectionTitles[section]}>
      <SectionHeader title={sectionTitles[section]} onBack={props.onBack} />
      <SectionBody>
        {section === 'profile' && <ProfileSection profile={props.profile} onChange={props.onProfileChange} />}
        {section === 'account' && <AccountSection profile={props.profile} prefs={prefs} toggle={toggle} />}
        {/* Future development: Agents and Notifications */}
        {(section === 'agents' || section === 'notifications') && <FutureSection />}
        {section === 'help' && <HelpSection />}
      </SectionBody>
    </section>
  );
}
