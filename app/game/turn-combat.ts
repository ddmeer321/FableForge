import { getHero } from "./data";
import { totalHeroStats } from "./logic";
import type {
  CombatEffect,
  CombatEnemy,
  CombatHero,
  CombatState,
  CombatTurnActor,
  PlayerCombatAction,
  PlayerCombatActionId,
  PlayerProgress,
  RoomType,
  RunBuff,
  TeamSlot,
} from "./types";

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const actionDelay = 620;

function enemy(
  id: string,
  name: string,
  kind: CombatEnemy["kind"],
  hp: number,
  attack: number,
  defense: number,
  initiative: number,
  boss = false,
): CombatEnemy {
  return {
    id,
    name,
    kind,
    hp,
    maxHp: hp,
    attack,
    defense,
    initiative,
    initiativePenalty: 0,
    nextAction: 0,
    boss,
  };
}

function enemiesForRoom(type: RoomType, dungeonId: string): CombatEnemy[] {
  if (dungeonId === "frostglass-cavern") {
    if (type === "boss") return [enemy("skadi", "Königin Skadi", "ice-queen", 2700, 34, 12, 76, true)];
    if (type === "miniboss") return [enemy("crystal-sentinel", "Kristallwächter", "crystal-golem", 1150, 30, 12, 48)];
    if (type === "elite") {
      return [
        enemy("frost-wolf-a", "Alpha-Frostwolf", "frost-wolf", 470, 25, 6, 72),
        enemy("frost-wolf-b", "Alpha-Frostwolf", "frost-wolf", 470, 25, 6, 68),
      ];
    }
    return [
      enemy("ice-wisp-a", "Eislicht", "ice-wisp", 270, 18, 4, 70),
      enemy("ice-wisp-b", "Eislicht", "ice-wisp", 270, 18, 4, 64),
      enemy("frost-hunter", "Frostwolf", "frost-wolf", 360, 22, 5, 66),
    ];
  }
  if (type === "boss") return [enemy("nox", "Waldhüter Nox", "boss", 1900, 27, 9, 72, true)];
  if (type === "miniboss") return [enemy("bark-golem", "Rindenkoloss", "golem", 800, 25, 8, 45)];
  if (type === "elite") {
    return [
      enemy("thorn-wolf-a", "Dornwolf", "wolf", 340, 20, 4, 69),
      enemy("thorn-wolf-b", "Dornwolf", "wolf", 340, 20, 4, 65),
    ];
  }
  return [
    enemy("sprout-a", "Waldling", "sprout", 200, 14, 2, 48),
    enemy("sprout-b", "Waldling", "sprout", 200, 14, 2, 44),
    enemy("shaman", "Sporenschamane", "shaman", 260, 17, 3, 58),
  ];
}

function appendLog(log: string[], message: string) {
  return [message, ...log].slice(0, 6);
}

function addEffect(
  state: CombatState,
  kind: CombatEffect["kind"],
  text: string,
  targetId: string,
  sourceId?: string,
) {
  const sequence = state.effectSequence + 1;
  return {
    effects: [
      { id: sequence, kind, text, targetId, sourceId, createdAt: Date.now() },
      ...state.effects.filter((effect) => Date.now() - effect.createdAt < 1200),
    ].slice(0, 12),
    effectSequence: sequence,
  };
}

function actorInitiative(actor: CombatTurnActor, heroes: CombatHero[], enemies: CombatEnemy[]) {
  if (actor.side === "hero") return heroes.find((hero) => hero.heroId === actor.id)?.speed ?? 0;
  const foe = enemies.find((entry) => entry.id === actor.id);
  return Math.max(1, (foe?.initiative ?? 0) - (foe?.initiativePenalty ?? 0));
}

