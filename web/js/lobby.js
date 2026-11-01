// Lobby (Brawl Stars-style home: hero on a stage in the middle, info on the left, play button bottom-right)
// and the capsule gacha with a staged pull sequence (crank → capsule → open → card flips → summary).
import { CHARS, CHAR_ORDER, ELEM, UNLOCKS, GACHA, RARITY, REACTIONS } from "./data.js";
import { load, save, unlockProgress, pull, checkUnlocks } from "./save.js";
import { sfx, setSound, setMusic, playMusic } from "./audio.js";
import { el } from "./util.js";
import { bushSprite, crateSprite } from "./map.js";
import { btn, toast, clear, showNet, showHelp, showUnlock, uiRoot } from "./ui.js";
import { app } from "./main.js";

const q = (s, r) => r.querySelector(s);
let entered = false; // full entrance animation only the first time per session

// ------------------------------------------------------------------ the island the hero stands on (pixel art)
function islandCanvas(elemColor) {
  const W = 220, H = 92, c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d");
  const cx = W / 2, top = 26, rx = 92, ry = 26, depth = 22;
  // dirt front face
  for (let y = 0; y < depth; y++) {
    const k = y / depth;
    g.fillStyle = y < 3 ? "#7a4f2c" : k < 0.5 ? "#a8713e" : "#8a5a30";
    const w = Math.sqrt(1 - Math.min(1, (0.05 * y) ** 2)) * rx * (1 - k * 0.12);
    g.fillRect(Math.round(cx - w), top + ry - 2 + y, Math.round(w * 2), 1);
  }
  for (let i = 0; i < 26; i++) {
    g.fillStyle = i % 3 ? "#6a4224" : "#c08a50";
    g.fillRect(Math.round(cx - 80 + Math.random() * 160), Math.round(top + ry + 2 + Math.random() * (depth - 6)), 3, 2);
  }
  // grass top: checker ellipse
  for (let y = -ry; y <= ry; y++) {
    const w = Math.floor(Math.sqrt(1 - (y / ry) ** 2) * rx);
    for (let x = -w; x <= w; x++) {
      const ch = ((Math.floor((x + 200) / 12) + Math.floor((y + 200) / 7)) & 1) === 0;
      g.fillStyle = ch ? "#78c850" : "#6fbf48";
      g.fillRect(cx + x, top + y, 1, 1);
    }
    g.fillStyle = "#2a1a14";
    g.fillRect(cx - w - 1, top + y, 1, 1);
    g.fillRect(cx + w + 1, top + y, 1, 1);
  }
  g.fillStyle = "#9ae070";
  for (let x = -rx + 6; x < rx - 6; x += 1) {
    const yy = Math.round(-Math.sqrt(1 - (x / rx) ** 2) * ry);
    g.fillRect(cx + x, top + yy + 1, 1, 1);
  }
  // glowing summon circle in the element color
  g.strokeStyle = elemColor;
  g.globalAlpha = 0.8;
  g.lineWidth = 1;
  g.beginPath();
  g.ellipse(cx, top + 2, 46, 13, 0, 0, Math.PI * 2);
  g.stroke();
  g.beginPath();
  g.ellipse(cx, top + 2, 38, 10, 0, 0, Math.PI * 2);
  g.stroke();
  g.globalAlpha = 1;
  // tufts & flowers
  for (let i = 0; i < 22; i++) {
    const a = Math.random() * Math.PI * 2, r = 0.55 + Math.random() * 0.4;
    const x = Math.round(cx + Math.cos(a) * rx * r), y = Math.round(top + Math.sin(a) * ry * r);
    g.fillStyle = i % 4 === 0 ? ["#ffffff", "#ffe066", "#ff8ac0"][i % 3] : "#4f9a34";
    g.fillRect(x, y, 1, 2);
    if (i % 4 === 0) g.fillRect(x - 1, y + 1, 3, 1);
  }
  // props: bushes and a crate on the rim
  g.drawImage(bushSprite(0, 1), 8, top - 30);
  g.drawImage(bushSprite(0, 3), 26, top - 22);
  g.drawImage(bushSprite(0, 2), W - 48, top - 28);
  g.drawImage(crateSprite("crate"), W - 70, top - 16);
  return c;
}

