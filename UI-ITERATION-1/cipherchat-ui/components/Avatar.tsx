import { initials } from '@/lib/mockData';

// Monogram avatar: initials in a circle (or a photo if one is set).
// variant "me" = dark, "contact" = soft teal.
export default function Avatar({ name, photo, size = 'md', variant = 'contact' }: { name: string; photo?: string | null; size?: 'sm' | 'md' | 'lg' | 'xl'; variant?: 'me' | 'contact' }) {
  const sizes = { sm: 'h-10 w-10 text-sm', md: 'h-12 w-12 text-base', lg: 'h-16 w-16 text-2xl font-display font-bold', xl: 'h-32 w-32 text-5xl font-display font-bold' };
  const colors = variant === 'me' ? 'bg-ink text-white' : 'bg-primary-soft text-primary-dark';
  if (photo) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={photo} alt="" className={`${sizes[size]} shrink-0 rounded-full object-cover`} />;
  }
  return (
    <div className={`${sizes[size]} ${colors} flex shrink-0 items-center justify-center rounded-full font-semibold`}>
      {initials(name) || '?'}
    </div>
  );
}
