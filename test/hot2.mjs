// Hot updater lifecycle with a mocked Capacitor: download once, boot from hot, relaunch (persist lost / kept) => no re-download.
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const browser = await chromium.launch();
const p = await browser.newPage({ viewport: { width: 1280, height: 720 } });
p.on("pageerror", (e) => console.log("PAGEERROR", e.message));
let base = "public", persisted = null, sets = 0;
const remoteMan = await (await fetch("http://localhost:8767/update.json")).text();
await p.exposeFunction("__nodeWV", (op, v) => {
  if (op === "set") { base = v; sets++; }
  if (op === "persist") persisted = base;
  return base;
});
await p.route("http://localhost:8766/update.json", (r) => (base.includes("/hot/") ? r.fulfill({ body: remoteMan, contentType: "application/json" }) : r.continue()));
await p.addInitScript(() => {
  localStorage.setItem("updRemote", "http://localhost:8767/");
  const meta = JSON.parse(sessionStorage.getItem("__fs") || "{}");
  const saveMeta = () => sessionStorage.setItem("__fs", JSON.stringify(meta));
  window.__fsLog = JSON.parse(sessionStorage.getItem("__fsLog") || "[]");
  const log = (x) => (window.__fsLog.push(x), sessionStorage.setItem("__fsLog", JSON.stringify(window.__fsLog)));
  const FS = {
    writeFile: async ({ path, data, encoding }) => { meta[path] = encoding ? { size: new TextEncoder().encode(data).length, text: path.endsWith("update.json") ? data : null } : { size: Math.floor((data.length * 3) / 4) - (data.endsWith("==") ? 2 : data.endsWith("=") ? 1 : 0) }; saveMeta(); log("w:" + path.split("/").slice(2).join("/")); },
    readFile: async ({ path }) => { if (!meta[path] || meta[path].text == null) throw new Error("nofile"); return { data: meta[path].text }; },
    stat: async ({ path }) => { if (!meta[path]) throw new Error("nofile"); return { size: meta[path].size }; },
    readdir: async ({ path }) => ({ files: [...new Set(Object.keys(meta).filter((k) => k.startsWith(path + "/")).map((k) => k.split("/")[1]))].map((name) => ({ name })) }),
    rmdir: async ({ path }) => { for (const k of Object.keys(meta)) if (k.startsWith(path + "/")) delete meta[k]; saveMeta(); log("rm:" + path); },
    getUri: async ({ path }) => ({ uri: "file:///data/user/0/app/files/" + path }),
  };
  const WV = {
    getServerBasePath: async () => ({ path: (await window.__nodeWV("get")) + (sessionStorage.getItem("__slash") ? "/" : "") }),
    persistServerBasePath: async () => window.__nodeWV("persist"),
    setServerBasePath: async ({ path }) => { await window.__nodeWV("set", path); setTimeout(() => location.reload(), 50); },
  };
  window.Capacitor = { isNativePlatform: () => true, Plugins: { Filesystem: FS, WebView: WV } };
});
const state = async (tag) => {
  const r = await p.evaluate(() => ({ writes: window.__fsLog.filter((x) => x.startsWith("w:")).length, rms: window.__fsLog.filter((x) => x.startsWith("rm:")), modal: !!document.querySelector(".upd-modal") }));
  console.log(tag.padEnd(28), JSON.stringify({ base, persisted, sets, ...r }));
  return r;
};
await p.goto("http://localhost:8766/index.html");
await p.waitForTimeout(9000); // 1. first launch: download + switch + reboot from hot
const s1 = await state("1 download+switch");
await p.waitForTimeout(2500);
const s2 = await state("2 booted hot (persist)");
// 3. relaunch, but the persisted path got lost -> bundled copy boots; must switch to the existing folder, no download
base = "public";
await p.evaluate(() => sessionStorage.setItem("__slash", "1"));
await p.reload();
await p.waitForTimeout(4000);
const s3 = await state("3 relaunch, persist lost");
// 4. relaunch from hot again (trailing slash in path): no download, nothing removed
await p.reload();
await p.waitForTimeout(4000);
const s4 = await state("4 relaunch from hot");
const ok = sets >= 2 && base.includes("/hot/") && s3.writes === s1.writes && s4.writes === s1.writes && !s4.rms.some((x) => x.includes("test01")) && persisted && persisted.includes("/hot/");
console.log(ok ? "PASS" : "FAIL");
await browser.close();
