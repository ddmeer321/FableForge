export type Rarity =
  | "Common"
  | "Uncommon"
  | "Rare"
  | "Epic"
  | "Legendary"
  | "Mythic"
  | "Secret";

export type HeroRole =
  | "Tank"
  | "Nahkampf-DPS"
  | "Fernkampf-DPS"
  | "Heiler"
  | "Support";

export type TeamPosition = "Front" | "Mitte" | "Hinten";
export type TeamBehavior =
  | "Offensiv"
  | "Ausgeglichen"
  | "Defensiv"
  | "Team schützen";
export type TargetPriority = "Nächstes Ziel" | "Schwache Gegner" | "Boss";

export type HeroDefinition = {
  id: string;
  name: string;
  epithet: string;
  role: HeroRole;
  rarity: Rarity;
  baseHp: number;
  baseAttack: number;
  baseDefense: number;
  speed: number;
  activeName: string;
  activeDescription: string;
  passiveName: string;
  passiveDescription: string;
  palette: string;
  portrait: "knight" | "archer" | "healer" | "rogue" | "mage" | "guardian" | "bard";
};

export type GearSlot = "Waffe" | "Rüstung" | "Ring" | "Relikt";

export type GearDefinition = {
  id: string;
  name: string;
  slot: GearSlot;
  rarity: Rarity;
  attack?: number;
  defense?: number;
  hp?: number;
  speed?: number;
  perk: string;
  icon: string;
};

export type BoxCurrency = "keys" | "gold" | "crystals" | "bossKeys";

export type BoxDefinition = {
  id: string;
  name: string;
  subtitle: string;
  kind: "hero" | "gear" | "cosmetic" | "event" | "boss";
  cost: number;
  currency: BoxCurrency;
  pityMax: number;
  accent: string;
  availability: string;
  chances: Partial<Record<Rarity, number>>;
  contents: string[];
};

export type DungeonDefinition = {
  id: string;
  name: string;
  subtitle: string;
  description: string;
  theme: "forest" | "frost" | "ember" | "void";
  difficulty: number;
  recommendedPower: number;
  boss: string;
  mechanic: string;
  accent: string;
};

export type PlayerHero = {
  id: string;
  level: number;
  xp: number;
  stars: number;
  fragments: number;
};

export type OwnedGear = {
  uid: string;
  definitionId: string;
  level: number;
  equippedBy: string | null;
};

export type TeamSlot = {
  heroId: string;
  position: TeamPosition;
  behavior: TeamBehavior;
  target: TargetPriority;
};

export type CurrencyWallet = {
  gold: number;
  keys: number;
  crystals: number;
  bossKeys: number;
};

export type OnboardingStep = "intro" | "starterGear" | "tutorial" | "ready";

export type PlayerProgress = {
  version: 2;
  onboarding: OnboardingStep;
  wallet: CurrencyWallet;
  heroes: PlayerHero[];
  gear: OwnedGear[];
  cosmetics: string[];
  team: TeamSlot[];
  pity: Record<string, number>;
  unlockedDungeons: string[];
  completedRuns: number;
  lastUnlockedDungeon: string;
  audioEnabled: boolean;
};

export type LootResult = {
  kind: "hero" | "gear" | "cosmetic";
  definitionId: string;
  rarity: Rarity;
  duplicate: boolean;
  fragments?: number;
};

export type AppScreen =
  | "lobby"
  | "boxes"
  | "heroes"
  | "gear"
  | "team"
  | "dungeons"
  | "run";

export type RoomType =
  | "fight"
  | "elite"
  | "treasure"
  | "merchant"
  | "healing"
  | "event"
  | "risk"
  | "miniboss"
  | "boss";

export type RoomChoice = {
  id: string;
  type: RoomType;
  title: string;
  subtitle: string;
  danger: "Sicher" | "Unbekannt" | "Gefährlich";
  reward: string;
  icon: string;
};

export type RunBuff = {
  id: string;
  name: string;
  description: string;
  icon: string;
};

export type CombatHero = {
  heroId: string;
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  speed: number;
  energy: number;
  shield: number;
  nextAction: number;
  shelterCooldownUntil: number;
  position: TeamPosition;
  behavior: TeamBehavior;
  target: TargetPriority;
  powerUntil: number;
};

export type CombatEnemy = {
  id: string;
  name: string;
  kind:
    | "sprout"
    | "wolf"
    | "shaman"
    | "golem"
    | "boss"
    | "ice-wisp"
    | "frost-wolf"
    | "crystal-golem"
    | "ice-queen";
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  nextAction: number;
  boss: boolean;
};

export type CombatEffect = {
  id: number;
  kind: "damage" | "heal" | "shield" | "ability" | "warning";
  text: string;
  targetId: string;
  sourceId?: string;
  createdAt: number;
};

export type CombatState = {
  dungeonId: string;
  heroes: CombatHero[];
  enemies: CombatEnemy[];
  shelterHeroId: string | null;
  paused: boolean;
  outcome: "victory" | "defeat" | null;
  selectedEnemyId: string | null;
  healItems: number;
  powerTonics: number;
  switchReadyAt: number;
  log: string[];
  effects: CombatEffect[];
  effectSequence: number;
  damageDone: number;
  environmentNextAt: number;
  environmentPulse: number;
  startedAt: number;
  lastTick: number;
};

export type RunEvent = {
  id: string;
  title: string;
  story: string;
  artwork: "statue" | "chest" | "merchant" | "spring" | "mirror";
  choices: {
    id: string;
    label: string;
    consequence: string;
  }[];
};

export type DungeonRunPhase =
  | "path"
  | "travel"
  | "combat"
  | "event"
  | "powerup"
  | "bossIntro"
  | "reward"
  | "defeat";

export type DungeonRun = {
  dungeonId: string;
  stage: number;
  phase: DungeonRunPhase;
  routePlan: RoomChoice[][];
  choices: RoomChoice[];
  currentRoom: RoomChoice | null;
  event: RunEvent | null;
  combat: CombatState | null;
  buffChoices: RunBuff[];
  buffs: RunBuff[];
  earnedGold: number;
  earnedKeys: number;
  earnedXp: number;
  roomsCleared: number;
  pathHistory: RoomChoice[];
  partyHp: Record<string, number>;
  bonusHealItems: number;
  nextCombatEnergy: number;
  message: string;
};

export type RunRewards = {
  dungeonId: string;
  gold: number;
  keys: number;
  crystals: number;
  bossKeys: number;
  xp: number;
};
