// Simulates the APK hot updater with a mocked Capacitor (Filesystem + WebView) against a modified "remote".
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const browser = await chromium.launch();
const p = await browser.newPage({ viewport: { width: 1280, height: 720 } });
p.on("pageerror", (e) => console.log("PAGEERROR", e.message));
p.on("console", (m) => m.type() === "error" && console.log("console", m.text()));
await p.addInitScript(() => {
  localStorage.setItem("updRemote", "http://localhost:8767/");
  const files = {};
  window.__fs = files;
  window.__wv = { base: "public", persisted: null, set: null };
  const FS = {
    writeFile: async ({ path, data }) => void (files[path] = data.length),
    readdir: async () => ({ files: [] }),
    rmdir: async () => {},
    getUri: async ({ path }) => ({ uri: "file:///data/user/0/app/files/" + path }),
  };
  const WV = {
    getServerBasePath: async () => ({ path: window.__wv.base }),
    persistServerBasePath: async () => (window.__wv.persisted = window.__wv.base),
    setServerBasePath: async ({ path }) => (window.__wv.set = path),
  };
  window.Capacitor = { isNativePlatform: () => true, Plugins: { Filesystem: FS, WebView: WV } };
});
await p.goto("http://localhost:8766/index.html");
await p.waitForTimeout(4500);
await p.screenshot({ path: "/home/claude/game/tmp/hot.png" });
await p.waitForTimeout(2500);
const r = await p.evaluate(() => ({ written: Object.keys(window.__fs).length, set: window.__wv.set, modal: document.querySelector(".upd-modal")?.innerText.replace(/\s+/g, " ") }));
console.log(JSON.stringify(r));
await browser.close();
