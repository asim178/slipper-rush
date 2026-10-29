// ============================================================
// Shop.jsx: characters, outfits, skateboards, upgrades and items.
// Tapping a card previews it on the 3D character straight away.
// ============================================================
import { useState } from 'react';
import { CHARACTERS, OUTFITS, BOARDS, PETS, UPGRADES, UPGRADE_COSTS, BOARD_PRICE, BOARD_PACK, ITEMS, upgradeTime } from '../game/catalog.js';
import { Avatar, OutfitIcon, BoardIcon, PetIcon } from './art.jsx';
import { SamosaIcon, PowerIcon } from './icons.jsx';

const TABS = [
  ['chars', 'Runners'],
  ['outfits', 'Outfits'],
  ['boards', 'Boards'],
  ['pets', 'Pets'],
  ['upgrades', 'Items'],
];
const LISTS = { chars: CHARACTERS, outfits: OUTFITS, boards: BOARDS, pets: PETS };
const SELECT_KEY = { chars: 'char', outfits: 'outfit', boards: 'board', pets: 'pet' };
const POWER_ICON = { magnet: 'magnet', jetpack: 'jetpack', turbo: 'turbo', chai: 'chai', board: 'board' };
const POWER_COLOR = { magnet: '#ff4f8b', jetpack: '#ff7a1a', turbo: '#8a5cff', chai: '#d9822b', board: '#20c25a' };

const fmt = (n) => n.toLocaleString('en-US');
// Rarity by price: the colour of the card's frame and ribbon
const rarity = (price) => (price >= 5000 ? 'legendary' : price >= 2500 ? 'epic' : price >= 900 ? 'rare' : 'common');
const RARITY_NAME = { common: 'Common', rare: 'Rare', epic: 'Epic', legendary: 'Legendary' };

function Price({ value }) {
  return (
    <span className="price">
      <SamosaIcon size={18} />
      {fmt(value)}
    </span>
  );
}

