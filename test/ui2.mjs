import { createRequire } from "module"; const require = createRequire(import.meta.url); const { chromium } = require("playwright");
const out = "/home/claude/game/tmp/ui2"; require("fs").mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
for (const [w, h, name, mobile] of [[1920, 895, "pc", false], [844, 390, "phone", true]]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: mobile ? 2 : 1 });
  const p = await ctx.newPage();
  const errs = []; p.on("pageerror", (e) => errs.push(e.message));
  await p.goto("http://localhost:8765/index.html"); await p.waitForTimeout(400);
  await p.evaluate(() => { localStorage.setItem("ai-girls-dungeon-v1", JSON.stringify({ tokens: 2500, chars: ["deepseek", "gpt", "glm"], sel: "gpt", seenUnlock: ["glm"], tutorialSeen: true, stats: { kills: 64, pulls: 3, reactions: 12, bossKills: 1, runs: 2, best: 7 }, talents: { t_dmg: 1 } })); });
  await p.reload(); await p.waitForTimeout(500);
  await p.screenshot({ path: `${out}/${name}_lobby_enter.png` });
  await p.waitForTimeout(1600);
  await p.screenshot({ path: `${out}/${name}_lobby.png` });
  await p.click(".lb-roster .rcard:nth-child(6)"); await p.waitForTimeout(700);
  await p.screenshot({ path: `${out}/${name}_lobby_glm.png` });
  await p.click(".t-gacha"); await p.waitForTimeout(800);
  await p.screenshot({ path: `${out}/${name}_gacha.png` });
  await p.click(".pull-btn >> nth=1"); await p.waitForTimeout(2300);
  await p.screenshot({ path: `${out}/${name}_pull_cap.png` });
  await p.mouse.click(w / 2, h / 2); await p.waitForTimeout(1600);
  await p.screenshot({ path: `${out}/${name}_pull_cards_mid.png` });
  await p.waitForTimeout(5000);
  await p.screenshot({ path: `${out}/${name}_pull_done.png` });
  console.log(name, errs.join("|"));
  await ctx.close();
}
await browser.close();
