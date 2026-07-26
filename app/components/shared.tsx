"use client";

import { CURRENCY_LABELS, getHero } from "../game/data";
import type { AppScreen, CurrencyWallet, HeroDefinition, Rarity } from "../game/types";

export function HeroPortrait({
  hero,
  size = "medium",
  muted = false,
}: {
  hero: HeroDefinition;
  size?: "small" | "medium" | "large";
  muted?: boolean;
}) {
  return (
    <div
      className={`adventure-portrait portrait-${hero.portrait} portrait-${size} ${muted ? "is-muted" : ""}`}
      style={{ "--portrait-accent": hero.palette } as React.CSSProperties}
      aria-label={`${hero.name}, ${hero.role}`}
    >
      <span className="portrait-aura" />
      <span className="portrait-body" />
      <span className="portrait-neck" />
      <span className="portrait-face" />
      <span className="portrait-hair portrait-hair-left" />
      <span className="portrait-hair portrait-hair-right" />
      <span className="portrait-eye portrait-eye-left" />
      <span className="portrait-eye portrait-eye-right" />
      <span className="portrait-accessory" />
      <b>{hero.name.slice(0, 1)}</b>
    </div>
  );
}

export function RarityBadge({ rarity }: { rarity: Rarity }) {
  return <span className={`rarity-badge rarity-${rarity.toLowerCase()}`}>{rarity}</span>;
}

export function GameIcon({ name, label }: { name: string; label?: string }) {
  const marks: Record<string, string> = {
    blade: "╱",
    bow: "⌁",
    armor: "◇",
    ring: "○",
    relic: "✦",
    crown: "♢",
    swords: "×",
    mushroom: "♧",
    claw: "〽",
    chest: "▰",
    shop: "⌂",
    spring: "◒",
    statue: "♜",
    risk: "!",
    golem: "▣",
    boss: "✹",
    burst: "✣",
    leaf: "❧",
    shield: "⬡",
    drop: "◉",
    arrow: "➤",
    snow: "✣",
    sun: "☼",
    ward: "◈",
    heal: "+",
    power: "↑",
    sound: "◖",
    mute: "×",
    key: "⌘",
    crystal: "◆",
    gold: "●",
    route: "⌁",
    box: "▰",
    team: "♟",
    bag: "◫",
    hero: "♞",
    pause: "Ⅱ",
    play: "▶",
    retreat: "↩",
  };
  return (
    <span className={`game-icon icon-${name}`} aria-label={label} aria-hidden={label ? undefined : true}>
      {marks[name] ?? name.slice(0, 1).toUpperCase()}
    </span>
  );
}

export function ResourceBar({ wallet }: { wallet: CurrencyWallet }) {
  const resources: { key: keyof CurrencyWallet; icon: string }[] = [
    { key: "gold", icon: "gold" },
    { key: "keys", icon: "key" },
    { key: "crystals", icon: "crystal" },
  ];
  return (
    <div className="resource-bar" aria-label="Währungen">
      {resources.map(({ key, icon }) => (
        <div className="resource-pill" key={key} title={CURRENCY_LABELS[key]}>
          <GameIcon name={icon} />
          <strong>{wallet[key].toLocaleString("de-DE")}</strong>
        </div>
      ))}
    </div>
  );
}

const NAV_ITEMS: { screen: AppScreen; label: string; icon: string }[] = [
  { screen: "lobby", label: "Lobby", icon: "route" },
  { screen: "boxes", label: "Boxen", icon: "box" },
  { screen: "heroes", label: "Helden", icon: "hero" },
  { screen: "gear", label: "Ausrüstung", icon: "bag" },
  { screen: "team", label: "Team", icon: "team" },
];

export function GameHeader({
  wallet,
  screen,
  onNavigate,
  audioEnabled,
  onToggleAudio,
  compact = false,
}: {
  wallet: CurrencyWallet;
  screen: AppScreen;
  onNavigate: (screen: AppScreen) => void;
  audioEnabled: boolean;
  onToggleAudio: () => void;
  compact?: boolean;
}) {
  return (
    <header className={`game-header ${compact ? "is-compact" : ""}`}>
      <button className="wordmark" onClick={() => onNavigate("lobby")} aria-label="Zur Fantasy-Lobby">
        <span className="wordmark-gem">R</span>
        <span><b>FABLEFORGE</b><small>TALES OF THE WILD</small></span>
      </button>
      {!compact && (
        <nav className="main-nav" aria-label="Hauptnavigation">
          {NAV_ITEMS.map((item) => (
            <button
              className={screen === item.screen ? "active" : ""}
              key={item.screen}
              onClick={() => onNavigate(item.screen)}
            >
              <GameIcon name={item.icon} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      )}
      <div className="header-actions">
        <ResourceBar wallet={wallet} />
        <button className="sound-button" onClick={onToggleAudio} aria-label={audioEnabled ? "Audio ausschalten" : "Audio einschalten"}>
          <GameIcon name={audioEnabled ? "sound" : "mute"} />
        </button>
      </div>
    </header>
  );
}

export function HeroMini({
  heroId,
  hp,
  maxHp,
  shield = 0,
}: {
  heroId: string;
  hp: number;
  maxHp: number;
  shield?: number;
}) {
  const hero = getHero(heroId);
  if (!hero) return null;
  return (
    <div className="hero-mini">
      <HeroPortrait hero={hero} size="small" muted={hp <= 0} />
      <div>
        <strong>{hero.name}</strong>
        <span>{Math.ceil(hp)} / {maxHp}</span>
      </div>
      <div className="mini-hp"><i style={{ width: `${Math.max(0, (hp / maxHp) * 100)}%` }} /></div>
      {shield > 0 && <small className="shield-chip">+{Math.ceil(shield)} Schild</small>}
    </div>
  );
}
