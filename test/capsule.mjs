import { createRequire } from "module"; const require = createRequire(import.meta.url); const { chromium } = require("playwright");
import fs from "fs"; import { execFileSync } from "child_process";
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 804, height: 360 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
p.on("pageerror", (e) => console.log("ERR", e.message));
await p.goto("http://localhost:8765/index.html"); await p.waitForTimeout(200);
await p.evaluate(() => localStorage.setItem("ai-girls-dungeon-v1", JSON.stringify({ tutorialSeen: true, tokens: 5000, chars: ["deepseek", "gpt"], pity: 49, pity10: 9 })));
await p.reload(); await p.waitForTimeout(1800);
await p.evaluate(() => document.querySelector(".t-gacha").click()); await p.waitForTimeout(1200);
await p.evaluate(() => document.querySelectorAll(".pull-btn")[0].click());
const dir = "/tmp/capf"; fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir);
const cols = [];
for (let i = 0; i < 70; i++) {
  if (i === 26) await p.mouse.click(400, 180);
  await p.screenshot({ path: `${dir}/${String(i).padStart(3, "0")}.png` });
  cols.push(await p.evaluate(() => { const c = document.querySelector(".pv-cap"); return c ? getComputedStyle(c).getPropertyValue("--c").trim() + (c.classList.contains("open") ? " open" : "") : "-"; }));
  await p.waitForTimeout(60);
}
console.log([...new Set(cols)].join(" | "));
await b.close();
execFileSync("python3", ["-c", `
import glob; from PIL import Image
fs=sorted(glob.glob('${dir}/*.png')); ims=[Image.open(f).convert('RGB').resize((536,240)) for f in fs]
pal=ims[30].quantize(colors=200)
q=[im.quantize(palette=pal, dither=Image.NONE) for im in ims]
q[0].save('/home/claude/out/capsule_ssr.gif', save_all=True, append_images=q[1:], duration=90, loop=0)
`]);
