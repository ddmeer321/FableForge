"use client";

import { useEffect, useMemo, useState } from "react";
import { getDungeon, getHero } from "../game/data";
import type { DungeonRun, PlayerProgress, RunRewards } from "../game/types";
import type { DungeonRunController } from "../game/use-dungeon-run";
import { GameIcon, HeroPortrait } from "./shared";

type RunActions = Omit<DungeonRunController, "run" | "startRun" | "endRun">;

const ATMOSPHERE_PARTICLES = Array.from({ length: 12 }, (_, index) => index);

function DungeonAtmosphere({ theme }: { theme: string }) {
  return (
    <div className={`dungeon-atmosphere atmosphere-${theme}`} aria-hidden="true">
      <span className="atmosphere-vignette" />
      <span className="atmosphere-haze haze-a" />
      <span className="atmosphere-haze haze-b" />
      <div className="atmosphere-particles">
        {ATMOSPHERE_PARTICLES.map((index) => (
          <i
            key={index}
            style={{ "--particle-index": index } as React.CSSProperties}
          />
        ))}
      </div>
    </div>
  );
}

function RunTopbar({
  run,
  onRetreat,
  actions,
}: {
  run: DungeonRun;
  onRetreat: () => void;
  actions: RunActions;
}) {
  const [confirmRetreat, setConfirmRetreat] = useState(false);
  const combat = run.combat;
  const dungeon = getDungeon(run.dungeonId);
  const frost = run.dungeonId === "frostglass-cavern";

  return (
    <>
      <header className="run-topbar">
        <div className="run-location">
          <button onClick={() => setConfirmRetreat(true)} aria-label="Rückzug vorbereiten"><GameIcon name="retreat" /></button>
          <div>
            <span>{dungeon?.name.toLocaleUpperCase("de-DE")} · UNKARTIERT</span>
            <strong>{run.currentRoom?.title ?? (run.phase === "bossIntro" ? (frost ? "Frostthron" : "Herzbaum") : (frost ? "Pfad im Eisnebel" : "Pfad im Nebel"))}</strong>
          </div>
        </div>
        <div className="run-progress run-progress-mystery" aria-label="Die Länge des Dungeons ist unbekannt">
          <i className="current"><GameIcon name="route" /></i>
          <span>DER NEBEL VERBIRGT DEN REST</span>
        </div>
        <div className="run-controls">
          <span><GameIcon name="gold" /> {run.earnedGold}</span>
          <button
            disabled={!combat}
            onClick={actions.togglePause}
            aria-label={combat?.paused ? "Kampf fortsetzen" : "Kampf pausieren"}
          >
            <GameIcon name={combat?.paused ? "play" : "pause"} />
          </button>
          <button onClick={() => setConfirmRetreat(true)}>RÜCKZUG</button>
        </div>
      </header>
      {confirmRetreat && (
        <div className="modal-backdrop">
          <section className="confirm-modal">
            <GameIcon name="retreat" />
            <span className="chapter-kicker">RUN ABBRECHEN</span>
            <h2>Zum Lumenhain zurückkehren?</h2>
            <p>Du behältst 40 % des gesammelten Goldes. Schlüssel und Bossbelohnungen gehen verloren.</p>
            <div><button onClick={() => setConfirmRetreat(false)}>WEITERKÄMPFEN</button><button className="danger" onClick={onRetreat}>RÜCKZUG</button></div>
          </section>
        </div>
      )}
    </>
  );
}

function PathChoiceView({
  run,
  progress,
  actions,
}: {
  run: DungeonRun;
  progress: PlayerProgress;
  actions: RunActions;
}) {
  return (
    <section className="path-choice-view">
      <div className="forest-scene">
        <span className="forest-moon" />
        <span className="forest-layer forest-back" />
        <span className="forest-layer forest-mid" />
        <span className="forest-layer forest-front" />
        <span className="path-lantern lantern-a" />
        <span className="path-lantern lantern-b" />
      </div>
      <div className="path-copy">
        <span className="chapter-kicker">KREUZUNG IM FLÜSTERWALD</span>
        <h1>Welchem Weg folgt die Gruppe?</h1>
        <p>{run.message}</p>
      </div>
      <div className="crossroads-map">
        <div className="crossroads-party" aria-label="Deine Gruppe wartet an der Kreuzung">
          {progress.team.map((slot, index) => {
            const hero = getHero(slot.heroId);
            return hero ? (
              <span style={{ "--party-index": index } as React.CSSProperties} key={slot.heroId}>
                <HeroPortrait hero={hero} size="small" />
                <small>{hero.name}</small>
              </span>
            ) : null;
          })}
        </div>
        <span className="crossroads-trunk" />
        <div className="branch-lines" aria-hidden="true"><i /><i /><i /></div>
        <div className="path-card-grid">
          {run.choices.map((choice, index) => (
            <button
              className={`path-card danger-${choice.danger.toLowerCase()}`}
              key={choice.id}
              onClick={() => actions.chooseRoom(choice)}
            >
              <div className="path-card-art"><GameIcon name={choice.icon} /><span /></div>
              <span className="branch-number">WEG {index + 1}</span>
              <span className="danger-label">{choice.danger}</span>
              <h2>{choice.title}</h2>
              <p>{choice.subtitle}</p>
              <div><span>MÖGLICHER FUND</span><strong>{choice.reward}</strong></div>
              <b>DIESEN WEG ERKUNDEN →</b>
            </button>
          ))}
        </div>
      </div>
      <div className="current-build-strip">
        <span>AKTUELLER BUILD</span>
        {run.buffs.length ? run.buffs.map((buff) => (
          <div key={buff.id} title={buff.description}><GameIcon name={buff.icon} /><b>{buff.name}</b></div>
        )) : <small>Noch keine Run-Power-ups</small>}
      </div>
    </section>
  );
}

