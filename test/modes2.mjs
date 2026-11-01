import { createRequire } from "module"; const require = createRequire(import.meta.url); const { chromium } = require("playwright");
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
const errs = []; p.on("pageerror", (e) => errs.push(e.message));
await p.goto("http://localhost:8765/index.html"); await p.waitForTimeout(200);
await p.evaluate(() => localStorage.setItem("ai-girls-dungeon-v1", JSON.stringify({ tutorialSeen: true, name: "测试", tokens: 999, chars: ["deepseek", "gpt", "grok", "claude", "doubao", "glm"], seenUnlock: ["grok", "claude", "doubao", "glm"], talents: { t_startcard: 2, t_overclock: 1, t_firewall: 1, t_ensemble: 1, u_links: 1, u_echo: 1 }, cards: ["links", "echo"], stats: { runs: 3, bossKills: 2 }, maps: { grass: 1, ice: 1 }, loadout: { deepseek: ["t_startcard", "t_overclock"], grok: ["t_firewall", "t_ensemble"], gpt: ["u_links", "u_echo"] }, playMode: { map: "lava", endless: false } })));
await p.reload(); await p.waitForTimeout(1800);
// lava run with start cards x2
await p.click(".play-btn"); await p.waitForTimeout(3000);
let r = await p.evaluate(() => { const g = __app.game, me = __app.me; return { hazard: g.hazard, theme: g.map.theme, ultG: me.st.ultG, ult: me.ult, offers: g.cardOffers[me.id], start: me.startCards, mud: g.map.mud.reduce((a, b) => a + b, 0) }; });
console.log("lava", JSON.stringify(r));
await p.click(".card2 >> nth=0"); await p.waitForTimeout(900);
r = await p.evaluate(() => { const g = __app.game, me = __app.me; return { offers: g.cardOffers[me.id], cards: me.cards, start: me.startCards }; });
console.log("after pick1", JSON.stringify(r));
await p.click(".card2 >> nth=0").catch(() => console.log("no 2nd offer")); await p.waitForTimeout(600);
r = await p.evaluate(() => { const me = __app.me; return { cards: Object.keys(me.cards).length, start: me.startCards }; });
console.log("after pick2", JSON.stringify(r));
// lava burns: put player on a lava tile
r = await p.evaluate(async () => { const g = __app.game, me = __app.me, m = g.map; let k = m.mud.findIndex((v, i) => v && m.t[i] === 0); const x = (k % m.W) * 32 + 16, y = Math.floor(k / m.W) * 32 + 16; me.x = x; me.y = y; me.invuln = 0; const hp0 = me.hp + me.shield; await new Promise((res) => setTimeout(res, 2600)); return { before: hp0, after: me.hp + me.shield }; });
console.log("lava burn", JSON.stringify(r));
await p.evaluate(() => { __app.game.phase = "over"; __app.endRun(false); }); await p.waitForTimeout(700);
await p.evaluate(() => document.querySelectorAll(".modal button").forEach((b) => /返回大厅/.test(b.textContent) && b.click())); await p.waitForTimeout(1200);
// endless with grok (firewall + ensemble)
await p.evaluate(() => { const m = JSON.parse(localStorage.getItem("ai-girls-dungeon-v1")); m.sel = "grok"; m.playMode = { map: "grass", endless: true }; localStorage.setItem("ai-girls-dungeon-v1", JSON.stringify(m)); });
await p.reload(); await p.waitForTimeout(1800);
await p.click(".play-btn"); await p.waitForTimeout(3000);
r = await p.evaluate(() => { const g = __app.game; return { endless: g.endless, banner: g.banner && g.banner.text, room: g.room.kind, waves: g.room.waves.length, per: g.room.waves[0].length }; });
console.log("endless", JSON.stringify(r));
// shoot: count bullets after 4 attacks with ensemble
r = await p.evaluate(async () => { const g = __app.game, me = __app.me; me.atkCount = 3; const n0 = g.bullets.length; const { fireAttack } = await import("./js/skills.js"); fireAttack(g, me, 0, null); return g.bullets.length - n0; });
console.log("bullets on 4th attack (1 + 3 ensemble expected)", r);
// firewall: break shield next to an enemy
r = await p.evaluate(async () => { const g = __app.game, me = __app.me; const e = g.enemies.find((e) => e.spawnT <= 0) || g.enemies[0]; e.spawnT = 0; e.x = me.x + 30; e.y = me.y; const hp0 = e.hp; me.shield = 1; me.invuln = 0; me.dashT = 0; g.hurt(me, 1, { x: me.x + 10, y: me.y }); return { fw: me.fwCd > g.time, enemyDmg: Math.round(hp0 - e.hp) }; });
console.log("firewall", JSON.stringify(r));
// jump to floor 10 (boss) and kill it: run must go on
r = await p.evaluate(async () => { const g = __app.game; g.roomIdx = 8; g.nextRoom(); await new Promise((res) => setTimeout(res, 2500)); const boss = g.enemies.find((e) => e.boss); const hp = boss && Math.round(boss.maxHp); if (boss) { boss.hp = 1; g.hit(boss, 999, { p: __app.me }); } await new Promise((res) => setTimeout(res, 3500)); return { kind: g.room.kind, bossHp: hp, phase: g.phase, chest: !!g.chest }; });
console.log("endless boss", JSON.stringify(r));
r = await p.evaluate(async () => { const g = __app.game; g.roomIdx = 19; g.nextRoom(); await new Promise((res) => setTimeout(res, 300)); return { idx: g.roomIdx, theme: g.map.theme, hazard: g.hazard, kind: g.room.kind }; });
console.log("floor 21", JSON.stringify(r));
await p.evaluate(() => { __app.game.runStats.rooms = 21; __app.game.phase = "over"; __app.endRun(false); }); await p.waitForTimeout(900);
await p.screenshot({ path: "/home/claude/game/tmp/md_endless_result.png" });
console.log("best", await p.evaluate(() => JSON.parse(localStorage.getItem("ai-girls-dungeon-v1")).stats.endlessBest));
console.log("ERR", errs.join(" | "));
await b.close();