function buildTurnOrder(heroes: CombatHero[], enemies: CombatEnemy[]): CombatTurnActor[] {
  const actors: CombatTurnActor[] = [
    ...heroes
      .filter((hero) => hero.hp > 0)
      .map((hero) => ({ id: hero.heroId, side: "hero" as const, initiative: hero.speed })),
    ...enemies
      .filter((entry) => entry.hp > 0)
      .map((entry) => ({
        id: entry.id,
        side: "enemy" as const,
        initiative: Math.max(1, entry.initiative - entry.initiativePenalty),
      })),
  ];
  return actors.sort((a, b) => {
    const difference = actorInitiative(b, heroes, enemies) - actorInitiative(a, heroes, enemies);
    if (difference) return difference;
    if (a.side !== b.side) return a.side === "hero" ? -1 : 1;
    return a.id.localeCompare(b.id);
  });
}

function chooseTarget(hero: CombatHero, enemies: CombatEnemy[], selected: string | null) {
  const alive = enemies.filter((entry) => entry.hp > 0);
  const manual = alive.find((entry) => entry.id === selected);
  const boss = alive.find((entry) => entry.boss);
  if (hero.target === "Boss" && boss) return boss;
  if (manual) return manual;
  if (hero.target === "Schwache Gegner") {
    return [...alive].sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
  }
  return alive[0];
}

function combatOutcome(state: CombatState): CombatState["outcome"] {
  if (state.enemies.every((entry) => entry.hp <= 0)) return "victory";
  const player = state.heroes.find((hero) => hero.heroId === state.playerHeroId);
  if (!player || player.hp <= 0 || state.heroes.every((hero) => hero.hp <= 0)) return "defeat";
  return null;
}

function finishWithOutcome(state: CombatState) {
  const outcome = combatOutcome(state);
  if (!outcome || outcome === state.outcome) return { ...state, outcome };
  return {
    ...state,
    outcome,
    log: appendLog(
      state.log,
      outcome === "victory" ? "Der Raum ist gesichert!" : "Dein Charakter wurde besiegt.",
    ),
  };
}

function applyFrostRound(state: CombatState, buffs: RunBuff[]) {
  if (state.dungeonId !== "frostglass-cavern" || state.round < state.environmentNextRound) return state;
  const heroes = state.heroes.map((hero) => ({ ...hero }));
  const deepFreeze = (state.environmentPulse + 1) % 3 === 0;
  const warmCore = buffs.some((buff) => buff.id === "warm-core");
  const crystalGuard = buffs.some((buff) => buff.id === "crystal-guard");
  let effects = state.effects;
  let effectSequence = state.effectSequence;

  heroes
    .filter((hero) => hero.hp > 0 && hero.heroId !== state.shelterHeroId)
    .forEach((hero) => {
      if (deepFreeze && !warmCore) hero.skipTurns += 1;
      if (crystalGuard) hero.shield += 16;
      effectSequence += 1;
      effects = [
        {
          id: effectSequence,
          kind: crystalGuard ? "shield" as const : "warning" as const,
          text: crystalGuard ? "+16 SCHILD" : deepFreeze ? "EINGEFROREN" : "FROST",
          targetId: hero.heroId,
          createdAt: Date.now(),
        },
        ...effects,
      ].slice(0, 12);
    });

  return {
    ...state,
    heroes,
    effects,
    effectSequence,
    environmentPulse: state.environmentPulse + 1,
    environmentNextRound: state.round + (warmCore ? 4 : 3),
    log: appendLog(
      state.log,
      deepFreeze
        ? "Tieffrost! Das aktive Team verliert seinen nächsten Zug."
        : "Eine Frostwelle zieht über das Schlachtfeld.",
    ),
  };
}

