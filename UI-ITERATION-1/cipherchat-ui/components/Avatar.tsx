import { initials } from '@/lib/mockData';

// Monogram avatar: initials in a circle. variant "me" = dark, "contact" = soft teal.
export default function Avatar({ name, size = 'md', variant = 'contact' }: { name: string; size?: 'sm' | 'md' | 'lg'; variant?: 'me' | 'contact' }) {
  const sizes = { sm: 'h-10 w-10 text-sm', md: 'h-12 w-12 text-base', lg: 'h-16 w-16 text-2xl font-display font-bold' };
  const colors = variant === 'me' ? 'bg-ink text-white' : 'bg-primary-soft text-primary-dark';
  return (
    <div className={`${sizes[size]} ${colors} flex shrink-0 items-center justify-center rounded-full font-semibold`}>
      {initials(name)}
    </div>
  );
}
