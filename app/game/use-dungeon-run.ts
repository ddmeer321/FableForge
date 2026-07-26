"use client";

import { useCallback, useEffect, useState } from "react";
import { RUN_BUFFS } from "./data";
import {
  activateHeroAbility,
  applyCombatItem,
  beginRoomTravel,
  createCombat,
  createEventForRoom,
  createRun,
  cycleHeroPosition,
  moveHeroToShelter,
  returnHeroFromShelter,
  selectRunBuffs,
  tickCombat,
} from "./logic";
import type {
  CombatState,
  DungeonRun,
  PlayerProgress,
  RoomChoice,
  RunBuff,
} from "./types";

function healParty(partyHp: Record<string, number>, amount: number) {
  return Object.fromEntries(
    Object.entries(partyHp).map(([heroId, hp]) => [heroId, Math.min(1, hp + amount)]),
  );
}

function damageParty(partyHp: Record<string, number>, amount: number) {
  return Object.fromEntries(
    Object.entries(partyHp).map(([heroId, hp]) => [heroId, Math.max(0.08, hp - amount)]),
  );
}

function capturePartyHp(combat: CombatState) {
  return Object.fromEntries(
    combat.heroes.map((hero) => [hero.heroId, Math.max(0, hero.hp / hero.maxHp)]),
  );
}

function advanceAfterRoom(run: DungeonRun): DungeonRun {
  const clearedStage = run.stage;
  const nextStage = clearedStage + 1;
  const next = {
    ...run,
    stage: nextStage,
    roomsCleared: run.roomsCleared + 1,
    combat: null,
    event: null,
    currentRoom: null,
  };

  if ([2, 5, 8].includes(clearedStage)) {
    return {
      ...next,
      phase: "powerup",
      buffChoices: selectRunBuffs(run.buffs, run.dungeonId),
      message: run.dungeonId === "frostglass-cavern"
        ? "Die Kristalle spiegeln drei Kräfte. Wähle eine."
        : "Der Wald bietet dir drei Kräfte an. Wähle eine.",
    };
  }
  if (nextStage >= 10) {
    return {
      ...next,
      phase: "bossIntro",
      choices: [],
      message: run.dungeonId === "frostglass-cavern"
        ? "Hinter dem letzten Eistor wartet der Frostthron."
        : "Hinter den Ästen schlägt das Herz des Waldes.",
    };
  }
  return {
    ...next,
    phase: "path",
    choices: next.routePlan[nextStage] ?? [],
    message: run.dungeonId === "frostglass-cavern"
      ? "Im blauen Nebel teilt sich der Eisweg erneut."
      : "Der Pfad teilt sich erneut.",
  };
}

