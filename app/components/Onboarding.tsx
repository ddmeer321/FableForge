"use client";

import { useState } from "react";
import { getHero } from "../game/data";
import type { PlayerProgress } from "../game/types";
import { GameIcon, HeroPortrait } from "./shared";

const TUTORIAL_STEPS = [
  {
    icon: "team",
    title: "Dein Team ist bereit",
    text: "Brann schützt die Front, Astra trifft verwundbare Ziele und Mira hält alle am Leben. Im Team-Bereich kannst du Position und Verhalten ändern.",
  },
  {
    icon: "burst",
    title: "Du führst den Kampf",
    text: "Normale Angriffe laufen automatisch. Du bestimmst Fähigkeiten, Ziele und Positionen – gutes Timing macht den Unterschied.",
  },
  {
    icon: "shield",
    title: "Nutze den Schutzraum",
    text: "Ziehe genau einen verletzten Helden aus dem Feld. Er regeneriert langsam, aber das restliche Team kämpft ohne ihn weiter.",
  },
  {
    icon: "route",
    title: "Jeder Pfad verändert den Run",
    text: "Wähle Räume, triff Entscheidungen und kombiniere drei Waldsegen zu einem eigenen Build. Jetzt beginnt dein Abenteuer.",
  },
];

export function TutorialOverlay({
  progress,
  onComplete,
}: {
  progress: PlayerProgress;
  onComplete: () => void;
}) {
  const [step, setStep] = useState(0);
  const current = TUTORIAL_STEPS[step];
  const team = progress.team
    .map((slot) => getHero(slot.heroId))
    .filter((hero): hero is NonNullable<typeof hero> => Boolean(hero));

  return (
    <div className="modal-backdrop tutorial-backdrop">
      <section className="tutorial-modal">
        <div className="tutorial-art">
          <span className="tutorial-sun" />
          <span className="tutorial-hill" />
          <div className="tutorial-party">
            {team.map((hero, index) => (
              <div key={hero.id} style={{ "--party-order": index } as React.CSSProperties}>
                <HeroPortrait hero={hero} size="medium" />
                <span>{hero.name}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="tutorial-copy">
          <span className="chapter-kicker">KURZES TUTORIAL · {step + 1} / {TUTORIAL_STEPS.length}</span>
          <span className="tutorial-step-icon"><GameIcon name={current.icon} /></span>
          <h2>{current.title}</h2>
          <p>{current.text}</p>
          <div className="tutorial-dots">
            {TUTORIAL_STEPS.map((_, index) => <i className={index === step ? "active" : index < step ? "done" : ""} key={index} />)}
          </div>
          <button
            onClick={() => {
              if (step === TUTORIAL_STEPS.length - 1) onComplete();
              else setStep((value) => value + 1);
            }}
          >
            {step === TUTORIAL_STEPS.length - 1 ? "ABENTEUER FREISCHALTEN" : "WEITER"}
          </button>
        </div>
      </section>
    </div>
  );
}
