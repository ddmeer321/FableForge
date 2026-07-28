import {
  BOXES,
  COSMETICS,
  GEAR,
  HEROES,
  RARITY_ORDER,
  RUN_BUFFS,
  getCosmetic,
  getGear,
  getHero,
} from "./data";
import type {
  BoxDefinition,
  CombatEffect,
  CombatEnemy,
  CombatHero,
  CombatState,
  DungeonRun,
  LootResult,
  PlayerProgress,
  Rarity,
  RoomChoice,
  RoomType,
  RunBuff,
  RunEvent,
  TeamSlot,
} from "./types";

const rarityScore = (rarity: Rarity) => RARITY_ORDER.indexOf(rarity);
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const randomOf = <T,>(items: T[]) => items[Math.floor(Math.random() * items.length)];
const shuffled = <T,>(items: T[]) => [...items].sort(() => Math.random() - 0.5);

export function createInitialProgress(): PlayerProgress {
  return {
    version: 2,
    onboarding: "intro",
    wallet: { gold: 650, keys: 2, crystals: 55, bossKeys: 0 },
    heroes: [],
    gear: [],
    cosmetics: [],
    equippedCosmetics: { skins: {}, aura: null, trail: null },
    team: [],
    pity: Object.fromEntries(BOXES.map((box) => [box.id, 0])),
    unlockedDungeons: ["whispering-woods"],
    completedRuns: 0,
    lastUnlockedDungeon: "Flüsterwald",
    audioEnabled: true,
  };
}

export function normalizeProgress(value: unknown): PlayerProgress | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<PlayerProgress>;
  if (
    candidate.version !== 2 ||
    !Array.isArray(candidate.heroes) ||
    !Array.isArray(candidate.gear) ||
    !Array.isArray(candidate.team) ||
    !candidate.wallet
  ) {
    return null;
  }

  const initial = createInitialProgress();
  const cosmetics = (Array.isArray(candidate.cosmetics) ? candidate.cosmetics : []).filter(
    (id): id is string => typeof id === "string" && Boolean(getCosmetic(id)),
  );
  const owned = new Set(cosmetics);
  const heroIds = new Set(candidate.heroes.map((hero) => hero.id));
  const rawLoadout = candidate.equippedCosmetics;
  const skins = Object.fromEntries(
    Object.entries(rawLoadout?.skins ?? {}).filter(([heroId, cosmeticId]) => {
      const cosmetic = getCosmetic(cosmeticId);
      return heroIds.has(heroId) && owned.has(cosmeticId) && cosmetic?.kind === "skin";
    }),
  );
  const aura =
    rawLoadout?.aura && owned.has(rawLoadout.aura) && getCosmetic(rawLoadout.aura)?.kind === "aura"
      ? rawLoadout.aura
      : null;
  const trail =
    rawLoadout?.trail && owned.has(rawLoadout.trail) && getCosmetic(rawLoadout.trail)?.kind === "trail"
      ? rawLoadout.trail
      : null;

  return {
    ...initial,
    ...candidate,
    version: 2,
    cosmetics,
    equippedCosmetics: { skins, aura, trail },
    pity: { ...initial.pity, ...(candidate.pity ?? {}) },
  };
}

export function starterHeroResult(): LootResult {
  return {
    kind: "hero",
    definitionId: "astra",
    rarity: "Rare",
    duplicate: false,
  };
}

export function starterGearResult(): LootResult {
  return {
    kind: "gear",
    definitionId: "sunbow",
    rarity: "Rare",
    duplicate: false,
  };
}

function rollRarity(box: BoxDefinition, pity: number): Rarity {
  if (pity >= box.pityMax - 1) {
    const guaranteed = RARITY_ORDER.filter(
      (rarity) => rarityScore(rarity) >= rarityScore("Rare") && box.chances[rarity],
    );
    return randomOf(guaranteed);
  }

  const roll = Math.random() * 100;
  let cursor = 0;
  for (const rarity of RARITY_ORDER) {
    cursor += box.chances[rarity] ?? 0;
    if (roll <= cursor) return rarity;
  }
  return "Common";
}

function closestContent(
  requested: Rarity,
  candidates: { id: string; rarity: Rarity; kind: LootResult["kind"] }[],
) {
  const exact = candidates.filter((candidate) => candidate.rarity === requested);
  if (exact.length) return randomOf(exact);
  return [...candidates].sort(
    (a, b) =>
      Math.abs(rarityScore(a.rarity) - rarityScore(requested)) -
      Math.abs(rarityScore(b.rarity) - rarityScore(requested)),
  )[0];
}

