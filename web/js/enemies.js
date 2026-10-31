// Enemy behaviours and the boss.
import { dist, angTo, TAU, R } from "./util.js";
import { moveCircle, flowDir, los, tileAt, BUSH } from "./map.js";

function nearestPlayer(g, e) {
  let best = null, bd = 1e9;
  for (const p of g.players) {
    if (p.dead || p.downed) continue;
    let d = dist(e.x, e.y, p.x, p.y);
    if (tileAt(g.map, p.x, p.y) === BUSH && d > 90 && e.lastBy !== p.id) d += 400; // hidden in a bush
    if (d < bd) (bd = d), (best = p);
  }
  return [best, bd];
}
function shoot(g, e, a, o = {}) {
  const b = g.mkBullet(null, { side: "e", x: e.x, y: e.y - (o.h ?? e.r + 6), a, spd: o.spd || 120, dmg: o.dmg || 1, kind: o.kind || "orb", r: o.r || 5, life: o.life || 3.5, elem: null });
  b.slow = o.slow;
  b.burn = o.burn;
  b.big = o.big;
  g.bullets.push(b);
  return b;
}

export function updateEnemy(g, e, dt) {
  e.anim += dt;
  e.flash -= dt;
  if (e.spawnT > 0) {
    e.spawnT -= dt;
    return;
  }
  // statuses
  if (e.burnT > 0) {
    e.burnT -= dt;
    e.burnTick += dt;
    if (e.burnTick >= 0.5) (e.burnTick = 0), g.hit(e, e.burnDps * 0.5, { noReact: true, noCrit: true, p: g.player(e.lastBy) });
    if (e.dead) return;
  }
  e.slowT -= dt;
  e.vulnT -= dt;
  // knockback
  if (e.kbx || e.kby) {
    moveCircle(g.map, e, e.kbx * dt, e.kby * dt, e.def.fly, e.def.phase);
    e.kbx *= Math.pow(0.0005, dt);
    e.kby *= Math.pow(0.0005, dt);
    if (Math.abs(e.kbx) + Math.abs(e.kby) < 5) e.kbx = e.kby = 0;
  }
  if (e.freezeT > 0) return void (e.freezeT -= dt);
  if (e.stunT > 0) return void (e.stunT -= dt);
  const [p, d] = nearestPlayer(g, e);
  if (!p) return;
  const sp = e.def.spd * (e.slowT > 0 ? 1 - e.slowK : 1) * (e.elite ? 1.1 : 1);
  e.t += dt;
  e.cd -= dt;
  e.face = p.x < e.x ? -1 : 1;
  const walk = (k = 1) => {
    let dir;
    if (e.def.fly || e.def.phase || los(g.map, e.x, e.y, p.x, p.y)) {
      const a = angTo(e.x, e.y, p.x, p.y);
      dir = [Math.cos(a), Math.sin(a)];
    } else dir = flowDir(g.map, g.flow, e.x, e.y) || [0, 0];
    moveCircle(g.map, e, dir[0] * sp * k * dt, dir[1] * sp * k * dt, e.def.fly, e.def.phase);
    return dir;
  };
  const touch = () => {
    if (e.def.touch && d < e.r + p.r + 2) g.hurt(p, e.def.touch, e);
  };
  switch (e.def.ai) {
    case "hop": {
      // rest, then a quick hop toward the player
      if (e.st !== "hop" && e.cd <= 0) (e.st = "hop"), (e.cd = 0.45);
      if (e.st === "hop") {
        walk(2.6);
        if (e.cd <= 0) (e.st = "idle"), (e.cd = 0.7 + Math.random() * 0.5);
      }
      touch();
      break;
    }
    case "flit": {
      const a = angTo(e.x, e.y, p.x, p.y) + Math.sin(e.t * 5 + e.wob) * 0.9;
      moveCircle(g.map, e, Math.cos(a) * sp * dt, Math.sin(a) * sp * dt, true);
      touch();
      break;
    }
    case "shooter": {
      const want = 150;
      const a = angTo(e.x, e.y, p.x, p.y), side = Math.sin(e.t * 0.8 + e.wob) > 0 ? 1 : -1;
      let mx = Math.cos(a + side * 1.3), my = Math.sin(a + side * 1.3);
      if (d > want + 30) (mx = Math.cos(a)), (my = Math.sin(a));
      else if (d < want - 40) (mx = -Math.cos(a)), (my = -Math.sin(a));
      moveCircle(g.map, e, mx * sp * dt, my * sp * dt, true);
      if (e.cd <= 0.45 && e.st !== "wind" && d < 260) e.st = "wind";
      if (e.st === "wind" && e.cd <= 0) {
        e.st = "idle";
        e.cd = e.def.shot.cd * (0.85 + Math.random() * 0.3);
        if (los(g.map, e.x, e.y - 10, p.x, p.y - 16)) {
          const n = e.elite ? 3 : 1;
          for (let i = 0; i < n; i++) shoot(g, e, angTo(e.x, e.y - 16, p.x, p.y - 16) + (i - (n - 1) / 2) * 0.22, { spd: e.def.shot.spd });
          g.sound("shoot_ink", 0.1);
        }
      }
      break;
    }
    case "leap": {
      if (e.st === "idle" && e.cd <= 0 && d < 260) {
        e.st = "aim";
        e.cd = 0.55;
        const a = angTo(e.x, e.y, p.x, p.y), L = Math.min(150, d);
        e.lx = e.x + Math.cos(a) * L;
        e.ly = e.y + Math.sin(a) * L;
        e.ox = e.x;
        e.oy = e.y;
      } else if (e.st === "aim" && e.cd <= 0) (e.st = "jump"), (e.cd = 0.5);
      else if (e.st === "jump") {
        const k = 1 - Math.max(0, e.cd) / 0.5;
        const nx = e.ox + (e.lx - e.ox) * k, ny = e.oy + (e.ly - e.oy) * k;
        moveCircle(g.map, e, nx - e.x, ny - e.y, true);
        e.z = Math.sin(k * Math.PI) * 26;
        if (e.cd <= 0) {
          e.st = "idle";
          e.z = 0;
          e.cd = 1.3 + Math.random() * 0.6;
          g.fx.spawn("spawn/poof", e.x, e.y + 4, { palette: ["#061a0a", "#1a4a20", "#3a8a3a", "#8ad06a", "#d0f0a0", "#ffffff"], speed2: 1.6 });
          for (const q of g.alivePlayers()) if (dist(q.x, q.y, e.x, e.y) < 26 + e.r) g.hurt(q, 1, e);
        }
      } else if (e.st === "idle") walk(0.5);
      break;
    }
    case "ghost": {
      walk(0.8);
      if (e.cd <= 0 && d < 240) {
        e.cd = e.def.shot.cd;
        const a = angTo(e.x, e.y - 14, p.x, p.y - 16);
        for (let i = -1; i <= 1; i++) shoot(g, e, a + i * e.def.shot.spread, { spd: e.def.shot.spd, slow: true, kind: "ghost" });
        if (e.elite) for (let i = 0; i < 6; i++) shoot(g, e, (i / 6) * TAU, { spd: 80, slow: true, kind: "ghost" });
      }
      touch();
      break;
    }
    case "caster": {
      if (d > 170) walk(1);
      else if (d < 110) moveCircle(g.map, e, -Math.cos(angTo(e.x, e.y, p.x, p.y)) * sp * dt, -Math.sin(angTo(e.x, e.y, p.x, p.y)) * sp * dt, true);
      if (e.cd <= 0.6 && e.st !== "wind") e.st = "wind";
      if (e.st === "wind" && e.cd <= 0) {
        e.st = "idle";
        e.cd = e.def.shot.cd;
        const n = e.elite ? 12 : 8, off = Math.random() * TAU;
        for (let i = 0; i < n; i++) shoot(g, e, off + (i / n) * TAU, { spd: e.def.shot.spd, burn: true, kind: "fire", h: 30 });
        if (e.elite) g.after(0.4, () => !e.dead && Array.from({ length: n }, (_, i) => shoot(g, e, off + ((i + 0.5) / n) * TAU, { spd: 90, burn: true, kind: "fire", h: 30 })));
        g.sound("shoot_dragon");
      }
      break;
    }
    case "pulse": {
      if (e.st !== "charge") walk(0.7);
      if (e.st !== "charge" && e.cd <= 0 && d < 120) (e.st = "charge"), (e.cd = 0.8);
      if (e.st === "charge" && e.cd <= 0) {
        e.st = "idle";
        e.cd = 2.6;
        const r = e.elite ? 80 : 60;
        g.vfx("lightning/zap-hit", e.x, e.y - 10, {});
        g.line(e.x - r, e.y, e.x + r, e.y, "#a0f0ff", 1, 0.15, "zap");
        for (const q of g.alivePlayers()) if (dist(q.x, q.y, e.x, e.y) < r) if (g.hurt(q, 1, e)) q.buff.slow = 1.5;
        g.sound("shoot_thunder");
      }
      break;
    }
    case "kamikaze": {
      if (e.st !== "boom") {
        walk(1.2);
        if (d < 30) (e.st = "boom"), (e.cd = 0.5);
      } else if (e.cd <= 0) {
        e.st = "boom2";
        g.explodeAt(e.x, e.y, 40, 1, 15, null);
        e.hp = 0;
        g.kill(e, null);
      }
      break;
    }
    case "snake": {
      const dir = walk(1);
      if (dir) {
        const perp = Math.sin(e.t * 9) * 0.6;
        moveCircle(g.map, e, -dir[1] * perp * sp * dt, dir[0] * perp * sp * dt, false);
      }
      touch();
      break;
    }
    case "boss_eye":
      bossEye(g, e, p, d, dt);
      break;
  }
}