function TravelView({
  run,
  progress,
  actions,
}: {
  run: DungeonRun;
  progress: PlayerProgress;
  actions: RunActions;
}) {
  const destination = run.currentRoom;

  useEffect(() => {
    if (!destination) return;
    const timer = window.setTimeout(actions.arriveAtRoom, 2800);
    return () => window.clearTimeout(timer);
  }, [actions.arriveAtRoom, destination]);

  if (!destination) return null;

  return (
    <section className="travel-view" aria-live="polite">
      <div className="travel-heading">
        <span className="chapter-kicker">DIE REISE GEHT WEITER</span>
        <h1>Unterwegs zum {destination.title}</h1>
        <p>{destination.subtitle}</p>
      </div>
      <div className="travel-world">
        <span className="travel-moon" />
        <span className="travel-hills hills-back" />
        <span className="travel-hills hills-front" />
        <span className="travel-trail" />
        <span className="travel-marker marker-one" />
        <span className="travel-marker marker-two" />
        <span className="travel-marker marker-three" />
        <div className="travel-party">
          {progress.team.map((slot, index) => {
            const hero = getHero(slot.heroId);
            return hero ? (
              <span style={{ "--walker-index": index } as React.CSSProperties} key={slot.heroId}>
                <HeroPortrait hero={hero} size="small" />
              </span>
            ) : null;
          })}
        </div>
        <div className={`travel-destination danger-${destination.danger.toLowerCase()}`}>
          <GameIcon name={destination.icon} />
          <span><small>ZIEL</small><strong>{destination.title}</strong></span>
        </div>
        <div className="travel-dust" aria-hidden="true"><i /><i /><i /></div>
      </div>
      <div className="travel-status">
        <span><i /> Die Gruppe folgt dem gewählten Pfad</span>
        <strong>{destination.danger} · {destination.reward}</strong>
        <button onClick={actions.arriveAtRoom}>WEG ABKÜRZEN</button>
      </div>
    </section>
  );
}

