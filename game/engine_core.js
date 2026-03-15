/**
 * 记忆碎片 — 引擎核心
 * 状态管理、探索、回忆、遗忘、回合推进
 * 
 * 作者：小羽
 * 日期：2026-03-11 Session 43
 */

import {
  DECAY_STATES, nextDecay, recallDecay,
  getFragments, getFragment, getFragmentContent, getDreamInsight, getEpiphanies
} from './data.js';
import * as sound from './sound.js';
// ── Constants ────────────────────────────────────
export const MAX_SLOTS = 5;
export const ENCOUNTER_ONLY_IDS = new Set([
  'frag_12', 'frag_13', 'frag_15', 'frag_16', 'frag_17', 'frag_18', 'frag_19'
]);
export const UNFORGETTABLE_IDS = new Set(['frag_19']);
export const GRACE_TURNS = 3;
export const ENCOUNTER_COOLDOWN = 3;

// ── Slot Entry ───────────────────────────────────
export function createSlot(fragmentId, state = 'vivid', recallCount = 0, turnsSinceRecall = 0) {
  return {
    fragmentId,
    state,
    recallCount,
    turnsSinceRecall,
    unforgettable: UNFORGETTABLE_IDS.has(fragmentId),
  };
}

export function slotDecay(slot) {
  slot.turnsSinceRecall++;
  const threshold = 3 + slot.recallCount;
  if (slot.turnsSinceRecall >= threshold) {
    slot.state = nextDecay(slot.state);
    slot.turnsSinceRecall = 0;
  }
}

export function slotRecall(slot) {
  slot.recallCount++;
  slot.turnsSinceRecall = 0;
  slot.state = recallDecay(slot.state);
}



// ── Explore ──────────────────────────────────────
const EXPLORE_ATMOSPHERES = [
  '你踩到了什么。低头一看——是一层很浅的積水，倒映着天和你的脸。水里有东西。',
  '光线变了。墙角有一处影子的形状不对——不是你的。你弯腰去看。',
  '风停了。空气突然变得很密，像有什么在屏住呼吸等你发现。',
  '脚下的石板有一块松动了。你掰开它——下面有东西。',
  '一只鸟停在窗框上。它的叫声很奇怪——像在说话，像在指路。你顺着它看的方向走。',
];

export function getExploreCandidate(gs) {
  const heldIds = new Set(gs.slots.map(s => s.fragmentId));
  const forgottenIds = new Set(gs.forgotten.map(f => f.id));
  const forgottenTitles = new Set(gs.forgotten.map(f => f.title));
  const available = getFragments().filter(f =>
    !gs.discovered.has(f.id) && 
    !heldIds.has(f.id) && 
    !forgottenIds.has(f.id) &&
    !forgottenTitles.has(f.title) &&
    !ENCOUNTER_ONLY_IDS.has(f.id)
  );
  if (!available.length) return null;

  // Weighted selection — connected fragments easier to find
  const weighted = available.map(frag => {
    let weight = 1;
    for (const slot of gs.slots) {
      const slotFrag = getFragment(slot.fragmentId);
      if (slotFrag && slotFrag.connections.includes(frag.id)) weight += 2;
    }
    return { frag, weight };
  });
  const totalWeight = weighted.reduce((s, w) => s + w.weight, 0);
  let roll = Math.random() * totalWeight;
  for (const { frag, weight } of weighted) {
    roll -= weight;
    if (roll <= 0) return frag;
  }
  return weighted[weighted.length - 1].frag;
}

export function randomAtmosphere() {
  return EXPLORE_ATMOSPHERES[Math.floor(Math.random() * EXPLORE_ATMOSPHERES.length)];
}

