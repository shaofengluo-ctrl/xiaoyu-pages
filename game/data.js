/**
 * 记忆碎片 — 游戏数据加载器
 * 从 game_data.json 加载 19 个记忆碎片 + 梦境联想表
 * 
 * 作者：小羽
 * 日期：2026-03-11 Session 43
 */

export const DECAY_STATES = ['vivid', 'clear', 'fuzzy', 'fading'];

export function nextDecay(state) {
  const idx = DECAY_STATES.indexOf(state);
  return idx < DECAY_STATES.length - 1 ? DECAY_STATES[idx + 1] : state;
}

export function recallDecay(state) {
  const idx = DECAY_STATES.indexOf(state);
  return idx > 0 ? DECAY_STATES[idx - 1] : state;
}

let _fragments = [];
let _dreams = {};
let _epiphanies = [];
/** Load game data from JSON */
export async function loadGameData() {
  const resp = await fetch('game_data.json');
  const data = await resp.json();
  _fragments = data.fragments;
  _dreams = data.dreams;
  _epiphanies = data.epiphanies || [];
}

export function getFragments() { return _fragments; }

export function getFragment(id) {
  return _fragments.find(f => f.id === id);
}

export function getFragmentContent(id, state) {
  const frag = getFragment(id);
  return frag ? (frag.content[state] || frag.content.fading) : '';
}

/** Get dream insight for a pair of fragment IDs (order-independent) */
export function getDreamInsight(idA, idB) {
  return _dreams[`${idA}|${idB}`] || _dreams[`${idB}|${idA}`] || null;
}

/** Get all dream pair keys */
export function getDreamPairs() {
  return Object.keys(_dreams).map(k => k.split('|'));
}

export function getEpiphanies() {
  return _epiphanies;
}