// ------------------------------------------------------------------ lobby
export function showLobby() {
  clear();
  document.body.classList.remove("ingame");
  playMusic("lobby");
  const root = uiRoot();
  const m = load();
  if (!m.chars.includes(m.sel)) m.sel = m.chars[0];
  const s = el("div", "screen lobby lb" + (entered ? " quick" : ""));
  entered = true;
  const pulls = Math.floor(m.tokens / GACHA.cost1);
  s.innerHTML = `<div class="sparkles"></div><div class="lb-glow"></div>
  <div class="topbar">
    <div class="logo outline">AI娘<span>幻觉地牢</span></div>
    <div class="spacer"></div>
    <div class="pill o1"><span>👤</span><span class="pname"></span></div>
    <div class="pill o1"><div class="gem"></div><span class="tok">${m.tokens}</span></div>
    <button class="btn gray small set-btn" title="设置">⚙</button>
  </div>
  <div class="lb-left"><div class="lb-info"></div><div class="lb-roster"></div></div>
  <div class="lb-center"><div class="lb-rays"></div><div class="lb-motes">${Array.from({ length: 14 }, (_, i) => `<i style="left:${8 + ((i * 37) % 84)}%;animation-delay:${(i * 0.53) % 4}s;animation-duration:${3 + (i % 4) * 0.7}s"></i>`).join("")}</div><div class="lb-island"></div><div class="lb-hero"><img alt=""></div><div class="lb-name outline"></div></div>
  <div class="lb-right">
    <div class="lb-tiles"></div>
    <div class="lb-goal o1"></div>
    <div class="lb-play"></div>
  </div>`;
  root.appendChild(s);
  q(".pname", s).textContent = m.name;
  q(".set-btn", s).onclick = () => (sfx("click"), showSettings());
  // side tiles (Brawl Stars keeps shop / brawlers / social as square tiles)
  const tiles = q(".lb-tiles", s);
  const tile = (icon, label, cls, fn, badge) => {
    const t = el("button", "lb-tile " + cls, `<span class="ti">${icon}</span><span class="tl outline">${label}</span>${badge ? `<i class="badge o1">${badge}</i>` : ""}`);
    t.onclick = () => (sfx("click"), fn());
    tiles.appendChild(t);
  };
  tile("🎰", "扭蛋机", "t-gacha", () => showGacha(), pulls > 0 ? Math.min(99, pulls) : "");
  tile("👥", "联机对战", "t-net", () => showNet());
  tile("📖", "玩法说明", "t-help", () => showHelp());
  const play = q(".lb-play", s);
  play.innerHTML = `<div class="mode o1"><span class="chip">单人闯关</span> 数据草原 · 7 个房间 · 首领【幻觉之眼】</div>`;
  const pb = btn(`<span class="pt">开始冒险</span>`, "big play-btn", () => {
    // launch: the hero leaps off the island, white wipe, then the run starts
    s.classList.add("launch");
    sfx("portal");
    setTimeout(() => app.startSolo(), 520);
  });
  play.appendChild(pb);
  play.appendChild(el("div", "lb-stats o1", `击败 ${m.stats.kills} · 反应 ${m.stats.reactions} · 通关 ${m.stats.bossKills} · 最远 ${m.stats.best}/7`));
  // next goal (like Brawl Stars' trophy road progress)
  const next = CHAR_ORDER.find((id) => !m.chars.includes(id));
  const goal = q(".lb-goal", s);
  if (next) {
    const u = UNLOCKS[next], pr = unlockProgress(next);
    goal.innerHTML = `<div class="g-h">下一个目标</div><div class="g-row"><img src="assets/portrait_${next}.png" alt=""><div class="g-tx"><b>解锁 ${CHARS[next].short}</b><span>${u.text}</span><div class="g-bar"><i style="width:${Math.round(pr * 100)}%"></i></div><small>${Math.min(m.stats[u.stat] || 0, u.need)} / ${u.need}</small></div></div>`;
  } else goal.innerHTML = `<div class="g-h">全部角色已解锁 🎉</div><div class="g-row"><div class="g-tx"><b>挑战更快通关</b><span>最远 ${m.stats.best}/7 · 通关 ${m.stats.bossKills} 次</span></div></div>`;
  renderRoster(s);
  renderHero(s, m.sel, false);
  // click the hero: a little hop
  q(".lb-hero", s).onclick = () => {
    const h = q(".lb-hero", s);
    h.classList.remove("hop");
    void h.offsetWidth;
    h.classList.add("hop");
    sfx("pickup");
  };
  const fresh = m.chars.filter((c) => !["deepseek", "gpt"].includes(c) && !m.seenUnlock.includes(c));
  if (fresh.length) setTimeout(() => showUnlock(fresh[0]), 900);
}