export function rollBox(progress: PlayerProgress, box: BoxDefinition): LootResult {
  const rarity = rollRarity(box, progress.pity[box.id] ?? 0);
  const candidates = box.contents
    .map((id) => {
      const hero = HEROES.find((entry) => entry.id === id);
      if (hero) return { id, rarity: hero.rarity, kind: "hero" as const };
      const gear = GEAR.find((entry) => entry.id === id);
      if (gear) return { id, rarity: gear.rarity, kind: "gear" as const };
      const cosmetic = COSMETICS.find((entry) => entry.id === id);
      if (cosmetic) return { id, rarity: cosmetic.rarity, kind: "cosmetic" as const };
      return null;
    })
    .filter((candidate): candidate is NonNullable<typeof candidate> => Boolean(candidate));
  const chosen = closestContent(rarity, candidates);
  const duplicate =
    chosen.kind === "hero"
      ? progress.heroes.some((hero) => hero.id === chosen.id)
      : chosen.kind === "cosmetic"
        ? progress.cosmetics.includes(chosen.id)
        : false;

  return {
    kind: chosen.kind,
    definitionId: chosen.id,
    rarity: chosen.rarity,
    duplicate,
    fragments: duplicate && chosen.kind === "hero" ? 24 + rarityScore(chosen.rarity) * 8 : undefined,
  };
}

export function totalHeroStats(progress: PlayerProgress, heroId: string) {
  const definition = getHero(heroId);
  const owned = progress.heroes.find((hero) => hero.id === heroId);
  if (!definition || !owned) return null;

  const levelFactor = 1 + (owned.level - 1) * 0.07 + (owned.stars - 1) * 0.09;
  const equipped = progress.gear
    .filter((gear) => gear.equippedBy === heroId)
    .map((gear) => getGear(gear.definitionId))
    .filter((gear): gear is NonNullable<typeof gear> => Boolean(gear));

  return {
    hp: Math.round(definition.baseHp * levelFactor + equipped.reduce((sum, gear) => sum + (gear.hp ?? 0), 0)),
    attack: Math.round(
      definition.baseAttack * levelFactor + equipped.reduce((sum, gear) => sum + (gear.attack ?? 0), 0),
    ),
    defense: Math.round(
      definition.baseDefense * levelFactor + equipped.reduce((sum, gear) => sum + (gear.defense ?? 0), 0),
    ),
    speed: Math.round(definition.speed + equipped.reduce((sum, gear) => sum + (gear.speed ?? 0), 0)),
    power: Math.round(
      definition.baseHp * levelFactor * 0.45 +
        definition.baseAttack * levelFactor * 3 +
        definition.baseDefense * levelFactor * 4,
    ),
  };
}

export function teamPower(progress: PlayerProgress) {
  return progress.team.reduce((sum, slot) => sum + (totalHeroStats(progress, slot.heroId)?.power ?? 0), 0);
}

const FOREST_ROOM_LIBRARY: Record<RoomType, Omit<RoomChoice, "id" | "type">[]> = {
  fight: [
    { title: "Wurzelpfad", subtitle: "Waldlinge blockieren den Weg", danger: "Sicher", reward: "Gold & Erfahrung", icon: "swords" },
    { title: "Pilzlichtung", subtitle: "Kleine Sporenwesen lauern", danger: "Sicher", reward: "Gold & Heilpflanze", icon: "mushroom" },
  ],
  elite: [
    { title: "Brombeer-Arena", subtitle: "Ein Rudel Dornwölfe jagt hier", danger: "Gefährlich", reward: "Seltene Beute", icon: "claw" },
  ],
  treasure: [
    { title: "Verwachsene Truhe", subtitle: "Etwas glitzert unter den Ranken", danger: "Unbekannt", reward: "Zufälliger Schatz", icon: "chest" },
  ],
  merchant: [
    { title: "Moosbasar", subtitle: "Ein verletzter Händler winkt", danger: "Sicher", reward: "Vorräte & Handel", icon: "shop" },
  ],
  healing: [
    { title: "Mondquelle", subtitle: "Klares Wasser flüstert Namen", danger: "Sicher", reward: "Team-Regeneration", icon: "spring" },
  ],
  event: [
    { title: "Singende Statue", subtitle: "Der Stein verlangt ein Opfer", danger: "Unbekannt", reward: "Starker Segen", icon: "statue" },
  ],
  risk: [
    { title: "Verbotener Hohlweg", subtitle: "Große Gefahr, große Beute", danger: "Gefährlich", reward: "Kristalle & Fluch", icon: "risk" },
  ],
  miniboss: [
    { title: "Hain des Kolosses", subtitle: "Der Rindenwächter erwacht", danger: "Gefährlich", reward: "Epische Chance", icon: "golem" },
  ],
  boss: [
    { title: "Herzbaum", subtitle: "Waldhüter Nox wartet", danger: "Gefährlich", reward: "Bossbox & Dungeon-Beute", icon: "boss" },
  ],
};

