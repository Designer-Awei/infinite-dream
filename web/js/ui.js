// HTML overlay: lobby, roster, gacha, net rooms, HUD, card picks, pause, results.
import { CHARS, CHAR_ORDER, ELEM, UNLOCKS, CARDS, fusionCards, RARITY, GACHA, RUN, STATUS, ITEMS, REACTIONS } from "./data.js";
import { load, save, unlockProgress, pull, checkUnlocks } from "./save.js";
import { A } from "./assets.js";
import { sfx, setSound, setMusic, playMusic } from "./audio.js";
import { el } from "./util.js";

let root, app;
const $ = (s, r = root) => r.querySelector(s);
export function initUI(r, a) {
  root = r;
  app = a;
}
function clear() {
  root.querySelectorAll(":scope > .screen, :scope > .modal, :scope > .hud").forEach((n) => n.remove());
}
export function toast(msg, ms = 1800) {
  const t = el("div", "toast outline", msg);
  root.appendChild(t);
  setTimeout(() => t.remove(), ms);
}
const cardById = (id, cid) => CARDS.find((c) => c.id === id) || fusionCards(cid).find((c) => c.id === id);
function spriteCanvas(cid, view = "front") {
  const s = A.girls[cid], c = document.createElement("canvas");
  c.width = s.w;
  c.height = s.foot;
  c.getContext("2d").drawImage(s.views[view], 0, 0);
  return c;
}
function btn(label, cls, fn) {
  const b = el("button", "btn " + (cls || ""), label);
  b.addEventListener("click", (e) => {
    e.stopPropagation();
    sfx("click");
    fn(e);
  });
  return b;
}