function renderRoster(s) {
  const m = load(), r = q(".lb-roster", s);
  r.innerHTML = "";
  CHAR_ORDER.forEach((id, i) => {
    const c = CHARS[id], open = m.chars.includes(id);
    const d = el("div", "rcard" + (m.sel === id ? " sel" : "") + (open ? "" : " locked"));
    d.style.background = `linear-gradient(180deg, ${c.color}, #2a2470)`;
    d.style.animationDelay = 0.55 + i * 0.06 + "s";
    d.innerHTML = `<img src="assets/portrait_${id}.png" alt=""><div class="el o1" style="background:${ELEM[c.elem].color}">${ELEM[c.elem].name}</div><div class="nm o1">${c.short}</div>`;
    if (!open) {
      const u = UNLOCKS[id], pr = unlockProgress(id);
      d.insertAdjacentHTML("beforeend", `<div class="lock o1"><div class="ic">🔒</div><div class="bar"><i style="width:${Math.round(pr * 100)}%"></i></div></div>`);
      d.title = u.text;
    }
    d.onclick = () => {
      sfx("click");
      if (open && m.sel !== id) {
        m.sel = id;
        save();
      }
      r.querySelectorAll(".rcard").forEach((n, k) => n.classList.toggle("sel", CHAR_ORDER[k] === id && open));
      renderHero(s, id, true);
    };
    r.appendChild(d);
  });
}

