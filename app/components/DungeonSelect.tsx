"use client";

import { useState } from "react";
import { DUNGEONS } from "../game/data";
import { teamPower } from "../game/logic";
import type { PlayerProgress } from "../game/types";
import { GameIcon } from "./shared";

export function DungeonSelect({
  progress,
  onStart,
  onEditTeam,
}: {
  progress: PlayerProgress;
  onStart: (dungeonId: string) => void;
  onEditTeam: () => void;
}) {
  const [selectedId, setSelectedId] = useState("whispering-woods");
  const selected = DUNGEONS.find((dungeon) => dungeon.id === selectedId) ?? DUNGEONS[0];
  const unlocked = progress.unlockedDungeons.includes(selected.id);
  const playable = ["whispering-woods", "frostglass-cavern"].includes(selected.id) && unlocked;
  const power = teamPower(progress);

  return (
    <main className="page-screen dungeon-select-screen">
      <header className="page-title">
        <div>
          <span className="chapter-kicker">ABENTEUERKARTE</span>
          <h1>Wohin führt der Weg?</h1>
          <p>Jeder Dungeon besitzt eigene Räume, Ereignisse und Mechaniken.</p>
        </div>
        <button className="edit-team-button" onClick={onEditTeam}><GameIcon name="team" /> TEAM BEARBEITEN</button>
      </header>

      <section className="world-map">
        <div className="map-terrain">
          <span className="map-river" />
          <span className="map-mountain range-a" />
          <span className="map-mountain range-b" />
          <span className="map-forest forest-a" />
          <span className="map-forest forest-b" />
          <span className="map-road" />
          {DUNGEONS.map((dungeon, index) => {
            const isUnlocked = progress.unlockedDungeons.includes(dungeon.id);
            return (
              <button
                className={`map-node map-node-${index + 1} ${selected.id === dungeon.id ? "selected" : ""} ${isUnlocked ? "unlocked" : "locked"}`}
                key={dungeon.id}
                onClick={() => setSelectedId(dungeon.id)}
                style={{ "--dungeon-accent": dungeon.accent } as React.CSSProperties}
              >
                <span>{isUnlocked ? index + 1 : "×"}</span>
                <b>{dungeon.name}</b>
                <small>{isUnlocked ? dungeon.subtitle : `${dungeon.recommendedPower} Stärke`}</small>
              </button>
            );
          })}
        </div>

        <article className="dungeon-detail-card" style={{ "--dungeon-accent": selected.accent } as React.CSSProperties}>
          <div className={`dungeon-art dungeon-art-${selected.id}`}>
            <span className="dungeon-sun" />
            <span className="dungeon-hill hill-a" />
            <span className="dungeon-hill hill-b" />
            <span className="dungeon-trees" />
            <span className="dungeon-door" />
          </div>
          <div className="dungeon-detail-copy">
            <span className="chapter-kicker">{selected.subtitle}</span>
            <h2>{selected.name}</h2>
            <p>{selected.description}</p>
            <div className="difficulty-row">
              <span>Schwierigkeit</span>
              <div>{[1, 2, 3, 4].map((value) => <i className={value <= selected.difficulty ? "active" : ""} key={value} />)}</div>
            </div>
            <div className="mechanic-card">
              <GameIcon name="leaf" />
              <span><b>DUNGEON-MECHANIK</b><small>{selected.mechanic}</small></span>
            </div>
            <div className="boss-line"><span>BOSS</span><strong>{selected.boss}</strong></div>
            <div className="recommended-line">
              <span>Empfohlen: {selected.recommendedPower}</span>
              <strong className={power >= selected.recommendedPower ? "ready" : "low"}>Dein Team: {power}</strong>
            </div>
            {playable ? (
              <button className="enter-dungeon-button" disabled={!progress.team.length} onClick={() => onStart(selected.id)}>
                {selected.name.toLocaleUpperCase("de-DE")} BETRETEN
              </button>
            ) : (
              <button className="enter-dungeon-button" disabled>
                {unlocked ? "FÜR DIE NÄCHSTE BETA FREIGESCHALTET" : "NOCH GESPERRT"}
              </button>
            )}
          </div>
        </article>
      </section>
    </main>
  );
}
