import assert from "node:assert/strict";
import test from "node:test";
import { COSMETICS } from "../app/game/data";
import {
  activateHeroAbility,
  beginRoomTravel,
  createCombat,
  createInitialProgress,
  createRun,
  normalizeProgress,
  tickCombat,
} from "../app/game/logic";
import {
  createTurnCombat,
  getCurrentCombatActor,
  getPlayerCombatActions,
  holdPlayerInShelter,
  isPlayerCombatTurn,
  moveTurnHeroToShelter,
  performPlayerCombatAction,
  returnTurnHeroFromShelter,
  tickTurnCombat,
} from "../app/game/turn-combat";

test("the cosmetics catalog contains only equipable skins, auras and trails", () => {
  assert.ok(COSMETICS.length >= 12);
  assert.deepEqual(
    [...new Set(COSMETICS.map((cosmetic) => cosmetic.kind))].sort(),
    ["aura", "skin", "trail"],
  );
  assert.ok(COSMETICS.every((cosmetic) => !/Titel|Emote/i.test(cosmetic.name)));
});

test("old saves gain a safe cosmetic loadout and discard retired cosmetics", () => {
  const oldSave = structuredClone(createInitialProgress()) as Partial<ReturnType<typeof createInitialProgress>>;
  delete oldSave.equippedCosmetics;
  oldSave.cosmetics = ["title-pathfinder", "emote-campfire", "skin-moonlit", "trail-fireflies"];

  const normalized = normalizeProgress(oldSave);

  assert.ok(normalized);
  assert.deepEqual(normalized.cosmetics, ["skin-moonlit", "trail-fireflies"]);
  assert.deepEqual(normalized.equippedCosmetics, { skins: {}, aura: null, trail: null });
});

function starterProgress() {
  const progress = createInitialProgress();
  progress.heroes = [
    { id: "brann", level: 1, xp: 0, stars: 1, fragments: 0 },
    { id: "astra", level: 1, xp: 0, stars: 1, fragments: 0 },
    { id: "mira", level: 1, xp: 0, stars: 1, fragments: 0 },
  ];
  progress.team = [
    { heroId: "brann", position: "Front", behavior: "Team schützen", target: "Nächstes Ziel" },
    { heroId: "astra", position: "Hinten", behavior: "Offensiv", target: "Schwache Gegner" },
    { heroId: "mira", position: "Mitte", behavior: "Defensiv", target: "Nächstes Ziel" },
  ];
  return progress;
}

test("turn combat makes the first team hero the only directly controlled character", () => {
  const progress = starterProgress();
  const combat = createTurnCombat(progress, progress.team, "fight", []);

  assert.equal(combat.playerHeroId, "brann");
  assert.equal(getPlayerCombatActions(combat.playerHeroId).length, 4);
  assert.ok(combat.turnOrder.some((actor) => actor.id === "brann"));
  assert.ok(combat.turnOrder.some((actor) => actor.id === "astra"));
  assert.ok(combat.turnOrder.some((actor) => actor.side === "enemy"));
});

test("turn combat waits for the player's choice and one attack consumes the turn", () => {
  const progress = starterProgress();
  const combat = createTurnCombat(progress, progress.team, "fight", []);
  combat.turnOrder = [{ id: combat.playerHeroId, side: "hero", initiative: 100 }];
  combat.turnIndex = 0;
  combat.turnReadyAt = 0;
  const enemyHp = combat.enemies[0].hp;

  const waiting = tickTurnCombat(combat, []);
  assert.equal(waiting.enemies[0].hp, enemyHp);
  assert.equal(isPlayerCombatTurn(waiting), true);

  const attacked = performPlayerCombatAction(waiting, "quick", []);
  assert.ok(attacked.enemies[0].hp < enemyHp);
  assert.equal(attacked.round, 2);
  assert.ok(attacked.effects.some((effect) => effect.sourceId === combat.playerHeroId));
});

test("companions use their initiative turn autonomously", () => {
  const progress = starterProgress();
  const combat = createTurnCombat(progress, progress.team, "fight", []);
  combat.turnOrder = [{ id: "astra", side: "hero", initiative: 70 }];
  combat.turnIndex = 0;
  combat.turnReadyAt = 0;
  const enemyHp = combat.enemies[0].hp;

  const next = tickTurnCombat(combat, []);

  assert.ok(next.enemies[0].hp < enemyHp);
  assert.ok(next.log[0].includes("selbstständig"));
});

