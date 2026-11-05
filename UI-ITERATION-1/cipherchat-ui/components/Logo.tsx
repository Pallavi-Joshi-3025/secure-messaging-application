// The CipherChat logo: a chat bubble with a keyhole.
export default function Logo({ size = 72 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 72 72" role="img" aria-label="CipherChat logo">
      <rect width="72" height="72" rx="18" fill="#0F766E" />
      <path d="M18 22a6 6 0 0 1 6-6h24a6 6 0 0 1 6 6v18a6 6 0 0 1-6 6H32l-9 8v-8h1a6 6 0 0 1-6-6z" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinejoin="round" />
      <circle cx="36" cy="28" r="4.5" fill="#fff" />
      <path d="M36 31v7" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" />
    </svg>
  );
}