function bar(label, v, max, col) {
  const pct = Math.max(6, Math.min(100, (v / max) * 100));
  return `<div class="sb"><span class="sl">${label}</span><div class="st"><i style="width:${pct}%;background:${col}"></i></div><span class="sv">${typeof v === "number" ? Math.round(v * 10) / 10 : v}</span></div>`;
}
function renderHero(s, id, swap) {
  const m = load(), c = CHARS[id], open = m.chars.includes(id), e = ELEM[c.elem];
  s.style.setProperty("--ec", e.color);
  s.style.setProperty("--eg", e.glow);
  const hero = q(".lb-hero", s), img = q("img", hero);
  const apply = () => {
    img.src = `assets/hero_${id}.png`;
    hero.classList.toggle("dark", !open);
    const isl = q(".lb-island", s);
    isl.innerHTML = "";
    isl.appendChild(islandCanvas(e.color));
    q(".lb-name", s).innerHTML = `${c.short}<small>${c.title}</small>`;
  };
  if (swap) {
    hero.classList.remove("swap");
    void hero.offsetWidth;
    hero.classList.add("swap");
    setTimeout(apply, 160);
    sfx("card");
  } else apply();
  const dps = c.atk.dmg * c.atk.rate;
  const info = q(".lb-info", s);
  info.classList.remove("refresh");
  void info.offsetWidth;
  info.classList.add("refresh");
  info.innerHTML = `
    <div class="li-head"><div class="li-name outline">${c.name}</div><div class="li-title o1">「${c.title}」</div>
      <div class="li-chips o1"><span class="chip" style="background:${e.color}">${e.name}元素</span><span class="chip">${c.role}</span></div></div>
    <div class="li-bars o1">
      ${bar("生命", c.hp, 7, "linear-gradient(90deg,#ff8a9a,#ff3a5a)")}
      ${bar("护盾", c.shield, 6, "linear-gradient(90deg,#e0ecff,#8aa8ff)")}
      ${bar("移速", c.speed, 125, "linear-gradient(90deg,#b0ffd0,#3ad07a)")}
      ${bar("火力", dps, 16, "linear-gradient(90deg,#ffe36a,#ff9a2e)")}
    </div>
    <div class="li-skills o1">
      ${[["J", c.atk.name, c.passive], ["K", c.skill.name, c.skill.desc + `（冷却${c.skill.cd}秒）`], ["L", c.ult.name, c.ult.desc]]
        .map(([k, n, d]) => `<div class="sk"><div class="sk-ic" style="background:${e.color}">${k}</div><div class="sk-tx"><b>${n}</b><span>${d}</span></div></div>`)
        .join("")}
    </div>
    <div class="li-react o1"><div class="lr-h">混搭反应（${e.name}元素参与）</div>${Object.entries(REACTIONS)
      .filter(([k]) => k === "bubble" || k.split("+").includes(c.elem))
      .map(([k, r]) => `<span class="chip" title="${r.desc}">${k === "bubble" ? (c.elem === "bubble" ? "泡+任意" : "泡+" + e.name) : k.split("+").map((x) => ELEM[x].name).join("+")} ${r.name}</span>`)
      .join("")}</div>
    <div class="li-lore o1">${open ? c.lore : "🔒 解锁条件：" + UNLOCKS[id].text + `（${Math.round(unlockProgress(id) * 100)}%）`}</div>`;
  const pb = q(".play-btn", s);
  if (pb) {
    pb.disabled = !open;
    q(".pt", pb).textContent = open ? "开始冒险" : "未解锁";
  }
}

function showSettings() {
  const m = load();
  const md = el("div", "modal");
  md.innerHTML = `<div class="panel" style="min-width:300px;text-align:center"><h2 class="outline">设置</h2><div class="row r1"></div><div class="row r2" style="margin-top:10px"></div></div>`;
  const tg = (label, key, fn) =>
    btn(`${label}：${m[key] ? "开" : "关"}`, "gray small", (ev) => {
      m[key] = !m[key];
      fn && fn(m[key]);
      save();
      ev.target.closest("button").innerHTML = `${label}：${m[key] ? "开" : "关"}`;
    });
  q(".r1", md).append(tg("音效", "sound", setSound), tg("音乐", "music", setMusic));
  q(".r2", md).append(btn("关闭", "", () => md.remove()));
  uiRoot().appendChild(md);
}

// ------------------------------------------------------------------ gacha
const FEATURED = ["t_revive", "t_startcard", "u_links"];
const ICON = (it) => (it.card ? "🃏" : { t_dmg: "⚔", t_hp: "❤", t_shield: "🛡", t_speed: "👟", t_coin: "🪙", t_start_coin: "💰", t_crit: "✴", t_ult: "⚡", t_revive: "♻", t_startcard: "📜" }[it.id] || "✦");
const CAP_COLORS = ["#ffd84a", "#5fb4ff", "#c27bff", "#5dff7a", "#ff7cc8", "#ff8a5a"];