test("the shelter costs the player's action and heals only on the sheltered companion's turn", () => {
  const progress = starterProgress();
  const combat = createTurnCombat(progress, progress.team, "fight", []);
  combat.turnOrder = [{ id: combat.playerHeroId, side: "hero", initiative: 100 }];
  combat.turnIndex = 0;
  combat.turnReadyAt = 0;
  const astra = combat.heroes.find((hero) => hero.heroId === "astra");
  assert.ok(astra);
  astra.hp = Math.round(astra.maxHp * 0.3);

  const sheltered = moveTurnHeroToShelter(combat, "astra", []);
  assert.equal(sheltered.shelterHeroId, "astra");
  assert.equal(sheltered.round, 2);
  assert.equal(isPlayerCombatTurn(sheltered), false);
  const hpBeforeShelterTurn = sheltered.heroes.find((hero) => hero.heroId === "astra")!.hp;

  sheltered.turnOrder = [{ id: "astra", side: "hero", initiative: astra.speed }];
  sheltered.turnIndex = 0;
  sheltered.turnReadyAt = 0;
  const healed = tickTurnCombat(sheltered, []);

  assert.ok(healed.heroes.find((hero) => hero.heroId === "astra")!.hp > hpBeforeShelterTurn);
});

test("the player can enter the shelter, receives automatic turn healing and chooses what happens next", () => {
  const progress = starterProgress();
  const combat = createTurnCombat(progress, progress.team, "fight", []);
  combat.turnOrder = [{ id: combat.playerHeroId, side: "hero", initiative: 100 }];
  combat.turnIndex = 0;
  combat.turnReadyAt = 0;
  const player = combat.heroes.find((hero) => hero.heroId === combat.playerHeroId);
  assert.ok(player);
  player.hp = Math.round(player.maxHp * 0.35);

  const entered = moveTurnHeroToShelter(combat, combat.playerHeroId, []);
  assert.equal(entered.shelterHeroId, combat.playerHeroId);

  entered.turnOrder = [{ id: combat.playerHeroId, side: "hero", initiative: player.speed }];
  entered.turnIndex = 0;
  entered.turnReadyAt = 0;
  const hpBeforeHealing = entered.heroes.find((hero) => hero.heroId === combat.playerHeroId)!.hp;
  const healed = tickTurnCombat(entered, []);

  assert.equal(healed.shelterHealedThisTurn, true);
  assert.equal(getCurrentCombatActor(healed)?.id, combat.playerHeroId);
  assert.ok(healed.heroes.find((hero) => hero.heroId === combat.playerHeroId)!.hp > hpBeforeHealing);

  const stayed = holdPlayerInShelter(healed, []);
  assert.equal(stayed.shelterHeroId, combat.playerHeroId);
  assert.equal(stayed.shelterHealedThisTurn, false);

  stayed.turnOrder = [{ id: combat.playerHeroId, side: "hero", initiative: player.speed }];
  stayed.turnIndex = 0;
  stayed.turnReadyAt = 0;
  const healedAgain = tickTurnCombat(stayed, []);
  const returned = returnTurnHeroFromShelter(healedAgain, []);
  assert.equal(returned.shelterHeroId, null);
});

test("initiative points at the current actor", () => {
  const progress = starterProgress();
  const combat = createTurnCombat(progress, progress.team, "fight", []);
  const current = getCurrentCombatActor(combat);

  assert.equal(current, combat.turnOrder[0]);
  assert.ok((current?.initiative ?? 0) > 0);
});

test("combat pacing leaves time for tactical decisions", () => {
  const progress = starterProgress();
  const normal = createCombat(progress, progress.team, "fight", []);
  const boss = createCombat(progress, progress.team, "boss", []);

  assert.ok(normal.enemies.reduce((sum, enemy) => sum + enemy.maxHp, 0) >= 650);
  assert.ok(boss.enemies[0].maxHp >= 1800);
});

test("ready abilities can be used during a tactical pause", () => {
  const progress = starterProgress();
  const combat = createCombat(progress, progress.team, "fight", []);
  const brann = combat.heroes.find((hero) => hero.heroId === "brann");
  assert.ok(brann);

  combat.paused = true;
  brann.energy = 100;
  const next = activateHeroAbility(combat, "brann", []);

  assert.equal(next.heroes.find((hero) => hero.heroId === "brann")?.energy, 0);
  assert.ok(next.heroes.every((hero) => hero.shield > 0));
});

test("the shelter never reduces health above its passive healing cap", () => {
  const progress = starterProgress();
  const combat = createCombat(progress, progress.team, "fight", []);
  const brann = combat.heroes.find((hero) => hero.heroId === "brann");
  assert.ok(brann);

  combat.shelterHeroId = "brann";
  brann.hp = brann.maxHp * 0.95;
  combat.lastTick = Date.now() - 100;
  combat.heroes.forEach((hero) => {
    hero.nextAction = Date.now() + 10_000;
  });
  combat.enemies.forEach((enemy) => {
    enemy.nextAction = Date.now() + 10_000;
  });

  const next = tickCombat(combat, []);
  assert.equal(next.heroes.find((hero) => hero.heroId === "brann")?.hp, brann.hp);
});