const FROST_ROOM_LIBRARY: Record<RoomType, Omit<RoomChoice, "id" | "type">[]> = {
  fight: [
    { title: "Splittersteg", subtitle: "Eislichter kreisen über dem Abgrund", danger: "Sicher", reward: "Gold & Erfahrung", icon: "snow" },
    { title: "Raureif-Galerie", subtitle: "Frostwölfe wittern warme Spuren", danger: "Sicher", reward: "Gold & Wärmeessenz", icon: "claw" },
  ],
  elite: [
    { title: "Spiegelarena", subtitle: "Zwei Alpha-Frostwölfe bewachen das Tor", danger: "Gefährlich", reward: "Seltene Frostbeute", icon: "swords" },
  ],
  treasure: [
    { title: "Eingefrorene Schatzkammer", subtitle: "Eine Truhe steckt tief im blauen Eis", danger: "Unbekannt", reward: "Kristallschatz", icon: "chest" },
  ],
  merchant: [
    { title: "Laternenlager", subtitle: "Händlerin Ylva schützt ihre letzte Flamme", danger: "Sicher", reward: "Wärme & Vorräte", icon: "shop" },
  ],
  healing: [
    { title: "Thermalgrotte", subtitle: "Warmer Dampf steigt zwischen Kristallen auf", danger: "Sicher", reward: "Team-Regeneration", icon: "spring" },
  ],
  event: [
    { title: "Flüsterspiegel", subtitle: "Dein Spiegelbild bewegt sich zu früh", danger: "Unbekannt", reward: "Frostsegen", icon: "snow" },
  ],
  risk: [
    { title: "Knackendes Eisfeld", subtitle: "Der direkte Weg führt über dünnes Eis", danger: "Gefährlich", reward: "Kristalle & Risiko", icon: "risk" },
  ],
  miniboss: [
    { title: "Kathedrale der Splitter", subtitle: "Der Kristallwächter erhebt sich", danger: "Gefährlich", reward: "Epische Chance", icon: "golem" },
  ],
  boss: [
    { title: "Frostthron", subtitle: "Königin Skadi erwartet euch", danger: "Gefährlich", reward: "Bossbox & Dungeon-Beute", icon: "boss" },
  ],
};

function room(type: RoomType, stage: number, index: number, dungeonId: string): RoomChoice {
  const library = dungeonId === "frostglass-cavern" ? FROST_ROOM_LIBRARY : FOREST_ROOM_LIBRARY;
  const source = randomOf(library[type]);
  return { ...source, id: `${stage}-${type}-${index}-${Math.floor(Math.random() * 9999)}`, type };
}

export function generateRoomChoices(stage: number, dungeonId = "whispering-woods"): RoomChoice[] {
  const forestLayouts: RoomType[][] = [
    ["fight", "event"], ["treasure", "fight"], ["elite", "healing"], ["merchant", "fight"],
    ["risk", "event"], ["elite", "treasure"], ["healing", "fight"], ["elite", "merchant"],
    ["risk", "fight"], ["miniboss", "event"],
  ];
  const frostLayouts: RoomType[][] = [
    ["fight", "healing"], ["event", "fight"], ["elite", "treasure"], ["merchant", "risk"],
    ["fight", "event"], ["elite", "healing"], ["treasure", "fight"], ["risk", "elite"],
    ["merchant", "fight"], ["miniboss", "event"],
  ];
  const layouts = dungeonId === "frostglass-cavern" ? frostLayouts : forestLayouts;
  return shuffled(layouts[Math.min(stage, layouts.length - 1)]).map(
    (type, index) => room(type, stage, index, dungeonId),
  );
}

export function createRun(dungeonId = "whispering-woods"): DungeonRun {
  const routePlan = Array.from({ length: 10 }, (_, stage) => generateRoomChoices(stage, dungeonId));
  const frost = dungeonId === "frostglass-cavern";
  return {
    dungeonId,
    stage: 0,
    phase: "path",
    routePlan,
    choices: routePlan[0],
    currentRoom: null,
    event: null,
    combat: null,
    buffChoices: [],
    buffs: [],
    earnedGold: 0,
    earnedKeys: 0,
    earnedXp: 0,
    roomsCleared: 0,
    pathHistory: [],
    partyHp: {},
    bonusHealItems: 0,
    nextCombatEnergy: 0,
    message: frost
      ? "Wähle den ersten Pfad in die Frostglas-Höhlen."
      : "Wähle den ersten Pfad in den Flüsterwald.",
  };
}

export function beginRoomTravel(run: DungeonRun, choice: RoomChoice): DungeonRun {
  if (run.phase !== "path") return run;
  return {
    ...run,
    phase: "travel",
    currentRoom: choice,
    pathHistory: [...run.pathHistory, choice],
    message: `Die Gruppe folgt dem Weg zum ${choice.title}.`,
  };
}