export function showGacha() {
  clear();
  playMusic("lobby");
  const root = uiRoot();
  const m = load();
  const s = el("div", "screen gacha2");
  s.innerHTML = `<div class="sparkles"></div>
  <div class="topbar"><button class="btn gray small back-btn">◀ 返回</button><div class="logo outline">扭蛋机<span>算力抽卡</span></div><div class="spacer"></div><div class="pill o1"><div class="gem"></div><span class="tok">${m.tokens}</span></div></div>
  <div class="gm">
    <div class="gm-dome"><div class="gm-shine"></div></div>
    <div class="gm-neck"></div>
    <div class="gm-base"><div class="gm-label outline">算力扭蛋</div><div class="gm-slot"></div><div class="gm-crank"><i></i></div><div class="gm-chute"></div></div>
  </div>
  <div class="gp">
    <div class="gp-banner"><div class="gp-title outline">常驻扭蛋 · 永久天赋与稀有技能卡</div><div class="gp-feat"></div></div>
    <div class="gp-pity o1"></div>
    <div class="gp-btns"></div>
    <div class="gp-owned-h o1">收藏（点击查看说明）</div>
    <div class="gp-owned"></div>
  </div>`;
  root.appendChild(s);
  q(".back-btn", s).onclick = () => (sfx("click"), showLobby());
  // capsules inside the dome
  const dome = q(".gm-dome", s);
  for (let i = 0; i < 18; i++) {
    const c = el("div", "capsule");
    c.style.setProperty("--c", CAP_COLORS[i % CAP_COLORS.length]);
    const row = Math.floor(i / 6), col = i % 6;
    c.style.left = 8 + col * 14 + (row % 2) * 6 + "%";
    c.style.top = 50 + row * 13 - Math.abs(col - 2.5) * 2 + "%";
    c.style.transform = `rotate(${(i * 47) % 360}deg)`;
    c.style.animationDelay = (i % 5) * 0.13 + "s";
    dome.appendChild(c);
  }
  // featured SSR items
  const feat = q(".gp-feat", s);
  for (const id of FEATURED) {
    const it = GACHA.pool.find((p) => p.id === id);
    const lv = m.talents[id] || 0;
    feat.appendChild(el("div", "fcard " + it.r, `<div class="fr o1">${it.r}</div><div class="fi">${ICON(it)}</div><div class="fn">${it.name}</div><div class="fd">${it.desc}</div>${lv ? `<div class="fo">已拥有</div>` : ""}`));
  }
  const pity = q(".gp-pity", s);
  pity.innerHTML = `<div class="pb"><span>SSR 保底</span><div class="st"><i style="width:${(m.pity / GACHA.pity) * 100}%;background:linear-gradient(90deg,#ffe36a,#ff9a2e)"></i></div><span>${m.pity}/${GACHA.pity}</span></div>
    <div class="pb"><span>SR 保底</span><div class="st"><i style="width:${Math.min(10, m.pity10) * 10}%;background:linear-gradient(90deg,#e0b0ff,#a060ff)"></i></div><span>${Math.min(10, m.pity10)}/10</span></div>
    <div class="rates">概率 <b style="color:#ffd84a">SSR 3%</b> · <b style="color:#d6a8ff">SR 14%</b> · <b style="color:#8ac8ff">R 33%</b> · N 50% ｜ 满级的重复天赋返还晶石</div>`;
  const b = q(".gp-btns", s);
  const b1 = btn(`<span>单抽</span><small>${GACHA.cost1} 💎</small>`, "blue pull-btn", () => doPull(1));
  const b10 = btn(`<span>十连</span><small>${GACHA.cost10} 💎 · 必出SR</small>`, "pink pull-btn", () => doPull(10));
  if (m.tokens < GACHA.cost1) b1.classList.add("poor");
  if (m.tokens < GACHA.cost10) b10.classList.add("poor");
  b.append(b1, b10);
  renderOwned(s);

  async function doPull(n) {
    const cost = n === 1 ? GACHA.cost1 : GACHA.cost10;
    if (m.tokens < cost) return toast("晶石不足：去地牢里赚吧！");
    m.tokens -= cost;
    const res = [];
    for (let i = 0; i < n; i++) res.push(pull());
    save();
    const unl = checkUnlocks();
    await pullSequence(s, res);
    showGacha();
    if (unl.length) showUnlock(unl[0]);
  }
}

function renderOwned(s) {
  const m = load(), o = q(".gp-owned", s);
  o.innerHTML = "";
  for (const it of GACHA.pool) {
    const lv = m.talents[it.id] || 0;
    const d = el("div", "own " + it.r + (lv ? "" : " no"), `<span class="oi">${ICON(it)}</span><span class="on">${it.name}</span><span class="ol">${lv ? (it.max > 1 ? "Lv" + lv : "✔") : "—"}</span>`);
    d.title = it.desc;
    d.onclick = () => toast(`${it.name}：${it.desc}${lv ? `（${it.max > 1 ? "Lv" + lv + "/" + it.max : "已拥有"}）` : "（未拥有）"}`, 2200);
    o.appendChild(d);
  }
}

