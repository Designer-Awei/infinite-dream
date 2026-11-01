// Boot, the frame loop, and the app controller tying UI, game and network together.
import { VIEW_H, VIEW_W, setViewW, CHARS, REWARD, ELEM, RS, setRS } from "./data.js";
import { loadAll, A } from "./assets.js";
import { loadFx, FxLayer } from "./fx.js";
import { Renderer } from "./render.js";
import { Game } from "./game.js";
import { input, initInput, consume } from "./input.js";
import { initAudio, playMusic, sfx, setSound, setMusic } from "./audio.js";
import { load, save, talent, checkUnlocks } from "./save.js";
import * as UI from "./ui.js";
import { showLobby, showGacha } from "./lobby.js";
import { Net } from "./net.js";
import { initUpdater } from "./updater.js";

const canvas = document.getElementById("view");
const uiRoot = document.getElementById("ui");
let fx = null, renderer = null;

function resize() {
  const W = innerWidth, H = innerHeight, aspect = W / H;
  const vw = Math.max(560, Math.min(820, Math.round((VIEW_H * aspect) / 2) * 2));
  if (vw !== VIEW_W || !fx || canvas.width !== vw * RS) {
    setViewW(vw);
    canvas.width = vw * RS;
    canvas.height = VIEW_H * RS;
    fx = new FxLayer(vw, VIEW_H);
    if (renderer) {
      const old = renderer;
      renderer = new Renderer(canvas, fx);
      renderer.cam = old.cam;
    }
    if (app.game) app.game.fx = fx;
  }
  const s = Math.min(W / vw, H / VIEW_H);
  // prefer integer scaling when it costs little space
  const si = Math.floor(s);
  const sc = si >= 2 && si / s > 0.9 ? si : s;
  canvas.style.width = Math.round(vw * sc) + "px";
  canvas.style.height = Math.round(VIEW_H * sc) + "px";
}