function advanceTurn(state: CombatState, buffs: RunBuff[]) {
  let turnIndex = state.turnIndex + 1;
  let round = state.round;
  const heroes = state.heroes.map((hero) => ({
    ...hero,
    powerTurns: Math.max(0, hero.powerTurns - (turnIndex >= state.turnOrder.length ? 1 : 0)),
  }));
  let enemies = state.enemies.map((entry) => ({ ...entry }));
  let playerActionCooldowns = { ...state.playerActionCooldowns };
  let turnOrder = state.turnOrder;

  if (turnIndex >= turnOrder.length) {
    round += 1;
    turnIndex = 0;
    playerActionCooldowns = {
      quick: Math.max(0, playerActionCooldowns.quick - 1),
      heavy: Math.max(0, playerActionCooldowns.heavy - 1),
      disrupt: Math.max(0, playerActionCooldowns.disrupt - 1),
      signature: Math.max(0, playerActionCooldowns.signature - 1),
    };
    turnOrder = buildTurnOrder(heroes, enemies);
    enemies = enemies.map((entry) => ({ ...entry, initiativePenalty: 0 }));
  }

  let next = {
    ...state,
    heroes,
    enemies,
    turnOrder,
    turnIndex,
    round,
    playerActionCooldowns,
    turnReadyAt: Date.now() + actionDelay,
    lastTick: Date.now(),
  };
  if (round !== state.round) next = applyFrostRound(next, buffs);
  return finishWithOutcome(next);
}

function dealDamage(
  state: CombatState,
  sourceId: string,
  targetId: string,
  rawDamage: number,
  kind: CombatEffect["kind"] = "damage",
  critical = false,
) {
  const enemies = state.enemies.map((entry) => ({ ...entry }));
  const target = enemies.find((entry) => entry.id === targetId);
  if (!target) return state;
  const damage = Math.max(2, Math.round(rawDamage - target.defense));
  target.hp = clamp(target.hp - damage, 0, target.maxHp);
  const effect = addEffect(state, kind, `${critical ? "KRIT " : ""}-${damage}`, targetId, sourceId);
  return {
    ...state,
    enemies,
    ...effect,
    damageDone: state.damageDone + damage,
  };
}

export function getCurrentCombatActor(state: CombatState) {
  return state.turnOrder[state.turnIndex] ?? null;
}

export function isPlayerCombatTurn(state: CombatState) {
  const actor = getCurrentCombatActor(state);
  return Boolean(
    actor?.side === "hero" &&
    actor.id === state.playerHeroId &&
    !state.paused &&
    !state.outcome,
  );
}

export function getPlayerCombatActions(heroId: string): PlayerCombatAction[] {
  const hero = getHero(heroId);
  return [
    {
      id: "quick",
      name: "Schneller Hieb",
      description: "Zuverlässiger Angriff mit erhöhter Krit-Chance.",
      icon: "blade",
      cooldown: 0,
    },
    {
      id: "heavy",
      name: "Kraftangriff",
      description: "Viel Schaden, danach 1 Runde Abklingzeit.",
      icon: "swords",
      cooldown: 1,
    },
    {
      id: "disrupt",
      name: "Unterbrechen",
      description: "Schaden und weniger Initiative für das Ziel.",
      icon: "burst",
      cooldown: 1,
    },
    {
      id: "signature",
      name: hero?.activeName ?? "Signaturtechnik",
      description: hero?.activeDescription ?? "Eine besondere Technik deines Charakters.",
      icon: hero?.role === "Heiler" ? "heal" : hero?.role === "Tank" ? "shield" : "sparkle",
      cooldown: 2,
    },
  ];
}

