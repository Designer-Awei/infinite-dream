import { createRequire } from "module"; const require = createRequire(import.meta.url); const { chromium } = require("playwright");
const out = "/home/claude/game/tmp/net"; require("fs").mkdirSync(out, { recursive: true });
const pvp = process.argv.includes("--pvp");
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1100, height: 620 } });
const A = await ctx.newPage(), B = await ctx.newPage();
const errs = [];
for (const [n, p] of [["A", A], ["B", B]]) { p.on("pageerror", (e) => errs.push(n + " PAGEERROR " + e.message + " " + (e.stack||"").split("\n").slice(1,3).join("|"))); p.on("console", (m) => m.type() === "error" && errs.push(n + " " + m.text())); }
await A.goto("http://localhost:8765/index.html?local"); await B.goto("http://localhost:8765/index.html?local");
await A.waitForTimeout(2500);
await B.evaluate(() => { const s = JSON.parse(localStorage.getItem("ai-girls-dungeon-v1")); });
await A.click(".t-net"); await A.waitForTimeout(300);
await A.click(pvp ? "button:has-text(\"竞技场PVP\")" : "button:has-text(\"合作闯关\")"); await A.waitForTimeout(800);
const code = await A.locator(".code").textContent();
console.log("code", code);
await B.click(".t-net"); await B.waitForTimeout(300);
await B.fill(".code-in", code); await B.click("button:has-text(\"加入\")"); await B.waitForTimeout(1200);
await B.screenshot({ path: out + "/b_room.png" });
await B.click(".mychars >> text=小龙娘"); await B.waitForTimeout(500);
await A.screenshot({ path: out + "/a_room.png" });
await A.click(pvp ? "text=开战！" : "text=出发！"); await A.waitForTimeout(2000);
// host bot-ish: hold J, move right; client: move & attack
await A.evaluate(() => { const i = __dbg.input; setInterval(() => { const g = __app.game, me = __app.me; if (!g) return; const c = document.querySelector('.cards-modal .card2'); if (c) c.click(); const es = g.enemies.filter(e=>e.spawnT<=0); i.atk = true; let t = es[0] || g.chest || g.portal; if (g.chest && !g.chest.opened && !es.length) t = g.chest; if (!es.length && g.portal) t = g.portal; if (t) { const d = Math.hypot(t.x-me.x,t.y-me.y)||1; i.mx=(t.x-me.x)/d*(es.length&&d<120?-1:1); i.my=(t.y-me.y)/d*(es.length&&d<120?-1:1);} if (me.ult>=1) i.pressed.ult = true; if (me.skillCd<=0) i.pressed.skill = true; }, 60); });
await B.evaluate(() => { const i = __dbg.input; setInterval(() => { const g = __app.game, me = __app.me; if (!g || !g.map) return; const c = document.querySelector('.cards-modal .card2'); if (c) c.click(); const es = g.enemies; i.atk = true; let t = es[0] || g.chest || g.portal; if (g.chest && !g.chest.opened && !es.length) t = g.chest; if (!es.length && g.portal) t = g.portal; if (t) { const d = Math.hypot(t.x-me.x,t.y-me.y)||1; i.mx=(t.x-me.x)/d*(es.length&&d<130?-1:1); i.my=(t.y-me.y)/d*(es.length&&d<130?-1:1);} if (Math.random()<0.02) i.pressed.skill = true; if (me.ult>=1) i.pressed.ult = true; }, 60); });
for (let k = 0; k < 8; k++) {
  await A.waitForTimeout(5000);
  const sa = await A.evaluate(() => { const g = __app.game; return g ? { room: g.roomIdx, ph: g.phase, en: g.enemies.length, ps: g.players.map(p => [p.id, p.cid, Math.round(p.x), Math.round(p.y), p.hp, Object.keys(p.cards).length]) } : null; });
  const sb = await B.evaluate(() => { const g = __app.game; return g ? { room: g.roomIdx, ph: g.phase, en: g.enemies.length, bl: g.bullets.length, ps: g.players.map(p => [p.id, Math.round(p.x), Math.round(p.y), p.hp]) } : null; });
  console.log("A", JSON.stringify(sa)); console.log("B", JSON.stringify(sb));
  if (k === 1 || k === 5) { await A.screenshot({ path: out + `/a_${k}.png` }); await B.screenshot({ path: out + `/b_${k}.png` }); }
}
console.log(errs.slice(0, 20).join("\n"));
await browser.close();
