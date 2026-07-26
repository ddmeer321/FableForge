import assert from "node:assert/strict";
import test from "node:test";
import {
  activateHeroAbility,
  beginRoomTravel,
  createCombat,
  createInitialProgress,
  createRun,
  tickCombat,
} from "../app/game/logic";

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
