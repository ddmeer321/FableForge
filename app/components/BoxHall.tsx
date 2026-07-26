"use client";

import { useEffect, useState } from "react";
import { BOXES, COSMETICS, CURRENCY_LABELS, getGear, getHero } from "../game/data";
import type { BoxDefinition, LootResult, PlayerProgress, Rarity } from "../game/types";
import { GameIcon, HeroPortrait, RarityBadge } from "./shared";

function resultName(result: LootResult) {
  if (result.kind === "hero") return getHero(result.definitionId)?.name ?? result.definitionId;
  if (result.kind === "gear") return getGear(result.definitionId)?.name ?? result.definitionId;
  return COSMETICS.find((entry) => entry.id === result.definitionId)?.name ?? result.definitionId;
}

function contentName(definitionId: string) {
  return (
    getHero(definitionId)?.name ??
    getGear(definitionId)?.name ??
    COSMETICS.find((entry) => entry.id === definitionId)?.name ??
    definitionId
  );
}

export function BoxOpening({
  box,
  result,
  onClose,
  onReveal,
}: {
  box: BoxDefinition;
  result: LootResult;
  onClose: () => void;
  onReveal?: () => void;
}) {
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setRevealed(true);
      onReveal?.();
    }, 1250);
    return () => window.clearTimeout(timer);
  }, [onReveal]);

  const revealNow = () => {
    if (!revealed) {
      setRevealed(true);
      onReveal?.();
    }
  };

  const hero = result.kind === "hero" ? getHero(result.definitionId) : null;
  const gear = result.kind === "gear" ? getGear(result.definitionId) : null;
  const rareScore = ["Epic", "Legendary", "Mythic", "Secret"].includes(result.rarity);

  return (
    <div className={`modal-backdrop opening-backdrop rarity-scene-${result.rarity.toLowerCase()} ${revealed ? "is-revealed" : ""}`}>
      <section className="box-opening-modal" role="dialog" aria-modal="true" aria-label="Box wird geöffnet">
        {!revealed ? (
          <>
            <div className="opening-runes"><i /><i /><i /><i /><i /><i /></div>
            <div className="animated-chest" style={{ "--box-accent": box.accent } as React.CSSProperties}>
              <span className="chest-glow" />
              <span className="opening-lid" />
              <span className="opening-body" />
              <span className="opening-lock" />
            </div>
            <p>{box.name} wird geöffnet …</p>
            <button className="skip-button" onClick={revealNow}>ANIMATION ÜBERSPRINGEN</button>
          </>
        ) : (
          <div className={`loot-reveal ${rareScore ? "rare-impact" : ""}`}>
            <div className="reveal-rays" />
            <RarityBadge rarity={result.rarity} />
            {hero && <HeroPortrait hero={hero} size="large" />}
            {gear && (
              <div className={`large-gear-icon gear-${gear.icon}`}>
                <GameIcon name={gear.icon} />
              </div>
            )}
            {result.kind === "cosmetic" && (
              <div className="large-cosmetic-icon"><span>✦</span></div>
            )}
            <span className="loot-kind">
              {result.kind === "hero" ? "NEUER HELD" : result.kind === "gear" ? gear?.slot : "KOSMETIK"}
            </span>
            <h2>{resultName(result)}</h2>
            {hero && <p>{hero.epithet} · {hero.role}</p>}
            {gear && <p>{gear.perk}</p>}
            {result.duplicate ? (
              <div className="duplicate-note">
                Duplikat umgewandelt · {result.fragments ?? 8} {result.kind === "hero" ? "Heldenfragmente" : "Kristalle"}
              </div>
            ) : (
              <div className="inventory-note">Direkt im Inventar gespeichert</div>
            )}
            <button className="modal-primary" onClick={onClose}>WEITER</button>
          </div>
        )}
      </section>
    </div>
  );
}

function chanceEntries(box: BoxDefinition) {
  return Object.entries(box.chances) as [Rarity, number][];
}