export function createTurnCombat(
  progress: PlayerProgress,
  team: TeamSlot[],
  type: RoomType,
  buffs: RunBuff[],
  bonusHealItems = 0,
  partyHp: Record<string, number> = {},
  nextCombatEnergy = 0,
  dungeonId = "whispering-woods",
): CombatState {
  const start = Date.now();
  const wildForce = buffs.some((buff) => buff.id === "wild-force");
  const shatterpoint = dungeonId === "frostglass-cavern" && buffs.some((buff) => buff.id === "shatterpoint");
  const heroes = team
    .map((slot) => {
      const stats = totalHeroStats(progress, slot.heroId);
      if (!stats) return null;
      return {
        heroId: slot.heroId,
        hp: Math.round(stats.hp * (partyHp[slot.heroId] ?? 1)),
        maxHp: stats.hp,
        attack: Math.round(stats.attack * (wildForce ? 1.2 : 1) * (shatterpoint ? 1.15 : 1)),
        defense: Math.max(0, Math.round(stats.defense * (wildForce ? 0.92 : 1))),
        speed: stats.speed,
        energy: clamp(nextCombatEnergy, 0, 100),
        shield: 0,
        nextAction: 0,
        shelterCooldownUntil: 0,
        powerUntil: 0,
        shelterReadyRound: 0,
        position: slot.position,
        behavior: slot.behavior,
        target: slot.target,
        powerTurns: 0,
        skipTurns: 0,
      } satisfies CombatHero;
    })
    .filter((hero): hero is CombatHero => Boolean(hero));
  const enemies = enemiesForRoom(type, dungeonId);
  const playerHeroId = heroes[0]?.heroId ?? "";

  return {
    dungeonId,
    heroes,
    enemies,
    playerHeroId,
    turnOrder: buildTurnOrder(heroes, enemies),
    turnIndex: 0,
    round: 1,
    turnReadyAt: start + 450,
    playerActionCooldowns: { quick: 0, heavy: 0, disrupt: 0, signature: 0 },
    shelterHeroId: null,
    paused: false,
    outcome: null,
    selectedEnemyId: enemies[0]?.id ?? null,
    healItems: 2 + bonusHealItems,
    powerTonics: 1,
    switchReadyAt: 0,
    shelterSwitchReadyRound: 0,
    log: [
      "Die Initiative bestimmt die Reihenfolge.",
      "Du steuerst deinen Charakter. Deine Gefährten handeln selbstständig.",
    ],
    effects: [],
    effectSequence: 0,
    damageDone: 0,
    environmentNextAt: Number.POSITIVE_INFINITY,
    environmentNextRound: dungeonId === "frostglass-cavern" ? 3 : Number.POSITIVE_INFINITY,
    environmentPulse: 0,
    startedAt: start,
    lastTick: start,
  };
}

function helperTurn(state: CombatState, hero: CombatHero, buffs: RunBuff[]) {
  const definition = getHero(hero.heroId);
  if (!definition) return advanceTurn(state, buffs);
  const heroes = state.heroes.map((entry) => ({ ...entry }));
  const acting = heroes.find((entry) => entry.heroId === hero.heroId)!;
  const weakest = heroes
    .filter((entry) => entry.hp > 0)
    .sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
  let next = { ...state, heroes };

  if (definition.role === "Heiler" && weakest && weakest.hp / weakest.maxHp < 0.74) {
    const amount = Math.round(acting.attack * 1.8 + weakest.maxHp * 0.12);
    weakest.hp = clamp(weakest.hp + amount, 0, weakest.maxHp);
    const effect = addEffect(next, "heal", `+${amount}`, weakest.heroId, acting.heroId);
    next = {
      ...next,
      ...effect,
      log: appendLog(next.log, `${definition.name} heilt ${getHero(weakest.heroId)?.name}.`),
    };
  } else if ((definition.role === "Tank" || definition.role === "Support") && weakest && weakest.hp / weakest.maxHp < 0.58) {
    const amount = Math.round(acting.defense * 1.6 + 18);
    weakest.shield += amount;
    const effect = addEffect(next, "shield", `+${amount} SCHILD`, weakest.heroId, acting.heroId);
    next = {
      ...next,
      ...effect,
      log: appendLog(next.log, `${definition.name} schützt ${getHero(weakest.heroId)?.name}.`),
    };
  } else {
    const target = chooseTarget(acting, next.enemies, next.selectedEnemyId);
    if (target) {
      const behavior = acting.behavior === "Offensiv" ? 1.14 : acting.behavior === "Defensiv" ? 0.9 : 1;
      const power = acting.powerTurns > 0 ? 1.35 : 1;
      next = dealDamage(next, acting.heroId, target.id, acting.attack * behavior * power);
      next.log = appendLog(next.log, `${definition.name} greift ${target.name} selbstständig an.`);
    }
  }
  return advanceTurn(finishWithOutcome(next), buffs);
}

