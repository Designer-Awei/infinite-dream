// two tabs over BroadcastChannel: PVP 算力据点 with per-player loadouts
import { createRequire } from "module"; const require = createRequire(import.meta.url); const { chromium } = require("playwright");
const out = "/home/claude/game/tmp/net"; require("fs").mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1100, height: 620 } });
const A = await ctx.newPage(), B = await ctx.newPage();
const errs = [];
for (const [n, p] of [["A", A], ["B", B]]) { p.on("pageerror", (e) => errs.push(n + " PAGEERROR " + e.message)); p.on("console", (m) => m.type() === "error" && !/404/.test(m.text()) && errs.push(n + " " + m.text())); }
await A.goto("http://localhost:8765/index.html?local"); await A.waitForTimeout(400);
// A owns firewall (equipped on deepseek); B's save has revive equipped on gpt -> must reach the host via the kit
await A.evaluate(() => localStorage.setItem("ai-girls-dungeon-v1", JSON.stringify({ tutorialSeen: true, name: "房主", chars: ["deepseek", "gpt"], talents: { t_firewall: 1, t_hp: 2 }, loadout: { deepseek: ["t_firewall", null] }, stats: { runs: 1 } })));
await A.reload(); await A.waitForTimeout(2000);
await A.click(".t-net"); await A.waitForTimeout(300);
await A.click("button:has-text(\"竞技场PVP\")"); await A.waitForTimeout(800);
await A.click(".ropt:has-text(\"算力据点\")"); await A.waitForTimeout(200);
await A.click(".ropt:has-text(\"显存冰原\")"); await A.waitForTimeout(300);
const code = await A.locator(".code").textContent();
await B.goto("http://localhost:8765/index.html?local"); await B.waitForTimeout(300);
await B.evaluate(() => localStorage.setItem("ai-girls-dungeon-v1", JSON.stringify({ tutorialSeen: true, name: "客人", chars: ["deepseek", "gpt"], sel: "gpt", talents: { t_revive: 1 }, loadout: { gpt: ["t_revive", null] }, stats: { runs: 1 } })));
await B.reload(); await B.waitForTimeout(2000);
await B.click(".t-net"); await B.waitForTimeout(300);
await B.fill(".code-in", code); await B.click("button:has-text(\"加入\")"); await B.waitForTimeout(1500);
await B.screenshot({ path: out + "/koth_room_b.png" });
await A.click("text=开战！"); await A.waitForTimeout(2500);
let r = await A.evaluate(() => { const g = __app.game; return { rule: g.pvpRule.name, hazard: g.hazard, theme: g.map.theme, ps: g.players.map((p) => ({ id: p.id, cid: p.cid, maxHp: p.maxHp, revives: p.revives, eq: p.kit.eq })) }; });
console.log("host", JSON.stringify(r));
// host stands in the zone alone for 6s
await A.evaluate(() => { const g = __app.game, me = __app.me; setInterval(() => { me.x = g.map.center.x; me.y = g.map.center.y; me.invuln = 1; }, 50); });
await B.evaluate(() => { const g = __app.game, me = __app.me; me.x = g.map.center.x + 260; me.y = g.map.center.y; });
await A.waitForTimeout(6000);
const sa = await A.evaluate(() => JSON.stringify(__app.game.pvpScore));
const sb = await B.evaluate(() => JSON.stringify({ sc: __app.game.pvpScore, hud: document.querySelector(".pvpscore")?.textContent }));
console.log("scores host", sa, "client", sb);
await A.screenshot({ path: out + "/koth_a.png" }); await B.screenshot({ path: out + "/koth_b.png" });
// KO the client once: revive (SSR) should trigger
r = await A.evaluate(() => { const g = __app.game, o = g.players.find((p) => !p.local), me = __app.me; o.invuln = 0; o.dashT = 0; o.shield = 0; o.hp = 1; g.hitPlayerPvp(o, 12, { p: me }); return { downed: o.downed, hp: o.hp, revives: o.revives }; });
console.log("revive in pvp", JSON.stringify(r));
console.log(errs.slice(0, 10).join("\n"));
await browser.close();
