// Autoplay bot: plays a whole run and screenshots each room.
import { createRequire } from "module"; const require = createRequire(import.meta.url); const { chromium } = require("playwright");
import fs from "fs";
const out = process.argv[2] || "/home/claude/game/tmp/bot"; fs.mkdirSync(out, { recursive: true });
const god = process.argv.includes("--god");
const cidArg = (process.argv.find(a => a.startsWith("--cid=")) || "").slice(6);
const W = +(process.argv.find(a => a.startsWith("--w=")) || "--w=1280").slice(4), Hh = +(process.argv.find(a => a.startsWith("--h=")) || "--h=720").slice(4);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: W, height: Hh } });
const errs = [];
page.on("console", (m) => { if (m.type() === "error") errs.push("console: " + m.text()); });
page.on("pageerror", (e) => errs.push("PAGEERROR: " + e.message + " @ " + (e.stack || "").split("\n").slice(0, 3).join(" | ")));
await page.goto("http://localhost:8765/index.html" + (process.argv.find(a => a.startsWith("--q=")) || "--q=").slice(4));
await page.waitForTimeout(2200);
if (cidArg) await page.evaluate((c) => { const raw = JSON.parse(localStorage.getItem("ai-girls-dungeon-v1") || "{}"); }, cidArg);
await page.evaluate((c) => { if (c) { const m = JSON.parse(localStorage.getItem("ai-girls-dungeon-v1")||"{}"); } }, cidArg);
if (cidArg) {
  await page.evaluate((c) => { const s = JSON.parse(localStorage.getItem("ai-girls-dungeon-v1") || "null") || {}; s.chars = ["deepseek","gpt","grok","claude","doubao","glm"]; s.sel = c; s.seenUnlock = ["grok","claude","doubao","glm"]; localStorage.setItem("ai-girls-dungeon-v1", JSON.stringify(s)); }, cidArg);
  await page.reload(); await page.waitForTimeout(2200);
}
await page.click("text=开始冒险");
await page.waitForTimeout(800);
await page.evaluate((god) => {
  const app = window.__app, D = window.__dbg, inp = D.input;
  if (god) { app.me.maxHp = 60; app.me.hp = 60; }
  const skip = +(new URLSearchParams(location.search).get("skipto") || 0);
  if (skip) { app.game.roomIdx = skip - 1; app.game.nextRoom(); }
  window.__bot = { log: [], room: -1 };
  let ff = null, ffT = 0, stuck = 0, lastPos = null;
  setInterval(() => {
    const g = app.game, me = app.me;
    if (!g || !me || !g.map) return;
    // cards modal
    const card = document.querySelector(".cards-modal .card");
    if (card) { card.click(); window.__bot.log.push("card@" + g.roomIdx); return; }
    if (g.roomIdx !== window.__bot.room) { window.__bot.room = g.roomIdx; window.__bot.log.push("room " + g.roomIdx + " " + g.room.kind + " t=" + g.time.toFixed(1)); }
    let target = null, keep = 0;
    const es = g.enemies.filter(e => e.spawnT <= 0);
    if (es.length) {
      es.sort((a, b) => Math.hypot(a.x - me.x, a.y - me.y) - Math.hypot(b.x - me.x, b.y - me.y));
      target = es[0]; keep = 110;
    } else if (g.chest && !g.chest.opened) target = g.chest;
    else if (g.room.kind === "shop" && me.coins >= (g.shop[0].price) && (window.__bot.buys || 0) < 2) { target = { x: g.shop[0].x, y: g.shop[0].y + 16 }; if (Math.hypot(target.x - me.x, target.y - me.y) < 14) { inp.atk = !inp.atk; window.__bot.buyT = (window.__bot.buyT || 0) + 1; if (window.__bot.buyT % 10 === 0) window.__bot.buys = (window.__bot.buys||0)+1; inp.mx = inp.my = 0; return; } }
    else if (g.portal) target = g.portal;
    inp.atk = es.length > 0;
    if (!target) { inp.mx = inp.my = 0; return; }
    const d = Math.hypot(target.x - me.x, target.y - me.y);
    let dir = null;
    if (keep && d < keep) { dir = [(me.x - target.x) / d, (me.y - target.y) / d]; }
    else if (d > (keep || 4)) {
      ffT--; if (ffT <= 0 || !ff) { ff = D.flowField(g.map, [target]); ffT = 10; }
      dir = D.flowDir(g.map, ff, me.x, me.y) || [(target.x - me.x) / d, (target.y - me.y) / d];
      if (Math.floor(me.x/32) === Math.floor(target.x/32) && Math.floor(me.y/32) === Math.floor(target.y/32)) dir = [(target.x - me.x) / (d||1), (target.y - me.y) / (d||1)];
    }
    if (lastPos && Math.hypot(lastPos[0] - me.x, lastPos[1] - me.y) < 0.5 && dir) stuck++; else stuck = 0;
    lastPos = [me.x, me.y];
    if (stuck > 10) { dir = [Math.cos(g.time * 3), Math.sin(g.time * 3)]; }
    inp.mx = dir ? dir[0] : 0; inp.my = dir ? dir[1] : 0;
    if (es.length && me.skillCd <= 0) inp.pressed.skill = true;
    if (es.length && me.ult >= 1) inp.pressed.ult = true;
    if (g.enemies.some(e=>!e.dead) && Math.random() < 0.02) inp.pressed.dash = true;
  }, 50);
}, god);
let shots = 0, lastRoom = -2;
for (let i = 0; i < 600; i++) {
  await page.waitForTimeout(1000);
  const st = await page.evaluate(() => { const g = __app.game; if (!g) return { over: true, html: document.querySelector(".result h2")?.textContent }; return { room: g.roomIdx, phase: g.phase, en: g.enemies.length, hp: __app.me.hp, coins: __app.me.coins, t: g.time.toFixed(0), cards: Object.keys(__app.me.cards).length, fx: g.fx.list.length, res: document.querySelector(".result h2")?.textContent }; });
  if (i % 5 === 0) console.log(JSON.stringify(st));
  if (st.room !== lastRoom && st.room != null) { lastRoom = st.room; await page.waitForTimeout(1500); await page.screenshot({ path: `${out}/room${st.room}.png` }); }
  if (i % 20 === 10) await page.screenshot({ path: `${out}/t${i}.png` });
  if (st.res || st.over) { console.log("RESULT", st.res); await page.screenshot({ path: `${out}/result.png` }); break; }
}
console.log((await page.evaluate(() => window.__bot.log)).join("\n"));
console.log("ERRORS:\n" + errs.slice(0, 20).join("\n"));
await browser.close();