export function createEventForRoom(type: RoomType, dungeonId = "whispering-woods"): RunEvent {
  if (dungeonId === "frostglass-cavern") {
    if (type === "treasure") {
      return {
        id: "frozen-chest",
        title: "Die Truhe im blauen Eis",
        story: "Unter einer klaren Eisschicht liegt eine königliche Truhe. Jeder Schlag lässt die Decke knacken.",
        artwork: "chest",
        choices: [
          { id: "shatter", label: "Eis zerschlagen", consequence: "+220 Gold, aber das Team verliert 12 % Leben." },
          { id: "thaw", label: "Für 90 Gold auftauen", consequence: "Sicher öffnen und eine Heilration finden." },
          { id: "leave-ice", label: "Fundort markieren", consequence: "+1 Schlüssel am Ende des Runs." },
        ],
      };
    }
    if (type === "merchant") {
      return {
        id: "flame-merchant",
        title: "Ylvas letzte Flamme",
        story: "Die Händlerin kauert an einer winzigen Laterne. Ohne Brennstoff übersteht niemand die nächste Frostwelle.",
        artwork: "merchant",
        choices: [
          { id: "share-flame", label: "Brennstoff teilen", consequence: "Das Team heilt 25 % und erhält eine Heilration." },
          { id: "steal-flame", label: "Die Laterne nehmen", consequence: "+260 Gold, aber ihre Frostwölfe greifen an." },
          { id: "pass-camp", label: "Weiterziehen", consequence: "Keine Wirkung." },
        ],
      };
    }
    if (type === "healing") {
      return {
        id: "thermal-grotto",
        title: "Die Thermalquelle",
        story: "Heißer Dampf füllt eine geschützte Grotte. Die Wärme reicht nur für eine kurze Rast.",
        artwork: "spring",
        choices: [
          { id: "thermal-rest", label: "Gemeinsam rasten", consequence: "Heilt das Team um 40 %." },
          { id: "thermal-bottle", label: "Wasser abfüllen", consequence: "+1 Heilitem für kommende Kämpfe." },
          { id: "focus-crystal", label: "Kristalle fokussieren", consequence: "+25 Startenergie im nächsten Kampf." },
        ],
      };
    }
    return {
      id: "frost-mirror",
      title: "Der Flüsterspiegel",
      story: "Im Eis erscheint eine Zukunft, in der euer Team den Frostthron erreicht. Das Bild verlangt Wärme als Preis.",
      artwork: "mirror",
      choices: [
        { id: "touch-mirror", label: "Das Spiegelbild berühren", consequence: "Verliere 20 % Leben und erhalte einen mächtigen Frostsegen." },
        { id: "melt-mirror", label: "140 Gold opfern", consequence: "Kristallschilde schützen jede Frostwelle." },
        { id: "walk-away", label: "Dem Bild misstrauen", consequence: "Der Weg bleibt sicher." },
      ],
    };
  }
  if (type === "treasure") {
    return {
      id: "broken-chest",
      title: "Die beschädigte Truhe",
      story: "Zwischen den Wurzeln steckt eine alte Truhe. Ihr Schloss zischt verdächtig.",
      artwork: "chest",
      choices: [
        { id: "open", label: "Sofort öffnen", consequence: "+180 Gold, aber das Team verliert 10 % Leben." },
        { id: "repair", label: "Für 80 Gold reparieren", consequence: "Sicher öffnen und eine Heilration finden." },
        { id: "ignore", label: "Markieren und weitergehen", consequence: "+1 Schlüssel am Ende des Runs." },
      ],
    };
  }
  if (type === "merchant") {
    return {
      id: "wounded-merchant",
      title: "Der verletzte Händler",
      story: "Pip der Mooshändler hält sich die Seite. Seine Waren liegen überall im Farn.",
      artwork: "merchant",
      choices: [
        { id: "help", label: "Pip helfen", consequence: "Das Team heilt 20 % und erhält Rabatt-Proviant." },
        { id: "rob", label: "Eine Kiste nehmen", consequence: "+240 Gold, aber ein Elitekampf folgt." },
        { id: "leave", label: "Freundlich weitergehen", consequence: "Keine Wirkung." },
      ],
    };
  }
  if (type === "healing") {
    return {
      id: "moon-spring",
      title: "Die Mondquelle",
      story: "Das Wasser leuchtet wie flüssiger Himmel. Es reicht nicht für alle Wünsche.",
      artwork: "spring",
      choices: [
        { id: "drink", label: "Gemeinsam trinken", consequence: "Heilt das Team um 35 %." },
        { id: "bottle", label: "Wasser abfüllen", consequence: "+1 Heilitem für kommende Kämpfe." },
        { id: "listen", label: "Dem Wasser lauschen", consequence: "+20 Startenergie im nächsten Kampf." },
      ],
    };
  }
  return {
    id: "hungry-statue",
    title: "Die hungrige Statue",
    story: "Eine steinerne Eule öffnet goldene Augen: „Kraft hat immer einen Preis.“",
    artwork: "statue",
    choices: [
      { id: "sacrifice", label: "25 % Leben opfern", consequence: "Erhalte dauerhaft +28 % Angriff für diesen Run." },
      { id: "pay", label: "120 Gold anbieten", consequence: "Erhalte einen Schutzsegen." },
      { id: "decline", label: "Ablehnen", consequence: "Die Statue schweigt. Der Weg bleibt sicher." },
    ],
  };
}