export const app = {
  game: null,
  me: null,
  paused: false,
  cardOpen: false,
  net: null,
  hudT: 0,

  startSolo() {
    const m = load();
    this.net = null;
    if (!m.tutorialSeen) {
      m.tutorialSeen = true;
      save();
      return UI.showTutorial(() => this.startSolo());
    }
    this.begin({ mode: "solo", pvp: false, seed: (Math.random() * 1e9) | 0, players: [{ id: 1, cid: m.sel, name: m.name }], myId: 1 });
  },
  /** start a run (solo, host or client). cfg: {mode, pvp, seed, players:[{id,cid,name}], myId} */
  begin(cfg) {
    UI.closeCards();
    const g = new Game({ mode: cfg.mode, pvp: cfg.pvp, seed: cfg.seed, fx });
    for (const p of cfg.players) {
      const pl = g.addPlayer({ id: p.id, cid: p.cid, name: p.name, local: p.id === cfg.myId });
      if (cfg.pvp && p.id !== cfg.myId) pl.pvpEnemy = true;
    }
    this.game = g;
    this.me = g.player(cfg.myId);
    this.paused = false;
    this.cardOpen = false;
    this.ended = false;
    g.onUi = (k, pid) => this.onGameUi(k, pid);
    if (cfg.mode !== "client") g.startRun();
    UI.showHud(g, this.me);
    playMusic(cfg.pvp ? "boss" : "battle");
    renderer.follow(g, this.me, 0, true);
    // talent: extra card at the start
    if (cfg.mode !== "client" && !cfg.pvp) {
      const n = talent("t_startcard");
      if (n) for (const p of g.players) if (p.local || cfg.mode === "host") g.offerCards(p, 3, "SR");
    }
  },
  onGameUi(kind, pid) {
    const g = this.game;
    if (!g) return;
    if (kind === "cards") {
      if (pid !== this.me.id) return;
      const ids = g.cardOffers[pid];
      if (!ids) return;
      this.cardOpen = true;
      UI.showCards(g, this.me, ids, (id) => {
        this.cardOpen = false;
        if (g.mode === "client") this.net.send({ t: "pick", card: id });
        else g.pickCard(this.me.id, id);
      });
    } else if (kind === "over") this.endRun(false);
    else if (kind === "win") this.endRun(true);
    else if (kind === "pvpwin") this.endPvp();
    else if (kind === "transition") fade();
    else if (kind === "cardsClosed") {
      UI.closeCards();
      this.cardOpen = false;
    }
    else if (kind === "room") {
      renderer.follow(g, this.me, 0, true);
      if (g.room && g.room.kind === "boss") playMusic("boss");
      else if (!g.pvp) playMusic("battle");
    }
  },
  endRun(win) {
    if (this.ended) return;
    this.ended = true;
    const g = this.game, m = load(), rs = g.runStats;
    const first = win && !m.stats.bossKills;
    const tokens = rs.rooms * REWARD.room + rs.kills * REWARD.kill + rs.elites * REWARD.elite + (rs.boss ? REWARD.boss : 0) + (first ? REWARD.firstBoss : 0);
    m.tokens += tokens;
    m.stats.kills += rs.kills;
    m.stats.reactions += rs.reactions;
    m.stats.runs++;
    m.stats.best = Math.max(m.stats.best, rs.rooms);
    if (rs.boss) m.stats.bossKills++;
    save();
    const unl = checkUnlocks();
    sfx(win ? "win" : "lose");
    const rows = [["清理房间", rs.rooms + " / 7"], ["击败敌人", rs.kills], ["精英", rs.elites], ["元素反应", rs.reactions], ["造成伤害", Math.round(rs.dmg)], ["承受伤害", rs.hurt || 0], ["技能卡", Object.keys(this.me.cards).length]];
    if (first) rows.push(["首通奖励", "+" + REWARD.firstBoss + "💎"]);
    if (unl.length) rows.push(["🔓 新角色解锁", unl.map((id) => CHARS[id].short).join("、")]);
    UI.showResult({ title: win ? "通关！幻觉已破除" : "倒下了…", sub: win ? `${CHARS[this.me.cid].name} 击败了幻觉之眼` : "再接再厉，构筑会更强！", rows, tokens },
      this.net ? null : () => this.startSolo(),
      () => this.toLobby());
  },
  endPvp() {
    if (this.ended) return;
    this.ended = true;
    const g = this.game, w = g.player(g.pvpWinner);
    const mine = g.pvpWinner === this.me.id;
    const m = load();
    const tokens = mine ? 60 : 20;
    m.tokens += tokens;
    save();
    sfx(mine ? "win" : "lose");
    UI.showResult({ title: mine ? "胜利！" : `${w ? w.name : "对手"} 获胜`, sub: "竞技场 · 自由混战", rows: g.players.map((p) => [p.name + "（" + CHARS[p.cid].short + "）", (g.pvpScore[p.id] || 0) + " 击倒"]), tokens }, null, () => this.toLobby());
  },
  toLobby() {
    this.game = null;
    this.me = null;
    if (this.net) this.net.close(), (this.net = null);
    showLobby();
  },
  pause() {
    if (!this.game || this.pauseMd) return;
    if (!this.net) this.paused = true;
    this.pauseMd = UI.showPause(this.game, {
      me: this.me,
      resume: () => ((this.paused = false), (this.pauseMd = null)),
      quit: () => {
        this.paused = false;
        this.pauseMd = null;
        if (this.net) return this.toLobby();
        this.game.phase = "over";
        this.endRun(false);
      },
    });
  },

  // ---------------------------------------------------------- network glue
  hostRoom(pvp) {
    this.net = new Net(this);
    this.net.host(pvp);
  },
  joinRoom(code) {
    if (!/^[A-Z0-9]{4}$/.test(code)) return UI.toast("请输入 4 位房间码");
    this.net = new Net(this);
    this.net.join(code);
  },
  pickNetChar(cid) {
    const m = load();
    m.sel = cid;
    save();
    this.net && this.net.setChar(cid);
  },
  startNet() {
    this.net && this.net.start();
  },
  leaveNet() {
    if (this.net) this.net.close();
    this.net = null;
    showLobby();
  },
};
window.__app = app;
import { flowField, flowDir } from "./map.js";
window.__dbg = { input, flowField, flowDir, UI, get renderer() { return renderer; } };

