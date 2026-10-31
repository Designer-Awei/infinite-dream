import { createRequire } from "module"; const require = createRequire(import.meta.url); const { chromium } = require("playwright");
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errs = [];
page.on("pageerror", (e) => errs.push("PAGEERROR " + e.message + " " + (e.stack || "").split("\n").slice(1, 4).join(" | ")));
page.on("console", (m) => m.type() === "error" && errs.push("console " + m.text()));
await page.goto("http://localhost:8765/index.html");
await page.waitForTimeout(2200);
const res = await page.evaluate(async () => {
  const app = __app, out = [];
  const step = (g, n = 60) => { for (let i = 0; i < n; i++) { g.update(1 / 60); g.fx.update(1 / 60); } };
  const cids = ["deepseek", "gpt", "grok", "claude", "doubao", "glm"];
  for (const cid of cids) {
    try {
      app.begin({ mode: "solo", pvp: false, seed: 42, players: [{ id: 1, cid, name: "T" }], myId: 1 });
      const g = app.game, me = app.me;
      step(g, 30);
      // enemies next to the player
      for (const t of ["slime", "eyeball", "skull", "jelly", "wisp", "frog", "ghost", "snake", "bat", "slime_purple"]) g.spawnEnemy(t, me.x + 60 + Math.random() * 60, me.y + (Math.random() - 0.5) * 80, Math.random() < 0.3, 0);
      // all cards incl. fusions & links
      const { CARDS, fusionCards } = await import("./js/data.js");
      const { applyCard } = await import("./js/game.js");
      for (const c of [...CARDS, ...fusionCards(cid)]) applyCard(g, me, c.id);
      me.input.atk = true;
      for (let k = 0; k < 6; k++) { me.input.skill = true; me.skillCd = 0; me.ult = 1; me.input.ult = true; me.input.dash = true; step(g, 40); me.hp = me.maxHp; }
      for (const it of ["cube", "speed", "rage", "shield", "heal", "star", "freeze", "infuse"]) g.applyItem(me, it);
      step(g, 120);
      // reactions
      const { REACTIONS } = await import("./js/data.js");
      for (const key of Object.keys(REACTIONS)) { const e = g.spawnEnemy("slime", me.x + 40, me.y, false, 0); e.hp = 999; g.react(e, key, me, "water"); }
      step(g, 120);
      // explode barrels / damage tiles
      for (const i of Object.keys(g.map.crates)) g.damageTile(+i, 999, me);
      step(g, 60);
      // down & revive
      me.invuln = 0; me.dashT = 0; me.buff.star = 0; me.barrier = 0; me.shield = 0; me.hp = 1; me.revives = 1;
      g.hurt(me, 5, {});
      out.push(cid + " revived=" + (!me.downed) + " hp=" + me.hp + " cards=" + Object.keys(me.cards).length + " bullets=" + g.bullets.length + " fx=" + g.fx.list.length);
      // clear the room & cards & portal
      for (const e of g.enemies) g.kill(e, me);
      g.enemies.length = 0; g.wave = 99; g.waveDelay = 0; step(g, 10);
      out.push(" phase after clear: " + g.phase);
      me.x = g.chest.x; me.y = g.chest.y; step(g, 5);
      out.push(" offers: " + JSON.stringify(g.cardOffers[1]));
      if (g.cardOffers[1]) g.pickCard(1, g.cardOffers[1][0]);
      out.push(" phase: " + g.phase + " portal " + !!g.portal);
      me.x = g.portal.x; me.y = g.portal.y; step(g, 90);
      out.push(" room now " + g.roomIdx + " " + g.room.kind);
      // shop buy all
      if (g.room.kind === "shop") { me.coins = 999; for (const it of g.shop) g.buy(me, it); if (g.cardOffers[1]) g.pickCard(1, g.cardOffers[1][0]); out.push(" shop ok coins " + me.coins); }
      __dbg.UI.closeCards(); app.cardOpen = false;
    } catch (e) { out.push(cid + " ERR " + e.message + " " + e.stack.split("\n").slice(0, 3).join(" | ")); }
  }
  // PVP 2 players, second remote
  try {
    app.begin({ mode: "solo", pvp: true, seed: 7, players: [{ id: 1, cid: "grok", name: "A" }, { id: 2, cid: "glm", name: "B" }], myId: 1 });
    const g = app.game, a = g.player(1), b = g.player(2);
    b.x = a.x + 80; b.y = a.y; a.input.atk = true;
    for (let i = 0; i < 600; i++) { b.x = a.x + 80; b.y = a.y; g.update(1 / 60); }
    out.push("pvp score " + JSON.stringify(g.pvpScore) + " phase " + g.phase);
  } catch (e) { out.push("PVP ERR " + e.message + " " + e.stack.split("\n").slice(0, 3).join(" | ")); }
  return out;
});
console.log(res.join("\n"));
await page.waitForTimeout(1500);
console.log("ERRORS:\n" + errs.slice(0, 20).join("\n"));
await browser.close();