export function selectRunBuffs(existing: RunBuff[], dungeonId = "whispering-woods") {
  const existingIds = new Set(existing.map((buff) => buff.id));
  const frostIds = new Set(["warm-core", "crystal-guard", "shatterpoint", "shelter-thaw"]);
  const pool = RUN_BUFFS.filter((buff) => {
    if (existingIds.has(buff.id)) return false;
    return dungeonId === "frostglass-cavern" || !frostIds.has(buff.id);
  });
  return shuffled(pool).slice(0, 3);
}

function enemy(
  id: string,
  name: string,
  kind: CombatEnemy["kind"],
  hp: number,
  attack: number,
  defense: number,
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
    initiative: boss ? 72 : kind === "wolf" || kind === "frost-wolf" ? 68 : 54,
    initiativePenalty: 0,
    nextAction: Date.now() + 1400 + Math.random() * 500,
    boss,
  };
}

function enemiesForRoom(type: RoomType, dungeonId: string): CombatEnemy[] {
  if (dungeonId === "frostglass-cavern") {
    if (type === "boss") return [enemy("skadi", "Königin Skadi", "ice-queen", 2700, 34, 12, true)];
    if (type === "miniboss") return [enemy("crystal-sentinel", "Kristallwächter", "crystal-golem", 1150, 30, 12)];
    if (type === "elite") {
      return [
        enemy("frost-wolf-a", "Alpha-Frostwolf", "frost-wolf", 470, 25, 6),
        enemy("frost-wolf-b", "Alpha-Frostwolf", "frost-wolf", 470, 25, 6),
      ];
    }
    return [
      enemy("ice-wisp-a", "Eislicht", "ice-wisp", 270, 18, 4),
      enemy("ice-wisp-b", "Eislicht", "ice-wisp", 270, 18, 4),
      enemy("frost-hunter", "Frostwolf", "frost-wolf", 360, 22, 5),
    ];
  }
  if (type === "boss") return [enemy("nox", "Waldhüter Nox", "boss", 1900, 27, 9, true)];
  if (type === "miniboss") return [enemy("bark-golem", "Rindenkoloss", "golem", 800, 25, 8)];
  if (type === "elite") {
    return [
      enemy("thorn-wolf-a", "Dornwolf", "wolf", 340, 20, 4),
      enemy("thorn-wolf-b", "Dornwolf", "wolf", 340, 20, 4),
    ];
  }
  return [
    enemy("sprout-a", "Waldling", "sprout", 200, 14, 2),
    enemy("sprout-b", "Waldling", "sprout", 200, 14, 2),
    enemy("shaman", "Sporenschamane", "shaman", 260, 17, 3),
  ];
}

export function createCombat(
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
        energy: clamp((getHero(slot.heroId)?.id === "solenne" ? 20 : 0) + nextCombatEnergy, 0, 100),
        shield: 0,
        nextAction: start + 500 + Math.random() * 500,
        shelterCooldownUntil: 0,
        shelterReadyRound: 0,
        position: slot.position,
        behavior: slot.behavior,
        target: slot.target,
        powerUntil: 0,
        powerTurns: 0,
        skipTurns: 0,
      } satisfies CombatHero;
    })
    .filter((hero): hero is CombatHero => Boolean(hero));

  const enemies = enemiesForRoom(type, dungeonId);
  const playerHeroId = heroes[0]?.heroId ?? "";
  const turnOrder = [
    ...heroes.map((hero) => ({ id: hero.heroId, side: "hero" as const, initiative: hero.speed })),
    ...enemies.map((entry) => ({ id: entry.id, side: "enemy" as const, initiative: entry.initiative })),
  ].sort((a, b) => b.initiative - a.initiative);

  return {
    dungeonId,
    heroes,
    enemies,
    playerHeroId,
    turnOrder,
    turnIndex: 0,
    round: 1,
    turnReadyAt: start,
    playerActionCooldowns: { quick: 0, heavy: 0, disrupt: 0, signature: 0 },
    shelterHeroId: null,
    shelterHealedThisTurn: false,
    paused: false,
    outcome: null,
    selectedEnemyId: null,
    healItems: 2 + bonusHealItems,
    powerTonics: 1,
    switchReadyAt: 0,
    shelterSwitchReadyRound: 0,
    log: dungeonId === "frostglass-cavern"
      ? ["Der Frost reagiert auf jede Bewegung.", "Der Schutzraum bewahrt einen Helden vor Frostwellen."]
      : ["Der Kampf beginnt. Fähigkeiten laden sich durch Angriffe auf.", "Wähle Ziele und nutze den Schutzraum."],
    effects: [],
    effectSequence: 0,
    damageDone: 0,
    environmentNextAt: dungeonId === "frostglass-cavern" ? start + 7000 : Number.POSITIVE_INFINITY,
    environmentNextRound: dungeonId === "frostglass-cavern" ? 3 : Number.POSITIVE_INFINITY,
    environmentPulse: 0,
    startedAt: start,
    lastTick: start,
  };
}

