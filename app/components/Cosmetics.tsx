"use client";

import { useMemo, useState } from "react";
import { COSMETICS, getCosmetic, getHero } from "../game/data";
import type { CosmeticKind, PlayerProgress } from "../game/types";
import type { PlayerProgressController } from "../game/use-player-progress";
import { GameIcon, HeroPortrait, RarityBadge } from "./shared";

type CosmeticActions = Pick<PlayerProgressController, "equipCosmetic" | "unequipCosmetic">;

const CATEGORY_COPY: Record<CosmeticKind, { label: string; title: string; icon: string }> = {
  skin: { label: "Skins", title: "Gewänder für einzelne Helden", icon: "hero" },
  aura: { label: "Auren", title: "Magie um dein gesamtes Team", icon: "sparkle" },
  trail: { label: "Spuren", title: "Effekte auf jedem Dungeonpfad", icon: "route" },
};

export function CosmeticsWardrobe({
  progress,
  actions,
  onOpenBoxes,
}: {
  progress: PlayerProgress;
  actions: CosmeticActions;
  onOpenBoxes: () => void;
}) {
  const [category, setCategory] = useState<CosmeticKind>("skin");
  const firstHeroId = progress.team[0]?.heroId ?? progress.heroes[0]?.id ?? "";
  const [selectedHeroId, setSelectedHeroId] = useState(firstHeroId);
  const selectedHero =
    getHero(selectedHeroId) ?? getHero(firstHeroId) ?? getHero(progress.heroes[0]?.id ?? "");
  const activeAura = getCosmetic(progress.equippedCosmetics.aura);
  const activeTrail = getCosmetic(progress.equippedCosmetics.trail);
  const visibleCosmetics = useMemo(
    () => COSMETICS.filter((cosmetic) => cosmetic.kind === category),
    [category],
  );
  const activeId =
    category === "skin"
      ? progress.equippedCosmetics.skins[selectedHero?.id ?? ""]
      : progress.equippedCosmetics[category];

  const effectStyle = {
    "--cosmetic-aura": activeAura?.colors[0] ?? "#91dcb2",
    "--cosmetic-aura-soft": activeAura?.colors[1] ?? "#efffd2",
    "--cosmetic-trail": activeTrail?.colors[0] ?? "#f3cf67",
    "--cosmetic-trail-soft": activeTrail?.colors[1] ?? "#fff4b5",
  } as React.CSSProperties;

  return (
    <main className="page-screen cosmetics-screen">
      <section className="cosmetics-heading">
        <div>
          <span className="chapter-kicker">DAS ATELIER VON LUMENHAIN</span>
          <h1>Kosmetik</h1>
          <p>Verwandle deine Gefährten mit Skins, Team-Auren und sichtbaren Spuren – ohne spielerischen Vorteil.</p>
        </div>
        <div className="cosmetic-count">
          <GameIcon name="sparkle" />
          <span><b>{progress.cosmetics.length}</b><small>VON {COSMETICS.length} GEFUNDEN</small></span>
        </div>
      </section>

      <section className="cosmetic-preview-stage" style={effectStyle}>
        <div className={`wardrobe-party ${activeAura ? "has-aura" : ""} ${activeTrail ? "has-trail" : ""}`}>
          <span className="wardrobe-aura" aria-hidden="true"><i /><i /></span>
          <span className="wardrobe-trail" aria-hidden="true">
            {[0, 1, 2, 3, 4, 5].map((particle) => <i key={particle} />)}
          </span>
          <div className="wardrobe-heroes">
            {progress.team.slice(0, 4).map((slot) => {
              const hero = getHero(slot.heroId);
              return hero ? (
                <div key={hero.id}>
                  <HeroPortrait
                    hero={hero}
                    size="large"
                    skinId={progress.equippedCosmetics.skins[hero.id]}
                  />
                  <strong>{hero.name}</strong>
                </div>
              ) : null;
            })}
            {!progress.team.length && <p>Stelle zuerst ein Team zusammen, um die Gruppenvorschau zu sehen.</p>}
          </div>
        </div>
        <div className="equipped-cosmetic-summary">
          <span><GameIcon name="sparkle" /><small>AURA</small><b>{activeAura?.name ?? "Keine"}</b></span>
          <span><GameIcon name="route" /><small>SPUR</small><b>{activeTrail?.name ?? "Keine"}</b></span>
        </div>
      </section>

      <nav className="cosmetic-tabs" aria-label="Kosmetik-Kategorien">
        {(Object.keys(CATEGORY_COPY) as CosmeticKind[]).map((kind) => (
          <button
            className={category === kind ? "active" : ""}
            aria-pressed={category === kind}
            key={kind}
            onClick={() => setCategory(kind)}
          >
            <GameIcon name={CATEGORY_COPY[kind].icon} />
            <span><b>{CATEGORY_COPY[kind].label}</b><small>{COSMETICS.filter((item) => item.kind === kind).length} Designs</small></span>
          </button>
        ))}
      </nav>

      <section className="cosmetic-collection">
        <header>
          <div>
            <span className="chapter-kicker">{CATEGORY_COPY[category].label.toUpperCase()}</span>
            <h2>{CATEGORY_COPY[category].title}</h2>
          </div>
          {category === "skin" && (
            <div className="cosmetic-hero-picker" aria-label="Held für den Skin">
              {progress.heroes.map((owned) => {
                const hero = getHero(owned.id);
                return hero ? (
                  <button
                    className={selectedHero?.id === hero.id ? "active" : ""}
                    aria-pressed={selectedHero?.id === hero.id}
                    key={hero.id}
                    onClick={() => setSelectedHeroId(hero.id)}
                  >
                    <HeroPortrait
                      hero={hero}
                      size="small"
                      skinId={progress.equippedCosmetics.skins[hero.id]}
                    />
                    <span>{hero.name}</span>
                  </button>
                ) : null;
              })}
            </div>
          )}
          {activeId && (
            <button
              className="unequip-cosmetic"
              onClick={() => actions.unequipCosmetic(category, category === "skin" ? selectedHero?.id : undefined)}
            >
              AKTIVEN LOOK ABLEGEN
            </button>
          )}
        </header>

        <div className="cosmetic-grid">
          {visibleCosmetics.map((cosmetic) => {
            const owned = progress.cosmetics.includes(cosmetic.id);
            const active = activeId === cosmetic.id;
            return (
              <article
                className={`cosmetic-card rarity-frame-${cosmetic.rarity.toLowerCase()} ${owned ? "owned" : "locked"} ${active ? "active" : ""}`}
                key={cosmetic.id}
                style={{
                  "--cosmetic-primary": cosmetic.colors[0],
                  "--cosmetic-secondary": cosmetic.colors[1],
                } as React.CSSProperties}
              >
                <div className={`cosmetic-art cosmetic-art-${cosmetic.kind}`} aria-hidden="true">
                  <span className="cosmetic-art-core" />
                  <i /><i /><i /><i />
                  {!owned && <b>?</b>}
                </div>
                <div className="cosmetic-card-copy">
                  <RarityBadge rarity={cosmetic.rarity} />
                  <h3>{cosmetic.name}</h3>
                  <p>{cosmetic.description}</p>
                </div>
                {owned ? (
                  <button
                    className={active ? "active" : ""}
                    disabled={active || (category === "skin" && !selectedHero)}
                    onClick={() => actions.equipCosmetic(cosmetic.id, category === "skin" ? selectedHero?.id : undefined)}
                  >
                    {active ? "AUSGERÜSTET" : category === "skin" && selectedHero ? `FÜR ${selectedHero.name.toUpperCase()}` : "AUSRÜSTEN"}
                  </button>
                ) : (
                  <span className="cosmetic-locked-label"><GameIcon name="box" /> NOCH NICHT GEFUNDEN</span>
                )}
              </article>
            );
          })}
        </div>
        <div className="cosmetic-box-link">
          <span><GameIcon name="box" /><b>Noch ein Look fehlt?</b><small>Alle Designs können in Kosmetik- und Eventboxen erscheinen.</small></span>
          <button onClick={onOpenBoxes}>ZUR BOXENHALLE</button>
        </div>
      </section>
    </main>
  );
}