function ContinuousDungeonPath({
  run,
  progress,
  actions,
}: {
  run: DungeonRun;
  progress: PlayerProgress;
  actions: RunActions;
}) {
  const [selectedBranch, setSelectedBranch] = useState(0);
  const isWalking = run.phase === "travel";
  const chosenBranch = Math.max(
    0,
    run.choices.findIndex((choice) => choice.id === run.currentRoom?.id),
  );
  const destination = isWalking ? run.currentRoom : run.choices[selectedBranch];
  const visibleHistory = run.pathHistory
    .slice(0, isWalking ? -1 : run.pathHistory.length)
    .slice(-3);
  const frost = run.dungeonId === "frostglass-cavern";
  const dungeon = getDungeon(run.dungeonId);

  useEffect(() => {
    if (!isWalking || !run.currentRoom) return;
    const timer = window.setTimeout(actions.arriveAtRoom, 1900);
    return () => window.clearTimeout(timer);
  }, [actions.arriveAtRoom, isWalking, run.currentRoom]);

  useEffect(() => {
    if (run.phase !== "path") return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowUp") {
        event.preventDefault();
        setSelectedBranch(0);
      }
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setSelectedBranch(Math.min(1, run.choices.length - 1));
      }
      if ((event.key === "ArrowRight" || event.key === "Enter") && run.choices[selectedBranch]) {
        event.preventDefault();
        actions.chooseRoom(run.choices[selectedBranch]);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [actions, run.choices, run.phase, selectedBranch]);

  const chooseBranch = (index: number) => {
    if (run.phase !== "path" || !run.choices[index]) return;
    setSelectedBranch(index);
    actions.chooseRoom(run.choices[index]);
  };

  if (!run.routePlan.length) {
    return run.phase === "travel"
      ? <TravelView run={run} progress={progress} actions={actions} />
      : <PathChoiceView run={run} progress={progress} actions={actions} />;
  }

  return (
    <section className={`dungeon-path-view ${isWalking ? "is-walking" : ""}`} aria-live="polite">
      <div className="dungeon-path-heading">
        <div>
          <span className="chapter-kicker">{frost ? "EISNEBEL · KARTE UNVOLLSTÄNDIG" : "NEBELPFAD · KARTE UNVOLLSTÄNDIG"}</span>
          <h1>{isWalking ? `Unterwegs: ${destination?.title}` : "Vor dir teilt sich der Weg"}</h1>
          <p>
            {isWalking
              ? `Die Gruppe läuft den gewählten Abschnitt. ${frost ? "Das Eis knackt unter jedem Schritt." : "Am Ziel beginnt die Begegnung."}`
              : `Nur eure Spuren und die nächste Abzweigung sind sichtbar. Alles Weitere verbirgt ${frost ? "der Eisnebel" : "der Nebel"}.`}
          </p>
        </div>
        <div className="path-key-hint">
          <span><kbd>↑</kbd><kbd>↓</kbd> Weg wählen</span>
          <span><kbd>→</kbd> Loslaufen</span>
        </div>
      </div>

      <div
        className="full-dungeon-map fog-exploration-map"
        role="application"
        aria-label="Nebelkarte mit gelaufenem Weg und aktueller Abzweigung"
      >
        <div className="dungeon-sky" aria-hidden="true"><i /><i /><i /></div>
        <div className="path-speed-lines" aria-hidden="true">
          {ATMOSPHERE_PARTICLES.slice(0, 8).map((index) => (
            <i key={index} style={{ "--particle-index": index } as React.CSSProperties} />
          ))}
        </div>
        <div className={`fog-local-route ${isWalking ? `walking-${chosenBranch === 0 ? "upper" : "lower"}` : ""}`}>
          <div className="traveled-road" aria-label="Bereits gelaufener Weg">
            <span className="traveled-line" />
            {visibleHistory.map((choice, historyIndex, recentHistory) => (
              <span
                className="traveled-room"
                style={{
                  "--history-position": `${12 + historyIndex * (40 / Math.max(1, recentHistory.length - 1))}%`,
                } as React.CSSProperties}
                key={choice.id}
              >
                <i><GameIcon name={choice.icon} /></i>
                <small>{choice.title}</small>
              </span>
            ))}
          </div>

          <span className="fog-junction"><i /></span>
          <span className="fog-branch fog-branch-upper" />
          <span className="fog-branch fog-branch-lower" />

          {run.choices.map((choice, branchIndex) => {
            const isSelected = isWalking ? branchIndex === chosenBranch : branchIndex === selectedBranch;
            return (
              <button
                className={`fog-route-choice fog-choice-${branchIndex === 0 ? "upper" : "lower"} ${isSelected ? "selected" : ""} ${isWalking && !isSelected ? "not-chosen" : ""} danger-${choice.danger.toLowerCase()}`}
                disabled={isWalking}
                key={`fog-${choice.id}`}
                onMouseEnter={() => {
                  if (!isWalking) setSelectedBranch(branchIndex);
                }}
                onFocus={() => {
                  if (!isWalking) setSelectedBranch(branchIndex);
                }}
                onClick={() => chooseBranch(branchIndex)}
              >
                <span><GameIcon name={choice.icon} /></span>
                <small>{branchIndex === 0 ? "OBERER PFAD" : "UNTERER PFAD"}</small>
                <strong>{choice.title}</strong>
                <em>{choice.subtitle}</em>
              </button>
            );
          })}

          <div className="fog-party" aria-label="Deine Gruppe an der Abzweigung">
            {progress.team.map((slot, index) => {
              const hero = getHero(slot.heroId);
              return hero ? (
                <span style={{ "--walker-index": index } as React.CSSProperties} key={`fog-${slot.heroId}`}>
                  <HeroPortrait hero={hero} size="small" />
                  <small>{hero.name}</small>
                </span>
              ) : null;
            })}
          </div>

          <div className="fog-bank fog-bank-top" aria-hidden="true"><i /><i /><i /></div>
          <div className="fog-bank fog-bank-forward" aria-hidden="true"><i /><i /><i /></div>
          <div className="fog-bank fog-bank-bottom" aria-hidden="true"><i /><i /><i /></div>
        </div>

        <div className="dungeon-route">
          {run.routePlan.map((branches, stageIndex) => {
            const completedChoice = run.pathHistory[stageIndex];
            const active = stageIndex === run.stage;
            return (
              <div
                className={`route-stage ${stageIndex < run.stage ? "completed" : ""} ${active ? "active" : ""}`}
                key={`stage-${stageIndex}`}
              >
                <span className="route-trunk route-trunk-in" />
                <span className="route-branch route-branch-upper" />
                <span className="route-branch route-branch-lower" />
                <span className="route-trunk route-trunk-out" />
                <span className="route-junction"><i /></span>
                {branches.map((choice, branchIndex) => {
                  const wasChosen = completedChoice?.id === choice.id;
                  const isSelected =
                    active &&
                    (isWalking ? branchIndex === chosenBranch : branchIndex === selectedBranch);
                  return (
                    <button
                      className={`route-room route-room-${branchIndex === 0 ? "upper" : "lower"} ${wasChosen ? "was-chosen" : ""} ${isSelected ? "selected" : ""} danger-${choice.danger.toLowerCase()}`}
                      disabled={!active || isWalking}
                      key={choice.id}
                      onMouseEnter={() => {
                        if (active && !isWalking) setSelectedBranch(branchIndex);
                      }}
                      onFocus={() => {
                        if (active && !isWalking) setSelectedBranch(branchIndex);
                      }}
                      onClick={() => chooseBranch(branchIndex)}
                      aria-label={`${branchIndex === 0 ? "Oberer" : "Unterer"} Weg: ${choice.title}, ${choice.subtitle}`}
                    >
                      <span className="route-room-icon"><GameIcon name={choice.icon} /></span>
                      <span className="route-room-copy">
                        <small>{branchIndex === 0 ? "OBERER WEG" : "UNTERER WEG"}</small>
                        <strong>{choice.title}</strong>
                        <em>{choice.subtitle}</em>
                      </span>
                    </button>
                  );
                })}
                <span className="route-rejoin"><i /></span>
              </div>
            );
          })}
          <div className="route-boss" aria-label="Boss am Ende des Weges">
            <span><GameIcon name="boss" /></span>
            <small>ENDZIEL</small>
            <strong>{dungeon?.boss ?? "Unbekannter Boss"}</strong>
          </div>
        </div>

        <div
          className={`map-party ${isWalking ? `walking-to-${chosenBranch === 0 ? "upper" : "lower"}` : ""}`}
          style={{ "--party-x": `${4 + run.stage * 18.4}%` } as React.CSSProperties}
          aria-label="Deine Gruppe auf dem Dungeonpfad"
        >
          {progress.team.map((slot, index) => {
            const hero = getHero(slot.heroId);
            return hero ? (
              <span style={{ "--walker-index": index } as React.CSSProperties} key={slot.heroId}>
                <HeroPortrait hero={hero} size="small" />
                <small>{hero.name}</small>
              </span>
            ) : null;
          })}
        </div>
      </div>

      <div className="path-action-bar">
        <div className="path-touch-controls">
          <button
            className={selectedBranch === 0 ? "active" : ""}
            disabled={isWalking}
            onClick={() => setSelectedBranch(0)}
            aria-label="Oberen Weg markieren"
          >↑</button>
          <button
            className={selectedBranch === 1 ? "active" : ""}
            disabled={isWalking}
            onClick={() => setSelectedBranch(1)}
            aria-label="Unteren Weg markieren"
          >↓</button>
        </div>
        <div className="path-current-destination">
          <span>{isWalking ? "UNTERWEGS" : selectedBranch === 0 ? "OBERER WEG" : "UNTERER WEG"}</span>
          <strong>{destination?.title ?? "Pfad"}</strong>
          <small>{destination?.danger} · {destination?.reward}</small>
        </div>
        {isWalking ? (
          <button className="path-go-button walking" onClick={actions.arriveAtRoom}>
            <span className="walking-dots"><i /><i /><i /></span>
            SCHNELLER ANKOMMEN
          </button>
        ) : (
          <button className="path-go-button" onClick={() => chooseBranch(selectedBranch)}>
            DIESEN WEG GEHEN <span>→</span>
          </button>
        )}
      </div>

      <div className="current-build-strip">
        <span>AKTUELLER BUILD</span>
        {run.buffs.length ? run.buffs.map((buff) => (
          <div key={buff.id} title={buff.description}><GameIcon name={buff.icon} /><b>{buff.name}</b></div>
        )) : <small>Noch keine Run-Power-ups</small>}
      </div>
    </section>
  );
}

