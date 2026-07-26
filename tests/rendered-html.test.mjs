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
});