// ------------------------------------------------------------------ lobby
export function showLobby() {
  clear();
  document.body.classList.remove("ingame");
  playMusic("lobby");
  const m = load();
  if (!m.chars.includes(m.sel)) m.sel = m.chars[0];
  const s = el("div", "screen lobby");
  s.innerHTML = `<div class="sparkles"></div>
  <div class="topbar">
    <div class="logo outline">AI娘<span>幻觉地牢</span></div>
    <div class="spacer"></div>
    <div class="pill o1"><span>👤</span><span class="pname"></span></div>
    <div class="pill o1"><div class="gem"></div><span class="tok">${m.tokens}</span></div>
  </div>
  <div class="hero-stage"><div class="platform"></div></div>
  <div class="hero-info"></div>
  <div class="menu-col"></div>
  <div class="roster"></div>`;
  root.appendChild(s);
  $(".pname", s).textContent = m.name;
  const col = $(".menu-col", s);
  col.append(
    btn("开始冒险", "big", () => app.startSolo()),
    btn("联机 / 对战", "blue", () => showNet()),
    btn(`扭蛋机 <small style="font-size:12px">(${GACHA.cost1}💎)</small>`, "pink", () => showGacha()),
    btn("玩法说明", "gray small", () => showHelp()),
  );
  const tip = el("div", "muted o1", `累计击败 ${m.stats.kills} · 反应 ${m.stats.reactions} · 首领 ${m.stats.bossKills}<br>音效 <a class="snd" style="color:#ffe36a;cursor:pointer">${m.sound ? "开" : "关"}</a> · 音乐 <a class="mus" style="color:#ffe36a;cursor:pointer">${m.music ? "开" : "关"}</a>`);
  col.appendChild(tip);
  $(".snd", tip).onclick = () => ((m.sound = !m.sound), setSound(m.sound), save(), showLobby());
  $(".mus", tip).onclick = () => ((m.music = !m.music), setMusic(m.music), save(), showLobby());
  renderRoster(s);
  renderHero(s);
  // newly unlocked?
  const fresh = m.chars.filter((c) => !["deepseek", "gpt"].includes(c) && !m.seenUnlock.includes(c));
  if (fresh.length) showUnlock(fresh[0]);
}
function renderRoster(s) {
  const m = load(), r = $(".roster", s);
  r.innerHTML = "";
  for (const id of CHAR_ORDER) {
    const c = CHARS[id], open = m.chars.includes(id);
    const d = el("div", "rcard" + (m.sel === id ? " sel" : "") + (open ? "" : " locked"));
    d.style.background = `linear-gradient(180deg, ${c.color}, #2a2470)`;
    d.innerHTML = `<img src="assets/portrait_${id}.png" alt=""><div class="el o1" style="background:${ELEM[c.elem].color}">${ELEM[c.elem].name}</div><div class="nm o1">${c.short}</div>`;
    if (!open) {
      const u = UNLOCKS[id], pr = unlockProgress(id);
      d.insertAdjacentHTML("beforeend", `<div class="lock o1"><div class="ic">🔒</div><div>${u.text}</div><div class="bar"><i style="width:${Math.round(pr * 100)}%"></i></div></div>`);
    }
    d.onclick = () => {
      sfx("click");
      if (open) {
        m.sel = id;
        save();
      }
      renderRoster(s);
      renderHero(s, id);
    };
    r.appendChild(d);
  }
}
function renderHero(s, show) {
  const m = load(), id = show || m.sel, c = CHARS[id], open = m.chars.includes(id);
  const st = $(".hero-stage", s);
  st.querySelectorAll("canvas").forEach((n) => n.remove());
  const cv = spriteCanvas(id);
  if (!open) cv.style.filter = "brightness(0) opacity(.6)";
  st.appendChild(cv);
  const e = ELEM[c.elem];
  $(".hero-info", s).innerHTML = `<h1 class="outline">${c.name}</h1>
    <div class="title outline">「${c.title}」 · ${c.role}</div>
    <div class="stats o1"><span class="stat">❤ ${c.hp}</span><span class="stat">🛡 ${c.shield}</span><span class="stat">👟 ${c.speed}</span><span class="stat" style="background:${e.color}">${e.name}元素</span></div>
    <div class="kit o1">
      <div><span class="key">J</span><b>${c.atk.name}</b>：${c.passive}</div>
      <div><span class="key">K</span><b>${c.skill.name}</b>：${c.skill.desc}（冷却${c.skill.cd}秒）</div>
      <div><span class="key">L</span><b>${c.ult.name}</b>：${c.ult.desc}</div>
    </div>
    <div class="lore o1">${open ? c.lore : "🔒 解锁条件：" + UNLOCKS[id].text}</div>`;
}
export function showUnlock(id) {
  const m = load(), c = CHARS[id];
  if (!m.seenUnlock.includes(id)) m.seenUnlock.push(id);
  save();
  const md = el("div", "modal");
  md.innerHTML = `<div class="panel unlock-pop" style="text-align:center"><h2 class="outline">新角色解锁！</h2></div>`;
  const p = $(".panel", md);
  const cv = spriteCanvas(id);
  cv.style.cssText = "height:150px;image-rendering:pixelated;display:block;margin:6px auto;animation:bob 2s infinite";
  p.appendChild(cv);
  p.appendChild(el("div", "outline", `<div style="font-size:22px">${c.name}</div><div style="color:#ffe36a">「${c.title}」</div>`));
  p.appendChild(btn("太好了！", "", () => md.remove()));
  root.appendChild(md);
  sfx("ssr");
}
function showHelp() {
  const md = el("div", "modal");
  const reacts = Object.entries(REACTIONS).map(([k, r]) => `<span class="chip">${k === "bubble" ? "泡+任意" : k.split("+").map((x) => ELEM[x].name).join("+")} → ${r.name}</span>`).join(" ");
  md.innerHTML = `<div class="panel" style="max-width:720px"><h2 class="outline">玩法说明</h2>
  <div class="muted" style="text-align:left;font-size:13px;color:#fff">
  <b style="color:#ffe36a">操作</b>　电脑：WASD 移动 · <b>J</b> 攻击（自动吸附锁定范围内最近的敌人）· <b>K</b> 小技能 · <b>L</b> 大招 · 空格 闪避 · Esc 暂停<br>
  手机：左侧拖动摇杆移动 · 按住攻击键自动锁敌连射，拖动攻击键可手动瞄准 · 技能/大招键轻点自动释放，拖动瞄准后松手释放<br><br>
  <b style="color:#ffe36a">循环</b>　每局 7 个房间：战斗 → 战斗 → 补给站 → 精英战 → 战斗 → 补给站 → 首领。清场后开箱三选一技能卡，构筑你的流派。护盾受击后几秒自动回复，生命不会。<br><br>
  <b style="color:#ffe36a">技能混搭 · 元素反应</b>　每位角色带一种元素。拿到【融合】【联动】卡后可以借用其他AI娘的弹幕和技能，不同元素先后命中同一敌人触发反应：<br>${reacts}<br><br>
  <b style="color:#ffe36a">地图道具</b>　${Object.values(ITEMS).map((i) => `<span class="chip" style="background:${i.color};color:#1a1020">${i.name}</span>`).join(" ")}　草丛可以隐身；毒雾、泥沼、尖刺、炸药桶会伤人（也会伤敌）。<br><br>
  <b style="color:#ffe36a">养成</b>　通关获得💎晶石，扭蛋机抽取永久天赋与稀有技能卡；达成条件解锁新角色。联机可 2~4 人合作闯关，或进入竞技场 PVP。
  </div><div class="row" style="margin-top:10px"></div></div>`;
  $(".row", md).appendChild(btn("知道了", "", () => md.remove()));
  root.appendChild(md);
}