function appendLog(log: string[], message: string) {
  return [message, ...log].slice(0, 5);
}

function addEffect(
  effects: CombatEffect[],
  sequence: number,
  kind: CombatEffect["kind"],
  text: string,
  targetId: string,
  sourceId?: string,
) {
  return [{ id: sequence, kind, text, targetId, sourceId, createdAt: Date.now() }, ...effects].slice(0, 10);
}

function chooseTarget(hero: CombatHero, enemies: CombatEnemy[], selected: string | null) {
  const alive = enemies.filter((entry) => entry.hp > 0);
  const boss = alive.find((entry) => entry.boss);
  const manual = alive.find((entry) => entry.id === selected);
  if (hero.target === "Boss" && boss) return boss;
  if (manual) return manual;
  if (hero.target === "Schwache Gegner") return [...alive].sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
  return alive[0];
}

export function tickCombat(state: CombatState, buffs: RunBuff[]): CombatState {
  const time = Date.now();
  if (state.outcome) return state;
  if (state.paused) return { ...state, lastTick: time };
  const deltaSeconds = clamp((time - state.lastTick) / 1000, 0, 0.5);
  const heroes = state.heroes.map((hero) => ({ ...hero }));
  const enemies = state.enemies.map((entry) => ({ ...entry }));
  let log = state.log;
  let effects = state.effects.filter((effect) => time - effect.createdAt < 950);
  let sequence = state.effectSequence;
  let shelterHeroId = state.shelterHeroId;
  let damageDone = state.damageDone;
  let environmentNextAt = state.environmentNextAt;
  let environmentPulse = state.environmentPulse;

  const sheltered = heroes.find((hero) => hero.heroId === shelterHeroId && hero.hp > 0);
  if (sheltered) {
    const healerBonus = heroes.some(
      (hero) => hero.hp > 0 && getHero(hero.heroId)?.role === "Heiler",
    )
      ? 1.5
      : 1;
    const buffBonus = buffs.some((buff) => buff.id === "sanctuary-bloom") ? 1.7 : 1;
    const cap = sheltered.maxHp * 0.78;
    if (sheltered.hp < cap) {
      sheltered.hp = Math.min(
        cap,
        sheltered.hp + sheltered.maxHp * 0.018 * healerBonus * buffBonus * deltaSeconds,
      );
    }
    if (
      state.dungeonId === "frostglass-cavern" &&
      buffs.some((buff) => buff.id === "shelter-thaw") &&
      time >= environmentNextAt
    ) {
      sheltered.energy = clamp(sheltered.energy + 25, 0, 100);
    }
  }

  if (state.dungeonId === "frostglass-cavern" && time >= environmentNextAt) {
    environmentPulse += 1;
    const deepFreeze = environmentPulse % 3 === 0;
    const warmCore = buffs.some((buff) => buff.id === "warm-core");
    const crystalGuard = buffs.some((buff) => buff.id === "crystal-guard");
    const delay = (deepFreeze ? 1800 : 900) * (warmCore ? 0.5 : 1);

    heroes
      .filter((hero) => hero.hp > 0 && hero.heroId !== shelterHeroId)
      .forEach((hero) => {
        hero.nextAction += delay;
        if (crystalGuard) hero.shield += 16;
        sequence += 1;
        effects = addEffect(
          effects,
          sequence,
          deepFreeze ? "warning" : crystalGuard ? "shield" : "warning",
          deepFreeze ? "EINGEFROREN" : crystalGuard ? "+16 SCHILD" : "FROST",
          hero.heroId,
        );
      });

    log = appendLog(
      log,
      deepFreeze
        ? "Tieffrost! Das aktive Team wird kurz eingefroren."
        : "Eine Frostwelle verlangsamt alle Helden außerhalb des Schutzraums.",
    );
    const bossAlive = enemies.some((entry) => entry.boss && entry.hp > 0);
    environmentNextAt = time + (bossAlive ? 5600 : 7600);
  }

  for (const hero of heroes) {
    if (hero.hp <= 0 || hero.heroId === shelterHeroId || time < hero.nextAction) continue;
    const target = chooseTarget(hero, enemies, state.selectedEnemyId);
    if (!target) break;
    const definition = getHero(hero.heroId);
    const critical = Math.random() < 0.14;
    const power = time < hero.powerUntil ? 1.35 : 1;
    const behavior = hero.behavior === "Offensiv" ? 1.12 : hero.behavior === "Defensiv" ? 0.9 : 1;
    const base = hero.attack * power * behavior * (0.86 + Math.random() * 0.28);
    const damage = Math.max(2, Math.round(base * (critical ? 1.75 : 1) - target.defense));
    target.hp = clamp(target.hp - damage, 0, target.maxHp);
    hero.energy = clamp(hero.energy + 17, 0, 100);
    hero.nextAction = time + Math.max(520, 1750 - hero.speed * 7);
    damageDone += damage;
    sequence += 1;
    effects = addEffect(
      effects,
      sequence,
      "damage",
      `${critical ? "KRIT " : ""}-${damage}`,
      target.id,
      hero.heroId,
    );

    if (definition?.role === "Fernkampf-DPS" && buffs.some((buff) => buff.id === "double-arrow")) {
      const second = enemies.find((entry) => entry.hp > 0 && entry.id !== target.id);
      if (second) {
        const secondDamage = Math.max(1, Math.round(damage * 0.45));
        second.hp = clamp(second.hp - secondDamage, 0, second.maxHp);
        damageDone += secondDamage;
      }
    }
    if (buffs.some((buff) => buff.id === "thorn-strikes") && Math.floor(damageDone / 100) !== Math.floor((damageDone - damage) / 100)) {
      enemies.filter((entry) => entry.hp > 0).forEach((entry) => {
        entry.hp = clamp(entry.hp - 12, 0, entry.maxHp);
      });
    }
    if (critical && buffs.some((buff) => buff.id === "slow-crit")) target.nextAction += 450;
  }

  if (enemies.every((entry) => entry.hp <= 0)) {
    return {
      ...state,
      heroes,
      enemies,
      effects,
      effectSequence: sequence,
      shelterHeroId,
      damageDone,
      environmentNextAt,
      environmentPulse,
      lastTick: time,
      outcome: "victory",
      log: appendLog(log, "Der Raum ist gesichert!"),
    };
  }

  for (const foe of enemies) {
    if (foe.hp <= 0 || time < foe.nextAction) continue;
    let active = heroes.filter((hero) => hero.hp > 0 && hero.heroId !== shelterHeroId);
    if (!active.length && sheltered) {
      shelterHeroId = null;
      sheltered.shelterCooldownUntil = time + 5000;
      active = [sheltered];
      log = appendLog(log, "Der letzte Held muss den Schutzraum verlassen!");
    }
    if (!active.length) break;

    const front = active.filter((hero) => hero.position === "Front");
    const protectors = active.filter(
      (hero) => hero.behavior === "Team schützen" || getHero(hero.heroId)?.role === "Tank",
    );
    const pool = protectors.length ? [...active, ...protectors, ...protectors] : front.length ? [...active, ...front] : active;
    const target = randomOf(pool);
    const guard = target.behavior === "Defensiv" ? 0.82 : target.position === "Front" ? 0.9 : 1;
    const rawDamage = Math.max(4, Math.round((foe.attack * (0.86 + Math.random() * 0.28) - target.defense) * guard));
    const absorbed = Math.min(target.shield, rawDamage);
    target.shield -= absorbed;
    const damage = rawDamage - absorbed;
    target.hp = clamp(target.hp - damage, 0, target.maxHp);
    foe.nextAction = time + (foe.boss ? 1160 : 1540) + Math.random() * 250;
    sequence += 1;
    effects = addEffect(
      effects,
      sequence,
      damage ? "damage" : "shield",
      damage ? `-${damage}` : "BLOCK",
      target.heroId,
      foe.id,
    );
    log = appendLog(log, `${foe.name} trifft ${getHero(target.heroId)?.name ?? "einen Helden"} für ${damage}.`);
  }

  const alive = heroes.filter((hero) => hero.hp > 0);
  const outcome = alive.length ? null : "defeat";
  if (outcome) log = appendLog(log, "Das Team wurde besiegt.");

  return {
    ...state,
    heroes,
    enemies,
    effects,
    effectSequence: sequence,
    shelterHeroId,
    damageDone,
    environmentNextAt,
    environmentPulse,
    log,
    lastTick: time,
    outcome,
  };
}

