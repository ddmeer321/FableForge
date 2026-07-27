"use client";

import { DUNGEONS, getHero } from "../game/data";
import { teamPower } from "../game/logic";
import type { AppScreen, PlayerProgress } from "../game/types";
import { GameIcon, HeroPortrait, RarityBadge } from "./shared";

export function Lobby({
  progress,
  onNavigate,
  onStarterHero,
  onStarterGear,
}: {
  progress: PlayerProgress;
  onNavigate: (screen: AppScreen) => void;
  onStarterHero: () => void;
  onStarterGear: () => void;
}) {
  const ready = progress.onboarding === "ready";
  const teamHeroes = progress.team
    .map((slot) => getHero(slot.heroId))
    .filter((hero): hero is NonNullable<typeof hero> => Boolean(hero));
  const latestDungeon = DUNGEONS.find((dungeon) => dungeon.name === progress.lastUnlockedDungeon) ?? DUNGEONS[0];

  return (
    <main className="lobby-screen">
      <section className="lobby-hero">
        <div className="lobby-sky">
          <span className="cloud cloud-a" />
          <span className="cloud cloud-b" />
          <span className="mountain mountain-a" />
          <span className="mountain mountain-b" />
          <span className="lobby-tree tree-left" />
          <span className="lobby-tree tree-right" />
          <span className="castle-tower tower-left" />
          <span className="castle-tower tower-right" />
          <span className="castle-gate" />
        </div>
        <div className="welcome-copy">
          <span className="chapter-kicker">
            {ready ? `ABENTEUERBUCH · KAPITEL ${progress.completedRuns + 1}` : "EIN NEUES ABENTEUER BEGINNT"}
          </span>
          <h1>{ready ? "Was ruft dich heute?" : "Willkommen in Lumenhain"}</h1>
          <p>
            {ready
              ? "Stelle deine Gefährten zusammen, öffne geheimnisvolle Boxen und schreibe deine eigene Dungeon-Geschichte."
              : "Bevor sich das große Tor öffnet, wartet eine kostenlose Heldenbox auf ihren neuen Besitzer."}
          </p>
          {progress.onboarding === "intro" && (
            <button className="primary-adventure-button" onClick={onStarterHero}>
              <span className="button-shine" />
              <GameIcon name="box" />
              KOSTENLOSE HELDENBOX ÖFFNEN
            </button>
          )}
          {progress.onboarding === "starterGear" && (
            <button className="primary-adventure-button" onClick={onStarterGear}>
              <span className="button-shine" />
              <GameIcon name="box" />
              STARTER-AUSRÜSTUNGSBOX ÖFFNEN
            </button>
          )}
          {ready && (
            <button className="primary-adventure-button" onClick={() => onNavigate("dungeons")}>
              <span className="button-shine" />
              <GameIcon name="route" />
              ABENTEUER
            </button>
          )}
          <div className="lobby-progress-line">
            <div><span>Fortschritt</span><strong>{Math.min(100, 18 + progress.completedRuns * 16)} %</strong></div>
            <div className="progress-track"><i style={{ width: `${Math.min(100, 18 + progress.completedRuns * 16)}%` }} /></div>
            <small>Zuletzt freigeschaltet: {progress.lastUnlockedDungeon}</small>
          </div>
        </div>
        <div className="lobby-party" aria-label="Aktuelles Team">
          {teamHeroes.length ? (
            teamHeroes.map((hero, index) => (
              <div className={`lobby-character lobby-character-${index + 1}`} key={hero.id}>
                <HeroPortrait hero={hero} size="large" skinId={progress.equippedCosmetics.skins[hero.id]} />
                <span>{hero.name}</span>
              </div>
            ))
          ) : (
            <div className="empty-party-banner">
              <span className="floating-rune">✦</span>
              <b>Dein erstes Team wartet</b>
            </div>
          )}
        </div>
      </section>

      <section className="lobby-actions" aria-label="Bereiche">
        <button className="lobby-card box-card" onClick={() => ready ? onNavigate("boxes") : onStarterHero()}>
          <div className="card-illustration">
            <span className="chest-lid" />
            <span className="chest-body" />
            <span className="chest-lock" />
            <span className="spark spark-a" />
            <span className="spark spark-b" />
          </div>
          <span className="card-label">MAGISCHE FUNDE</span>
          <h2>Boxen</h2>
          <p>Helden, Ausrüstung und besondere Schätze.</p>
          <b>{ready ? "ZUR BOXENHALLE →" : "STARTERBOX BEREIT →"}</b>
        </button>

        <button className="lobby-card hero-card-lobby" onClick={() => onNavigate("heroes")} disabled={!ready}>
          <div className="card-portrait-row">
            {progress.heroes.slice(0, 3).map((owned, index) => {
              const hero = getHero(owned.id);
              return hero ? <HeroPortrait hero={hero} size="medium" skinId={progress.equippedCosmetics.skins[hero.id]} key={hero.id} muted={index > 1} /> : null;
            })}
          </div>
          <span className="card-label">DEINE GEFÄHRTEN</span>
          <h2>Helden</h2>
          <p>{progress.heroes.length || "Noch keine"} Helden gesammelt</p>
          <b>SAMMLUNG ANSEHEN →</b>
        </button>

        <button className="lobby-card gear-card-lobby" onClick={() => onNavigate("gear")} disabled={!ready}>
          <div className="gear-display">
            <span className="gear-sword" />
            <span className="gear-shield" />
            <span className="gear-gem">◆</span>
          </div>
          <span className="card-label">RUCKSACK</span>
          <h2>Ausrüstung</h2>
          <p>{progress.gear.length} Gegenstände · direkt ausrüstbar</p>
          <b>INVENTAR ÖFFNEN →</b>
        </button>

        <button className="lobby-card team-card-lobby" onClick={() => onNavigate("team")} disabled={!ready}>
          <div className="formation-preview">
            {teamHeroes.map((hero) => (
              <span key={hero.id} style={{ "--dot-color": hero.palette } as React.CSSProperties}>
                {hero.name.slice(0, 1)}
              </span>
            ))}
            {[...Array(Math.max(0, 4 - teamHeroes.length))].map((_, index) => <i key={index}>+</i>)}
          </div>
          <span className="card-label">FORMATION</span>
          <h2>Team</h2>
          <p>{teamHeroes.length}/4 Helden · Stärke {teamPower(progress)}</p>
          <b>TEAM VORBEREITEN →</b>
        </button>

        <button className="lobby-card cosmetic-card-lobby" onClick={() => onNavigate("cosmetics")} disabled={!ready}>
          <div className="lobby-cosmetic-display" aria-hidden="true">
            <span className="lobby-cosmetic-aura"><i /><i /></span>
            <span className="lobby-cosmetic-cloak" />
            <span className="lobby-cosmetic-trail"><i /><i /><i /></span>
          </div>
          <span className="card-label">ATELIER</span>
          <h2>Kosmetik</h2>
          <p>{progress.cosmetics.length} Looks · Skins, Auren und Spuren</p>
          <b>LOOKS AUSRÜSTEN →</b>
        </button>
      </section>

      {ready && (
        <section className="latest-dungeon-card">
          <div className="dungeon-thumbnail">
            <span className="forest-canopy canopy-a" />
            <span className="forest-canopy canopy-b" />
            <span className="forest-path" />
            <span className="forest-light" />
          </div>
          <div>
            <span className="chapter-kicker">ZULETZT FREIGESCHALTET</span>
            <h2>{latestDungeon.name}</h2>
            <p>{latestDungeon.description}</p>
            <div className="dungeon-meta">
              <span>Stufe {latestDungeon.difficulty}</span>
              <span>Boss: {latestDungeon.boss}</span>
              <RarityBadge rarity={progress.completedRuns ? "Epic" : "Rare"} />
            </div>
          </div>
          <button onClick={() => onNavigate("dungeons")}>DUNGEON ANSEHEN</button>
        </section>
      )}
    </main>
  );
}
