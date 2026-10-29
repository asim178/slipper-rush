// Little SVG pictures for the shop and trophy cards, drawn from catalog data

export function Avatar({ char, size = 72 }) {
  const { skin, hair, hairColor, capColor } = char;
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      {hair === 'ponytail' && <ellipse cx="50" cy="30" rx="7" ry="13" fill={hairColor} />}
      {hair === 'bun' && <circle cx="32" cy="12" r="8" fill={hairColor} />}
      <circle cx="32" cy="35" r="19" fill={skin} />
      <circle cx="13" cy="36" r="4" fill={skin} />
      <circle cx="51" cy="36" r="4" fill={skin} />
      {hair === 'cap' && (
        <>
          <path d="M13 31a19 19 0 0 1 38 0z" fill={capColor} />
          <rect x="40" y="27" width="16" height="4" rx="2" fill={capColor} />
        </>
      )}
      {(hair === 'ponytail' || hair === 'bun') && <path d="M13 33a19 19 0 0 1 38 0c-6-6-14-8-19-8s-13 2-19 8z" fill={hairColor} />}
      {hair === 'bun' && (
        <g fill={capColor}>
          <circle cx="40" cy="12" r="2.5" />
          <circle cx="43" cy="15" r="2.5" />
          <circle cx="40" cy="17" r="2.5" />
        </g>
      )}
      {hair === 'ponytail' && <circle cx="49" cy="20" r="3" fill={capColor} />}
      {hair === 'curly' && (
        <g fill={hairColor}>
          {[16, 22, 28, 34, 40, 46].map((x, i) => <circle key={x} cx={x} cy={i % 2 ? 19 : 22} r="6" />)}
        </g>
      )}
      {hair === 'spiky' && <path d="M14 30l4-14 5 9 4-12 5 11 5-11 4 12 5-9 4 14z" fill={hairColor} />}
      {hair === 'bald' && (
        <>
          <circle cx="15" cy="30" r="4" fill={hairColor} />
          <circle cx="49" cy="30" r="4" fill={hairColor} />
          <path d="M18 44c4 12 24 12 28 0-6 3-22 3-28 0z" fill={hairColor} />
        </>
      )}
      <ellipse cx="25" cy="35" rx="4.5" ry="5" fill="#fff" />
      <ellipse cx="39" cy="35" rx="4.5" ry="5" fill="#fff" />
      <circle cx="25.5" cy="36" r="2.6" fill="#2a1a12" />
      <circle cx="39.5" cy="36" r="2.6" fill="#2a1a12" />
      <circle cx="26.5" cy="35" r="0.9" fill="#fff" />
      <circle cx="40.5" cy="35" r="0.9" fill="#fff" />
      {char.glasses && (
        <g fill="none" stroke="#1b1b22" strokeWidth="1.6">
          <circle cx="25" cy="35" r="6" />
          <circle cx="39" cy="35" r="6" />
          <path d="M31 35h2" />
        </g>
      )}
      {hair !== 'bald' && <path d="M27 44q5 4 10 0" stroke="#5a1f2a" strokeWidth="2" fill="none" strokeLinecap="round" />}
    </svg>
  );
}

export function OutfitIcon({ outfit, size = 72 }) {
  const id = `g-${outfit.id}`;
  const fill = outfit.metal ? `url(#${id})` : outfit.shirt;
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      {outfit.metal && (
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#fff3b0" />
            <stop offset="0.5" stopColor="#ffc94a" />
            <stop offset="1" stopColor="#c98a12" />
          </linearGradient>
        </defs>
      )}
      {outfit.cape && <path d="M18 14h28l8 44H10z" fill={outfit.cape} />}
      <path d="M22 10l-12 7 5 11 6-3v28h22V25l6 3 5-11-12-7c-2 4-6 6-10 6s-8-2-10-6z" fill={fill} stroke="rgba(0,0,0,0.15)" strokeWidth="1.5" />
      {outfit.kurta && <path d="M21 53h22l2 6H19z" fill={outfit.shirt} stroke={outfit.trim} strokeWidth="2" />}
      <path d="M26 10c2 3 4 4 6 4s4-1 6-4" stroke={outfit.trim} strokeWidth="3" fill="none" />
      {outfit.tie && <path d="M30 16h4l1 4-3 16-3-16z" fill={outfit.trim} />}
      {outfit.cape && <circle cx="32" cy="32" r="6" fill={outfit.trim} />}
      {!outfit.long && <rect x="21" y="30" width="22" height="3" fill={outfit.trim} />}
      {outfit.kurta && <path d="M32 14v18" stroke={outfit.trim} strokeWidth="2" />}
    </svg>
  );
}

export function BoardIcon({ board, size = 72 }) {
  if (board.style === 'carpet') {
    return (
      <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
        <path d="M8 24q12-6 24 0t24 0v18q-12 6-24 0T8 42z" fill={board.deck} stroke="#ffd23f" strokeWidth="3" />
        <circle cx="32" cy="33" r="6" fill="#ffd23f" />
        {[8, 56].map((x) => <path key={x} d={`M${x} 42l-2 8h4z`} fill="#ffd23f" />)}
      </svg>
    );
  }
  const neon = board.style === 'neon';
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <g transform="rotate(-20 32 32)">
        <rect x="6" y="26" width="52" height="11" rx="5.5" fill={board.deck} stroke={neon ? '#39f0ff' : 'rgba(0,0,0,0.2)'} strokeWidth={neon ? 2.5 : 1.5} />
        {board.style === 'art' && (
          <g>
            <path d="M10 31l4-3 4 3 4-3 4 3 4-3 4 3 4-3 4 3 4-3 4 3 4-3" stroke="#ffd23f" strokeWidth="2" fill="none" />
            <circle cx="32" cy="31.5" r="3" fill="#ff3b5c" />
          </g>
        )}
        {[16, 48].map((x) => <circle key={x} cx={x} cy="41" r="4.5" fill={board.wheels} />)}
      </g>
    </svg>
  );
}