export function activateHeroAbility(state: CombatState, heroId: string, buffs: RunBuff[]): CombatState {
  if (state.outcome) return state;
  const heroes = state.heroes.map((hero) => ({ ...hero }));
  const enemies = state.enemies.map((entry) => ({ ...entry }));
  const hero = heroes.find((entry) => entry.heroId === heroId);
  const definition = getHero(heroId);
  if (!hero || !definition || hero.energy < 100 || hero.hp <= 0 || state.shelterHeroId === heroId) return state;

  hero.energy = 0;
  hero.nextAction = Date.now() + 700;
  let effects = state.effects.filter((effect) => Date.now() - effect.createdAt < 950);
  let sequence = state.effectSequence;
  let damageDone = state.damageDone;
  let log = appendLog(state.log, `${definition.name} nutzt ${definition.activeName}!`);

  if (definition.role === "Tank") {
    heroes.filter((entry) => entry.hp > 0).forEach((entry) => {
      entry.shield += Math.round(hero.defense * 2.4 + 18);
      sequence += 1;
      effects = addEffect(effects, sequence, "shield", "SCHILD", entry.heroId, heroId);
    });
  } else if (definition.role === "Heiler") {
    heroes.filter((entry) => entry.hp > 0).forEach((entry) => {
      const amount = Math.round(entry.maxHp * (buffs.some((buff) => buff.id === "healing-rain") ? 0.32 : 0.25));
      entry.hp = clamp(entry.hp + amount, 0, entry.maxHp);
      sequence += 1;
      effects = addEffect(effects, sequence, "heal", `+${amount}`, entry.heroId, heroId);
    });
  } else if (definition.role === "Support") {
    heroes.filter((entry) => entry.hp > 0).forEach((entry) => {
      entry.shield += 18;
      entry.powerUntil = Date.now() + 7000;
      entry.nextAction = Math.min(entry.nextAction, Date.now() + 250);
    });
  } else {
    const aliveEnemies = enemies.filter((entry) => entry.hp > 0);
    const targets =
      definition.role === "Fernkampf-DPS"
        ? aliveEnemies
        : [chooseTarget(hero, enemies, state.selectedEnemyId)].filter(Boolean) as CombatEnemy[];
    targets.forEach((target) => {
      const multiplier = definition.role === "Nahkampf-DPS" ? 2.4 : 1.45;
      const damage = Math.max(4, Math.round(hero.attack * multiplier - target.defense));
      target.hp = clamp(target.hp - damage, 0, target.maxHp);
      damageDone += damage;
      sequence += 1;
      effects = addEffect(effects, sequence, "ability", `-${damage}`, target.id, heroId);
    });
  }

  const outcome = enemies.every((entry) => entry.hp <= 0) ? "victory" : state.outcome;
  if (outcome === "victory") log = appendLog(log, "Der Raum ist gesichert!");
  return { ...state, heroes, enemies, effects, effectSequence: sequence, damageDone, log, outcome };
}

