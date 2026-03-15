/**
 * 记忆碎片 — 做梦系统
 * 梦境连接两段记忆，产生灵感
 * 
 * 作者：小羽
 * 日期：2026-03-11 Session 43
 */

import { getFragment, getDreamInsight } from './data.js';
import * as sound from './sound.js';
import { tick } from './engine_core.js';

/**
 * Execute a dream action.
 * Returns { ok, ..result } or { ok: false, reason }.
 */
export function doDream(gs) {
  if (gs.slots.length < 2) {
    return { ok: false, reason: 'not_enough', msg: '记忆太少了，还不够做梦……至少需要 2 段记忆。' };
  }

  // Pick two random distinct slots
  const indices = [];
  while (indices.length < 2) {
    const r = Math.floor(Math.random() * gs.slots.length);
    if (!indices.includes(r)) indices.push(r);
  }
  const a = gs.slots[indices[0]];
  const b = gs.slots[indices[1]];
  const fragA = getFragment(a.fragmentId);
  const fragB = getFragment(b.fragmentId);

  sound.soundDream();

  // Lookup insight
  const insight = getDreamInsight(a.fragmentId, b.fragmentId);

  let result;
  if (insight) {
    // Dedupe check
    const alreadyHad = gs.dreamInsights.some(
      d => (d.a === fragA.title && d.b === fragB.title) ||
           (d.a === fragB.title && d.b === fragA.title)
    );

    if (alreadyHad) {
      result = {
        ok: true,
        isNew: false,
        titleA: fragA.title,
        titleB: fragB.title,
        preview: insight.substring(0, 30) + '……',
      };
    } else {
      sound.soundDreamInsight();
      gs.dreamInsights.push({ a: fragA.title, b: fragB.title, insight });
      result = {
        ok: true,
        isNew: true,
        titleA: fragA.title,
        titleB: fragB.title,
        insight,
      };
    }
    // Dream consolidation — regardless of new/old
    a.recallCount++;
    b.recallCount++;
  } else {
    result = {
      ok: true,
      isNew: false,
      titleA: fragA.title,
      titleB: fragB.title,
      noConnection: true,
    };
  }

  gs.totalDreams++;

  // Dream consumes a turn
  const tickResult = tick(gs);

  return { ...result, tick: tickResult };
}

/**
 * Get all collected dream insights for display.
 */
export function getDreamInsightsList(gs) {
  return gs.dreamInsights.map((d, i) => ({
    index: i + 1,
    titleA: d.a,
    titleB: d.b,
    insight: d.insight,
  }));
}