export function TrophyIcon({ color, locked = false, size = 64 }) {
  const fill = locked ? '#c9d2e3' : color;
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <path d="M18 10h28v8c0 10-6 18-14 18S18 28 18 18z" fill={fill} />
      <path d="M18 14H8c0 9 5 13 11 13M46 14h10c0 9-5 13-11 13" stroke={fill} strokeWidth="4" fill="none" />
      <rect x="28" y="35" width="8" height="9" fill={fill} />
      <rect x="20" y="44" width="24" height="8" rx="2" fill={locked ? '#aab4c8' : '#5a3a22'} />
      {!locked && <path d="M24 14c0 8 3 13 6 15" stroke="rgba(255,255,255,0.6)" strokeWidth="3" fill="none" strokeLinecap="round" />}
      {locked && <path d="M28 22h8v7h-8zM29.5 22v-3a2.5 2.5 0 0 1 5 0v3" stroke="#8792aa" strokeWidth="2" fill="none" />}
    </svg>
  );
}

export function GiftIcon({ size = 26 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <rect x="4" y="12" width="24" height="16" rx="3" fill="#ff4f8b" />
      <rect x="3" y="9" width="26" height="6" rx="2" fill="#ff7aa8" />
      <rect x="14" y="9" width="4" height="19" fill="#ffd23f" />
      <path d="M16 9c-3-6-9-6-8-2 1 3 8 2 8 2zM16 9c3-6 9-6 8-2-1 3-8 2-8 2z" fill="#ffd23f" />
    </svg>
  );
}

// Pet faces for the shop
export function PetIcon({ pet, size = 72 }) {
  const eyes = (y = 30, dx = 8) => (
    <>
      <circle cx={32 - dx} cy={y} r="3.2" fill="#14121a" />
      <circle cx={32 + dx} cy={y} r="3.2" fill="#14121a" />
      <circle cx={33 - dx} cy={y - 1} r="1" fill="#fff" />
      <circle cx={33 + dx} cy={y - 1} r="1" fill="#fff" />
    </>
  );
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      {pet.id === 'none' && (
        <g fill="none" stroke="#9aa6bd" strokeWidth="4" strokeLinecap="round">
          <circle cx="32" cy="32" r="18" />
          <path d="M19 45 45 19" />
        </g>
      )}
      {pet.id === 'parrot' && (
        <>
          <path d="M50 52 C40 40 46 30 40 22 L56 46Z" fill="#e8263f" />
          <ellipse cx="34" cy="40" rx="14" ry="17" fill="#2fbf4a" />
          <path d="M44 38 C52 42 50 52 42 54Z" fill="#2fa8ff" />
          <circle cx="30" cy="24" r="13" fill="#2fbf4a" />
          <path d="M18 24 C14 26 14 32 20 34 L24 27Z" fill="#ff3b2f" />
          <circle cx="28" cy="21" r="3" fill="#14121a" />
          <circle cx="29" cy="20" r="1" fill="#fff" />
        </>
      )}
      {pet.id === 'cat' && (
        <>
          <path d="M14 14 L24 24 L14 30Z M50 14 L40 24 L50 30Z" fill="#f29a3a" />
          <circle cx="32" cy="36" r="19" fill="#f29a3a" />
          <path d="M26 20 Q32 26 38 20" stroke="#c46f1c" strokeWidth="3" fill="none" />
          {eyes(34)}
          <path d="M30 41 L34 41 L32 43Z" fill="#ff8fa3" />
          <path d="M14 40 L24 41 M14 45 L24 43 M50 40 L40 41 M50 45 L40 43" stroke="#7a4a2a" strokeWidth="1.5" />
        </>
      )}
      {pet.id === 'puppy' && (
        <>
          <ellipse cx="14" cy="32" rx="7" ry="13" fill="#6b4423" />
          <ellipse cx="50" cy="32" rx="7" ry="13" fill="#6b4423" />
          <circle cx="32" cy="34" r="18" fill="#a8713f" />
          <ellipse cx="32" cy="42" rx="10" ry="8" fill="#e6c49a" />
          {eyes(30, 7)}
          <ellipse cx="32" cy="39" rx="4" ry="3" fill="#14121a" />
          <path d="M30 46 Q32 52 34 46Z" fill="#ff6b8a" />
        </>
      )}
      {pet.id === 'goat' && (
        <>
          <path d="M20 18 C14 8 8 12 12 20 M44 18 C50 8 56 12 52 20" stroke="#8a7a66" strokeWidth="5" fill="none" strokeLinecap="round" />
          <ellipse cx="12" cy="32" rx="8" ry="4" fill="#e0dccf" />
          <ellipse cx="52" cy="32" rx="8" ry="4" fill="#e0dccf" />
          <ellipse cx="32" cy="34" rx="15" ry="18" fill="#f4f1ea" stroke="#d8d2c4" strokeWidth="1.5" />
          {eyes(30, 7)}
          <path d="M28 52 L32 62 L36 52Z" fill="#e0dccf" />
          <circle cx="32" cy="58" r="0" />
          <ellipse cx="32" cy="44" rx="5" ry="3" fill="#3a2a20" />
        </>
      )}
    </svg>
  );
}
