import { Link } from 'react-router-dom';

export function PlateMark({ className = 'h-7 w-7' }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <circle cx="16" cy="16" r="15" fill="#1F5FBF" />
      <circle cx="16" cy="16" r="9" fill="none" stroke="#F2F4F6" strokeWidth="2" />
      <circle cx="16" cy="16" r="3" fill="#F2F4F6" />
    </svg>
  );
}

export default function Brand({ to = '/', dark = false }) {
  return (
    <Link to={to} className="inline-flex items-center gap-2">
      <PlateMark />
      <span className={`font-display text-2xl font-bold tracking-wide ${dark ? 'text-white' : 'text-ink'}`}>Ironwork</span>
    </Link>
  );
}
