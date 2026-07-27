"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getBox, getCosmetic, getGear } from "./data";
import {
  createInitialProgress,
  normalizeProgress,
  rollBox,
  starterGearResult,
  starterHeroResult,
} from "./logic";
import type {
  LootResult,
  PlayerProgress,
  RunRewards,
  TeamBehavior,
  TeamPosition,
  TargetPriority,
} from "./types";

const SAVE_KEY = "riftbound-beta-progress-v2";

function uid() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `gear-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function addHero(progress: PlayerProgress, heroId: string, fragments = 0) {
  const existing = progress.heroes.find((hero) => hero.id === heroId);
  if (existing) {
    existing.fragments += fragments || 24;
    return true;
  }
  progress.heroes.push({ id: heroId, level: 1, xp: 0, stars: 1, fragments: 0 });
  return false;
}

export function usePlayerProgress() {
  const [progress, setProgress] = useState<PlayerProgress>(() => createInitialProgress());
  const [hydrated, setHydrated] = useState(false);
  const progressRef = useRef(progress);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const raw = window.localStorage.getItem(SAVE_KEY);
        if (raw) {
          const parsed: unknown = JSON.parse(raw);
          const normalized = normalizeProgress(parsed);
          if (normalized) {
            setProgress(normalized);
            progressRef.current = normalized;
          }
        }
      } catch {
        window.localStorage.removeItem(SAVE_KEY);
      } finally {
        setHydrated(true);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    progressRef.current = progress;
    if (!hydrated) return;
    try {
      window.localStorage.setItem(SAVE_KEY, JSON.stringify(progress));
    } catch {
      // Der aktuelle Spielzustand bleibt nutzbar, auch wenn der Browser Speicher blockiert.
    }
  }, [progress, hydrated]);

  const claimStarterHero = useCallback(() => {
    const result = starterHeroResult();
    setProgress((current) => {
      if (current.onboarding !== "intro") return current;
      const next = structuredClone(current);
      addHero(next, result.definitionId);
      next.onboarding = "starterGear";
      return next;
    });
    return result;
  }, []);

  const claimStarterGear = useCallback(() => {
    const result = starterGearResult();
    setProgress((current) => {
      if (current.onboarding !== "starterGear") return current;
      const next = structuredClone(current);
      addHero(next, "brann");
      addHero(next, "mira");
      next.gear.push({
        uid: uid(),
        definitionId: result.definitionId,
        level: 1,
        equippedBy: "astra",
      });
      next.team = [
        { heroId: "brann", position: "Front", behavior: "Team schützen", target: "Nächstes Ziel" },
        { heroId: "astra", position: "Hinten", behavior: "Offensiv", target: "Schwache Gegner" },
        { heroId: "mira", position: "Mitte", behavior: "Defensiv", target: "Nächstes Ziel" },
      ];
      next.onboarding = "tutorial";
      return next;
    });
    return result;
  }, []);

  const completeTutorial = useCallback(() => {
    setProgress((current) => ({ ...current, onboarding: "ready" }));
  }, []);

  const canAffordBox = useCallback((boxId: string) => {
    const box = getBox(boxId);
    if (!box) return false;
    return progressRef.current.wallet[box.currency] >= box.cost;
  }, []);

  const openBox = useCallback((boxId: string): LootResult | null => {
    const current = progressRef.current;
    const box = getBox(boxId);
    if (!box || current.wallet[box.currency] < box.cost || current.onboarding !== "ready") return null;
    const result = rollBox(current, box);

    setProgress((latest) => {
      if (latest.wallet[box.currency] < box.cost) return latest;
      const next = structuredClone(latest);
      next.wallet[box.currency] -= box.cost;
      next.pity[box.id] =
        ["Rare", "Epic", "Legendary", "Mythic", "Secret"].includes(result.rarity)
          ? 0
          : (next.pity[box.id] ?? 0) + 1;

      if (result.kind === "hero") {
        addHero(next, result.definitionId, result.fragments);
      } else if (result.kind === "gear") {
        next.gear.push({
          uid: uid(),
          definitionId: result.definitionId,
          level: 1,
          equippedBy: null,
        });
      } else if (!next.cosmetics.includes(result.definitionId)) {
        next.cosmetics.push(result.definitionId);
      } else {
        next.wallet.crystals += 8;
      }
      return next;
    });
    return result;
  }, []);

  const addHeroToTeam = useCallback((heroId: string) => {
    setProgress((current) => {
      if (current.team.some((slot) => slot.heroId === heroId) || current.team.length >= 4) return current;
      const next = structuredClone(current);
      const position: TeamPosition = next.team.some((slot) => slot.position === "Front") ? "Mitte" : "Front";
      next.team.push({
        heroId,
        position,
        behavior: "Ausgeglichen",
        target: "Nächstes Ziel",
      });
      return next;
    });
  }, []);

  const removeHeroFromTeam = useCallback((heroId: string) => {
    setProgress((current) => ({
      ...current,
      team: current.team.filter((slot) => slot.heroId !== heroId),
    }));
  }, []);

  const moveTeamHero = useCallback((heroId: string, direction: -1 | 1) => {
    setProgress((current) => {
      const index = current.team.findIndex((slot) => slot.heroId === heroId);
      const destination = index + direction;
      if (index < 0 || destination < 0 || destination >= current.team.length) return current;
      const team = [...current.team];
      [team[index], team[destination]] = [team[destination], team[index]];
      return { ...current, team };
    });
  }, []);

  const updateTeamSlot = useCallback(
    (
      heroId: string,
      patch: Partial<{
        position: TeamPosition;
        behavior: TeamBehavior;
        target: TargetPriority;
      }>,
    ) => {
      setProgress((current) => ({
        ...current,
        team: current.team.map((slot) => (slot.heroId === heroId ? { ...slot, ...patch } : slot)),
      }));
    },
    [],
  );

  const equipGear = useCallback((gearUid: string, heroId: string) => {
    setProgress((current) => {
      const item = current.gear.find((gear) => gear.uid === gearUid);
      const definition = item ? getGear(item.definitionId) : null;
      if (!item || !definition || !current.heroes.some((hero) => hero.id === heroId)) return current;
      const gear = current.gear.map((entry) => {
        const entryDefinition = getGear(entry.definitionId);
        if (entry.equippedBy === heroId && entryDefinition?.slot === definition.slot) {
          return { ...entry, equippedBy: null };
        }
        return entry.uid === gearUid ? { ...entry, equippedBy: heroId } : entry;
      });
      return { ...current, gear };
    });
  }, []);

  const unequipGear = useCallback((gearUid: string) => {
    setProgress((current) => ({
      ...current,
      gear: current.gear.map((gear) =>
        gear.uid === gearUid ? { ...gear, equippedBy: null } : gear,
      ),
    }));
  }, []);

  const equipCosmetic = useCallback((cosmeticId: string, heroId?: string) => {
    setProgress((current) => {
      const cosmetic = getCosmetic(cosmeticId);
      if (!cosmetic || !current.cosmetics.includes(cosmeticId)) return current;
      if (cosmetic.kind === "skin") {
        if (!heroId || !current.heroes.some((hero) => hero.id === heroId)) return current;
        return {
          ...current,
          equippedCosmetics: {
            ...current.equippedCosmetics,
            skins: { ...current.equippedCosmetics.skins, [heroId]: cosmeticId },
          },
        };
      }
      return {
        ...current,
        equippedCosmetics: {
          ...current.equippedCosmetics,
          [cosmetic.kind]: cosmeticId,
        },
      };
    });
  }, []);

  const unequipCosmetic = useCallback((kind: "skin" | "aura" | "trail", heroId?: string) => {
    setProgress((current) => {
      if (kind === "skin") {
        if (!heroId || !current.equippedCosmetics.skins[heroId]) return current;
        const skins = { ...current.equippedCosmetics.skins };
        delete skins[heroId];
        return {
          ...current,
          equippedCosmetics: { ...current.equippedCosmetics, skins },
        };
      }
      if (!current.equippedCosmetics[kind]) return current;
      return {
        ...current,
        equippedCosmetics: { ...current.equippedCosmetics, [kind]: null },
      };
    });
  }, []);

  const levelHero = useCallback((heroId: string) => {
    setProgress((current) => {
      const hero = current.heroes.find((entry) => entry.id === heroId);
      if (!hero) return current;
      const cost = 120 + hero.level * 70;
      if (current.wallet.gold < cost || hero.level >= 20) return current;
      const next = structuredClone(current);
      next.wallet.gold -= cost;
      const target = next.heroes.find((entry) => entry.id === heroId);
      if (target) target.level += 1;
      return next;
    });
  }, []);

  const starHero = useCallback((heroId: string) => {
    setProgress((current) => {
      const hero = current.heroes.find((entry) => entry.id === heroId);
      const cost = hero ? hero.stars * 30 : 0;
      if (!hero || hero.fragments < cost || hero.stars >= 5) return current;
      const next = structuredClone(current);
      const target = next.heroes.find((entry) => entry.id === heroId);
      if (target) {
        target.fragments -= cost;
        target.stars += 1;
      }
      return next;
    });
  }, []);

  const claimRunRewards = useCallback((rewards: RunRewards) => {
    setProgress((current) => {
      const next = structuredClone(current);
      next.wallet.gold += rewards.gold;
      next.wallet.keys += rewards.keys;
      next.wallet.crystals += rewards.crystals;
      next.wallet.bossKeys += rewards.bossKeys;
      next.completedRuns += 1;
      next.team.forEach((slot) => {
        const hero = next.heroes.find((entry) => entry.id === slot.heroId);
        if (!hero) return;
        hero.xp += rewards.xp;
        while (hero.xp >= hero.level * 80 && hero.level < 20) {
          hero.xp -= hero.level * 80;
          hero.level += 1;
        }
      });
      if (rewards.dungeonId === "whispering-woods" && !next.unlockedDungeons.includes("frostglass-cavern")) {
        next.unlockedDungeons.push("frostglass-cavern");
        next.lastUnlockedDungeon = "Frostglas-Höhlen";
      }
      if (rewards.dungeonId === "frostglass-cavern" && !next.unlockedDungeons.includes("emberpeak")) {
        next.unlockedDungeons.push("emberpeak");
        next.lastUnlockedDungeon = "Glutgipfel";
      }
      return next;
    });
  }, []);

  const claimRetreatGold = useCallback((gold: number) => {
    setProgress((current) => ({
      ...current,
      wallet: { ...current.wallet, gold: current.wallet.gold + Math.floor(gold * 0.4) },
    }));
  }, []);

  const toggleAudio = useCallback(() => {
    setProgress((current) => ({ ...current, audioEnabled: !current.audioEnabled }));
  }, []);

  const resetProgress = useCallback(() => {
    const fresh = createInitialProgress();
    setProgress(fresh);
    progressRef.current = fresh;
    try {
      window.localStorage.removeItem(SAVE_KEY);
    } catch {
      // Kein weiterer Schritt nötig.
    }
  }, []);

  return {
    progress,
    hydrated,
    claimStarterHero,
    claimStarterGear,
    completeTutorial,
    canAffordBox,
    openBox,
    addHeroToTeam,
    removeHeroFromTeam,
    moveTeamHero,
    updateTeamSlot,
    equipGear,
    unequipGear,
    equipCosmetic,
    unequipCosmetic,
    levelHero,
    starHero,
    claimRunRewards,
    claimRetreatGold,
    toggleAudio,
    resetProgress,
  };
}

export type PlayerProgressController = ReturnType<typeof usePlayerProgress>;