// ----------------------------------------------------------------- the boss: 幻觉之眼
function bossEye(g, e, p, d, dt) {
  const frac = e.hp / e.maxHp;
  const phase = frac > 0.66 ? 1 : frac > 0.33 ? 2 : 3;
  if (e.phase !== phase) {
    e.phase = phase;
    if (phase > 1) {
      g.text(e.x, e.y - 90, phase === 2 ? "幻觉加深！" : "全知幻象！", "#ff6a8a", 1.6, 1.5);
      g.vfx("explosions/implosion", e.x, e.y - 40, {});
      g.sound("boss");
      spawnBossAdds(g, e, phase === 2 ? ["bat", "bat", "wisp", "wisp"] : ["ghost", "wisp", "wisp", "bat", "bat"]);
    }
  }
  const speedK = phase === 3 ? 1.35 : phase === 2 ? 1.15 : 1;
  // drift toward the room's center line, keep some distance
  const c = g.map.center;
  const tx = c.x + Math.sin(e.t * 0.4) * 140, ty = c.y + Math.cos(e.t * 0.55) * 50;
  if (e.st !== "dash") {
    const a = angTo(e.x, e.y, tx, ty), dd = dist(e.x, e.y, tx, ty);
    if (dd > 8) moveCircle(g.map, e, Math.cos(a) * 40 * dt, Math.sin(a) * 40 * dt, true);
  }
  e.face = p.x < e.x ? -1 : 1;
  const H = 46;
  for (const q of g.alivePlayers()) if (dist(q.x, q.y, e.x, e.y) < e.r + 10) g.hurt(q, 1, e);
  if (e.st === "dash") {
    e.dt -= dt;
    if (e.dt > 0.6) return; // telegraph
    moveCircle(g.map, e, Math.cos(e.da) * 380 * dt, Math.sin(e.da) * 380 * dt, true);
    for (const q of g.alivePlayers()) if (dist(q.x, q.y, e.x, e.y) < e.r + 12) g.hurt(q, 2, e);
    if (e.dt <= 0) (e.st = "idle"), (e.cd = 1);
    return;
  }
  if (e.st === "spiral") {
    e.dt -= dt;
    e.sp = (e.sp || 0) + dt;
    while (e.sp > 0.07 / speedK) {
      e.sp -= 0.07 / speedK;
      e.ang += 0.37;
      const arms = phase === 3 ? 4 : 2;
      for (let k = 0; k < arms; k++) shoot(g, e, e.ang + (k / arms) * TAU, { spd: 110, h: H, r: 6, big: true });
    }
    if (e.dt <= 0) (e.st = "idle"), (e.cd = 1.2);
    return;
  }
  if (e.cd > 0) return;
  // choose an attack
  const opts = ["burst", "aimed", "burst", "aimed"];
  if (phase >= 2) opts.push("spiral", "dash");
  if (phase >= 3) opts.push("spiral", "summon");
  const k = opts[(Math.random() * opts.length) | 0];
  g.sound("laser", 0.2);
  switch (k) {
    case "burst": {
      const waves = phase === 1 ? 3 : 4, n = phase === 3 ? 22 : 16;
      for (let w = 0; w < waves; w++)
        g.after(w * 0.35, () => {
          if (e.dead) return;
          const off = w * 0.2 + Math.random();
          for (let i = 0; i < n; i++) shoot(g, e, off + (i / n) * TAU, { spd: 115 * speedK, h: H, r: 6, big: true });
        });
      e.cd = 2 / speedK;
      break;
    }
    case "aimed": {
      for (let w = 0; w < 4; w++)
        g.after(w * 0.22, () => {
          if (e.dead) return;
          const q = g.alivePlayers()[0] || p;
          const a = angTo(e.x, e.y - H, q.x, q.y - 16);
          for (let i = -2; i <= 2; i++) shoot(g, e, a + i * 0.16, { spd: 170 * speedK, h: H, r: 5 });
        });
      e.cd = 1.6 / speedK;
      break;
    }
    case "spiral":
      e.st = "spiral";
      e.dt = 2.6;
      e.ang = Math.random() * TAU;
      e.cd = 1;
      break;
    case "dash":
      e.st = "dash";
      e.dt = 1.4;
      e.da = angTo(e.x, e.y, p.x, p.y);
      g.line(e.x, e.y, e.x + Math.cos(e.da) * 500, e.y + Math.sin(e.da) * 500, "#ff4060", 18, 0.6, "warn");
      break;
    case "summon":
      spawnBossAdds(g, e, ["wisp", "wisp", "bat"]);
      e.cd = 2.5;
      break;
  }
}
export function spawnBossAdds(g, e, list) {
  if (g.enemies.length > 14) return;
  list.forEach((t, i) => {
    const a = (i / list.length) * TAU;
    g.spawnEnemy(t, e.x + Math.cos(a) * 70, e.y + Math.sin(a) * 50, false, 0.7);
  });
}