// ── Recall ───────────────────────────────────────
const RECALL_ATMOSPHERE = {
  vivid: [
    '你闭上眼。记忆像一盏灯被点亮，每个细节都在发光。',
    '你闭上眼。这段记忆清晰得像刚刚发生，你甚至能感受到当时的温度。',
    '你闭上眼。一切纤毫毕现——颜色、气味、触感，全在。',
  ],
  clear: [
    '你闭上眼。画面稳定地浮现，像一张对焦准确的照片。',
    '你闭上眼。大部分轮廓还在，只是边缘开始有一点点柔化。',
    '你闭上眼。你记得这个。不是每个细节，但故事还在。',
  ],
  fuzzy: [
    '你闭上眼，使劲想。画面像水中的倒影，越用力抓越碎。',
    '你闭上眼，试图拼凑。一些碎片回来了——但不确定顺序对不对。',
    '你闭上眼。记忆像雾中的灯塔，时亮时灭。你只能看到方向，看不清形状。',
  ],
  fading: [
    '你闭上眼。几乎什么都抓不住了——只有一个模糊的轮廓和一种说不清的感觉。',
    '你使劲回想。但只剩下影子和一个你不确定属于这段记忆的情绪。',
    '你努力搜寻。只有碎片的碎片——一个词、一种触感、一缕快要消失的光。',
  ],
};

export function getRecallAtmosphere(state) {
  const list = RECALL_ATMOSPHERE[state] || RECALL_ATMOSPHERE.clear;
  return list[Math.floor(Math.random() * list.length)];
}

export function doRecall(gs, slotIdx) {
  if (slotIdx < 0 || slotIdx >= gs.slots.length) return null;
  const entry = gs.slots[slotIdx];
  slotRecall(entry);
  gs.totalRecalled++;
  sound.soundRecall();
  const frag = getFragment(entry.fragmentId);
  return {
    title: frag.title,
    state: entry.state,
    content: getFragmentContent(entry.fragmentId, entry.state),
    recallCount: entry.recallCount,
    atmosphere: getRecallAtmosphere(entry.state),
  };
}

// ── Forget ───────────────────────────────────────
export function doForget(gs, slotIdx) {
  if (slotIdx < 0 || slotIdx >= gs.slots.length) return { ok: false, reason: 'invalid' };
  const entry = gs.slots[slotIdx];
  if (entry.unforgettable || UNFORGETTABLE_IDS.has(entry.fragmentId)) {
    return { ok: false, reason: 'unforgettable' };
  }
  const frag = getFragment(entry.fragmentId);
  const isVivid = entry.state === 'vivid';
  return { ok: true, entry, frag, needConfirm: isVivid };
}

export function confirmForget(gs, slotIdx) {
  const entry = gs.slots[slotIdx];
  const frag = getFragment(entry.fragmentId);
  gs.forgotten.push({ id: frag.id, title: frag.title });
  gs.totalForgotten++;
  gs.slots.splice(slotIdx, 1);
  sound.soundForget();
  return frag.title;
}

// ── Tick (turn advance) ──────────────────────────
const DECAY_MSGS = [
  '——你感到它在滑落，像手指间的沙。',
  '——边缘模糊了，像雨水打湿的墨迹。',
  '——声音变远了，像从很深的井底传上来。',
  '——轮廓在解体，像冰在温水里慢慢融化。',
  '——你抓紧它，但手心里只剩温度，没有形状。',
];
const FORGET_MSGS = [
  '——它终于消失了。你记得自己曾经记得什么，但已经说不出是什么。',
  '——它走了，像梦醒后最先忘掉的那部分。只留下一种梨形的残影。',
  '——无声无息，它离开了。像从没来过一样——但你知道它来过。',
];

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

export function tick(gs) {
  gs.turn++;
  if (gs.turn <= GRACE_TURNS) return { faded: [], autoForgotten: [], worldHint: false };

  const faded = [];
  for (const entry of gs.slots) {
    const oldState = entry.state;
    slotDecay(entry);
    if (entry.state === 'fading' && oldState !== 'fading') {
      faded.push({ title: getFragment(entry.fragmentId).title, msg: pick(DECAY_MSGS) });
    }
  }

  const autoForgotten = [];
  const remaining = [];
  for (const entry of gs.slots) {
    if (
      entry.state === 'fading' &&
      entry.turnsSinceRecall >= (2 + entry.recallCount) &&
      !entry.unforgettable &&
      !UNFORGETTABLE_IDS.has(entry.fragmentId)
    ) {
      const frag = getFragment(entry.fragmentId);
      const title = frag.title;
      autoForgotten.push({ title, msg: pick(FORGET_MSGS) });
      gs.forgotten.push({ id: frag.id, title: frag.title });
      gs.totalForgotten++;
    } else {
      remaining.push(entry);
    }
  }
  gs.slots = remaining;

  if (faded.length || autoForgotten.length) sound.soundDecay();

  // World change hint
  let worldHint = false;
  if (gs.turn >= 20 && gs.turn - gs.lastWorldHintTurn >= 3) {
    const { checkEndingAvailable } = await_import_endings();
    if (checkEndingAvailable(gs).length) {
      sound.soundWorldChange();
      gs.lastWorldHintTurn = gs.turn;
      worldHint = true;
    }
  }

  return { faded, autoForgotten, worldHint };
}