// ---------------------------------------------------------------- the staged pull
const ORDER = ["N", "R", "SR", "SSR"];
const RCOL = { N: "#b8c4d6", R: "#5fb4ff", SR: "#c27bff", SSR: "#ffc93a" };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function particles(canvas) {
  const g = canvas.getContext("2d"), parts = [];
  let raf = 0, alive = true;
  const fit = () => {
    canvas.width = innerWidth;
    canvas.height = innerHeight;
  };
  fit();
  const tick = () => {
    if (!alive) return;
    g.clearRect(0, 0, canvas.width, canvas.height);
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.t += 1 / 60;
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.grav;
      p.vx *= 0.99;
      p.rot += p.vr;
      const a = Math.max(0, 1 - p.t / p.life);
      if (a <= 0) {
        parts.splice(i, 1);
        continue;
      }
      g.save();
      g.globalAlpha = a;
      g.translate(p.x, p.y);
      g.rotate(p.rot);
      g.fillStyle = p.c;
      if (p.kind === "spark") {
        g.globalCompositeOperation = "lighter";
        g.fillRect(-p.s, -p.s / 4, p.s * 2, p.s / 2);
      } else g.fillRect(-p.s / 2, -p.s / 3, p.s, p.s / 1.5);
      g.restore();
    }
    raf = requestAnimationFrame(tick);
  };
  tick();
  return {
    burst(x, y, n, cols, kind = "confetti", speed = 9) {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2, v = (0.3 + Math.random()) * speed;
        parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - (kind === "confetti" ? 4 : 0), grav: kind === "confetti" ? 0.18 : 0.02, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4, s: kind === "confetti" ? 7 + Math.random() * 7 : 10 + Math.random() * 16, c: cols[i % cols.length], t: 0, life: kind === "confetti" ? 2.6 : 0.9, kind });
      }
    },
    stop() {
      alive = false;
      cancelAnimationFrame(raf);
    },
  };
}

