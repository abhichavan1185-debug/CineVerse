/**
 * CineVerse original cinema brand logo:
 * Cinematic projector lens + golden film ticket emblem with modern typography.
 */
export default function Logo({ className = "h-9 w-auto" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      <svg
        viewBox="0 0 44 44"
        className="h-full w-auto aspect-square flex-shrink-0"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label="CineVerse"
      >
        <defs>
          <linearGradient id="cvGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#E50914" />
            <stop offset="50%" stopColor="#DC2626" />
            <stop offset="100%" stopColor="#B91C1C" />
          </linearGradient>
          <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FDE047" />
            <stop offset="100%" stopColor="#F59E0B" />
          </linearGradient>
        </defs>

        {/* Outer squircle with subtle border */}
        <rect x="2" y="2" width="40" height="40" rx="12" fill="url(#cvGrad)" />
        <rect x="2" y="2" width="40" height="40" rx="12" stroke="#ffffff" strokeOpacity="0.2" strokeWidth="1.5" />

        {/* Film reel cutouts */}
        <circle cx="10" cy="10" r="2.5" fill="#ffffff" fillOpacity="0.8" />
        <circle cx="34" cy="10" r="2.5" fill="#ffffff" fillOpacity="0.8" />
        <circle cx="10" cy="34" r="2.5" fill="#ffffff" fillOpacity="0.8" />
        <circle cx="34" cy="34" r="2.5" fill="#ffffff" fillOpacity="0.8" />

        {/* Stylized play / cinema projector beam icon */}
        <path
          d="M17 14.5L29 22L17 29.5V14.5Z"
          fill="url(#goldGrad)"
          stroke="#ffffff"
          strokeWidth="1"
          strokeLinejoin="round"
        />
        {/* Glow point */}
        <circle cx="22" cy="22" r="3" fill="#ffffff" fillOpacity="0.9" />
      </svg>

      <div className="flex flex-col leading-none">
        <span className="font-extrabold text-xl tracking-tight text-neutral-900 flex items-center">
          Cine<span className="text-brand">Verse</span>
        </span>
        <span className="text-[9px] font-semibold tracking-widest uppercase text-neutral-400">
          Maharashtra
        </span>
      </div>
    </div>
  );
}