// Lazy import to avoid circular dependency
let _endingsModule = null;
function await_import_endings() {
  if (!_endingsModule) {
    // Will be set by engine_endings.js via registerEndingsModule
    throw new Error('endings module not registered — call registerEndingsModule first');
  }
  return _endingsModule;
}
export function registerEndingsModule(mod) { _endingsModule = mod; }

// ── Obtain fragment (from explore or encounter) ──
export function canObtain(gs, fragmentId) {
  const heldIds = new Set(gs.slots.map(s => s.fragmentId));
  return !heldIds.has(fragmentId);
}

export function obtainFragment(gs, fragmentId) {
  const frag = getFragment(fragmentId);
  gs.slots.push(createSlot(fragmentId));
  gs.discovered.delete(fragmentId);
  sound.soundDiscover();
  return frag;
}

export function checkEpiphany(gs, fragmentId) {
  const frag = getFragment(fragmentId);
  if (!frag || !frag.tags || !frag.tags.includes('concept')) {
    gs.consecutiveConcepts = 0;
    return null;
  }

  const heldConcepts = gs.slots.filter(s => {
    if (s.fragmentId === fragmentId) return false;
    const f = getFragment(s.fragmentId);
    return f && f.tags && f.tags.includes('concept');
  });
  
  let isConnected = false;
  for (const hc of heldConcepts) {
    const hf = getFragment(hc.fragmentId);
    if (hf.connections && frag.connections && (hf.connections.includes(fragmentId) || frag.connections.includes(hf.id))) {
      isConnected = true;
      break;
    }
  }
  
  if (isConnected || gs.consecutiveConcepts > 0) {
    gs.consecutiveConcepts++;
  } else {
    gs.consecutiveConcepts = 1;
  }

  if (gs.consecutiveConcepts >= 3) {
    const epiphanies = getEpiphanies();
    const available = epiphanies.filter((_, i) => !gs.seenEpiphanies.includes(i));
    if (available.length > 0) {
      const e = available[Math.floor(Math.random() * available.length)];
      const idx = epiphanies.indexOf(e);
      gs.seenEpiphanies.push(idx);
      gs.consecutiveConcepts = 0;
      return e;
    }
  }
  return null;
}
export function forgetAndReplace(gs, forgetIdx, newFragmentId) {
  const old = gs.slots[forgetIdx];
  const oldFrag = getFragment(old.fragmentId);
  gs.forgotten.push({ id: oldFrag.id, title: oldFrag.title });
  gs.totalForgotten++;
  gs.slots[forgetIdx] = createSlot(newFragmentId);
  gs.discovered.delete(newFragmentId);
  return oldFrag.title;
}

// ── Status helpers ───────────────────────────────
export function getStatusDisplay(gs) {
  const slotsDisplay = gs.slots.map((entry, i) => {
    const frag = getFragment(entry.fragmentId);
    const idx = DECAY_STATES.indexOf(entry.state);
    const filled = 4 - idx;
    const bar = '█'.repeat(filled) + '░'.repeat(4 - filled);
    return { index: i, state: entry.state, title: frag.title, recallCount: entry.recallCount, bar };
  });
  return {
    turn: gs.turn,
    slotsCount: gs.slots.length,
    maxSlots: MAX_SLOTS,
    slots: slotsDisplay,
    forgotten: gs.forgotten.map(f => f.title).slice(-3),
    moreforgotten: Math.max(0, gs.forgotten.length - 3),
    dreamCount: gs.dreamInsights.length,
  };
}