// ------------------------------------------------------------------ gacha
export function showGacha() {
  clear();
  playMusic("lobby");
  const m = load();
  const s = el("div", "screen gacha");
  s.innerHTML = `<div class="sparkles"></div>
  <div class="topbar"><div class="logo outline">扭蛋机<span>算力抽卡</span></div><div class="spacer"></div><div class="pill o1"><div class="gem"></div><span class="tok">${m.tokens}</span></div></div>
  <div class="machine"><div class="glass"></div><div class="base"></div></div>
  <div class="gpanel">
    <div class="rates o1">概率：<span style="color:#ffd84a">SSR 3%</span> · <span style="color:#d0a0ff">SR 14%</span> · <span style="color:#8ac8ff">R 33%</span> · N 50%<br>十连必出 SR 以上 · ${GACHA.pity} 抽内必出 SSR（当前已 ${m.pity} 抽）<br>重复且已满级的天赋会返还晶石。</div>
    <div class="row g-btns"></div>
    <div class="o1" style="font-size:13px">已拥有：</div>
    <div class="owned o1"></div>
  </div>`;
  root.appendChild(s);
  const glass = $(".glass", s), cols = ["#ffd84a", "#5fb4ff", "#c27bff", "#5dff7a", "#ff7cc8", "#ff8a5a"];
  for (let i = 0; i < 14; i++) {
    const c = el("div", "capsule");
    c.style.setProperty("--c", cols[i % cols.length]);
    c.style.left = 8 + ((i * 37) % 70) + "%";
    c.style.top = 30 + ((i * 53) % 55) + "%";
    c.style.transform = `rotate(${i * 47}deg)`;
    glass.appendChild(c);
  }
  const b = $(".g-btns", s);
  b.append(
    btn(`单抽 ${GACHA.cost1}💎`, "blue", () => doPull(1)),
    btn(`十连 ${GACHA.cost10}💎`, "pink", () => doPull(10)),
    btn("返回", "gray", () => showLobby()),
  );
  renderOwned(s);
  function doPull(n) {
    const cost = n === 1 ? GACHA.cost1 : GACHA.cost10;
    if (m.tokens < cost) return toast("晶石不足：去地牢里赚吧！");
    m.tokens -= cost;
    const res = [];
    for (let i = 0; i < n; i++) res.push(pull());
    save();
    const unl = checkUnlocks();
    $(".machine", s).classList.add("shake");
    sfx("gacha");
    const order = ["N", "R", "SR", "SSR"];
    const best = res.reduce((b, r) => (order.indexOf(r.r) > order.indexOf(b) ? r.r : b), "N");
    setTimeout(() => {
      $(".machine", s).classList.remove("shake");
      const cap = el("div", "dropcap " + best);
      cap.style.setProperty("--c", RARITY[best].color);
      $(".machine", s).appendChild(cap);
      setTimeout(() => sfx(best === "SSR" ? "ssr" : "coin"), 520);
      setTimeout(() => {
        cap.classList.add("open");
        setTimeout(() => revealPulls(res, () => {
          showGacha();
          if (unl.length) showUnlock(unl[0]);
        }), 350);
      }, 1050);
    }, 700);
  }
}
function renderOwned(s) {
  const m = load(), o = $(".owned", s);
  o.innerHTML = "";
  for (const it of GACHA.pool) {
    const lv = m.talents[it.id] || 0;
    if (!lv) continue;
    const sp = el("span", "", `${it.name} ${it.max > 1 ? "Lv" + lv : ""}`);
    sp.style.background = RARITY[it.r].color;
    sp.style.color = "#1a1020";
    sp.title = it.desc;
    o.appendChild(sp);
  }
  if (!o.children.length) o.innerHTML = '<span style="border:0">还没有，来一发？</span>';
}
function revealPulls(res, done) {
  const md = el("div", "modal");
  md.innerHTML = `<div class="panel"><h2 class="outline">抽卡结果</h2><div class="reveal"></div><div class="row" style="margin-top:12px"></div></div>`;
  const rv = $(".reveal", md);
  let best = "N";
  const order = ["N", "R", "SR", "SSR"];
  res.forEach((r, i) => {
    if (order.indexOf(r.r) > order.indexOf(best)) best = r.r;
    const d = el("div", "rv " + r.r, `<span class="chip" style="background:${RARITY[r.r].color};color:#1a1020">${r.r}</span><b>${r.item.name}</b><i>${r.item.desc}</i><i>${r.dup ? "已满级 → 返还" + r.refund + "💎" : r.item.max > 1 ? "Lv" + r.lv : "新获得！"}</i>`);
    d.style.animationDelay = i * 0.09 + "s";
    rv.appendChild(d);
  });
  $(".row", md).appendChild(btn("收下", "", () => (md.remove(), done())));
  root.appendChild(md);
  setTimeout(() => sfx(best === "SSR" ? "ssr" : best === "SR" ? "card" : "pickup"), 300);
}