function EventView({ run, actions }: { run: DungeonRun; actions: RunActions }) {
  const event = run.event;
  if (!event) return null;
  return (
    <section className="event-view">
      <div className={`event-art event-art-${event.artwork}`}>
        <span className="event-glow" />
        <span className="event-object" />
        <span className="event-ground" />
      </div>
      <article className="event-story">
        <span className="chapter-kicker">ZUFALLSEREIGNIS</span>
        <h1>{event.title}</h1>
        <p>{event.story}</p>
        <div className="event-choice-list">
          {event.choices.map((choice) => {
            const insufficientGold =
              (choice.id === "repair" && run.earnedGold < 80) ||
              (choice.id === "pay" && run.earnedGold < 120) ||
              (choice.id === "thaw" && run.earnedGold < 90) ||
              (choice.id === "melt-mirror" && run.earnedGold < 140);
            return (
              <button disabled={insufficientGold} onClick={() => actions.resolveEvent(choice.id)} key={choice.id}>
                <span><b>{choice.label}</b><small>{choice.consequence}</small></span>
                <strong>{insufficientGold ? "ZU WENIG RUN-GOLD" : "→"}</strong>
              </button>
            );
          })}
        </div>
      </article>
    </section>
  );
}

function PowerupView({ run, actions }: { run: DungeonRun; actions: RunActions }) {
  const frost = run.dungeonId === "frostglass-cavern";
  return (
    <section className="powerup-view">
      <div className="powerup-heading">
        <span className="chapter-kicker">{frost ? "KRISTALLSEGEN" : "WALDSEGEN"} {run.buffs.length + 1} / 3</span>
        <h1>Wähle eine Kraft</h1>
        <p>Sie gilt nur für diesen Run und kann deinen Build grundlegend verändern.</p>
      </div>
      <div className="powerup-grid">
        {run.buffChoices.map((buff) => (
          <button key={buff.id} onClick={() => actions.chooseBuff(buff)}>
            <span className="powerup-icon"><GameIcon name={buff.icon} /></span>
            <small>RUN-POWER-UP</small>
            <h2>{buff.name}</h2>
            <p>{buff.description}</p>
            <b>AUSWÄHLEN</b>
          </button>
        ))}
      </div>
    </section>
  );
}