export function useDungeonRun(progress: PlayerProgress) {
  const [run, setRun] = useState<DungeonRun | null>(null);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setRun((current) => {
        if (!current || current.phase !== "combat" || !current.combat) return current;
        return { ...current, combat: tickCombat(current.combat, current.buffs) };
      });
    }, 180);
    return () => window.clearInterval(timer);
  }, []);

  const startRun = useCallback((dungeonId: string) => {
    const next = createRun(dungeonId);
    next.partyHp = Object.fromEntries(progress.team.map((slot) => [slot.heroId, 1]));
    setRun(next);
  }, [progress.team]);

  const chooseRoom = useCallback(
    (choice: RoomChoice) => {
      setRun((current) => {
        if (!current || current.phase !== "path") return current;
        return beginRoomTravel(current, choice);
      });
    },
    [],
  );

  const arriveAtRoom = useCallback(
    () => {
      setRun((current) => {
        if (!current || current.phase !== "travel" || !current.currentRoom) return current;
        const choice = current.currentRoom;
        const base = {
          ...current,
          message: `${choice.title}: ${choice.subtitle}`,
        };
        if (["fight", "elite", "miniboss"].includes(choice.type)) {
          return {
            ...base,
            phase: "combat",
            combat: createCombat(
              progress,
              progress.team,
              choice.type,
              current.buffs,
              current.bonusHealItems,
              current.partyHp,
              current.nextCombatEnergy,
              current.dungeonId,
            ),
            nextCombatEnergy: 0,
          };
        }
        return {
          ...base,
          phase: "event",
          event: createEventForRoom(choice.type, current.dungeonId),
        };
      });
    },
    [progress],
  );

  const resolveEvent = useCallback(
    (choiceId: string) => {
      setRun((current) => {
        if (!current || current.phase !== "event" || !current.event) return current;
        const next = { ...current };

        switch (choiceId) {
          case "shatter":
            next.earnedGold += 220;
            next.partyHp = damageParty(next.partyHp, 0.12);
            next.message = "Das Eis bricht gefährlich, doch 220 Gold gehören dir.";
            break;
          case "thaw":
            if (next.earnedGold < 90) return current;
            next.earnedGold -= 90;
            next.bonusHealItems += 1;
            next.message = "Die aufgetaute Truhe enthält eine wärmende Heilration.";
            break;
          case "leave-ice":
            next.earnedKeys += 1;
            next.message = "Ylvas Bergungstrupp belohnt die genaue Markierung.";
            break;
          case "share-flame":
            next.partyHp = healParty(next.partyHp, 0.25);
            next.bonusHealItems += 1;
            next.message = "Ylva teilt Wärme und eine dampfende Heilration.";
            break;
          case "steal-flame": {
            next.earnedGold += 260;
            const ambush = {
              id: `frost-ambush-${Date.now()}`,
              type: "elite" as const,
              title: "Ylvas Frostwölfe",
              subtitle: "Das Rudel verteidigt die letzte Flamme",
              danger: "Gefährlich" as const,
              reward: "Beute verteidigen",
              icon: "claw",
            };
            return {
              ...next,
              currentRoom: ambush,
              phase: "combat",
              event: null,
              combat: createCombat(
                progress,
                progress.team,
                "elite",
                next.buffs,
                next.bonusHealItems,
                next.partyHp,
                next.nextCombatEnergy,
                next.dungeonId,
              ),
              nextCombatEnergy: 0,
              message: "Die Frostwölfe schneiden euch den Rückweg ab!",
            };
          }
          case "pass-camp":
          case "walk-away":
            next.message = "Die Gruppe bewahrt ihre Wärme für den nächsten Schritt.";
            break;
          case "thermal-rest":
            next.partyHp = healParty(next.partyHp, 0.4);
            next.message = "Die Thermalquelle taut müde Glieder wieder auf.";
            break;
          case "thermal-bottle":
            next.bonusHealItems += 1;
            next.message = "Eine Flasche Thermalwasser kommt ins Gepäck.";
            break;
          case "focus-crystal":
            next.nextCombatEnergy = 25;
            next.message = "Das Kristalllicht lädt die Fähigkeiten des Teams.";
            break;
          case "touch-mirror":
            next.partyHp = damageParty(next.partyHp, 0.2);
            if (!next.buffs.some((buff) => buff.id === "warm-core")) {
              next.buffs = [...next.buffs, RUN_BUFFS.find((buff) => buff.id === "warm-core")!];
            }
            next.message = "Der Spiegel nimmt Wärme und hinterlässt einen warmen Kern.";
            break;
          case "melt-mirror":
            if (next.earnedGold < 140) return current;
            next.earnedGold -= 140;
            if (!next.buffs.some((buff) => buff.id === "crystal-guard")) {
              next.buffs = [...next.buffs, RUN_BUFFS.find((buff) => buff.id === "crystal-guard")!];
            }
            next.message = "Das schmelzende Spiegelglas wird zur Kristallwacht.";
            break;
          case "open":
            next.earnedGold += 180;
            next.partyHp = damageParty(next.partyHp, 0.1);
            next.message = "Die Falle schnappt zu, doch 180 Gold gehören dir.";
            break;
          case "repair":
            if (next.earnedGold < 80) return current;
            next.earnedGold -= 80;
            next.bonusHealItems += 1;
            next.message = "Die reparierte Truhe enthält eine starke Heilration.";
            break;
          case "ignore":
            next.earnedKeys += 1;
            next.message = "Deine Markierung wird später von Sammlern belohnt.";
            break;
          case "help":
            next.partyHp = healParty(next.partyHp, 0.2);
            next.bonusHealItems += 1;
            next.message = "Pip bedankt sich mit einer Heilration.";
            break;
          case "rob": {
            next.earnedGold += 240;
            const ambush = {
              id: `ambush-${Date.now()}`,
              type: "elite" as const,
              title: "Pips Beschützer",
              subtitle: "Dornwölfe haben alles gesehen",
              danger: "Gefährlich" as const,
              reward: "Beute verteidigen",
              icon: "claw",
            };
            return {
              ...next,
              currentRoom: ambush,
              phase: "combat",
              event: null,
              combat: createCombat(
                progress,
                progress.team,
                "elite",
                next.buffs,
                next.bonusHealItems,
                next.partyHp,
                next.nextCombatEnergy,
                next.dungeonId,
              ),
              nextCombatEnergy: 0,
              message: "Pips Dornwölfe greifen an!",
            };
          }
          case "leave":
          case "decline":
            next.message = "Manchmal ist ein sicherer Schritt der klügste.";
            break;
          case "drink":
            next.partyHp = healParty(next.partyHp, 0.35);
            next.message = "Die Mondquelle wärmt das ganze Team.";
            break;
          case "bottle":
            next.bonusHealItems += 1;
            next.message = "Ein Fläschchen Mondwasser kommt ins Gepäck.";
            break;
          case "listen":
            next.nextCombatEnergy = 20;
            next.message = "Das Flüstern lädt die Fähigkeiten des Teams.";
            break;
          case "sacrifice":
            next.partyHp = damageParty(next.partyHp, 0.25);
            if (!next.buffs.some((buff) => buff.id === "wild-force")) {
              next.buffs = [...next.buffs, RUN_BUFFS.find((buff) => buff.id === "wild-force")!];
            }
            next.message = "Die Statue nimmt Leben und gibt wilde Kraft.";
            break;
          case "pay":
            if (next.earnedGold < 120) return current;
            next.earnedGold -= 120;
            if (!next.buffs.some((buff) => buff.id === "guardian-return")) {
              next.buffs = [...next.buffs, RUN_BUFFS.find((buff) => buff.id === "guardian-return")!];
            }
            next.message = "Goldene Ranken schützen jede Rückkehr.";
            break;
        }

        return advanceAfterRoom(next);
      });
    },
    [progress],
  );

  const chooseBuff = useCallback((buff: RunBuff) => {
    setRun((current) => {
      if (!current || current.phase !== "powerup") return current;
      const next = {
        ...current,
        buffs: [...current.buffs, buff],
        buffChoices: [],
        message: `${buff.name} begleitet dich für den Rest des Runs.`,
      };
      if (next.stage >= 10) {
        return { ...next, phase: "bossIntro", choices: [] };
      }
      return {
        ...next,
        phase: "path",
        choices: next.routePlan[next.stage] ?? [],
      };
    });
  }, []);

  const startBoss = useCallback(() => {
    setRun((current) => {
      if (!current || current.phase !== "bossIntro") return current;
      const frost = current.dungeonId === "frostglass-cavern";
      const bossRoom: RoomChoice = {
        id: frost ? "frost-throne-boss" : "heart-tree-boss",
        type: "boss",
        title: frost ? "Frostthron" : "Herzbaum",
        subtitle: frost ? "Königin Skadi" : "Waldhüter Nox",
        danger: "Gefährlich",
        reward: "Bossbox & Dungeon-Beute",
        icon: "boss",
      };
      return {
        ...current,
        phase: "combat",
        currentRoom: bossRoom,
        pathHistory: [...current.pathHistory, bossRoom],
        combat: createCombat(
          progress,
          progress.team,
          "boss",
          current.buffs,
          current.bonusHealItems,
          current.partyHp,
          current.nextCombatEnergy,
          current.dungeonId,
        ),
        nextCombatEnergy: 0,
      };
    });
  }, [progress]);

  const continueAfterCombat = useCallback(() => {
    setRun((current) => {
      if (!current?.combat?.outcome) return current;
      if (current.combat.outcome === "defeat") {
        return { ...current, phase: "defeat", partyHp: capturePartyHp(current.combat) };
      }
      const partyHp = capturePartyHp(current.combat);
      const isBoss = current.currentRoom?.type === "boss";
      if (isBoss) {
        const frost = current.dungeonId === "frostglass-cavern";
        return {
          ...current,
          phase: "reward",
          combat: null,
          partyHp,
          earnedGold: current.earnedGold + (frost ? 850 : 620),
          earnedKeys: current.earnedKeys + (frost ? 3 : 2),
          earnedXp: current.earnedXp + (frost ? 360 : 240),
          roomsCleared: current.roomsCleared + 1,
          message: frost
            ? "Skadi ist besiegt. Die Frostglas-Höhlen beginnen zu tauen."
            : "Nox ist besiegt. Der Wald atmet wieder.",
        };
      }
      const roomBonus =
        current.currentRoom?.type === "miniboss"
          ? 190
          : current.currentRoom?.type === "elite"
            ? 120
            : 70;
      return advanceAfterRoom({
        ...current,
        partyHp,
        earnedGold: current.earnedGold + roomBonus,
        earnedXp: current.earnedXp + (roomBonus > 100 ? 55 : 35),
      });
    });
  }, []);

  const useAbility = useCallback((heroId: string) => {
    setRun((current) =>
      current?.combat
        ? { ...current, combat: activateHeroAbility(current.combat, heroId, current.buffs) }
        : current,
    );
  }, []);

  const shelterHero = useCallback((heroId: string) => {
    setRun((current) =>
      current?.combat ? { ...current, combat: moveHeroToShelter(current.combat, heroId) } : current,
    );
  }, []);

  const returnShelteredHero = useCallback(() => {
    setRun((current) =>
      current?.combat
        ? { ...current, combat: returnHeroFromShelter(current.combat, current.buffs) }
        : current,
    );
  }, []);

  const useItem = useCallback((item: "heal" | "power") => {
    setRun((current) =>
      current?.combat ? { ...current, combat: applyCombatItem(current.combat, item) } : current,
    );
  }, []);

  const togglePause = useCallback(() => {
    setRun((current) =>
      current?.combat
        ? { ...current, combat: { ...current.combat, paused: !current.combat.paused } }
        : current,
    );
  }, []);

  const selectEnemy = useCallback((enemyId: string) => {
    setRun((current) =>
      current?.combat
        ? { ...current, combat: { ...current.combat, selectedEnemyId: enemyId } }
        : current,
    );
  }, []);

  const changePosition = useCallback((heroId: string) => {
    setRun((current) =>
      current?.combat
        ? { ...current, combat: cycleHeroPosition(current.combat, heroId) }
        : current,
    );
  }, []);

  const endRun = useCallback(() => setRun(null), []);

  return {
    run,
    startRun,
    chooseRoom,
    arriveAtRoom,
    resolveEvent,
    chooseBuff,
    startBoss,
    continueAfterCombat,
    useAbility,
    shelterHero,
    returnShelteredHero,
    useItem,
    togglePause,
    selectEnemy,
    changePosition,
    endRun,
  };
}

export type DungeonRunController = ReturnType<typeof useDungeonRun>;