// ------------------------------------------------------------------ net
export function showNet(pre = {}) {
  clear();
  const m = load();
  const s = el("div", "modal");
  s.style.background = "radial-gradient(120% 90% at 30% 20%, #4a7cff 0%, #3a3ad0 35%, #241a6a 70%, #140c30 100%)";
  s.innerHTML = `<div class="panel netp"><h2 class="outline">联机 · 合作闯关 / 竞技场</h2>
   <div class="row o1" style="margin-bottom:8px">昵称 <input class="nm" maxlength="8" style="text-transform:none;width:150px"></div>
   <div class="row">
     <div style="text-align:center"><div class="o1" style="margin-bottom:6px">创建房间</div><div class="row c-btns"></div></div>
     <div style="width:3px;height:70px;background:#1a1020;border-radius:2px"></div>
     <div style="text-align:center"><div class="o1" style="margin-bottom:6px">加入房间</div><div class="row"><input class="code-in" maxlength="4" placeholder="房间码"></div><div class="row j-btns" style="margin-top:6px"></div></div>
   </div>
   <div class="muted" style="margin-top:10px">把 4 位房间码发给朋友即可一起玩（2~4人，点对点直连，无需注册）。<br>合作模式：敌人血量与数量随人数提升，倒地队友靠近 2 秒可救起。竞技场：自由混战，先拿 5 次击倒获胜。</div>
   <div class="row back" style="margin-top:8px"></div></div>`;
  root.appendChild(s);
  const nm = $(".nm", s);
  nm.value = m.name;
  nm.onchange = () => ((m.name = nm.value.trim().slice(0, 8) || m.name), save());
  $(".c-btns", s).append(btn("合作闯关", "green", () => app.hostRoom(false)), btn("竞技场PVP", "red", () => app.hostRoom(true)));
  $(".j-btns", s).append(btn("加入", "blue", () => app.joinRoom($(".code-in", s).value.trim().toUpperCase())));
  $(".back", s).append(btn("返回大厅", "gray small", () => app.leaveNet()));
}
/** room lobby (both host and clients) */
export function showRoom(info) {
  clear();
  const m = load();
  const s = el("div", "modal");
  s.style.background = "radial-gradient(120% 90% at 30% 20%, #4a7cff 0%, #3a3ad0 35%, #241a6a 70%, #140c30 100%)";
  s.innerHTML = `<div class="panel netp"><h2 class="outline">${info.pvp ? "竞技场 PVP" : "合作闯关"} · 房间</h2>
    <div class="row o1">房间码 <span class="code outline">${info.code}</span></div>
    <div class="muted">${info.status || ""}</div>
    <div class="plist"></div>
    <div class="o1" style="text-align:center;font-size:13px">选择你的角色：</div>
    <div class="row mychars" style="margin:6px 0"></div>
    <div class="row acts"></div></div>`;
  root.appendChild(s);
  const pl = $(".plist", s);
  for (const p of info.players) {
    const d = el("div", "pl o1", `<img src="assets/portrait_${p.cid}.png"><div>${escapeHtml(p.name)}${p.host ? " 👑" : ""}</div><div style="color:#ffe36a">${CHARS[p.cid].short}</div>`);
    pl.appendChild(d);
  }
  for (let i = info.players.length; i < 4; i++) pl.appendChild(el("div", "pl o1", `<div style="height:70px;display:flex;align-items:center;justify-content:center;font-size:26px;opacity:.4">?</div><div>等待加入…</div>`));
  const mc = $(".mychars", s);
  for (const id of m.chars) {
    const b = btn(CHARS[id].short, id === info.myCid ? "" : "gray small", () => app.pickNetChar(id));
    mc.appendChild(b);
  }
  const acts = $(".acts", s);
  if (info.isHost) acts.appendChild(btn(info.pvp ? "开战！" : "出发！", "big", () => app.startNet()));
  else acts.appendChild(el("div", "muted", "等待房主开始…"));
  acts.appendChild(btn("复制邀请链接", "blue small", async () => {
    const url = location.origin + location.pathname + location.search + "#join-" + info.code;
    try {
      await navigator.clipboard.writeText(url);
      toast("已复制：发给朋友打开即可加入");
    } catch {
      toast("房间码：" + info.code);
    }
  }));
  acts.appendChild(btn("离开", "gray small", () => app.leaveNet()));
}
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

