// two tabs over a simulated 120 ms link: client B fights; we sample how far B's shots start from B, and screenshot B.
import { createRequire } from "module"; const require = createRequire(import.meta.url); const { chromium } = require("playwright");
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1100, height: 620 } });
const A = await ctx.newPage(), B = await ctx.newPage();
for (const [n, p] of [["A", A], ["B", B]]) { p.on("pageerror", (e) => console.log(n, "PAGEERROR", e.message, (e.stack || "").split("\n")[1])); }
for (const p of [A, B]) { await p.goto("http://localhost:8765/index.html?local&lag=120"); }
await A.waitForTimeout(2000);
for (const p of [A, B]) await p.evaluate(() => localStorage.setItem("ai-girls-dungeon-v1", JSON.stringify({ tutorialSeen: true, chars: ["deepseek", "gpt", "grok"], seenUnlock: ["grok"], sel: "grok" })));
for (const p of [A, B]) await p.reload();
await A.waitForTimeout(2000);
await A.click(".t-net"); await A.waitForTimeout(300); await A.click("button:has-text('合作闯关')"); await A.waitForTimeout(900);
const code = await A.locator(".code").textContent();
await B.click(".t-net"); await B.waitForTimeout(300); await B.fill(".code-in", code); await B.click("button:has-text('加入')"); await B.waitForTimeout(1500);
await A.click("text=出发！"); await A.waitForTimeout(3500);
await B.evaluate(() => { const i = __dbg.input; let t = 0; window.__orig = []; setInterval(() => { t += 0.05; i.mx = Math.cos(t * 0.7); i.my = Math.sin(t * 0.7); i.atk = true; if (Math.random() < 0.04) i.pressed.dash = true; const me = __app.me; for (const b of __app.game.bullets) if (b.pred && b.t < 0.05 && !b.seen) { b.seen = 1; window.__orig.push(Math.hypot(b.x - me.x, b.y - (me.y - 20))); } }, 50); });
await B.waitForTimeout(6000);
await B.screenshot({ path: "/home/claude/game/tmp/netlag_b.png" });
const r = await B.evaluate(() => { const o = window.__orig; return { shots: o.length, maxOff: Math.max(0, ...o).toFixed(1), en: __app.game.enemies.length, bl: __app.game.bullets.length } });
const hostHp = await A.evaluate(() => __app.game.enemies.map((e) => Math.round(e.hp)).join(","));
console.log(JSON.stringify(r), "host enemy hp:", hostHp);
await browser.close();