export function moveHeroToShelter(state: CombatState, heroId: string): CombatState {
  const time = Date.now();
  const hero = state.heroes.find((entry) => entry.heroId === heroId);
  if (
    state.shelterHeroId ||
    !hero ||
    hero.hp <= 0 ||
    hero.shelterCooldownUntil > time ||
    state.switchReadyAt > time ||
    state.outcome
  ) {
    return state;
  }
  return {
    ...state,
    shelterHeroId: heroId,
    switchReadyAt: time + 1800,
    log: appendLog(state.log, `${getHero(heroId)?.name} zieht sich in den Schutzraum zurück.`),
  };
}

export function returnHeroFromShelter(state: CombatState, buffs: RunBuff[]): CombatState {
  const time = Date.now();
  if (!state.shelterHeroId || state.switchReadyAt > time) return state;
  const heroId = state.shelterHeroId;
  const heroes = state.heroes.map((hero) =>
    hero.heroId === heroId
      ? {
          ...hero,
          shelterCooldownUntil: time + 5200,
          nextAction: time + 500,
          shield: hero.shield + (buffs.some((buff) => buff.id === "guardian-return") ? 35 : 0),
        }
      : hero,
  );
  return {
    ...state,
    heroes,
    shelterHeroId: null,
    switchReadyAt: time + 1800,
    log: appendLog(state.log, `${getHero(heroId)?.name} kehrt in den Kampf zurück.`),
  };
}

export function applyCombatItem(state: CombatState, item: "heal" | "power"): CombatState {
  const heroId = state.shelterHeroId;
  if (!heroId || state.outcome) return state;
  if (item === "heal" && state.healItems <= 0) return state;
  if (item === "power" && state.powerTonics <= 0) return state;
  const heroes = state.heroes.map((hero) => {
    if (hero.heroId !== heroId) return hero;
    if (item === "heal") return { ...hero, hp: clamp(hero.hp + hero.maxHp * 0.28, 0, hero.maxHp) };
    return { ...hero, powerUntil: Date.now() + 9000 };
  });
  return {
    ...state,
    heroes,
    healItems: state.healItems - (item === "heal" ? 1 : 0),
    powerTonics: state.powerTonics - (item === "power" ? 1 : 0),
    log: appendLog(
      state.log,
      `${getHero(heroId)?.name} erhält ${item === "heal" ? "eine Heilration" : "Waldkraft"}.`,
    ),
  };
}

export function cycleHeroPosition(state: CombatState, heroId: string): CombatState {
  const positions: CombatHero["position"][] = ["Front", "Mitte", "Hinten"];
  return {
    ...state,
    heroes: state.heroes.map((hero) =>
      hero.heroId === heroId
        ? { ...hero, position: positions[(positions.indexOf(hero.position) + 1) % positions.length] }
        : hero,
    ),
  };
}