// ------------------------------------------------------------------ HUD
let hud = null, hudCache = {};
export function showHud(game, me) {
  clear();
  document.body.classList.add("ingame");
  hud = el("div", "hud");
  hud.innerHTML = `
   <div class="tl"><div class="face"><img src="assets/portrait_${me.cid}.png"></div>
     <div class="bars"><div class="bar hp"><i></i><span class="o1"></span></div><div class="bar sh"><i></i><span class="o1"></span></div>
     <div class="res o1"><div><div class="coin"></div><span class="coins">0</span></div><div><div class="cube"></div><span class="cubes">0</span></div><div class="pvpscore"></div></div></div></div>
   <div class="tc"><div class="pips"></div><div class="bossbar" style="display:none"><div class="nm o1">幻觉之眼</div><div class="bar"><i></i></div></div></div>
   <div class="tr"><div class="buffs"></div><button class="btn small gray pausebtn">Ⅱ</button></div>
   <div class="banner-slot"></div>
   <div class="keys o1">WASD 移动 · J 攻击(自动锁敌) · K 技能 · L 大招 · 空格 闪避</div>
   <div class="pcskills o1"><div class="pcs s-dash"><i class="cdm"></i><span class="k">␣</span>闪避</div><div class="pcs s-skill"><i class="cdm"></i><span class="k">K</span>技能</div><div class="pcs ult s-ult"><i class="cdm"></i><span class="k">L</span>大招</div></div>
   <div class="tipline o1" style="display:none"></div>`;
  root.appendChild(hud);
  hud.querySelector(".pausebtn").onclick = () => app.pause();
  const pips = hud.querySelector(".pips");
  if (!game.pvp) RUN.forEach((r, i) => pips.appendChild(el("div", "pip o1", r.kind === "shop" ? "🛒" : r.kind === "boss" ? "👑" : "⚔")));
  hudCache = {};
}
export function updateHud(game, me) {
  if (!hud || !me) return;
  const set = (k, v, fn) => {
    if (hudCache[k] !== v) (hudCache[k] = v), fn(v);
  };
  set("hp", me.hp + "/" + me.maxHp, (v) => {
    hud.querySelector(".bar.hp i").style.width = (100 * Math.max(0, me.hp)) / me.maxHp + "%";
    hud.querySelector(".bar.hp span").textContent = "❤ " + v;
  });
  set("sh", me.shield + "/" + me.maxShield, (v) => {
    hud.querySelector(".bar.sh i").style.width = (100 * me.shield) / Math.max(1, me.maxShield) + "%";
    hud.querySelector(".bar.sh span").textContent = "🛡 " + v;
  });
  set("coins", me.coins, (v) => (hud.querySelector(".coins").textContent = v));
  set("cubes", me.cubes, (v) => (hud.querySelector(".cubes").textContent = v));
  set("room", game.roomIdx, (v) => hud.querySelectorAll(".pip").forEach((p, i) => (p.className = "pip o1" + (i < v ? " done" : i === v ? " cur" : ""))));
  const boss = game.enemies.find((e) => e.boss);
  set("boss", boss ? Math.ceil((boss.hp / boss.maxHp) * 200) : -1, (v) => {
    const bb = hud.querySelector(".bossbar");
    bb.style.display = v < 0 ? "none" : "";
    if (v >= 0) bb.querySelector("i").style.width = v / 2 + "%";
  });
  // buffs
  const bl = [];
  for (const k of ["speed", "rage", "star", "infuse", "ultOn", "slow", "burn", "poison"]) if (me.buff[k] > 0) bl.push(k + Math.ceil(me.buff[k]));
  set("buffs", bl.join(","), () => {
    const b = hud.querySelector(".buffs");
    b.innerHTML = "";
    for (const k of ["speed", "rage", "star", "infuse", "ultOn", "slow", "burn", "poison"]) if (me.buff[k] > 0) {
      const d = el("div", "buff o1", `${k === "infuse" && me.infuseElem ? "灌注·" + ELEM[me.infuseElem].name : STATUS[k].name} ${Math.ceil(me.buff[k])}s`);
      d.style.background = STATUS[k].color;
      b.appendChild(d);
    }
  });
  // banner
  const bn = game.banner ? game.banner.text + "|" + game.banner.sub : "";
  set("banner", bn, () => {
    const slot = hud.querySelector(".banner-slot");
    slot.innerHTML = "";
    if (game.banner) slot.appendChild(el("div", "banner outline", `<b>${game.banner.text}</b><small>${game.banner.sub || ""}</small>`));
  });
  // cooldowns (PC widgets + touch buttons)
  const c = CHARS[me.cid];
  const sk = me.skillCdFrac ?? Math.max(0, me.skillCd) / (c.skill.cd * me.st.cd);
  const dk = me.dashCdFrac ?? Math.max(0, me.dashCd) / 1.6;
  const uk = Math.min(1, me.ult);
  const q = (x) => Math.round(x * 50) / 50;
  set("cds", q(sk) + "," + q(dk) + "," + q(uk), () => {
    const upd = (sel, frac, ready, label) => {
      const n = hud.querySelector(sel);
      if (n) {
        n.querySelector(".cdm").style.setProperty("--p", Math.round(frac * 100) + "%");
        n.classList.toggle("ready", ready);
      }
      const t = document.querySelector(".b-" + sel.split("-")[1]);
      if (t) {
        const cd = t.querySelector(".cd");
        if (cd) cd.style.setProperty("--p", Math.round(frac * 100) + "%");
        t.classList.toggle("ready", ready);
        if (label) t.querySelector("span").textContent = label;
      }
    };
    upd(".s-skill", sk, sk <= 0);
    upd(".s-dash", dk, dk <= 0);
    upd(".s-ult", 1 - uk, uk >= 1, uk >= 1 ? "大招" : Math.floor(uk * 100) + "%");
  });
  // tip line
  let tip = "";
  if (game.room && game.room.kind === "shop" && me.nearShop) tip = `${me.nearShop.name}：◎${me.nearShop.price}（${load().sel && "按攻击键购买"}）`;
  if (me.downed && !game.pvp) tip = "倒地了！等待队友靠近救援…";
  if (game.phase === "portal") tip = "前往传送门 ↓";
  set("tip", tip, (v) => {
    const t = hud.querySelector(".tipline");
    t.style.display = v ? "" : "none";
    t.textContent = v;
  });
  me.nearShop = null;
  if (game.pvp) {
    const sc = game.players.map((p) => `${p.name}:${game.pvpScore[p.id] || 0}`).join(" ");
    set("pvp", sc, (v) => (hud.querySelector(".pvpscore").textContent = "⚔ " + v));
  }
}

