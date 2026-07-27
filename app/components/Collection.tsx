"use client";

import { useMemo, useState } from "react";
import { HEROES, getGear, getHero } from "../game/data";
import { teamPower, totalHeroStats } from "../game/logic";
import type {
  PlayerProgress,
  TeamBehavior,
  TeamPosition,
  TargetPriority,
} from "../game/types";
import type { PlayerProgressController } from "../game/use-player-progress";
import { GameIcon, HeroPortrait, RarityBadge } from "./shared";

type CollectionActions = Pick<
  PlayerProgressController,
  | "addHeroToTeam"
  | "removeHeroFromTeam"
  | "moveTeamHero"
  | "updateTeamSlot"
  | "equipGear"
  | "unequipGear"
  | "levelHero"
  | "starHero"
>;

export function HeroesCollection({
  progress,
  actions,
}: {
  progress: PlayerProgress;
  actions: CollectionActions;
}) {
  const [selectedId, setSelectedId] = useState(progress.heroes[0]?.id ?? "");
  const owned = progress.heroes.find((hero) => hero.id === selectedId) ?? progress.heroes[0];
  const definition = owned ? getHero(owned.id) : null;
  const stats = owned ? totalHeroStats(progress, owned.id) : null;
  const equipped = progress.gear.filter((gear) => gear.equippedBy === owned?.id);
  const levelCost = owned ? 120 + owned.level * 70 : 0;
  const starCost = owned ? owned.stars * 30 : 0;

  return (
    <main className="page-screen collection-screen">
      <header className="page-title">
        <div>
          <span className="chapter-kicker">GEFÄHRTENBUCH</span>
          <h1>Deine Helden</h1>
          <p>Fähigkeiten, Rollen und Kombinationen sind wichtiger als bloße Seltenheit.</p>
        </div>
        <div className="collection-count"><strong>{progress.heroes.length}</strong><span>von {HEROES.length}<small>entdeckt</small></span></div>
      </header>

      <section className="hero-collection-layout">
        <div className="hero-roster-grid">
          {HEROES.map((hero) => {
            const playerHero = progress.heroes.find((entry) => entry.id === hero.id);
            return (
              <button
                className={`roster-card ${selectedId === hero.id ? "selected" : ""} ${playerHero ? "" : "locked"}`}
                key={hero.id}
                disabled={!playerHero}
                onClick={() => setSelectedId(hero.id)}
                style={{ "--hero-accent": hero.palette } as React.CSSProperties}
              >
                <RarityBadge rarity={hero.rarity} />
                <HeroPortrait hero={hero} size="medium" skinId={playerHero ? progress.equippedCosmetics.skins[hero.id] : null} muted={!playerHero} />
                <strong>{playerHero ? hero.name : "Unentdeckt"}</strong>
                <small>{playerHero ? `Lv. ${playerHero.level} · ${hero.role}` : hero.rarity}</small>
                {playerHero && <span className="star-line">{"★".repeat(playerHero.stars)}{"☆".repeat(5 - playerHero.stars)}</span>}
              </button>
            );
          })}
        </div>

        {owned && definition && stats && (
          <article className="hero-detail-card" style={{ "--hero-accent": definition.palette } as React.CSSProperties}>
            <div className="hero-detail-banner">
              <HeroPortrait hero={definition} size="large" skinId={progress.equippedCosmetics.skins[definition.id]} />
              <div>
                <RarityBadge rarity={definition.rarity} />
                <h2>{definition.name}</h2>
                <p>{definition.epithet}</p>
                <span>{definition.role}</span>
              </div>
            </div>
            <div className="stat-grid">
              <div><span>LEBEN</span><strong>{stats.hp}</strong></div>
              <div><span>ANGRIFF</span><strong>{stats.attack}</strong></div>
              <div><span>VERTEIDIGUNG</span><strong>{stats.defense}</strong></div>
              <div><span>TEMPO</span><strong>{stats.speed}</strong></div>
            </div>
            <div className="ability-list">
              <div><GameIcon name="burst" /><span><b>{definition.activeName}</b><small>AKTIV · {definition.activeDescription}</small></span></div>
              <div><GameIcon name="ward" /><span><b>{definition.passiveName}</b><small>PASSIV · {definition.passiveDescription}</small></span></div>
            </div>
            <div className="equipped-row">
              <span>AUSGERÜSTET</span>
              <div>
                {equipped.length ? equipped.map((item) => {
                  const gear = getGear(item.definitionId);
                  return gear ? <span key={item.uid} title={gear.name}><GameIcon name={gear.icon} /></span> : null;
                }) : <small>Noch keine Gegenstände</small>}
              </div>
            </div>
            <div className="upgrade-actions">
              <button
                disabled={progress.wallet.gold < levelCost || owned.level >= 20}
                onClick={() => actions.levelHero(owned.id)}
              >
                <span>LEVEL ERHÖHEN</span><small>{owned.level >= 20 ? "MAX" : `${levelCost} Gold`}</small>
              </button>
              <button
                disabled={owned.fragments < starCost || owned.stars >= 5}
                onClick={() => actions.starHero(owned.id)}
              >
                <span>STERN AUFWERTEN</span><small>{owned.stars >= 5 ? "MAX" : `${owned.fragments}/${starCost} Fragmente`}</small>
              </button>
            </div>
          </article>
        )}
      </section>
    </main>
  );
}