function BossIntro({ run, actions }: { run: DungeonRun; actions: RunActions }) {
  const frost = run.dungeonId === "frostglass-cavern";
  return (
    <section className="boss-intro">
      <div className="boss-intro-art">
        <span className="boss-tree-crown" />
        <span className="boss-silhouette" />
        <span className="boss-eye eye-a" />
        <span className="boss-eye eye-b" />
        <span className="boss-fog" />
      </div>
      <div className="boss-intro-copy">
        <span className="chapter-kicker">{frost ? "BOSS DER FROSTGLAS-HÖHLEN" : "BOSS DES FLÜSTERWALDS"}</span>
        <h1>{frost ? "KÖNIGIN SKADI" : "WALDHÜTER NOX"}</h1>
        <p>{frost
          ? "„Wärme ist nur eine Erinnerung. Legt sie vor meinem Thron ab.“"
          : "„Ihr habt meine Pfade betreten. Nun zeigt, ob ihr auch ihre Last tragen könnt.“"}</p>
        <div><span>VORBEREITUNG</span><strong>Fähigkeiten, Schutzraum und alle Run-Buffs bleiben erhalten.</strong></div>
        <button onClick={actions.startBoss}>{frost ? "DEN FROSTTHRON BETRETEN" : "DEN HERZBAUM BETRETEN"}</button>
      </div>
    </section>
  );
}

function EnemyFigure({
  enemy,
  selected,
  effects,
  onSelect,
}: {
  enemy: NonNullable<DungeonRun["combat"]>["enemies"][number];
  selected: boolean;
  effects: NonNullable<DungeonRun["combat"]>["effects"];
  onSelect: () => void;
}) {
  const enemyEffects = effects.filter((effect) => effect.targetId === enemy.id);
  const attackEffect = effects.find((effect) => effect.sourceId === enemy.id);
  const impactEffect = enemyEffects.find(
    (effect) => effect.kind === "damage" || effect.kind === "ability",
  );
  return (
    <button
      className={`enemy-figure enemy-${enemy.kind} ${attackEffect ? "is-attacking" : ""} ${impactEffect ? "is-hit" : ""} ${selected ? "selected" : ""} ${enemy.hp <= 0 ? "defeated" : ""}`}
      onClick={onSelect}
      disabled={enemy.hp <= 0}
      aria-label={`${enemy.name} als Ziel auswählen`}
    >
      <span className="enemy-shadow" />
      <span className="enemy-body" />
      <span className="enemy-head" />
      <span className="enemy-ear ear-a" />
      <span className="enemy-ear ear-b" />
      <span className="enemy-eye eye-a" />
      <span className="enemy-eye eye-b" />
      <span className="enemy-weapon" />
      {attackEffect && <span className="enemy-attack-claw" key={attackEffect.id}><i /><i /><i /></span>}
      {impactEffect && <span className="combat-impact-ring" key={`impact-${impactEffect.id}`} />}
      <strong>{enemy.name}</strong>
      <div className="battle-bar enemy-bar"><i style={{ width: `${(enemy.hp / enemy.maxHp) * 100}%` }} /></div>
      <small>{Math.ceil(enemy.hp)} / {enemy.maxHp}</small>
      {enemyEffects.map((effect) => <b className={`combat-float float-${effect.kind}`} key={effect.id}>{effect.text}</b>)}
    </button>
  );
}

function BattleHeroFigure({
  heroId,
  hp,
  maxHp,
  position,
  shield,
  effects,
  sheltered,
}: {
  heroId: string;
  hp: number;
  maxHp: number;
  position: string;
  shield: number;
  effects: NonNullable<DungeonRun["combat"]>["effects"];
  sheltered: boolean;
}) {
  const definition = getHero(heroId);
  if (!definition) return null;
  const heroEffects = effects.filter((effect) => effect.targetId === heroId);
  const impactEffect = heroEffects.find(
    (effect) => effect.kind === "damage" || effect.kind === "ability",
  );
  const healEffect = heroEffects.find((effect) => effect.kind === "heal");
  const shieldEffect = heroEffects.find((effect) => effect.kind === "shield");
  const attackEffect = effects.find(
    (effect) =>
      effect.sourceId === heroId &&
      effect.targetId !== heroId &&
      (effect.kind === "damage" || effect.kind === "ability"),
  );
  const attackStyle =
    definition.role === "Nahkampf-DPS" || definition.role === "Tank"
      ? "sword"
      : definition.portrait === "archer"
        ? "arrow"
        : "fireball";
  return (
    <div className={`battle-hero-figure battle-position-${position.toLowerCase()} ${attackEffect ? `is-attacking attack-${attackStyle}` : ""} ${impactEffect ? "is-hit" : ""} ${healEffect ? "is-healed" : ""} ${shieldEffect ? "is-shielded" : ""} ${hp <= 0 ? "defeated" : ""} ${sheltered ? "sheltered" : ""}`}>
      <HeroPortrait hero={definition} size="medium" muted={hp <= 0} />
      <span className={`held-weapon held-weapon-${attackStyle}`} aria-hidden="true" />
      {attackEffect && (
        <span className={`hero-attack-projectile projectile-${attackStyle}`} key={attackEffect.id} aria-hidden="true">
          <i /><b />
        </span>
      )}
      {impactEffect && <span className="combat-impact-ring" key={`impact-${impactEffect.id}`} />}
      {healEffect && <span className="combat-heal-burst" key={`heal-${healEffect.id}`}><i /><i /><i /></span>}
      {shieldEffect && <span className="combat-shield-burst" key={`shield-${shieldEffect.id}`} />}
      <strong>{definition.name}</strong>
      <div className="battle-bar"><i style={{ width: `${Math.max(0, (hp / maxHp) * 100)}%` }} /></div>
      {shield > 0 && <span className="figure-shield">{Math.ceil(shield)}</span>}
      {heroEffects.map((effect) => <b className={`combat-float float-${effect.kind}`} key={effect.id}>{effect.text}</b>)}
    </div>
  );
}

