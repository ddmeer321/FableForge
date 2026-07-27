import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html", host: "localhost" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the FableForge opening lobby", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>FableForge — Tales of the Wild<\/title>/i);
  assert.match(html, /FABLEFORGE/);
  assert.match(html, /KOSTENLOSE HELDENBOX ÖFFNEN/);
  assert.match(html, /Willkommen in Lumenhain/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape/i);
});

test("ships the social preview image", async () => {
  const response = await render();
  const html = await response.text();
  assert.match(html, /og\.png/);
});

test("keeps responsive overrides in deliberate cascade order", async () => {
  const css = await readFile(new URL("../app/styles/dungeon.css", import.meta.url), "utf8");
  const tablet = css.indexOf("/* Tablet allgemein");
  const touchLandscape = css.indexOf("/* Große Touch-Handys im Querformat");
  const tabletLandscape = css.indexOf("/* iPad/Tablet im Querformat");

  assert.ok(tablet > css.indexOf("/* Zusammenhängende Dungeon-Erkundung"));
  assert.ok(tablet < touchLandscape);
  assert.ok(touchLandscape < tabletLandscape);
  assert.match(css.slice(touchLandscape), /any-pointer:\s*coarse/);
  assert.match(css.slice(tabletLandscape), /\.combat-view\.has-boss\s*\{\s*grid-template-rows:\s*auto/);
  assert.match(css.slice(tabletLandscape), /\.boss-health-banner > div\s*\{\s*height:\s*6px/);
});

test("ships immersive dungeon animation layers with an accessible fallback", async () => {
  const component = await readFile(new URL("../app/components/DungeonRun.tsx", import.meta.url), "utf8");
  const css = await readFile(new URL("../app/styles/dungeon.css", import.meta.url), "utf8");

  assert.match(component, /DungeonAtmosphere/);
  assert.match(component, /battle-weather/);
  assert.match(component, /map-weather/);
  assert.match(component, /combat-impact-ring/);
  assert.match(component, /combat-result-card/);
  assert.match(component, /boss \? "has-boss"/);
  assert.match(component, /EVENT_MOTIONS/);
  assert.match(component, /reward-celebration/);
  assert.match(css, /\.atmosphere-forest/);
  assert.match(css, /\.atmosphere-frost/);
  assert.match(css, /@keyframes chest-lid-open/);
  assert.doesNotMatch(css, /\.combat-result-banner\s*>\s*div\s*\{/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
});

test("gives the team builder a larger desktop-only layout", async () => {
  const css = await readFile(new URL("../app/styles/collection.css", import.meta.url), "utf8");
  const desktopTeam = css.indexOf("/* Team-Builder auf Desktop");

  assert.ok(desktopTeam > 0);
  assert.match(css.slice(desktopTeam), /@media \(min-width: 1181px\)/);
  assert.match(css.slice(desktopTeam), /\.team-builder-screen \.team-slot-card \.portrait-medium/);
  assert.match(css.slice(desktopTeam), /min-height:\s*500px/);
});

test("ships an equipable cosmetics wardrobe instead of title or emote placeholders", async () => {
  const app = await readFile(new URL("../app/components/GameApp.tsx", import.meta.url), "utf8");
  const wardrobe = await readFile(new URL("../app/components/Cosmetics.tsx", import.meta.url), "utf8");
  const dungeon = await readFile(new URL("../app/components/DungeonRun.tsx", import.meta.url), "utf8");

  assert.match(app, /screen === "cosmetics"/);
  assert.match(wardrobe, /Skins, Team-Auren und sichtbaren Spuren/);
  assert.match(wardrobe, /equipCosmetic/);
  assert.match(wardrobe, /unequipCosmetic/);
  assert.doesNotMatch(wardrobe, /Titel|Emote/);
  assert.match(dungeon, /party-aura-effect/);
  assert.match(dungeon, /party-trail-effect/);
});