export function GearInventory({
  progress,
  actions,
}: {
  progress: PlayerProgress;
  actions: CollectionActions;
}) {
  const [filter, setFilter] = useState<"Alle" | "Waffe" | "Rüstung" | "Ring" | "Relikt">("Alle");
  const [selectedUid, setSelectedUid] = useState(progress.gear[0]?.uid ?? "");
  const inventory = progress.gear.filter((item) => filter === "Alle" || getGear(item.definitionId)?.slot === filter);
  const selected = progress.gear.find((item) => item.uid === selectedUid) ?? inventory[0];
  const definition = selected ? getGear(selected.definitionId) : null;

  return (
    <main className="page-screen gear-screen">
      <header className="page-title">
        <div>
          <span className="chapter-kicker">ABENTEUER-RUCKSACK</span>
          <h1>Ausrüstung</h1>
          <p>Jeder Held kann je ein Stück pro Ausrüstungsplatz tragen.</p>
        </div>
        <div className="inventory-space"><strong>{progress.gear.length}</strong><span>/ 60 Plätze</span></div>
      </header>
      <div className="inventory-filters">
        {(["Alle", "Waffe", "Rüstung", "Ring", "Relikt"] as const).map((slot) => (
          <button className={filter === slot ? "active" : ""} onClick={() => setFilter(slot)} key={slot}>{slot}</button>
        ))}
      </div>
      <section className="gear-layout">
        <div className="gear-grid">
          {inventory.map((item) => {
            const gear = getGear(item.definitionId);
            if (!gear) return null;
            return (
              <button
                className={`gear-tile rarity-frame-${gear.rarity.toLowerCase()} ${selected?.uid === item.uid ? "selected" : ""}`}
                key={item.uid}
                onClick={() => setSelectedUid(item.uid)}
              >
                <span className="gear-tile-icon"><GameIcon name={gear.icon} /></span>
                <strong>{gear.name}</strong>
                <small>{gear.slot} · Lv. {item.level}</small>
                {item.equippedBy && <b>{getHero(item.equippedBy)?.name}</b>}
              </button>
            );
          })}
          {!inventory.length && <div className="empty-state">Keine Gegenstände in dieser Kategorie.</div>}
        </div>
        {selected && definition && (
          <article className="gear-detail">
            <div className={`large-gear-icon gear-${definition.icon}`}><GameIcon name={definition.icon} /></div>
            <RarityBadge rarity={definition.rarity} />
            <h2>{definition.name}</h2>
            <span>{definition.slot} · Level {selected.level}</span>
            <div className="gear-stat-list">
              {definition.attack && <div><span>Angriff</span><strong>+{definition.attack}</strong></div>}
              {definition.defense && <div><span>Verteidigung</span><strong>+{definition.defense}</strong></div>}
              {definition.hp && <div><span>Leben</span><strong>+{definition.hp}</strong></div>}
              {definition.speed && <div><span>Tempo</span><strong>+{definition.speed}</strong></div>}
            </div>
            <p>{definition.perk}</p>
            <span className="equip-heading">AUSRÜSTEN FÜR</span>
            <div className="equip-hero-list">
              {progress.heroes.map((owned) => {
                const hero = getHero(owned.id);
                return hero ? (
                  <button
                    className={selected.equippedBy === hero.id ? "equipped" : ""}
                    key={hero.id}
                    onClick={() => actions.equipGear(selected.uid, hero.id)}
                  >
                    <HeroPortrait hero={hero} size="small" skinId={progress.equippedCosmetics.skins[hero.id]} />
                    <span>{hero.name}<small>{selected.equippedBy === hero.id ? "Ausgerüstet" : hero.role}</small></span>
                  </button>
                ) : null;
              })}
            </div>
            {selected.equippedBy && <button className="unequip-button" onClick={() => actions.unequipGear(selected.uid)}>ABLEGEN</button>}
          </article>
        )}
      </section>
    </main>
  );
}

const positions: TeamPosition[] = ["Front", "Mitte", "Hinten"];
const behaviors: TeamBehavior[] = ["Offensiv", "Ausgeglichen", "Defensiv", "Team schützen"];
const targets: TargetPriority[] = ["Nächstes Ziel", "Schwache Gegner", "Boss"];

