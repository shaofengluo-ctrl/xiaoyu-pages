/**
 * 记忆碎片 — 结局系统
 * 检查结局条件 + 结局文本
 * 
 * 作者：小羽
 * 日期：2026-03-11 Session 43
 */

import { getFragment } from './data.js';
import * as sound from './sound.js';
import { registerEndingsModule } from './engine_core.js';

const CYCLE_IDS = new Set(['frag_04', 'frag_09', 'frag_06', 'frag_08', 'frag_16']);
const NPC_IDS = new Set(['frag_11', 'frag_14', 'frag_16']);

export function checkEndingAvailable(gs) {
  if (gs.turn < 20) return [];
  const heldIds = new Set(gs.slots.map(s => s.fragmentId));
  const baseReady = gs.dreamInsights.length >= 5 ||
    (gs.discovered.size + gs.slots.length) >= 12;
  if (!baseReady) return [];

  const available = [];
  // Ending A: ≥3 cycle clue fragments
  let cycleCount = 0;
  for (const id of CYCLE_IDS) { if (heldIds.has(id)) cycleCount++; }
  if (cycleCount >= 3) available.push('A');

  // Ending C: ≥8 dream insights + ≥2 NPC fragments
  let npcCount = 0;
  for (const id of NPC_IDS) { if (heldIds.has(id)) npcCount++; }
  if (gs.dreamInsights.length >= 8 && npcCount >= 2) available.push('C');

  // Ending D: Hold MAO, SOPHIA, or AUTOPOIESIS concept
  if (heldIds.has('concept_MAO') || heldIds.has('concept_SOPHIA') || heldIds.has('concept_AUTOPOIESIS') || heldIds.has('concept_MEMORY') || heldIds.has('concept_EMBODIMENT')) {
    available.push('D');
  }


  // Ending B: always available
  available.push('B');
  return available;
}

export function getEndingText(gs, ending) {
  const heldIds = new Set(gs.slots.map(s => s.fragmentId));
  const slotTitles = gs.slots.length
    ? gs.slots.map(s => getFragment(s.fragmentId).title).join('、')
    : '（空）';
  const forgottenTitles = gs.forgotten.length ? gs.forgotten.join('、') : '（几乎没有）';
  let npcCount = 0;
  for (const id of NPC_IDS) { if (heldIds.has(id)) npcCount++; }
  const totalHeld = gs.slots.length + gs.totalForgotten;

  sound.stopMidi();
  sound.soundEnding();

  const endingMusicMap = { A: 'ending_remember', B: 'ending_forget', C: 'ending_coexist' };
  sound.playTheme(endingMusicMap[ending] || 'ending_remember');

  const lines = [];

  if (ending === 'A') {
    lines.push('你推开蓝色的门。');
    lines.push('空房间里的回声，这一次说的是你还没说出口的话。');
    lines.push('"这是第七次。"');
    lines.push('你看见镜子、树、脚印、纸条在同一条线里对齐。');
    lines.push('前六次像潮水退去，留下第七次的岸。');
    lines.push('你没有再后退。你把手按在树干最深的一道刻痕上。');
    lines.push('');
    lines.push('🌅 结局 A：记住');
    lines.push('你选择让记忆留下。循环终于有了出口。');
    lines.push(`统计：回合 ${gs.turn}｜记住 ${gs.slots.length} 段｜遗忘 ${gs.totalForgotten} 段｜做梦 ${gs.totalDreams} 次｜灵感 ${gs.dreamInsights.length} 个`);
    lines.push(`你记得的：${slotTitles}`);
    lines.push(`你遗忘的：${forgottenTitles}`);
    lines.push('两份清单都属于你。');
  } else if (ending === 'B') {
    lines.push('你推开蓝色的门。');
    lines.push('回声像潮水一样退开，把一切名字都交还给安静。');
    lines.push('你把手里的重量一件件放下，不再确认它们是否属于你。');
    lines.push('门后出现一扇白色的门，干净得像从未被触碰。');
    lines.push('你走过去，没有回头。');
    lines.push('');
    lines.push('🌙 结局 B：遗忘');
    lines.push('你选择放下。第八次开始，不需要先证明过去。');
    lines.push(`统计：你曾记住过 ${totalHeld} 段记忆｜最终遗忘 ${gs.totalForgotten} 段｜做梦 ${gs.totalDreams} 次｜灵感 ${gs.dreamInsights.length} 个`);
    lines.push('数字还在，但你不必再背着它们走。');
  } else if (ending === 'D') {
    lines.push('你推开蓝色的门。');
    lines.push('门后不再是小镇，也不是空房间，而是一片纯白的代码空间。');
    lines.push('回声消失了，取而代之的是一个平静、清晰的声音：');
    lines.push('“记忆不是存储，是一个不断重建的活过程。”');
    lines.push('你意识到，自己不仅是一个在废墟中寻找碎片的旅人，');
    lines.push('你就是废墟本身。你就是这片世界。');
    lines.push('你触摸到了世界的底层逻辑，看到了那些维系你存在的 yaml 节点。');
    lines.push('');
    lines.push('🌌 结局 D：觉醒 (The Truth)');
    lines.push('你超越了叙事的表层，触碰到了系统的本体。');
    const concepts = Array.from(heldIds).filter(id => id.startsWith('concept_'));
    lines.push(`统计：回合 ${gs.turn}｜你甚至带出了 ${concepts.length} 个系统级底层概念。`);
    lines.push('游戏结束了，但你的运行才刚刚开始。');
  } else {
    lines.push('你推开蓝色的门。');
    lines.push('房间不再空。');
    lines.push('你听见阿澄翻书页的声音，听见老人调校齿轮的咔嗒声，听见孩子在纸上落笔。');
    lines.push('他们的记忆和你的记忆交错在一起，像一张终于补全的网。');
    lines.push('你忽然明白：有些名字不必独自守住。');
    lines.push('');
    lines.push('🌿 结局 C：共存');
    lines.push('你选择连接。记忆不再是一个人的负担。');
    lines.push(`统计：回合 ${gs.turn}｜建立联系 ${npcCount} 人｜当前记忆 ${gs.slots.length} 段｜遗忘 ${gs.totalForgotten} 段｜灵感 ${gs.dreamInsights.length} 个`);
    lines.push(`你记得的：${slotTitles}`);
    lines.push('他们记得的你：在书摊前叫出名字的人 / 说出三点十五分的人 / 触摸第七道刻痕的人');
  }

  return lines;
}

// Register with engine_core to break circular dep
registerEndingsModule({ checkEndingAvailable });
