// Meta progression kept in the player's own browser (no account needed).
import { START_CHARS, START_TOKENS, UNLOCKS, GACHA, CHAR_ORDER } from "./data.js";

const KEY = "ai-girls-dungeon-v1";
const fresh = () => ({
  tokens: START_TOKENS,
  chars: [...START_CHARS],
  talents: {}, // id -> level
  cards: [], // unlocked locked-cards
  stats: { kills: 0, pulls: 0, reactions: 0, bossKills: 0, runs: 0, best: 0 },
  pity: 0,
  pity10: 0,
  sel: "deepseek",
  name: "",
  sound: true,
  music: true,
  seenUnlock: [],
});

let mem = null;
export function load() {
  if (mem) return mem;
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || "null");
    mem = Object.assign(fresh(), s || {});
    mem.stats = Object.assign(fresh().stats, (s && s.stats) || {});
  } catch {
    mem = fresh();
  }
  if (!mem.name) {
    mem.name = "玩家" + Math.floor(1000 + Math.random() * 9000);
    save();
  }
  return mem;
}
export function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(mem));
  } catch {}
}
export const talent = (id) => load().talents[id] || 0;

/** Check unlock conditions; returns newly unlocked char ids. */
export function checkUnlocks() {
  const m = load(), out = [];
  for (const id of CHAR_ORDER) {
    if (m.chars.includes(id)) continue;
    const u = UNLOCKS[id];
    if (u && (m.stats[u.stat] || 0) >= u.need) {
      m.chars.push(id);
      out.push(id);
    }
  }
  if (out.length) save();
  return out;
}
export function unlockProgress(id) {
  const u = UNLOCKS[id];
  if (!u) return 1;
  return Math.min(1, (load().stats[u.stat] || 0) / u.need);
}

/** One gacha pull with pity. Returns {item, dup, refund}. */
export function pull(rand = Math.random) {
  const m = load();
  m.pity++;
  m.pity10++;
  m.stats.pulls++;
  let r;
  if (m.pity >= GACHA.pity) r = "SSR";
  else {
    const x = rand();
    const { N, R: Rr, SR } = GACHA.rates;
    r = x < N ? "N" : x < N + Rr ? "R" : x < N + Rr + SR ? "SR" : "SSR";
    if (m.pity10 >= 10 && (r === "N" || r === "R")) r = "SR";
  }
  if (r === "SSR") m.pity = 0;
  if (r === "SR" || r === "SSR") m.pity10 = 0;
  const pool = GACHA.pool.filter((p) => p.r === r);
  const item = pool[Math.floor(rand() * pool.length)];
  const lv = m.talents[item.id] || 0;
  let dup = false, refund = 0;
  if (lv >= item.max) {
    dup = true;
    refund = GACHA.refund[r];
    m.tokens += refund;
  } else {
    m.talents[item.id] = lv + 1;
    if (item.card && !m.cards.includes(item.card)) m.cards.push(item.card);
  }
  return { item, r, dup, refund, lv: m.talents[item.id] || 0 };
}