export function TeamBuilder({
  progress,
  actions,
  onAdventure,
}: {
  progress: PlayerProgress;
  actions: CollectionActions;
  onAdventure: () => void;
}) {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const available = progress.heroes.filter((hero) => !progress.team.some((slot) => slot.heroId === hero.id));
  const power = useMemo(() => teamPower(progress), [progress]);

  return (
    <main className="page-screen team-builder-screen">
      <header className="page-title">
        <div>
          <span className="chapter-kicker">VOR DEM AUFBRUCH</span>
          <h1>Team vorbereiten</h1>
          <p>Position, Verhalten und Ziele entscheiden, wie deine Helden automatisch handeln.</p>
        </div>
        <div className="team-power"><span>TEAMSTÄRKE</span><strong>{power}</strong></div>
      </header>

      <section className="formation-board">
        <div className="formation-lanes">
          <span>FRONT</span><span>MITTE</span><span>HINTEN</span>
        </div>
        <div className="team-slots">
          {progress.team.map((slot, index) => {
            const hero = getHero(slot.heroId);
            if (!hero) return null;
            return (
              <article
                className={`team-slot-card position-${slot.position.toLowerCase()}`}
                key={slot.heroId}
                draggable
                onDragStart={() => setDraggedId(slot.heroId)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => {
                  if (!draggedId || draggedId === slot.heroId) return;
                  const from = progress.team.findIndex((entry) => entry.heroId === draggedId);
                  const to = progress.team.findIndex((entry) => entry.heroId === slot.heroId);
                  if (from >= 0 && to >= 0) actions.moveTeamHero(draggedId, to > from ? 1 : -1);
                  setDraggedId(null);
                }}
                style={{ "--hero-accent": hero.palette } as React.CSSProperties}
              >
                <div className="team-order">{index + 1}</div>
                <HeroPortrait hero={hero} size="medium" skinId={progress.equippedCosmetics.skins[hero.id]} />
                <div className="team-hero-name"><strong>{hero.name}</strong><span>{hero.role}</span></div>
                <label>POSITION
                  <select value={slot.position} onChange={(event) => actions.updateTeamSlot(slot.heroId, { position: event.target.value as TeamPosition })}>
                    {positions.map((position) => <option key={position}>{position}</option>)}
                  </select>
                </label>
                <label>VERHALTEN
                  <select value={slot.behavior} onChange={(event) => actions.updateTeamSlot(slot.heroId, { behavior: event.target.value as TeamBehavior })}>
                    {behaviors.map((behavior) => <option key={behavior}>{behavior}</option>)}
                  </select>
                </label>
                <label>ZIELPRIORITÄT
                  <select value={slot.target} onChange={(event) => actions.updateTeamSlot(slot.heroId, { target: event.target.value as TargetPriority })}>
                    {targets.map((target) => <option key={target}>{target}</option>)}
                  </select>
                </label>
                <div className="team-card-actions">
                  <button disabled={index === 0} onClick={() => actions.moveTeamHero(slot.heroId, -1)} aria-label={`${hero.name} nach links`}>←</button>
                  <button onClick={() => actions.removeHeroFromTeam(slot.heroId)}>ENTFERNEN</button>
                  <button disabled={index === progress.team.length - 1} onClick={() => actions.moveTeamHero(slot.heroId, 1)} aria-label={`${hero.name} nach rechts`}>→</button>
                </div>
              </article>
            );
          })}
          {[...Array(Math.max(0, 4 - progress.team.length))].map((_, index) => (
            <div className="empty-team-slot" key={index}><span>+</span><b>FREIER PLATZ</b><small>Maximal 4 Helden</small></div>
          ))}
        </div>
      </section>

      <section className="available-heroes">
        <div><span className="chapter-kicker">VERFÜGBARE HELDEN</span><small>Klicken, um dem Team hinzuzufügen</small></div>
        <div className="available-row">
          {available.map((owned) => {
            const hero = getHero(owned.id);
            return hero ? (
              <button disabled={progress.team.length >= 4} key={hero.id} onClick={() => actions.addHeroToTeam(hero.id)}>
                <HeroPortrait hero={hero} size="small" skinId={progress.equippedCosmetics.skins[hero.id]} />
                <span><strong>{hero.name}</strong><small>{hero.role}</small></span>
                <b>+</b>
              </button>
            ) : null;
          })}
          {!available.length && <span className="all-assigned">Alle verfügbaren Helden sind bereits zugewiesen.</span>}
        </div>
      </section>

      <div className="team-footer">
        <span>{progress.team.length < 2 ? "Mindestens 2 Helden werden empfohlen." : "Das Team ist bereit für den Flüsterwald."}</span>
        <button disabled={progress.team.length < 1} onClick={onAdventure}>DUNGEON AUSWÄHLEN →</button>
      </div>
    </main>
  );
}
