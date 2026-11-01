// Layout audit: every screen at several viewport sizes; reports elements outside the viewport / clipped, saves screenshots.
import { createRequire } from "module"; const require = createRequire(import.meta.url); const { chromium } = require("playwright");
const SIZES = (process.argv[2] || "667x375,740x360,804x360,844x390,932x430,1024x768,1280x720").split(",").map((s) => s.split("x").map(Number));
const out = "/home/claude/game/tmp/audit"; require("fs").mkdirSync(out, { recursive: true });
const SAVE = { tutorialSeen: true, name: "测试玩家", tokens: 2400, chars: ["deepseek", "gpt", "grok", "claude", "doubao", "glm"], seenUnlock: ["grok", "claude", "doubao", "glm"], talents: { t_dmg: 3, t_hp: 1, t_crit: 2, t_coin: 1, t_revive: 1, t_startcard: 2, t_ensemble: 1, t_firewall: 1, u_links: 1, u_echo: 1 }, cards: ["links", "echo"], stats: { runs: 4, bossKills: 1, kills: 300, pulls: 40, reactions: 60, best: 7, endlessBest: 12 }, maps: { grass: 1 }, sel: "claude", playMode: { map: "ice", endless: false } };
const b = await chromium.launch();
const issues = [];
const audit = async (p, tag) => p.evaluate((tag) => {
  const W = innerWidth, H = innerHeight, bad = [];
  const scrollAnc = (e) => { for (let a = e.parentElement; a && a.id !== "ui"; a = a.parentElement) { const cs = getComputedStyle(a); if (/(auto|scroll)/.test(cs.overflowY + cs.overflowX) && a.scrollHeight > a.clientHeight + 1) return true; } return false; };
  for (const e of document.querySelectorAll("#ui *")) {
    const cs = getComputedStyle(e); if (cs.display === "none" || cs.visibility === "hidden" || +cs.opacity === 0) continue;
    if (!/^(BUTTON|B|SPAN|SMALL|DIV|IMG|H2|I|EM)$/.test(e.tagName)) continue;
    const r = e.getBoundingClientRect(); if (r.width < 4 || r.height < 4) continue;
    if (e.closest(".lb-center,.sparkles,.lb-glow,.pv-fx,.pv-rays,.lb-motes,.gm,.capsule,.touchpad,.fcard::after")) continue;
    if (scrollAnc(e)) continue;
    const out = r.left < -2 || r.top < -2 || r.right > W + 2 || r.bottom > H + 2;
    const txt = (e.children.length === 0 && e.textContent.trim()) ? e : null;
    const clip = txt && e.scrollWidth > e.clientWidth + 2 && cs.overflow !== "visible" && cs.textOverflow !== "ellipsis" && !/nowrap/.test(cs.whiteSpace) ? true : false;
    if (out || clip) bad.push(`${out ? "OUT" : "CLIP"} ${e.tagName}.${(e.className || "").toString().slice(0, 30)} "${e.textContent.trim().slice(0, 14)}" [${[r.left, r.top, r.right, r.bottom].map(Math.round)}]`);
  }
  return bad.slice(0, 12).map((x) => tag + " " + x);
}, tag);
for (const [W, H] of SIZES) {
  const ctx = await b.newContext({ viewport: { width: W, height: H }, isMobile: W < 1000, hasTouch: W < 1000, deviceScaleFactor: 1 });
  const p = await ctx.newPage(); p.on("pageerror", (e) => issues.push(`${W}x${H} PAGEERROR ${e.message}`));
  await p.goto("http://localhost:8765/index.html"); await p.waitForTimeout(200);
  await p.evaluate((s) => localStorage.setItem("ai-girls-dungeon-v1", JSON.stringify(s)), SAVE);
  await p.reload(); await p.waitForTimeout(2200);
  const sz = `${W}x${H}`, shot = (n) => p.screenshot({ path: `${out}/${n}_${sz}.png` });
  const step = async (n, fn, wait = 600) => { await fn(); await p.waitForTimeout(wait); issues.push(...(await audit(p, `${sz} ${n}`))); await shot(n); };
  const click = (sel) => p.evaluate((sel) => document.querySelector(sel)?.click(), sel);
  await step("lobby", async () => {});
  await step("kit", () => click(".li-kit"));
  await click(".kit-modal .x-btn"); await p.waitForTimeout(300);
  await step("modes", () => click(".mode-sel"));
  await click(".mode-modal .x-btn"); await p.waitForTimeout(800);
  await step("gacha", () => click(".t-gacha"), 1200);
  await step("pool", () => click(".gp-poolbtn"));
  await click(".pool-modal .x-btn"); await p.waitForTimeout(300);
  await step("preview", () => click(".fcard"));
  await click(".pv-modal"); await p.waitForTimeout(300);
  await click(".back-btn"); await p.waitForTimeout(800);
  await step("help", () => click(".t-help"));
  await p.evaluate(() => document.querySelectorAll(".modal").forEach((m) => m.remove()));
  await step("run", () => click(".play-btn"), 3500);
  await p.evaluate(() => document.querySelectorAll(".cards-modal .card2")[0]?.click()); await p.waitForTimeout(600);
  await step("pause", () => click(".pausebtn"));
  await p.evaluate(() => document.querySelectorAll(".modal").forEach((m) => m.remove())); await p.evaluate(() => (__app.paused = false, __app.pauseMd = null));
  await step("result", () => p.evaluate(() => { __app.game.runStats.boss = true; __app.game.runStats.rooms = 7; __app.endRun(true); }), 1200);
  await ctx.close();
}
await b.close();
console.log(issues.length ? issues.join("\n") : "no layout issues");
