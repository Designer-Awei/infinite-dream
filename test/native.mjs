import { createRequire } from "module"; const require = createRequire(import.meta.url); const { chromium } = require("playwright");
const b = await chromium.launch();
for (const ver of [null, "1.2.60"]) {
  const p = await b.newPage({ viewport: { width: 804, height: 360 }, deviceScaleFactor: 2 }); p.on("pageerror", (e) => console.log("ERR", e.message));
  await p.addInitScript((ver) => {
    localStorage.setItem("updRemote", "http://localhost:1/");
    const FS = { readdir: async () => ({ files: [] }), rmdir: async () => {}, writeFile: async () => {}, readFile: async () => { throw 1; }, stat: async () => { throw 1; }, getUri: async () => ({ uri: "" }) };
    const WV = { getServerBasePath: async () => ({ path: "/data/app/public" }), persistServerBasePath: async () => {}, setServerBasePath: async () => {} };
    const P = { Filesystem: FS, WebView: WV };
    if (ver) P.App = { getInfo: async () => ({ version: ver, build: "60" }) };
    window.Capacitor = { isNativePlatform: () => true, Plugins: P };
  }, ver);
  await p.goto("http://localhost:8766/index.html"); await p.waitForTimeout(4500);
  const t = await p.evaluate(() => document.querySelector(".nat-modal")?.innerText.replace(/\s+/g, " ").slice(0, 120) || "no prompt");
  console.log(ver || "old apk", "=>", t);
  if (!ver) await p.screenshot({ path: "/home/claude/game/tmp/native_prompt.png" });
  await p.close();
}
await b.close();