function enemyTurn(state: CombatState, foe: CombatEnemy, buffs: RunBuff[]) {
  const heroes = state.heroes.map((hero) => ({ ...hero }));
  const active = heroes.filter(
    (hero) => hero.hp > 0 && hero.heroId !== state.shelterHeroId,
  );
  if (!active.length) return advanceTurn({ ...state, heroes }, buffs);
  const protectors = active.filter(
    (hero) => getHero(hero.heroId)?.role === "Tank" || hero.behavior === "Team schützen",
  );
  const front = active.filter((hero) => hero.position === "Front");
  const pool = protectors.length ? protectors : front.length ? front : active;
  const target = pool[Math.floor(Math.random() * pool.length)];
  const guard = target.behavior === "Defensiv" ? 0.82 : target.position === "Front" ? 0.9 : 1;
  const rawDamage = Math.max(4, Math.round((foe.attack * (0.9 + Math.random() * 0.2) - target.defense) * guard));
  const absorbed = Math.min(target.shield, rawDamage);
  target.shield -= absorbed;
  const damage = rawDamage - absorbed;
  target.hp = clamp(target.hp - damage, 0, target.maxHp);
  const nextBase = { ...state, heroes };
  const effect = addEffect(
    nextBase,
    damage ? "damage" : "shield",
    damage ? `-${damage}` : "BLOCK",
    target.heroId,
    foe.id,
  );
  const next = finishWithOutcome({
    ...nextBase,
    ...effect,
    log: appendLog(
      state.log,
      `${foe.name} trifft ${getHero(target.heroId)?.name ?? "deinen Charakter"} für ${damage}.`,
    ),
  });
  return advanceTurn(next, buffs);
}

function shelterTurn(state: CombatState, hero: CombatHero, buffs: RunBuff[]) {
  const heroes = state.heroes.map((entry) => ({ ...entry }));
  const sheltered = heroes.find((entry) => entry.heroId === hero.heroId);
  if (!sheltered) return advanceTurn(state, buffs);
  const healerBonus = heroes.some(
    (entry) => entry.hp > 0 && getHero(entry.heroId)?.role === "Heiler",
  ) ? 1.35 : 1;
  const bloomBonus = buffs.some((buff) => buff.id === "sanctuary-bloom") ? 1.55 : 1;
  const cap = sheltered.maxHp * 0.78;
  const amount = Math.max(1, Math.round(sheltered.maxHp * 0.12 * healerBonus * bloomBonus));
  const before = sheltered.hp;
  sheltered.hp = Math.min(cap, sheltered.hp + amount);
  const healed = Math.max(0, Math.round(sheltered.hp - before));
  let next: CombatState = {
    ...state,
    heroes,
    log: appendLog(
      state.log,
      healed
        ? `${getHero(hero.heroId)?.name} regeneriert im Schutzraum ${healed} LP.`
        : `${getHero(hero.heroId)?.name} bleibt im Schutzraum geschützt.`,
    ),
  };
  if (healed) next = { ...next, ...addEffect(next, "heal", `+${healed}`, hero.heroId) };
  return advanceTurn(next, buffs);
}

