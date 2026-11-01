import { createRequire } from "module"; const require = createRequire(import.meta.url); const { chromium } = require("playwright");
const b = await chromium.launch();
for (const [W, H] of [[1280, 720], [804, 360], [390 * 2, 844 / 2]]) {
  const p = await b.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 2 }); const errs = []; p.on("pageerror", (e) => errs.push(e.message));
  await p.goto("http://localhost:8765/index.html"); await p.waitForTimeout(200);
  await p.evaluate(() => localStorage.setItem("ai-girls-dungeon-v1", JSON.stringify({ tutorialSeen: true, name: "熊大", chars: ["deepseek", "gpt"], stats: { runs: 3, endlessBest: 8 }, maps: { grass: 1, ice: 1 }, playMode: { map: "ice", endless: true } })));
  await p.reload(); await p.waitForTimeout(2300);
  const geo = () => p.evaluate(() => { const t = document.querySelector(".lm-track"), on = t.querySelector(".on"), g = document.querySelector(".lb-goal").getBoundingClientRect(), r = on.getBoundingClientRect(), tr = t.getBoundingClientRect(); return { on: on.dataset.id, cardL: Math.round(r.left), cardR: Math.round(r.right), goalL: Math.round(g.left), goalR: Math.round(g.right), trackL: Math.round(tr.left), trackR: Math.round(tr.right) }; });
  console.log(W, "start", JSON.stringify(await geo()));
  await p.screenshot({ path: `/home/claude/game/tmp/al_a_${W}.png` });
  await p.evaluate(() => { const t = document.querySelector(".lm-track"); t.scrollTo({ left: t.scrollWidth }); }); await p.waitForTimeout(900);
  console.log(W, "end  ", JSON.stringify(await geo()));
  await p.screenshot({ path: `/home/claude/game/tmp/al_b_${W}.png` });
  await p.evaluate(() => document.querySelector(".set-btn").click()); await p.waitForTimeout(300);
  await p.evaluate(() => [...document.querySelectorAll(".modal button")].find((x) => x.textContent.includes("导出存档")).click()); await p.waitForTimeout(400);
  const code = await p.evaluate(() => document.querySelector(".save-code").value);
  await p.screenshot({ path: `/home/claude/game/tmp/al_exp_${W}.png` });
  // wipe, import
  await p.evaluate(() => { localStorage.clear(); }); await p.reload(); await p.waitForTimeout(2000);
  await p.evaluate(() => document.querySelector(".set-btn").click()); await p.waitForTimeout(300);
  await p.evaluate(() => [...document.querySelectorAll(".modal button")].find((x) => x.textContent.includes("导入存档")).click()); await p.waitForTimeout(300);
  await p.fill(".save-modal .save-code", code); await p.waitForTimeout(200);
  console.log(W, "import msg:", await p.evaluate(() => document.querySelector(".save-msg").textContent));
  await p.screenshot({ path: `/home/claude/game/tmp/al_imp_${W}.png` });
  await p.evaluate(() => [...document.querySelectorAll(".save-modal button")].find((x) => x.textContent === "导入").click()); await p.waitForTimeout(2500);
  console.log(W, "restored:", await p.evaluate(() => { const m = JSON.parse(localStorage.getItem("ai-girls-dungeon-v1")); return [m.name, m.stats.endlessBest, m.maps.ice]; }), errs.join("|"));
  await p.close();
}
await b.close();
