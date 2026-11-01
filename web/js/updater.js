// APK hot update ("incremental update" from GitHub):
// The Android app (Capacitor) ships the game files in the APK. On launch it fetches update.json from
// GitHub Pages, compares per-file hashes with the running copy, downloads ONLY the changed files,
// copies the unchanged ones locally, verifies every hash, and switches the WebView to the new folder.
// The new folder is made permanent only after it boots successfully (so a broken update can't brick the app).
import { el } from "./util.js";

const OVERRIDE = (() => {
  try {
    return localStorage.getItem("updRemote"); // test hook
  } catch {
    return null;
  }
})();
const REMOTES = [
  ...(OVERRIDE ? [OVERRIDE] : []),
  "https://designer-awei.github.io/infinite-dream/",
  "https://cdn.jsdelivr.net/gh/Designer-Awei/infinite-dream@main/docs/",
];
const native = () => !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
export let localVersion = "";

async function sha12(buf) {
  const d = await crypto.subtle.digest("SHA-1", buf);
  return Array.from(new Uint8Array(d), (b) => b.toString(16).padStart(2, "0")).join("").slice(0, 12);
}
function b64(buf) {
  let s = "";
  const u = new Uint8Array(buf);
  for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000));
  return btoa(s);
}
async function fetchJSON(url) {
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) throw new Error(r.status);
  return r.json();
}

/** called once at boot */
export async function initUpdater() {
  try {
    localVersion = (await fetchJSON("update.json")).version || "";
  } catch {}
  if (!native()) return;
  const P = window.Capacitor.Plugins, FS = P.Filesystem, WV = P.WebView;
  if (!FS || !WV) return;
  // we booted fine from a downloaded folder: make it permanent, and drop older folders
  let current = "";
  try {
    current = (await WV.getServerBasePath()).path || "";
    if (current.includes("/hot/")) await WV.persistServerBasePath();
    const list = await FS.readdir({ path: "hot", directory: "DATA" }).catch(() => ({ files: [] }));
    for (const f of list.files || []) {
      const name = typeof f === "string" ? f : f.name;
      if (!current.endsWith("/hot/" + name)) await FS.rmdir({ path: "hot/" + name, directory: "DATA", recursive: true }).catch(() => {});
    }
  } catch {}
  setTimeout(() => checkUpdate(FS, WV), 1500);
}

async function checkUpdate(FS, WV) {
  let local, remote, base;
  try {
    local = await fetchJSON("update.json");
  } catch {
    return;
  }
  for (const r of REMOTES) {
    try {
      remote = await fetchJSON(r + "update.json?t=" + Date.now());
      base = r;
      break;
    } catch {}
  }
  if (!remote || !remote.version || remote.version <= local.version) return;
  const names = Object.keys(remote.files);
  const changed = names.filter((f) => !local.files[f] || local.files[f].h !== remote.files[f].h);
  const bytes = changed.reduce((a, f) => a + remote.files[f].s, 0);
  const ui = progressUI(remote.version, changed.length, bytes);
  const dir = "hot/" + remote.version.replace(/[^\w.-]/g, "_");
  try {
    let done = 0, got = 0;
    for (const f of names) {
      const isNew = changed.includes(f);
      const want = remote.files[f].h;
      let buf = null;
      // changed files come from GitHub (fallback mirror if the first is stale/unreachable); others from the local copy
      const sources = isNew ? [base, ...REMOTES.filter((r) => r !== base)].map((r) => r + f + "?v=" + want) : [f];
      for (const src of sources) {
        try {
          const r = await fetch(src, { cache: "no-store" });
          if (!r.ok) continue;
          const b = await r.arrayBuffer();
          if ((await sha12(b)) === want) {
            buf = b;
            break;
          }
        } catch {}
      }
      if (!buf) throw new Error("下载失败：" + f);
      await FS.writeFile({ path: dir + "/" + f, data: b64(buf), directory: "DATA", recursive: true });
      done++;
      if (isNew) got += buf.byteLength;
      ui.set(done / names.length, isNew ? got : null);
    }
    await FS.writeFile({ path: dir + "/update.json", data: b64(new TextEncoder().encode(JSON.stringify(remote))), directory: "DATA", recursive: true });
    const { uri } = await FS.getUri({ path: dir, directory: "DATA" });
    ui.done();
    await new Promise((r) => setTimeout(r, 600));
    // switch the WebView to the new folder (reloads the page); it is persisted on the next successful boot
    await WV.setServerBasePath({ path: decodeURIComponent(uri.replace(/^file:\/\//, "")) });
  } catch (e) {
    ui.fail(e.message || String(e));
    FS.rmdir({ path: dir, directory: "DATA", recursive: true }).catch(() => {});
  }
}

function progressUI(version, n, bytes) {
  const md = el("div", "modal upd-modal");
  md.innerHTML = `<div class="panel" style="min-width:320px;text-align:center"><h2 class="outline">发现新版本</h2>
    <div class="muted" style="color:#fff">增量更新 ${n} 个文件 · ${(bytes / 1024).toFixed(0)} KB<br><small>${version}</small></div>
    <div class="ld-bar" style="width:100%;margin:12px 0 6px"><i></i></div><div class="muted upd-t">准备中…</div></div>`;
  document.getElementById("ui").appendChild(md);
  const bar = md.querySelector(".ld-bar i"), t = md.querySelector(".upd-t");
  return {
    set(p, got) {
      bar.style.width = Math.round(p * 100) + "%";
      if (got != null) t.textContent = `已下载 ${(got / 1024).toFixed(0)} / ${(bytes / 1024).toFixed(0)} KB`;
    },
    done() {
      bar.style.width = "100%";
      t.textContent = "更新完成，正在重启…";
    },
    fail(msg) {
      t.textContent = "更新失败，下次启动再试（" + msg + "）";
      setTimeout(() => md.remove(), 2500);
    },
  };
}