export function BoxHall({
  progress,
  canAfford,
  onOpen,
}: {
  progress: PlayerProgress;
  canAfford: (boxId: string) => boolean;
  onOpen: (box: BoxDefinition) => void;
}) {
  const [selectedId, setSelectedId] = useState(BOXES[0].id);
  const selected = BOXES.find((box) => box.id === selectedId) ?? BOXES[0];
  const pity = progress.pity[selected.id] ?? 0;

  return (
    <main className="page-screen box-hall-screen">
      <header className="page-title">
        <div>
          <span className="chapter-kicker">DIE SCHATZKAMMER</span>
          <h1>Boxenhalle</h1>
          <p>Jede Box hat ihren eigenen Inhalt. Öffne gezielt, was dein Abenteuer braucht.</p>
        </div>
        <div className="pity-explainer">
          <GameIcon name="crystal" />
          <span><b>Pity bleibt erhalten</b><small>Ein seltener Fund setzt ihn zurück.</small></span>
        </div>
      </header>

      <section className="box-showcase">
        <div className="box-list" role="tablist" aria-label="Boxen auswählen">
          {BOXES.map((box) => {
            const affordable = canAfford(box.id);
            return (
              <button
                role="tab"
                aria-selected={selected.id === box.id}
                className={`box-tab ${selected.id === box.id ? "active" : ""}`}
                key={box.id}
                onClick={() => setSelectedId(box.id)}
                style={{ "--box-accent": box.accent } as React.CSSProperties}
              >
                <span className="mini-box"><i /><b /></span>
                <span><strong>{box.name}</strong><small>{box.subtitle}</small></span>
                <i className={affordable ? "availability-dot" : "availability-dot empty"} />
              </button>
            );
          })}
        </div>

        <article className="selected-box" style={{ "--box-accent": selected.accent } as React.CSSProperties}>
          <div className="box-stage">
            <span className="stage-orbit orbit-one" />
            <span className="stage-orbit orbit-two" />
            <div className="display-chest">
              <span className="display-chest-lid" />
              <span className="display-chest-body" />
              <span className="display-chest-lock" />
            </div>
            <span className="box-availability">{selected.availability}</span>
          </div>
          <div className="box-detail">
            <span className="chapter-kicker">{selected.kind.toUpperCase()}-KOLLEKTION</span>
            <h2>{selected.name}</h2>
            <p>{selected.subtitle}</p>

            <div className="possible-contents">
              <span>MÖGLICHE INHALTE</span>
              <div>
                {selected.contents.map((definitionId) => (
                  <small key={definitionId}>{contentName(definitionId)}</small>
                ))}
              </div>
            </div>

            <div className="chance-list">
              <span>MÖGLICHE SELTENHEITEN</span>
              {chanceEntries(selected).map(([rarity, chance]) => (
                <div key={rarity}>
                  <RarityBadge rarity={rarity} />
                  <i><b style={{ width: `${Math.max(4, chance)}%` }} /></i>
                  <strong>{chance}%</strong>
                </div>
              ))}
            </div>

            <div className="pity-meter">
              <div><span>PITY-FORTSCHRITT</span><strong>{pity} / {selected.pityMax}</strong></div>
              <div className="pity-track"><i style={{ width: `${(pity / selected.pityMax) * 100}%` }} /></div>
              <small>Spätestens dann ist Rare oder besser garantiert.</small>
            </div>

            <div className="box-cost-row">
              <div>
                <span>KOSTEN</span>
                <strong><GameIcon name={selected.currency === "gold" ? "gold" : selected.currency === "crystals" ? "crystal" : "key"} /> {selected.cost} {CURRENCY_LABELS[selected.currency]}</strong>
              </div>
              <button disabled={!canAfford(selected.id)} onClick={() => onOpen(selected)}>
                {canAfford(selected.id) ? "BOX ÖFFNEN" : "NICHT GENUG WÄHRUNG"}
              </button>
            </div>
          </div>
        </article>
      </section>
    </main>
  );
}