test("paused combat advances only its timing clock", () => {
  const progress = starterProgress();
  const combat = createCombat(progress, progress.team, "fight", []);
  const previousTick = combat.lastTick;
  const previousEnemyHp = combat.enemies.map((enemy) => enemy.hp);
  combat.paused = true;

  const next = tickCombat(combat, []);

  assert.ok(next.lastTick >= previousTick);
  assert.deepEqual(next.enemies.map((enemy) => enemy.hp), previousEnemyHp);
});

test("choosing a branch starts a visible journey before its encounter", () => {
  const run = createRun();
  const choice = run.choices[0];
  const next = beginRoomTravel(run, choice);

  assert.equal(run.routePlan.length, 10);
  assert.ok(run.routePlan.every((fork) => fork.length === 2));
  assert.equal(next.phase, "travel");
  assert.equal(next.currentRoom?.id, choice.id);
  assert.equal(next.pathHistory.at(-1)?.id, choice.id);
  assert.equal(next.combat, null);
  assert.equal(next.event, null);
});

test("the frostglass cavern builds a distinct ten-stage route", () => {
  const run = createRun("frostglass-cavern");

  assert.equal(run.dungeonId, "frostglass-cavern");
  assert.equal(run.routePlan.length, 10);
  assert.ok(run.routePlan.every((fork) => fork.length === 2));
  assert.ok(run.routePlan.flat().some((room) => /Eis|Frost|Kristall|Splitter|Raureif/i.test(`${room.title} ${room.subtitle}`)));
});

test("frostglass combat uses frost enemies and protects the sheltered hero from frost waves", () => {
  const progress = starterProgress();
  const combat = createCombat(
    progress,
    progress.team,
    "fight",
    [],
    0,
    {},
    0,
    "frostglass-cavern",
  );
  const sheltered = combat.heroes.find((hero) => hero.heroId === "brann");
  const exposed = combat.heroes.find((hero) => hero.heroId === "astra");
  assert.ok(sheltered);
  assert.ok(exposed);
  assert.ok(combat.enemies.every((enemy) => ["ice-wisp", "frost-wolf"].includes(enemy.kind)));

  combat.shelterHeroId = sheltered.heroId;
  combat.environmentNextAt = 0;
  combat.enemies.forEach((enemy) => {
    enemy.nextAction = Date.now() + 10_000;
  });
  combat.heroes.forEach((hero) => {
    hero.nextAction = Date.now() + 10_000;
  });
  const shelteredAction = sheltered.nextAction;
  const exposedAction = exposed.nextAction;

  const next = tickCombat(combat, []);

  assert.equal(next.environmentPulse, 1);
  assert.equal(next.heroes.find((hero) => hero.heroId === sheltered.heroId)?.nextAction, shelteredAction);
  assert.ok((next.heroes.find((hero) => hero.heroId === exposed.heroId)?.nextAction ?? 0) > exposedAction);
});

test("Königin Skadi is the stronger second-dungeon boss", () => {
  const progress = starterProgress();
  const combat = createCombat(
    progress,
    progress.team,
    "boss",
    [],
    0,
    {},
    0,
    "frostglass-cavern",
  );

  assert.equal(combat.enemies[0].name, "Königin Skadi");
  assert.ok(combat.enemies[0].maxHp >= 2700);
  assert.equal(combat.enemies[0].boss, true);
});

test("combat effects identify their attacker for visible attack animations", () => {
  const progress = starterProgress();
  const combat = createCombat(progress, progress.team, "fight", []);
  const now = Date.now();
  combat.heroes.forEach((hero) => {
    hero.nextAction = hero.heroId === "brann" ? 0 : now + 10_000;
  });
  combat.enemies.forEach((enemy) => {
    enemy.nextAction = now + 10_000;
  });

  const next = tickCombat(combat, []);
  const attack = next.effects.find((effect) => effect.sourceId === "brann");

  assert.ok(attack);
  assert.ok(next.enemies.some((enemy) => enemy.id === attack.targetId));
  assert.ok(attack.createdAt > 0);
});

test("old combat effects disappear instead of looping forever", () => {
  const progress = starterProgress();
  const combat = createCombat(progress, progress.team, "fight", []);
  const now = Date.now();
  combat.effects = [{
    id: 999,
    kind: "damage",
    text: "-1",
    targetId: combat.enemies[0].id,
    sourceId: "brann",
    createdAt: now - 2_000,
  }];
  combat.heroes.forEach((hero) => {
    hero.nextAction = now + 10_000;
  });
  combat.enemies.forEach((enemy) => {
    enemy.nextAction = now + 10_000;
  });

  const next = tickCombat(combat, []);
  assert.equal(next.effects.length, 0);
});