// ------------------------------------------------------------------ cards
export function showCards(game, me, ids, onPick) {
  closeCards();
  const md = el("div", "modal cards-modal");
  md.innerHTML = `<div style="text-align:center"><h2 class="outline" style="font-weight:normal;margin:0 0 18px;font-size:24px">选择一张技能卡</h2><div class="cards"></div><div class="build o1"></div><div class="muted" style="margin-top:6px">${"ontouchstart" in window ? "点击卡牌选择" : "点击或按 1 / 2 / 3 选择"}</div></div>`;
  const wrap = $(".cards", md);
  ids.forEach((id, i) => {
    const c = cardById(id, me.cid);
    if (!c) return;
    const d = el("div", "card " + c.r);
    let ill = "";
    if (c.fuse) ill = `<div class="ill" style="background:${ELEM[CHARS[c.fuse].elem].color}"><img src="assets/portrait_${c.fuse}.png"></div>`;
    else ill = `<div class="ill" style="background:${RARITY[c.r].color}">${{ 提示词: "✎", 机制: "⚙", 反应: "⚛" }[c.tag] || "★"}</div>`;
    const lv = me.cards[id] || 0;
    d.innerHTML = `<div class="rar o1" style="background:${RARITY[c.r].color}">${c.r}</div>${ill}<div class="cn">${c.name}</div><span class="chip tag o1" style="color:#fff">${c.tag}</span><div class="cd2">${c.desc}</div><div class="lv">${c.max > 1 ? `Lv ${lv} → ${lv + 1}` : ""}</div>`;
    d.onclick = () => pick(id);
    wrap.appendChild(d);
  });
  const owned = Object.entries(me.cards);
  const b = $(".build", md);
  if (owned.length) b.innerHTML = "当前构筑：" + owned.map(([id, n]) => `<span>${cardById(id, me.cid)?.name || id}${n > 1 ? "×" + n : ""}</span>`).join("");
  let done = false;
  function pick(id) {
    if (done) return;
    done = true;
    removeEventListener("keydown", key);
    md.remove();
    onPick(id);
  }
  function key(e) {
    const k = { Digit1: 0, Digit2: 1, Digit3: 2, KeyJ: 0, KeyK: 1, KeyL: 2 }[e.code];
    if (k != null && ids[k]) pick(ids[k]);
  }
  setTimeout(() => addEventListener("keydown", key), 350);
  md._cleanup = () => removeEventListener("keydown", key);
  root.appendChild(md);
  sfx("card");
}
export function closeCards() {
  root.querySelectorAll(".cards-modal").forEach((n) => (n._cleanup && n._cleanup(), n.remove()));
}