/** crank → capsule drops and rolls to center → tap to open → cards fly out and flip → summary */
function pullSequence(screen, res) {
  return new Promise(async (resolve) => {
    const best = res.reduce((b, r) => (ORDER.indexOf(r.r) > ORDER.indexOf(b) ? r.r : b), "N");
    let skip = false;
    const machine = q(".gm", screen);
    // 1. crank and rattle
    machine.classList.add("crank");
    sfx("gacha");
    await sleep(750);
    machine.classList.remove("crank");
    // overlay
    const ov = el("div", "pull-ov");
    ov.innerHTML = `<canvas class="pv-fx"></canvas><div class="pv-rays"></div><div class="pv-stage"><div class="pv-cap"><i class="top"></i><i class="bot"></i></div><div class="pv-hint outline">点击打开</div></div><div class="pv-cards"></div><div class="pv-foot"></div><button class="btn gray small pv-skip">跳过 ▶▶</button>`;
    uiRoot().appendChild(ov);
    const fx = particles(q(".pv-fx", ov));
    const cap = q(".pv-cap", ov), rays = q(".pv-rays", ov);
    // the capsule shows the best rarity (SSR fakes out as SR first)
    const shown = best === "SSR" ? "SR" : best;
    cap.style.setProperty("--c", RCOL[shown]);
    rays.style.setProperty("--c", RCOL[shown]);
    ov.classList.add("r-" + shown);
    q(".pv-skip", ov).onclick = (e) => {
      e.stopPropagation();
      skip = true;
      ov.classList.add("skipping");
    };
    setTimeout(() => sfx("coin"), 420);
    setTimeout(() => sfx("coin"), 700);
    await sleep(skip ? 0 : 950);
    // 2. wait for the tap (or skip)
    ov.classList.add("ready");
    if (!skip)
      await new Promise((r) => {
        const go = () => (ov.removeEventListener("click", go), r());
        ov.addEventListener("click", go);
        const t = setInterval(() => skip && (clearInterval(t), r()), 100);
      });
    ov.classList.remove("ready");
    if (best === "SSR" && !skip) {
      // fake-out: the purple glow cracks into gold
      cap.classList.add("shake");
      await sleep(600);
      cap.style.setProperty("--c", RCOL.SSR);
      rays.style.setProperty("--c", RCOL.SSR);
      ov.classList.remove("r-SR");
      ov.classList.add("r-SSR");
      sfx("ssr");
      fx.burst(innerWidth / 2, innerHeight / 2, 60, ["#ffe36a", "#ffffff", "#ff9a2e"], "spark", 14);
      await sleep(500);
    }
    // 3. open
    cap.classList.remove("shake");
    cap.classList.add("open");
    sfx("pickup");
    fx.burst(innerWidth / 2, innerHeight / 2, 40, ["#ffffff", RCOL[best]], "spark", 12);
    await sleep(skip ? 0 : 320);
    q(".pv-stage", ov).classList.add("gone");
    // 4. cards
    const wrap = q(".pv-cards", ov);
    wrap.classList.toggle("ten", res.length > 1);
    const cards = res.map((r, i) => {
      const it = r.item;
      const d = el("div", "rc " + r.r);
      d.style.setProperty("--c", RCOL[r.r]);
      d.style.setProperty("--i", i);
      d.innerHTML = `<div class="rc-in"><div class="rc-back"><span>?</span></div><div class="rc-front"><div class="rr o1">${r.r}</div><div class="ri">${ICON(it)}</div><div class="rn">${it.name}</div><div class="rd">${it.desc}</div><div class="rl">${r.dup ? "已满级 · 返还 " + r.refund + "💎" : it.max > 1 ? "Lv " + r.lv + " / " + it.max : "新获得！"}</div></div></div>`;
      wrap.appendChild(d);
      return d;
    });
    await sleep(skip ? 0 : 450 + res.length * 40);
    // flip: commons quick, rares slow with a burst
    for (let i = 0; i < cards.length; i++) {
      const r = res[i], d = cards[i];
      d.classList.add("flip");
      if (!skip) {
        if (r.r === "SSR") {
          sfx("ssr");
          const b = d.getBoundingClientRect();
          fx.burst(b.left + b.width / 2, b.top + b.height / 2, 90, ["#ffe36a", "#ff7cc8", "#5fb4ff", "#ffffff", "#5dff7a"], "confetti", 11);
          ov.classList.add("flash");
          setTimeout(() => ov.classList.remove("flash"), 260);
          await sleep(700);
        } else if (r.r === "SR") {
          sfx("card");
          const b = d.getBoundingClientRect();
          fx.burst(b.left + b.width / 2, b.top + b.height / 2, 30, ["#e0b0ff", "#ffffff"], "spark", 7);
          await sleep(380);
        } else {
          sfx("click");
          await sleep(120);
        }
      }
    }
    // 5. summary
    const foot = q(".pv-foot", ov);
    const m = load();
    const refund = res.reduce((a, r) => a + r.refund, 0);
    foot.innerHTML = `<div class="o1 pv-sum">${res.length} 抽 · 最高 <b style="color:${RCOL[best]}">${best}</b>${refund ? ` · 返还 ${refund}💎` : ""} · 剩余 ${m.tokens}💎</div>`;
    const again = btn(res.length > 1 ? `再来十连 ${GACHA.cost10}💎` : `再来一抽 ${GACHA.cost1}💎`, "pink", () => finish(res.length));
    const ok = btn("收下", "", () => finish(0));
    foot.append(ok, again);
    q(".pv-skip", ov).remove();
    foot.classList.add("show");
    function finish(again) {
      fx.stop();
      ov.remove();
      resolve();
      if (again) setTimeout(() => {
        const bt = document.querySelectorAll(".gacha2 .pull-btn")[again > 1 ? 1 : 0];
        bt && bt.click();
      }, 60);
    }
  });
}