export function tickTurnCombat(state: CombatState, buffs: RunBuff[]): CombatState {
  if (state.outcome || state.paused) return state;
  const time = Date.now();
  const effects = state.effects.filter((effect) => time - effect.createdAt < 1200);
  if (time < state.turnReadyAt) return effects.length === state.effects.length ? state : { ...state, effects };
  const actor = getCurrentCombatActor(state);
  if (!actor) return finishWithOutcome({ ...state, effects });

  if (actor.side === "hero") {
    const hero = state.heroes.find((entry) => entry.heroId === actor.id);
    if (!hero || hero.hp <= 0) return advanceTurn({ ...state, effects }, buffs);
    if (hero.skipTurns > 0) {
      const heroes = state.heroes.map((entry) =>
        entry.heroId === hero.heroId ? { ...entry, skipTurns: entry.skipTurns - 1 } : entry,
      );
      return advanceTurn(
        { ...state, heroes, effects, log: appendLog(state.log, `${getHero(hero.heroId)?.name} ist eingefroren.`) },
        buffs,
      );
    }
    if (state.shelterHeroId === hero.heroId) return shelterTurn({ ...state, effects }, hero, buffs);
    if (hero.heroId === state.playerHeroId) return { ...state, effects, lastTick: time };
    return helperTurn({ ...state, effects }, hero, buffs);
  }

  const foe = state.enemies.find((entry) => entry.id === actor.id);
  if (!foe || foe.hp <= 0) return advanceTurn({ ...state, effects }, buffs);
  return enemyTurn({ ...state, effects }, foe, buffs);
}

export function performPlayerCombatAction(
  state: CombatState,
  actionId: PlayerCombatActionId,
  buffs: RunBuff[],
): CombatState {
  if (!isPlayerCombatTurn(state) || state.playerActionCooldowns[actionId] > 0) return state;
  const hero = state.heroes.find((entry) => entry.heroId === state.playerHeroId);
  const target = hero ? chooseTarget(hero, state.enemies, state.selectedEnemyId) : null;
  if (!hero || !target || hero.hp <= 0 || state.shelterHeroId === hero.heroId) return state;
  const definition = getHero(hero.heroId);
  const critical = actionId === "quick" && Math.random() < 0.28;
  const power = hero.powerTurns > 0 ? 1.35 : 1;
  let next = { ...state };

  if (actionId === "signature" && definition?.role === "Heiler") {
    const heroes = state.heroes.map((entry) => {
      if (entry.hp <= 0) return entry;
      return { ...entry, hp: clamp(entry.hp + Math.round(entry.maxHp * 0.26), 0, entry.maxHp) };
    });
    next = { ...next, heroes };
    heroes.filter((entry) => entry.hp > 0).forEach((entry) => {
      next = { ...next, ...addEffect(next, "heal", "GEHEILT", entry.heroId, hero.heroId) };
    });
  } else if (actionId === "signature" && definition?.role === "Tank") {
    const heroes = state.heroes.map((entry) =>
      entry.hp > 0 ? { ...entry, shield: entry.shield + Math.round(hero.defense * 2.3 + 18) } : entry,
    );
    next = { ...next, heroes };
    heroes.filter((entry) => entry.hp > 0).forEach((entry) => {
      next = { ...next, ...addEffect(next, "shield", "SCHILD", entry.heroId, hero.heroId) };
    });
  } else if (actionId === "signature" && definition?.role === "Support") {
    next = {
      ...next,
      heroes: state.heroes.map((entry) =>
        entry.hp > 0 ? { ...entry, powerTurns: Math.max(entry.powerTurns, 2), shield: entry.shield + 14 } : entry,
      ),
    };
  } else {
    const multiplier =
      actionId === "quick" ? (critical ? 1.55 : 0.95)
        : actionId === "heavy" ? 1.85
          : actionId === "disrupt" ? 0.82
            : definition?.role === "Fernkampf-DPS" ? 1.6 : 2.35;
    next = dealDamage(next, hero.heroId, target.id, hero.attack * multiplier * power, actionId === "signature" ? "ability" : "damage", critical);
    if (actionId === "disrupt") {
      next = {
        ...next,
        enemies: next.enemies.map((entry) =>
          entry.id === target.id ? { ...entry, initiativePenalty: entry.initiativePenalty + 24 } : entry,
        ),
      };
    }
    if (
      actionId === "signature" &&
      definition?.role === "Fernkampf-DPS"
    ) {
      next.enemies.filter((entry) => entry.hp > 0 && entry.id !== target.id).forEach((entry) => {
        next = dealDamage(next, hero.heroId, entry.id, hero.attack * 0.7, "ability");
      });
    }
  }

  const cooldown = getPlayerCombatActions(hero.heroId).find((action) => action.id === actionId)?.cooldown ?? 0;
  next = {
    ...next,
    playerActionCooldowns: {
      ...next.playerActionCooldowns,
      [actionId]: cooldown > 0 ? cooldown + 1 : 0,
    },
    log: appendLog(
      next.log,
      `${definition?.name ?? "Du"} nutzt ${getPlayerCombatActions(hero.heroId).find((action) => action.id === actionId)?.name}.`,
    ),
  };
  return advanceTurn(finishWithOutcome(next), buffs);
}

