// Small inline SVG icons used by the menus and HUD

// The game's coin: gold with a samosa stamped in the middle
export function SamosaIcon({ size = 26 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <circle cx="16" cy="16" r="15" fill="#c98200" />
      <circle cx="16" cy="15" r="14" fill="#ffc21a" />
      <circle cx="16" cy="15" r="11" fill="none" stroke="#ffe27a" strokeWidth="2" />
      <path d="M16 8 L22.5 20 H9.5 Z" fill="#ff9d00" stroke="#c96a00" strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M10 9 A8 8 0 0 1 15 6.6" stroke="#fff6c8" strokeWidth="2" strokeLinecap="round" fill="none" />
    </svg>
  );
}

export function StarIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2.5l2.9 6 6.6.8-4.9 4.6 1.3 6.5L12 17.2l-5.9 3.2 1.3-6.5L2.5 9.3l6.6-.8z" fill="#ffd23f" stroke="#b86e00" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  );
}

export function PowerIcon({ type }) {
  const common = { width: 20, height: 20, viewBox: '0 0 24 24', 'aria-hidden': true };
  switch (type) {
    case 'magnet':
      return (
        <svg {...common} fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round">
          <path d="M6 4v8a6 6 0 0 0 12 0V4" />
        </svg>
      );
    case 'shield':
      return (
        <svg {...common} fill="#fff">
          <path d="M3 15a9 9 0 0 1 18 0v1H3z" />
          <rect x="2" y="15" width="20" height="3" rx="1.5" />
        </svg>
      );
    case 'turbo':
      return (
        <svg {...common} fill="#fff">
          <path d="M13 2 4 14h6l-2 8 10-13h-6z" />
        </svg>
      );
    case 'double':
      return (
        <svg {...common}>
          <text x="12" y="17" textAnchor="middle" fontSize="14" fontFamily="Lilita One, sans-serif" fill="#fff">x2</text>
        </svg>
      );
    case 'jetpack':
      return (
        <svg {...common} fill="#fff">
          <rect x="6" y="3" width="12" height="13" rx="3.5" />
          <path d="M8 17h3l-1.5 5zM13 17h3l-1.5 5z" fill="#ffd23f" />
        </svg>
      );
    case 'board':
      return (
        <svg {...common} fill="#fff">
          <rect x="2" y="9" width="20" height="5" rx="2.5" transform="rotate(-15 12 12)" />
          <circle cx="7" cy="17" r="2" />
          <circle cx="17" cy="14.5" r="2" />
        </svg>
      );
    case 'chai':
      return (
        <svg {...common} fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round">
          <path d="M5 10h11l-1.5 9h-8z" fill="#fff" />
          <path d="M16 12a2.5 2.5 0 0 1 0 5" />
          <path d="M8 7q1.5-2 0-4M12 7q1.5-2 0-4" />
        </svg>
      );
    case 'key':
      return (
        <svg {...common} fill="#fff">
          <circle cx="8" cy="8" r="5" fill="none" stroke="#fff" strokeWidth="3" />
          <path d="M11.5 11.5 21 21M17 17l2.5-2.5M19.5 19.5 21.5 17.5" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
        </svg>
      );
    case 'forcefield':
      return (
        <svg {...common} fill="#fff">
          <path d="M12 2 20 5v6c0 5-3.5 9-8 11-4.5-2-8-6-8-11V5z" />
          <path d="M12 6v12M7 11h10" stroke="#39c6ff" strokeWidth="2.4" strokeLinecap="round" />
        </svg>
      );
    case 'blaster':
      return (
        <svg {...common} fill="#fff">
          <circle cx="15" cy="10" r="6.5" />
          <path d="M15 16.5l-1.2 2.5h2.4z" />
          <path d="M3 21l6-6" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
          <circle cx="13" cy="8" r="1.8" fill="#ff8fa3" />
        </svg>
      );
    default:
      return (
        <svg {...common} fill="#fff">
          <path d="M12 2l7 8-7 8-7-8z" />
          <path d="M12 18q3 2 0 4" stroke="#fff" strokeWidth="1.6" fill="none" />
        </svg>
      );
  }
}

export function SoundIcon({ muted }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor" />
      {muted ? <path d="M17 9l5 6M22 9l-5 6" /> : <path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12" />}
    </svg>
  );
}

export function ShopIcon({ size = 30 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <path d="M6 11h20l-2 17H8z" fill="#ff4f8b" />
      <path d="M11 13V9a5 5 0 0 1 10 0v4" stroke="#fff" strokeWidth="2.6" fill="none" strokeLinecap="round" />
      <path d="M8 18h16" stroke="#ffd23f" strokeWidth="2.6" />
    </svg>
  );
}

export function TargetIcon({ size = 30 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <circle cx="16" cy="16" r="13" fill="#ff3b5c" />
      <circle cx="16" cy="16" r="9" fill="#fff" />
      <circle cx="16" cy="16" r="5" fill="#ff3b5c" />
      <path d="M16 16l11-11M23 4h4v4" stroke="#1d2b53" strokeWidth="2.4" strokeLinecap="round" fill="none" />
    </svg>
  );
}