function CombatView({
  run,
  actions,
}: {
  run: DungeonRun;
  actions: RunActions;
}) {
  const combat = run.combat;
  const [draggedHero, setDraggedHero] = useState<string | null>(null);
  if (!combat) return null;
  const sheltered = combat.heroes.find((hero) => hero.heroId === combat.shelterHeroId);
  const boss = combat.enemies.find((enemy) => enemy.boss);
  const livingEnemies = combat.enemies.filter((enemy) => enemy.hp > 0).length;
  const lowHealth = combat.heroes.some((hero) => hero.hp > 0 && hero.hp / hero.maxHp < 0.28);
  const frost = run.dungeonId === "frostglass-cavern";
  const frostSeconds = Math.max(0, Math.ceil((combat.environmentNextAt - combat.lastTick) / 1000));

  return (
    <section className={`combat-view ${combat.paused ? "paused" : ""} ${lowHealth ? "low-health-warning" : ""}`}>
      {boss && (
        <div className="boss-health-banner">
          <span>BOSS · {livingEnemies} GEGNER VERBLEIBEND</span>
          <strong>{boss.name}</strong>
          <div><i style={{ width: `${(boss.hp / boss.maxHp) * 100}%` }} /></div>
          <small>{Math.ceil(boss.hp)} / {boss.maxHp}</small>
        </div>
      )}
      {!boss && <div className="enemy-counter">{livingEnemies} GEGNER VERBLEIBEND</div>}
      {frost && (
        <div className="frost-wave-indicator" aria-live="polite">
          <GameIcon name="snow" />
          <span>
            <b>{combat.environmentPulse > 0 && (combat.environmentPulse + 1) % 3 === 0 ? "TIEFFROST NAHT" : "NÄCHSTE FROSTWELLE"}</b>
            <small>{frostSeconds}s · Schutzraum bewahrt 1 Helden</small>
          </span>
        </div>
      )}

      <div className="battle-stage">
        <span className="battle-canopy canopy-left" />
        <span className="battle-canopy canopy-right" />
        <span className="battle-ground" />
        <div className={`battle-weather ${frost ? "battle-snow" : "battle-fireflies"}`} aria-hidden="true">
          {ATMOSPHERE_PARTICLES.map((index) => (
            <i key={index} style={{ "--particle-index": index } as React.CSSProperties} />
          ))}
        </div>
        <div className="hero-formation" aria-label="Dein Team">
          {combat.heroes.map((hero) => (
            <BattleHeroFigure
              key={hero.heroId}
              {...hero}
              sheltered={combat.shelterHeroId === hero.heroId}
              effects={combat.effects}
            />
          ))}
        </div>
        <span className="battle-direction" aria-hidden="true">→</span>
        <div className="enemy-formation" aria-label="Gegner">
          {combat.enemies.map((enemy) => (
            <EnemyFigure
              enemy={enemy}
              effects={combat.effects}
              key={enemy.id}
              selected={combat.selectedEnemyId === enemy.id}
              onSelect={() => actions.selectEnemy(enemy.id)}
            />
          ))}
        </div>
        {combat.paused && <div className="pause-banner"><GameIcon name="pause" /><strong>PAUSIERT</strong><small>Plane Fähigkeiten, Ziele und Positionen.</small></div>}
      </div>

      <div className="battle-interface">
        <div className="hero-command-deck">
          {combat.heroes.map((hero) => {
            const definition = getHero(hero.heroId);
            if (!definition) return null;
            const inShelter = combat.shelterHeroId === hero.heroId;
            return (
              <article
                className={`command-card ${hero.hp <= 0 ? "defeated" : ""} ${inShelter ? "in-shelter" : ""}`}
                key={hero.heroId}
                draggable={hero.hp > 0 && !inShelter}
                onDragStart={() => setDraggedHero(hero.heroId)}
                onDragEnd={() => setDraggedHero(null)}
                style={{ "--hero-accent": definition.palette } as React.CSSProperties}
              >
                <div className="command-hero">
                  <HeroPortrait hero={definition} size="small" muted={hero.hp <= 0} />
                  <div><strong>{definition.name}</strong><span>{definition.role} · {hero.position}</span></div>
                  <button onClick={() => actions.changePosition(hero.heroId)} disabled={hero.hp <= 0}>↻</button>
                </div>
                <div className="command-vitals">
                  <span>LP {Math.ceil(hero.hp)}/{hero.maxHp}</span>
                  <div className="battle-bar"><i style={{ width: `${Math.max(0, (hero.hp / hero.maxHp) * 100)}%` }} /></div>
                  <span>ENERGIE {Math.floor(hero.energy)}%</span>
                  <div className="energy-bar"><i style={{ width: `${hero.energy}%` }} /></div>
                </div>
                <button
                  className="ability-button"
                  disabled={hero.energy < 100 || hero.hp <= 0 || inShelter || Boolean(combat.outcome)}
                  onClick={() => actions.useAbility(hero.heroId)}
                >
                  <GameIcon name={definition.role === "Heiler" ? "heal" : definition.role === "Tank" ? "shield" : "burst"} />
                  <span><b>{definition.activeName}</b><small>{hero.energy >= 100 ? "BEREIT" : `${Math.floor(hero.energy)} / 100`}</small></span>
                </button>
                <button
                  className="shelter-shortcut"
                  disabled={Boolean(combat.shelterHeroId) || hero.hp <= 0 || inShelter || hero.shelterCooldownUntil > combat.lastTick}
                  onClick={() => actions.shelterHero(hero.heroId)}
                >
                  {inShelter ? "IM SCHUTZRAUM" : "IN SCHUTZRAUM"}
                </button>
              </article>
            );
          })}
        </div>

        <aside
          className={`combat-sanctuary ${draggedHero ? "drag-ready" : ""}`}
          onDragOver={(event) => event.preventDefault()}
          onDrop={() => {
            if (draggedHero) actions.shelterHero(draggedHero);
            setDraggedHero(null);
          }}
        >
          <div className="sanctuary-title"><GameIcon name="shield" /><span><b>SCHUTZRAUM</b><small>1 PLATZ · LANGSAME REGENERATION</small></span></div>
          <div className={`sanctuary-slot ${sheltered ? "occupied" : ""}`}>
            {sheltered ? (() => {
              const definition = getHero(sheltered.heroId);
              return definition ? (
                <>
                  <HeroPortrait hero={definition} size="medium" />
                  <strong>{definition.name}</strong>
                  <div className="battle-bar"><i style={{ width: `${(sheltered.hp / sheltered.maxHp) * 100}%` }} /></div>
                  <small>{Math.ceil(sheltered.hp)} / {sheltered.maxHp} LP · max. 78 % passiv</small>
                </>
              ) : null;
            })() : (
              <>
                <span className="slot-pulse"><GameIcon name="shield" /></span>
                <strong>PLATZ FREI</strong>
                <small>Held hierher ziehen oder unten antippen</small>
              </>
            )}
          </div>
          <div className="sanctuary-items">
            <button disabled={!sheltered || combat.healItems <= 0} onClick={() => actions.useItem("heal")}>
              <GameIcon name="heal" /><span><b>HEILRATION</b><small>+28 % LP · {combat.healItems} übrig</small></span>
            </button>
            <button disabled={!sheltered || combat.powerTonics <= 0} onClick={() => actions.useItem("power")}>
              <GameIcon name="power" /><span><b>{frost ? "FROSTESSENZ" : "WALDKRAFT"}</b><small>+35 % Angriff · {combat.powerTonics} übrig</small></span>
            </button>
          </div>
          <button className="return-from-shelter" disabled={!sheltered || combat.switchReadyAt > combat.lastTick} onClick={actions.returnShelteredHero}>
            ZURÜCK INS FELD →
          </button>
          <div className="run-buff-list">
            <span>AKTIVE RUN-BUFFS</span>
            {run.buffs.map((buff) => <div key={buff.id} title={buff.description}><GameIcon name={buff.icon} /><b>{buff.name}</b></div>)}
          </div>
        </aside>
      </div>

      {combat.outcome && (
        <div className={`combat-result-banner result-${combat.outcome}`}>
          {combat.outcome === "victory" && (
            <div className="combat-victory-sparks" aria-hidden="true">
              {ATMOSPHERE_PARTICLES.slice(0, 8).map((index) => <i key={index} />)}
            </div>
          )}
          <div>
            <span>{combat.outcome === "victory" ? "RAUM GESICHERT" : "TEAM BESIEGT"}</span>
            <h2>{combat.outcome === "victory" ? "Der Weg ist frei!" : frost ? "Der Frost war stärker." : "Der Wald war stärker."}</h2>
            <p>{combat.outcome === "victory" ? `${combat.damageDone} Schaden verursacht.` : "Du kannst mit einem Teil des Goldes zurückkehren."}</p>
            <button onClick={actions.continueAfterCombat}>{combat.outcome === "victory" ? "WEITER ZUM PFAD" : "RUN BEENDEN"}</button>
          </div>
        </div>
      )}
    </section>
  );
}

