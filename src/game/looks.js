// ============================================================
// looks.js: every option in the character creator.
// A "look" is a plain object describing one runner from head to
// toe. It starts from the character you picked, then the outfit,
// then whatever you changed yourself in the creator.
// ============================================================

export const SKIN_TONES = ['#f6d2b8', '#eab894', '#d9a27a', '#c98b5c', '#b07446', '#8f5a35', '#6e4428', '#4f3020'];
export const HAIR_COLORS = ['#14110f', '#3a2418', '#6b4423', '#a8713f', '#d9a54a', '#e8d9b0', '#9aa0ad', '#b0123f', '#2f5bea'];
export const EYE_COLORS = ['#3b2414', '#6b4423', '#4f7d3a', '#3a6fb0', '#7a8a96'];
export const CLOTH_COLORS = ['#14a04e', '#e8364f', '#2f5bea', '#ffd23f', '#14121a', '#f4f6fb', '#8a5cff', '#ff7a1a', '#13b5a5', '#ff4f8b', '#6b7280', '#22356e', '#8a5a34', '#fbf6ea'];

export const OPTIONS = {
  style: [['cartoon', 'Cartoon'], ['real', 'Realistic']],
  body: [['m', 'Man'], ['f', 'Woman']],
  build: [['slim', 'Slim'], ['regular', 'Regular'], ['athletic', 'Athletic']],
  face: [['oval', 'Oval'], ['round', 'Round'], ['square', 'Square jaw']],
  hair: [['short', 'Short'], ['quiff', 'Quiff'], ['buzz', 'Buzz cut'], ['curly', 'Curly'], ['spiky', 'Spiky'], ['long', 'Long'], ['ponytail', 'Ponytail'], ['bun', 'Bun'], ['bald', 'Bald']],
  beard: [['none', 'None'], ['stubble', 'Stubble'], ['mustache', 'Mustache'], ['goatee', 'Goatee'], ['beard', 'Full beard']],
  top: [['tee', 'T-shirt'], ['jersey', 'Cricket jersey'], ['hoodie', 'Hoodie'], ['shirt', 'Shirt and tie'], ['kurta', 'Kurta']],
  bottom: [['shorts', 'Shorts'], ['jeans', 'Jeans'], ['track', 'Track pants'], ['trousers', 'Trousers']],
  hat: [['none', 'None'], ['cap', 'Cap'], ['beanie', 'Beanie']],
  glasses: [['none', 'None'], ['glasses', 'Glasses'], ['shades', 'Sunglasses']],
};

// Fields that come from the outfit. Equipping a new outfit resets them.
export const CLOTHING_KEYS = ['top', 'topColor', 'trimColor', 'bottom', 'bottomColor', 'shoes'];

// Character + outfit + your own changes = the final look
export function resolveLook(char, outfit, custom = {}) {
  const base = {
    style: 'cartoon',
    body: char.body ?? 'm',
    build: char.buildType ?? 'regular',
    face: char.face ?? 'oval',
    skin: char.skin,
    eyes: char.eyes ?? EYE_COLORS[0],
    hair: char.hairStyle ?? 'short',
    hairColor: char.hairColor,
    beard: char.beard ?? 'none',
    hat: char.hat ?? 'none',
    hatColor: char.capColor,
    glasses: char.glasses ?? 'none',
    glassesColor: char.glassesColor,
    top: outfit.top ?? 'tee',
    topColor: outfit.shirt,
    trimColor: outfit.trim,
    bottom: outfit.bottom ?? (outfit.long ? 'trousers' : 'shorts'),
    bottomColor: outfit.pants,
    shoes: outfit.shoes,
    cape: outfit.cape ?? null,
    emblem: !!outfit.cape,
    metal: !!outfit.metal,
    scale: char.build ?? 1,
  };
  // Each character wears Street Style in their own colours
  const tint = outfit.id === 'street' && char.street ? char.street : {};
  return { ...base, ...tint, ...custom };
}
