// ============================================================
// Creator.jsx: customize your runner from head to toe.
// Every change shows on the 3D runner straight away. Changes are
// saved per character, so Zara and Ali keep their own style.
// ============================================================
import { useEffect, useState } from 'react';
import { OPTIONS, SKIN_TONES, HAIR_COLORS, EYE_COLORS, CLOTH_COLORS, CLOTHING_KEYS } from '../game/looks.js';

const TABS = [
  ['body', 'Body'],
  ['face', 'Face'],
  ['hair', 'Hair'],
  ['clothes', 'Clothes'],
  ['extras', 'Extras'],
];
// Which tabs zoom the camera on the face
const FACE_TABS = ['face', 'hair', 'extras'];

const pick = (list) => list[Math.floor(Math.random() * list.length)];

function Chips({ id, label, options, value, onPick }) {
  return (
    <div className="ctl">
      <span className="ctl-label">{label}</span>
      <div className="chips" role="radiogroup" aria-label={label}>
        {options.map(([v, name]) => (
          <button key={v} id={`${id}-${v}`} role="radio" aria-checked={value === v} className={`chip ${value === v ? 'on' : ''}`} onClick={() => onPick(v)}>
            {name}
          </button>
        ))}
      </div>
    </div>
  );
}

function Swatches({ id, label, colors, value, onPick }) {
  return (
    <div className="ctl">
      <span className="ctl-label">{label}</span>
      <div className="swatches" role="radiogroup" aria-label={label}>
        {colors.map((c) => (
          <button
            key={c}
            id={`${id}-${c.slice(1)}`}
            role="radio"
            aria-checked={value?.toLowerCase() === c.toLowerCase()}
            aria-label={`${label} ${c}`}
            className={`swatch ${value?.toLowerCase() === c.toLowerCase() ? 'on' : ''}`}
            style={{ background: c }}
            onClick={() => onPick(c)}
          />
        ))}
      </div>
    </div>
  );
}

export default function Creator({ profile, look, onPreview, onSave, onZoom, onClose }) {
  const char = profile.selected.char;
  const [custom, setCustom] = useState(() => ({ ...(profile.looks?.[char] ?? {}) }));
  const [tab, setTab] = useState('body');
  const view = { ...look, ...custom }; // what you see right now

  useEffect(() => {
    onPreview({ ...profile.selected, custom });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [custom]);
  useEffect(() => {
    onZoom(FACE_TABS.includes(tab) ? 'face' : 'sheet');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const set = (key) => (value) => setCustom((c) => ({ ...c, [key]: value }));

  const randomize = () => {
    const opt = (k) => pick(OPTIONS[k])[0];
    const body = opt('body');
    setCustom({
      body,
      build: opt('build'),
      face: opt('face'),
      skin: pick(SKIN_TONES),
      eyes: pick(EYE_COLORS),
      hair: opt('hair'),
      hairColor: pick(HAIR_COLORS.slice(0, 6)),
      beard: body === 'f' ? 'none' : opt('beard'),
      top: opt('top'),
      topColor: pick(CLOTH_COLORS),
      trimColor: pick(CLOTH_COLORS),
      bottom: opt('bottom'),
      bottomColor: pick(CLOTH_COLORS),
      shoes: pick(CLOTH_COLORS),
      hat: Math.random() < 0.3 ? opt('hat') : 'none',
      hatColor: pick(CLOTH_COLORS),
      glasses: Math.random() < 0.25 ? opt('glasses') : 'none',
    });
  };

  return (
    <section className="sheet creator" aria-label="Customize your runner">
      <header className="sheet-head">
        <h2 className="sheet-title">Style</h2>
        <button id="btn-close-creator" className="close-btn" onClick={onClose} aria-label="Close without saving">×</button>
      </header>
      <nav className="tabs" role="tablist">
        {TABS.map(([id, label]) => (
          <button key={id} id={`ctab-${id}`} role="tab" aria-selected={tab === id} className={`tab ${tab === id ? 'on' : ''}`} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </nav>
      <div className="sheet-body creator-body">
        {tab === 'body' && (
          <>
            <Chips id="opt-style" label="Art style" options={OPTIONS.style} value={view.style} onPick={set('style')} />
            <Chips id="opt-body" label="Body" options={OPTIONS.body} value={view.body} onPick={set('body')} />
            <Chips id="opt-build" label="Build" options={OPTIONS.build} value={view.build} onPick={set('build')} />
            <Swatches id="col-skin" label="Skin tone" colors={SKIN_TONES} value={view.skin} onPick={set('skin')} />
          </>
        )}
        {tab === 'face' && (
          <>
            <Chips id="opt-face" label="Face shape" options={OPTIONS.face} value={view.face} onPick={set('face')} />
            <Swatches id="col-eyes" label="Eye colour" colors={EYE_COLORS} value={view.eyes} onPick={set('eyes')} />
            <Chips id="opt-beard" label="Facial hair" options={OPTIONS.beard} value={view.beard} onPick={set('beard')} />
          </>
        )}
        {tab === 'hair' && (
          <>
            <Chips id="opt-hair" label="Hairstyle" options={OPTIONS.hair} value={view.hair} onPick={set('hair')} />
            <Swatches id="col-hair" label="Hair colour" colors={HAIR_COLORS} value={view.hairColor} onPick={set('hairColor')} />
          </>
        )}
        {tab === 'clothes' && (
          <>
            <Chips id="opt-top" label="Top" options={OPTIONS.top} value={view.top} onPick={set('top')} />
            <Swatches id="col-top" label="Top colour" colors={CLOTH_COLORS} value={view.topColor} onPick={set('topColor')} />
            <Swatches id="col-trim" label="Details colour" colors={CLOTH_COLORS} value={view.trimColor} onPick={set('trimColor')} />
            <Chips id="opt-bottom" label="Bottoms" options={OPTIONS.bottom} value={view.bottom} onPick={set('bottom')} />
            <Swatches id="col-bottom" label="Bottoms colour" colors={CLOTH_COLORS} value={view.bottomColor} onPick={set('bottomColor')} />
            <Swatches id="col-shoes" label="Shoes" colors={CLOTH_COLORS} value={view.shoes} onPick={set('shoes')} />
          </>
        )}
        {tab === 'extras' && (
          <>
            <Chips id="opt-hat" label="Hat" options={OPTIONS.hat} value={view.hat} onPick={set('hat')} />
            {view.hat !== 'none' && <Swatches id="col-hat" label="Hat colour" colors={CLOTH_COLORS} value={view.hatColor} onPick={set('hatColor')} />}
            <Chips id="opt-glasses" label="Glasses" options={OPTIONS.glasses} value={view.glasses} onPick={set('glasses')} />
          </>
        )}
      </div>
      <footer className="creator-actions">
        <button id="btn-random" className="btn btn-purple btn-mini" onClick={randomize}>🎲 Random</button>
        <button id="btn-reset-look" className="btn btn-blue btn-mini" onClick={() => setCustom({})}>Reset</button>
        <button id="btn-save-look" className="btn btn-green btn-mini" onClick={() => onSave(custom)}>Save</button>
      </footer>
    </section>
  );
}

export { CLOTHING_KEYS };