function RewardView({ run, onClaim }: { run: DungeonRun; onClaim: (rewards: RunRewards) => void }) {
  const frost = run.dungeonId === "frostglass-cavern";
  const rewards = useMemo<RunRewards>(() => ({
    dungeonId: run.dungeonId,
    gold: run.earnedGold,
    keys: run.earnedKeys,
    crystals: frost ? 28 : 18,
    bossKeys: 1,
    xp: run.earnedXp,
  }), [frost, run.dungeonId, run.earnedGold, run.earnedKeys, run.earnedXp]);

  return (
    <section className="run-reward-view">
      <div className="reward-celebration" aria-hidden="true">
        {ATMOSPHERE_PARTICLES.map((index) => (
          <i key={index} style={{ "--particle-index": index } as React.CSSProperties} />
        ))}
      </div>
      <div className="victory-emblem"><span>{frost ? "S" : "N"}</span><i /><b>✦</b></div>
      <span className="chapter-kicker">{frost ? "FROSTGLAS-HÖHLEN ABGESCHLOSSEN" : "FLÜSTERWALD ABGESCHLOSSEN"}</span>
      <h1>{frost ? "Der Frostthron zerbricht" : "Der Wald atmet wieder"}</h1>
      <p>{frost
        ? "Skadi überlässt euch die Krone aus Tauglas. In der Ferne glüht bereits der nächste Berg."
        : "Nox erkennt eure Stärke an und überlässt euch das Siegel des Herzbaums."}</p>
      <div className="reward-summary-grid">
        <div><GameIcon name="gold" /><strong>{rewards.gold}</strong><span>Gold</span></div>
        <div><GameIcon name="key" /><strong>{rewards.keys}</strong><span>Schlüssel</span></div>
        <div><GameIcon name="crystal" /><strong>{rewards.crystals}</strong><span>Kristalle</span></div>
        <div className="boss-reward"><GameIcon name="box" /><strong>1</strong><span>Bossbox</span></div>
      </div>
      <div className="xp-reward-line"><span>TEAM-ERFAHRUNG</span><strong>+{rewards.xp} XP für jeden Helden</strong></div>
      <div className="unlocked-preview">
        <GameIcon name={frost ? "power" : "snow"} />
        <span>
          <b>NEUER DUNGEON FREIGESCHALTET</b>
          <small>{frost ? "Glutgipfel · für eine kommende Beta" : "Frostglas-Höhlen · jetzt spielbar"}</small>
        </span>
      </div>
      <button onClick={() => onClaim(rewards)}>BELOHNUNGEN NEHMEN & ZUR LOBBY</button>
    </section>
  );
}