export default function Shop({ initialTab = 'chars', profile, onClose, onPreview, onBuy, onEquip, onUpgrade, onBuyBoards, onBuyItem }) {
  const [tab, setTab] = useState(initialTab);
  const [picked, setPicked] = useState(null);

  const choose = (kind, item) => {
    setPicked(item.id);
    onPreview({ ...profile.selected, [SELECT_KEY[kind]]: item.id });
  };

  return (
    <section className="sheet shop" aria-label="Shop">
      <header className="sheet-head">
        <h2 className="sheet-title">Shop</h2>
        <button id="btn-close-shop" className="close-btn" onClick={onClose} aria-label="Close shop">×</button>
      </header>
      <nav className="tabs" role="tablist">
        {TABS.map(([id, label]) => (
          <button
            key={id}
            id={`tab-${id}`}
            role="tab"
            aria-selected={tab === id}
            className={`tab ${tab === id ? 'on' : ''}`}
            onClick={() => {
              setTab(id);
              setPicked(null);
              onPreview(null);
            }}
          >
            {label}
          </button>
        ))}
      </nav>

      <div className="sheet-body">
        {LISTS[tab] && (
          <div className="card-grid">
            {LISTS[tab].map((item) => {
              const owned = (profile.owned[tab] ?? []).includes(item.id) || item.price === 0;
              const equipped = profile.selected[SELECT_KEY[tab]] === item.id;
              const isPicked = picked === item.id;
              const canAfford = profile.coins >= item.price;
              return (
                <article key={item.id} className={`shop-card rarity-${rarity(item.price)} ${isPicked ? 'picked' : ''} ${equipped ? 'equipped' : ''}`}>
                  <span className="rarity-tag">{RARITY_NAME[rarity(item.price)]}</span>
                  <button className="card-art" onClick={() => choose(tab, item)} aria-label={`Preview ${item.name}`}>
                    {tab === 'chars' && <Avatar char={item} />}
                    {tab === 'outfits' && <OutfitIcon outfit={item} />}
                    {tab === 'boards' && <BoardIcon board={item} />}
                    {tab === 'pets' && <PetIcon pet={item} />}
                  </button>
                  <h3 className="card-name">{item.name}</h3>
                  {(item.blurb || item.skill) && <p className="card-blurb">{item.blurb ?? item.skill}</p>}
                  {equipped ? (
                    <span className="tag tag-on">Equipped</span>
                  ) : owned ? (
                    <button className="btn btn-blue btn-mini" onClick={() => onEquip(SELECT_KEY[tab], item.id)}>Equip</button>
                  ) : (
                    <button
                      className="btn btn-green btn-mini"
                      disabled={!canAfford}
                      onClick={() => onBuy(tab, SELECT_KEY[tab], item)}
                      aria-label={`Buy ${item.name} for ${item.price} samosas`}
                    >
                      <Price value={item.price} />
                    </button>
                  )}
                  {!owned && !canAfford && <span className="need">Need {fmt(item.price - profile.coins)} more</span>}
                </article>
              );
            })}
          </div>
        )}

        {tab === 'upgrades' && (
          <div className="upgrade-list">
            <article className="upgrade-row stock">
              <span className="up-icon" style={{ background: POWER_COLOR.board }}><PowerIcon type="board" /></span>
              <div className="up-info">
                <h3>Skateboard rides</h3>
                <p>You have <strong>{profile.boards}</strong>. Double tap while running to ride.</p>
              </div>
              <div className="up-buy">
                <button className="btn btn-green btn-mini" disabled={profile.coins < BOARD_PRICE} onClick={() => onBuyBoards(1, BOARD_PRICE)}>
                  +1 <Price value={BOARD_PRICE} />
                </button>
                <button className="btn btn-green btn-mini" disabled={profile.coins < BOARD_PACK.price} onClick={() => onBuyBoards(BOARD_PACK.count, BOARD_PACK.price)}>
                  +{BOARD_PACK.count} <Price value={BOARD_PACK.price} />
                </button>
              </div>
            </article>
            {ITEMS.map((it) => (
              <article key={it.id} className="upgrade-row stock">
                <span className="up-icon" style={{ background: it.color }}><PowerIcon type={it.icon} /></span>
                <div className="up-info">
                  <h3>{it.name}</h3>
                  <p>You have <strong>{profile[it.id] ?? 0}</strong>. {it.text}</p>
                </div>
                <div className="up-buy">
                  {it.packs.map(([count, price]) => (
                    <button key={count} id={`buy-${it.id}-${count}`} className="btn btn-green btn-mini" disabled={profile.coins < price} onClick={() => onBuyItem(it.id, count, price)}>
                      +{count} <Price value={price} />
                    </button>
                  ))}
                </div>
              </article>
            ))}
            {UPGRADES.map((u) => {
              const level = profile.upgrades[u.id] ?? 0;
              const maxed = level >= UPGRADE_COSTS.length;
              const cost = UPGRADE_COSTS[level];
              return (
                <article key={u.id} className="upgrade-row">
                  <span className="up-icon" style={{ background: POWER_COLOR[u.id] }}><PowerIcon type={POWER_ICON[u.id]} /></span>
                  <div className="up-info">
                    <h3>{u.name}</h3>
                    <p>Lasts {upgradeTime(u.id, level)}{u.unit}{!maxed && ` → ${upgradeTime(u.id, level + 1)}${u.unit}`}</p>
                    <div className="pips" aria-label={`Level ${level} of 5`}>
                      {UPGRADE_COSTS.map((_, i) => <span key={i} className={`pip ${i < level ? 'on' : ''}`} />)}
                    </div>
                  </div>
                  <div className="up-buy">
                    {maxed ? (
                      <span className="tag tag-on">Max</span>
                    ) : (
                      <button className="btn btn-green btn-mini" disabled={profile.coins < cost} onClick={() => onUpgrade(u.id, cost)}>
                        <Price value={cost} />
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