// ------------------------------------------------------------------ pause / results
export function showPause(game, opts) {
  const md = el("div", "modal pause-modal");
  const m = load();
  md.innerHTML = `<div class="panel" style="min-width:300px;text-align:center"><h2 class="outline">暂停</h2><div class="row r1"></div><div class="row r2" style="margin-top:10px"></div><div class="build o1"></div></div>`;
  $(".r1", md).append(btn("继续", "", () => (md.remove(), opts.resume())));
  $(".r2", md).append(
    btn(`音效：${m.sound ? "开" : "关"}`, "gray small", (e) => ((m.sound = !m.sound), setSound(m.sound), save(), (e.target.closest("button").innerHTML = `音效：${m.sound ? "开" : "关"}`))),
    btn(`音乐：${m.music ? "开" : "关"}`, "gray small", (e) => ((m.music = !m.music), setMusic(m.music), save(), (e.target.closest("button").innerHTML = `音乐：${m.music ? "开" : "关"}`))),
    btn(`自动攻击：${(m.autoFire ?? document.body.classList.contains("touchmode")) ? "开" : "关"}`, "gray small", (e) => {
      m.autoFire = !(m.autoFire ?? document.body.classList.contains("touchmode"));
      save();
      e.target.closest("button").innerHTML = `自动攻击：${m.autoFire ? "开" : "关"}`;
    }),
    btn("放弃本局", "red small", () => (md.remove(), opts.quit())),
  );
  const me = opts.me;
  if (me) {
    const owned = Object.entries(me.cards);
    $(".build", md).innerHTML = owned.length ? "构筑：" + owned.map(([id, n]) => `<span>${cardById(id, me.cid)?.name || id}${n > 1 ? "×" + n : ""}</span>`).join("") : "还没有技能卡";
  }
  root.appendChild(md);
  return md;
}
export function showTutorial(go) {
  const md = el("div", "modal");
  const touch = document.body.classList.contains("touchmode");
  md.innerHTML = `<div class="panel" style="max-width:640px;text-align:center"><h2 class="outline">操作说明</h2>
   <div class="row" style="gap:18px;align-items:stretch">
    <div class="kit o1" style="text-align:left;flex:1;max-height:none">
     <div style="color:#ffe36a">${touch ? "📱 手机" : "⌨ 电脑"}</div>
     ${touch ? "左侧任意位置拖动 = 移动<br>右下红键 = 攻击（默认自动锁敌开火，拖动可手动瞄准）<br>蓝键 = 技能 · 黄键 = 大招（轻点自动瞄准，拖动瞄准松手释放）<br>绿键 = 闪避（短暂无敌）" : "<span class='key'>W</span><span class='key'>A</span><span class='key'>S</span><span class='key'>D</span> 移动<br><span class='key'>J</span> 按住攻击：自动吸附锁定范围内最近的敌人<br><span class='key'>K</span> 小技能 · <span class='key'>L</span> 大招（打出伤害充能）<br><span class='key'>空格</span> 闪避（短暂无敌）· <span class='key'>Esc</span> 暂停"}
    </div>
    <div class="kit o1" style="text-align:left;flex:1;max-height:none">
     <div style="color:#ffe36a">生存要点</div>
     🛡 护盾受击后几秒自动回满，❤ 生命不会<br>🌿 躲进草丛可以隐身<br>✦ 不同元素先后命中同一敌人 = 元素反应<br>📦 清场后开箱选卡，构筑你的混搭流派
    </div></div><div class="row" style="margin-top:12px"></div></div>`;
  $(".row:last-child", md).appendChild(btn("出发！", "big", () => (md.remove(), go())));
  root.appendChild(md);
}
export function showResult(r, onAgain, onLobby) {
  const md = el("div", "modal result");
  md.innerHTML = `<div class="panel" style="min-width:340px;text-align:center"><h2 class="outline">${r.title}</h2>
    <div class="o1" style="font-size:14px;color:#d8d0ff">${r.sub || ""}</div>
    <table class="o1">${r.rows.map(([a, b]) => `<tr><td>${a}</td><td>${b}</td></tr>`).join("")}</table>
    <div class="big outline">+${r.tokens} 💎</div><div class="row acts" style="margin-top:10px"></div></div>`;
  const a = $(".acts", md);
  if (onAgain) a.appendChild(btn("再来一局", "", onAgain));
  a.appendChild(btn("返回大厅", "blue", onLobby));
  root.appendChild(md);
}
export function showMsg(title, text, okLabel = "好的", ok) {
  const md = el("div", "modal");
  md.innerHTML = `<div class="panel" style="text-align:center;max-width:460px"><h2 class="outline">${title}</h2><div class="muted" style="font-size:14px;color:#fff">${text}</div><div class="row" style="margin-top:10px"></div></div>`;
  $(".row", md).appendChild(btn(okLabel, "", () => (md.remove(), ok && ok())));
  root.appendChild(md);
  return md;
}
