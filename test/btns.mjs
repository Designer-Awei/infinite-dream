import { createRequire } from "module"; const require = createRequire(import.meta.url); const { chromium } = require("playwright");
const out = "/home/claude/game/tmp/btn"; require("fs").mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
for (const [w, h, name, mobile] of [[1280, 720, "pc", false], [844, 390, "phone", true]]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: 2 });
  const p = await ctx.newPage(); p.on("pageerror", (e) => console.log("PAGEERROR", e.message));
  await p.goto("http://localhost:8765/index.html"); await p.waitForTimeout(300);
  await p.evaluate(() => localStorage.setItem("ai-girls-dungeon-v1", JSON.stringify({ tokens: 300, chars: ["deepseek","gpt","glm","claude","grok","doubao"], sel: "claude", seenUnlock: ["glm","claude","grok","doubao"], tutorialSeen: true })));
  await p.reload(); await p.waitForTimeout(1500);
  await p.evaluate(() => __app.startSolo()); await p.waitForTimeout(1200);
  if (mobile) await p.evaluate(() => document.body.classList.add("touchmode"));
  await p.evaluate(() => { __app.me.skillCd = 4; __app.me.ult = 0.6; __dbg.input.atk = true; }); await p.waitForTimeout(500);
  await p.screenshot({ path: `${out}/${name}_cd.png` });
  await p.evaluate(() => { __app.me.skillCd = 0.05; __app.me.ult = 1; }); await p.waitForTimeout(250);
  await p.screenshot({ path: `${out}/${name}_ready.png` });
  await ctx.close();
}
await browser.close();