let fadeEl = null;
function fade() {
  if (!fadeEl) {
    fadeEl = document.createElement("div");
    fadeEl.style.cssText = "position:absolute;inset:0;background:#0b0a10;opacity:0;pointer-events:none;transition:opacity .35s;z-index:8";
    uiRoot.appendChild(fadeEl);
  }
  uiRoot.appendChild(fadeEl);
  fadeEl.style.opacity = 1;
  setTimeout(() => (fadeEl.style.opacity = 0), 750);
}

// ------------------------------------------------------------ loop
let last = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  let dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  const g = app.game;
  if (!g) {
    renderer.g.setTransform(RS, 0, 0, RS, 0, 0);
    renderer.g.fillStyle = "#120c1e";
    renderer.g.fillRect(0, 0, VIEW_W, VIEW_H);
    return;
  }
  const me = app.me;
  if (consume("pause")) app.pauseMd ? null : app.pause();
  const frozen = app.paused || (app.cardOpen && !app.net);
  if (me && !frozen) {
    const inp = me.input;
    inp.mx = input.mx;
    inp.my = input.my;
    const auto = load().autoFire ?? input.touch;
    inp.atk = (input.atk || (auto && !!me.target && !me.downed)) && !app.cardOpen;
    inp.aim = input.aim;
    if (consume("skill")) (inp.skill = true), (inp.castAim = { ...inp.castAim, skill: input.castAim.skill });
    if (consume("ult")) (inp.ult = true), (inp.castAim = { ...inp.castAim, ult: input.castAim.ult });
    if (consume("dash")) inp.dash = true;
  }
  if (g.hitStop > 0) {
    g.hitStop -= dt;
    dt = 0.0001;
  }
  if (g.slowmo > 0) {
    g.slowmo -= dt;
    dt *= 0.3;
  }
  if (!frozen) {
    if (g.mode === "client") app.net && app.net.clientTick(dt);
    else g.update(dt);
    if (g.mode === "host") app.net && app.net.hostTick(dt);
    fx.update(dt);
  }
  renderer.follow(g, me, dt);
  renderer.draw(g, me, frozen ? 0 : dt);
  // adaptive quality: slow devices drop to 1x canvas resolution
  app.ft = (app.ft ?? 16) * 0.97 + (now - (app.lastNow ?? now)) * 0.03;
  app.lastNow = now;
  app.slowT = app.ft > 24 ? (app.slowT || 0) + dt : 0;
  if (RS > 1 && app.slowT > 3) {
    setRS(1);
    resize();
    app.slowT = 0;
  }
  app.hudT -= dt;
  if (app.hudT <= 0) {
    app.hudT = 0.06;
    UI.updateHud(g, me);
  }
}

// ------------------------------------------------------------ boot
async function boot() {
  const bar = document.querySelector(".ld-bar i"), tip = document.querySelector(".ld-tip");
  resize();
  renderer = new Renderer(canvas, fx);
  addEventListener("resize", resize);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && app.game && !app.net && !app.ended && !app.cardOpen) app.pause();
  });
  const m = load();
  setSound(m.sound);
  setMusic(m.music);
  try {
    await Promise.all([loadAll((p) => (bar.style.width = p * 70 + "%")), loadFx().then(() => (tip.textContent = "特效就绪…"))]);
  } catch (e) {
    tip.textContent = "加载失败：" + e.message;
    throw e;
  }
  bar.style.width = "100%";
  initInput(uiRoot);
  UI.initUI(uiRoot, app);
  const unlock = () => {
    initAudio();
    playMusic(app.game ? "battle" : "lobby");
  };
  addEventListener("pointerdown", unlock, { once: false });
  addEventListener("keydown", unlock, { once: false });
  document.getElementById("loading").remove();
  showLobby();
  requestAnimationFrame(frame);
  initUpdater();
  // deep link: #join-ABCD
  const h = location.hash.match(/^#join-([A-Z0-9]{4})$/i);
  if (h) app.joinRoom(h[1].toUpperCase());
}
boot();