export function moveTurnHeroToShelter(state: CombatState, heroId: string, buffs: RunBuff[]) {
  if (!isPlayerCombatTurn(state) || state.shelterHeroId || heroId === state.playerHeroId) return state;
  const hero = state.heroes.find((entry) => entry.heroId === heroId);
  if (!hero || hero.hp <= 0 || hero.shelterReadyRound > state.round || state.shelterSwitchReadyRound > state.round) {
    return state;
  }
  return advanceTurn({
    ...state,
    shelterHeroId: heroId,
    shelterSwitchReadyRound: state.round + 1,
    log: appendLog(state.log, `${getHero(heroId)?.name} zieht sich in den Schutzraum zurück.`),
  }, buffs);
}

export function returnTurnHeroFromShelter(state: CombatState, buffs: RunBuff[]) {
  if (!isPlayerCombatTurn(state) || !state.shelterHeroId || state.shelterSwitchReadyRound > state.round) return state;
  const heroId = state.shelterHeroId;
  const heroes = state.heroes.map((hero) =>
    hero.heroId === heroId
      ? {
          ...hero,
          shelterReadyRound: state.round + 2,
          shield: hero.shield + (buffs.some((buff) => buff.id === "guardian-return") ? 35 : 0),
        }
      : hero,
  );
  return advanceTurn({
    ...state,
    heroes,
    shelterHeroId: null,
    shelterSwitchReadyRound: state.round + 1,
    log: appendLog(state.log, `${getHero(heroId)?.name} kehrt ins Feld zurück.`),
  }, buffs);
}

export function applyTurnCombatItem(
  state: CombatState,
  item: "heal" | "power",
  buffs: RunBuff[],
) {
  if (!isPlayerCombatTurn(state) || !state.shelterHeroId) return state;
  const heroes = state.heroes.map((hero) => ({ ...hero }));
  const target = heroes.find((hero) => hero.heroId === state.shelterHeroId);
  if (!target) return state;
  let next = { ...state, heroes };

  if (item === "heal" && state.healItems > 0) {
    const amount = Math.round(target.maxHp * 0.28);
    target.hp = clamp(target.hp + amount, 0, target.maxHp);
    next = { ...next, healItems: state.healItems - 1 };
    next = { ...next, ...addEffect(next, "heal", `+${amount}`, target.heroId, state.playerHeroId) };
  } else if (item === "power" && state.powerTonics > 0) {
    target.powerTurns = Math.max(target.powerTurns, 3);
    next = { ...next, powerTonics: state.powerTonics - 1 };
    next = { ...next, ...addEffect(next, "ability", "KRAFT", target.heroId, state.playerHeroId) };
  } else {
    return state;
  }

  next.log = appendLog(
    next.log,
    `${getHero(target.heroId)?.name} erhält ${item === "heal" ? "eine Heilration" : "neue Kraft"}.`,
  );
  return advanceTurn(next, buffs);
}