function DefeatView({ run, onRetreat }: { run: DungeonRun; onRetreat: () => void }) {
  const frost = run.dungeonId === "frostglass-cavern";
  return (
    <section className="defeat-view">
      <span className="defeat-mark">×</span>
      <span className="chapter-kicker">RUN BEENDET</span>
      <h1>{frost ? "Die Wärme erlischt" : "Der Pfad endet hier"}</h1>
      <p>{frost
        ? "Die Gruppe kehrt aus dem Eisnebel zurück. Beim nächsten Versuch kennt sie den Rhythmus der Frostwellen."
        : "Die nächste Gruppe wird aus deinen Entscheidungen lernen. Ein Teil des Goldes bleibt erhalten."}</p>
      <div><span>Gesichert</span><strong>{Math.floor(run.earnedGold * 0.4)} Gold</strong></div>
      <button onClick={onRetreat}>ZURÜCK ZUM LUMENHAIN</button>
    </section>
  );
}

export function DungeonRunView({
  run,
  progress,
  actions,
  onRetreat,
  onClaimRewards,
}: {
  run: DungeonRun;
  progress: PlayerProgress;
  actions: RunActions;
  onRetreat: () => void;
  onClaimRewards: (rewards: RunRewards) => void;
}) {
  const theme = getDungeon(run.dungeonId)?.theme ?? "forest";
  return (
    <main className={`dungeon-run-screen dungeon-theme-${theme} phase-${run.phase}`}>
      <DungeonAtmosphere theme={theme} />
      <RunTopbar run={run} onRetreat={onRetreat} actions={actions} />
      {(run.phase === "path" || run.phase === "travel") && (
        <ContinuousDungeonPath run={run} progress={progress} actions={actions} />
      )}
      {run.phase === "event" && <EventView run={run} actions={actions} />}
      {run.phase === "powerup" && <PowerupView run={run} actions={actions} />}
      {run.phase === "bossIntro" && <BossIntro run={run} actions={actions} />}
      {run.phase === "combat" && <CombatView run={run} actions={actions} />}
      {run.phase === "reward" && <RewardView run={run} onClaim={onClaimRewards} />}
      {run.phase === "defeat" && <DefeatView run={run} onRetreat={onRetreat} />}
    </main>
  );
}
