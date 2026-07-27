"use client";

import { useCallback, useState } from "react";
import { BOXES } from "../game/data";
import type { AppScreen, BoxDefinition, LootResult, RunRewards } from "../game/types";
import { useDungeonRun } from "../game/use-dungeon-run";
import { usePlayerProgress } from "../game/use-player-progress";
import { BoxHall, BoxOpening } from "./BoxHall";
import { GearInventory, HeroesCollection, TeamBuilder } from "./Collection";
import { CosmeticsWardrobe } from "./Cosmetics";
import { DungeonRunView } from "./DungeonRun";
import { DungeonSelect } from "./DungeonSelect";
import { Lobby } from "./Lobby";
import { TutorialOverlay } from "./Onboarding";
import { GameHeader } from "./shared";

type OpeningState = {
  box: BoxDefinition;
  result: LootResult;
};

export function GameApp() {
  const player = usePlayerProgress();
  const runController = useDungeonRun(player.progress);
  const [screen, setScreen] = useState<AppScreen>("lobby");
  const [opening, setOpening] = useState<OpeningState | null>(null);

  const playSound = useCallback(
    (kind: "click" | "box" | "rare" | "heal" | "victory") => {
      if (!player.progress.audioEnabled || typeof window === "undefined") return;
      try {
        const AudioContextClass =
          window.AudioContext ??
          (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!AudioContextClass) return;
        const context = new AudioContextClass();
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        const frequencies = { click: 360, box: 180, rare: 660, heal: 520, victory: 780 };
        oscillator.frequency.setValueAtTime(frequencies[kind], context.currentTime);
        oscillator.type = kind === "box" ? "triangle" : "sine";
        gain.gain.setValueAtTime(0.045, context.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + (kind === "victory" ? 0.45 : 0.18));
        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.start();
        oscillator.stop(context.currentTime + (kind === "victory" ? 0.45 : 0.18));
        oscillator.addEventListener("ended", () => void context.close());
      } catch {
        // Audio ist optional; ein blockierter Browser-Kontext darf das Spiel nie stoppen.
      }
    },
    [player.progress.audioEnabled],
  );

  const navigate = useCallback(
    (next: AppScreen) => {
      if (player.progress.onboarding !== "ready" && next !== "lobby") return;
      playSound("click");
      setScreen(next);
    },
    [player.progress.onboarding, playSound],
  );

  const startHeroBox = () => {
    const result = player.claimStarterHero();
    setOpening({ box: BOXES[0], result });
    playSound("box");
  };

  const startGearBox = () => {
    const result = player.claimStarterGear();
    setOpening({ box: BOXES[1], result });
    playSound("box");
  };

  const openRegularBox = (box: BoxDefinition) => {
    const result = player.openBox(box.id);
    if (!result) return;
    setOpening({ box, result });
    playSound("box");
  };

  const startAdventure = (dungeonId: string) => {
    runController.startRun(dungeonId);
    setScreen("run");
    playSound("click");
  };

  const retreat = () => {
    if (runController.run) player.claimRetreatGold(runController.run.earnedGold);
    runController.endRun();
    setScreen("lobby");
    playSound("click");
  };

  const claimRewards = (rewards: RunRewards) => {
    player.claimRunRewards(rewards);
    runController.endRun();
    setScreen("lobby");
    playSound("victory");
  };

  const collectionActions = {
    addHeroToTeam: player.addHeroToTeam,
    removeHeroFromTeam: player.removeHeroFromTeam,
    moveTeamHero: player.moveTeamHero,
    updateTeamSlot: player.updateTeamSlot,
    equipGear: player.equipGear,
    unequipGear: player.unequipGear,
    levelHero: player.levelHero,
    starHero: player.starHero,
  };

  return (
    <div className={`riftbound-app screen-${screen}`}>
      {screen !== "run" && (
        <GameHeader
          wallet={player.progress.wallet}
          screen={screen}
          onNavigate={navigate}
          audioEnabled={player.progress.audioEnabled}
          onToggleAudio={player.toggleAudio}
        />
      )}

      {screen === "lobby" && (
        <Lobby
          progress={player.progress}
          onNavigate={navigate}
          onStarterHero={startHeroBox}
          onStarterGear={startGearBox}
        />
      )}
      {screen === "boxes" && (
        <BoxHall progress={player.progress} canAfford={player.canAffordBox} onOpen={openRegularBox} />
      )}
      {screen === "heroes" && <HeroesCollection progress={player.progress} actions={collectionActions} />}
      {screen === "gear" && <GearInventory progress={player.progress} actions={collectionActions} />}
      {screen === "cosmetics" && (
        <CosmeticsWardrobe
          progress={player.progress}
          actions={{ equipCosmetic: player.equipCosmetic, unequipCosmetic: player.unequipCosmetic }}
          onOpenBoxes={() => navigate("boxes")}
        />
      )}
      {screen === "team" && (
        <TeamBuilder progress={player.progress} actions={collectionActions} onAdventure={() => navigate("dungeons")} />
      )}
      {screen === "dungeons" && (
        <DungeonSelect progress={player.progress} onStart={startAdventure} onEditTeam={() => navigate("team")} />
      )}
      {screen === "run" && runController.run && (
        <DungeonRunView
          run={runController.run}
          progress={player.progress}
          actions={runController}
          onRetreat={retreat}
          onClaimRewards={claimRewards}
        />
      )}

      {player.progress.onboarding === "tutorial" && !opening && (
        <TutorialOverlay
          progress={player.progress}
          onComplete={() => {
            player.completeTutorial();
            playSound("victory");
          }}
        />
      )}

      {opening && (
        <BoxOpening
          box={opening.box}
          result={opening.result}
          onReveal={() => playSound(["Epic", "Legendary", "Mythic", "Secret"].includes(opening.result.rarity) ? "rare" : "click")}
          onClose={() => setOpening(null)}
        />
      )}

      {screen !== "run" && player.progress.onboarding === "ready" && (
        <div className="save-indicator"><i /> Fortschritt lokal gespeichert</div>
      )}
    </div>
  );
}
