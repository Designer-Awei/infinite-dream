import { createRequire } from "module"; const require = createRequire(import.meta.url); const { chromium } = require("playwright");
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1000, height: 700 } });
page.on("pageerror", (e) => console.log("PAGEERROR " + e.message));
await page.goto("http://localhost:8765/index.html"); await page.waitForTimeout(1500);
const url = await page.evaluate(async () => {
  const I = await import("./js/icons.js");
  const names = ["attack","deepseek_atk","deepseek_skill","deepseek_ult","gpt_atk","gpt_skill","gpt_ult","grok_atk","grok_skill","grok_ult","claude_atk","claude_skill","claude_ult","doubao_atk","doubao_skill","doubao_ult","glm_atk","glm_skill","glm_ult","dash","sword","rate","hp","shield","boot","target","bigorb","coin","bag","multishot","pierce","bounce","crit","hourglass","battery","vamp","wing","flame","bomb","atom","spread","nova","echo","infinity","revive","scroll","cardicon","links"];
  const c = document.createElement("canvas"); const S = 4, cell = 22 * S + 8; c.width = cell * 10; c.height = cell * Math.ceil(names.length / 10);
  const g = c.getContext("2d"); g.fillStyle = "#3a3a8a"; g.fillRect(0, 0, c.width, c.height); g.imageSmoothingEnabled = false;
  names.forEach((n, i) => g.drawImage(I.icon(n), (i % 10) * cell + 4, Math.floor(i / 10) * cell + 4, 22 * S, 22 * S));
  return c.toDataURL();
});
require("fs").writeFileSync("/home/claude/game/tmp/icons.png", Buffer.from(url.split(",")[1], "base64"));
await browser.close();
