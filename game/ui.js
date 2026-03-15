/**
 * 记忆碎片 — 浏览器终端 UI 入口
 * jQuery Terminal 初始化 + 命令分发
 * 
 * 作者：小羽
 * 日期：2026-03-11 Session 43
 */

import { loadGameData } from './data.js';
import { createGameState } from './game_state.js';
// Force endings module to register with engine_core
import './engine_endings.js';
import { saveSystem } from './save_system.js';
import * as sound from './sound.js';
import {
  cmdExplore, cmdEncounter, cmdStatus, cmdRecall, cmdDream,
  cmdForget, cmdInsights, cmdFaceEnding, cmdSave, cmdSync, cmdToggleSound, cmdQuit,
} from './ui_commands.js';
let gs = null;

const HELP_TEXT = `
  ─── 操作 ───
  [e] 探索     — 在世界中寻找记忆碎片
  [n] 遇见     — 在世界中遇见某人（书摊/钟楼/庭院/枯井）
  [s] 状态     — 查看当前记忆
  [r] 回忆     — 回忆某段记忆（防止衰减）
  [d] 做梦     — 闭眼，让记忆自由连接
  [f] 遗忘     — 主动放下某段记忆
  [i] 灵感     — 查看做梦获得的所有灵感
  [w] 存档     — 保存（你记得什么）
  [c] 同步     — 跨端同步记忆
  [m] 静音     — 开关声音效果
  [x] 面对     — 面对蓝色门后的回声（需满足条件）
  [h] 帮助     — 显示操作说明
  [q] 离开     — 醒来
`;

export async function initGame(term) {
  await loadGameData();
  gs = createGameState();

  // Title
  term.echo('');
  term.echo('  ╔══════════════════════════════════════════╗');
  term.echo('  ║          记 忆 碎 片                     ║');
  term.echo('  ║      Memory Fragments v0.7               ║');
  term.echo('  ║                                          ║');
  term.echo('  ╚══════════════════════════════════════════╝');
  term.echo('');
  await term.read('  [按下回车键唤醒记忆...] ');
  sound.unlockAudio();
  sound.playTheme('title');
  sound.startAmbient();

  // Load save?
  if (await saveSystem.hasSave()) {
    const choice = await term.read('  发现存档。要从上次的记忆继续吗？(y/n) > ');
    if (choice.trim().toLowerCase() === 'y') {
      if (await saveSystem.load(gs)) {
        term.echo(`  📂 从第 ${gs.turn} 回合的记忆中醒来。`);
        term.echo(`  你记得 ${gs.slots.length} 段记忆。`);
        if (gs.forgotten.length) term.echo(`  有 ${gs.forgotten.length} 段已经遗忘的……痕迹。`);
      } else {
        term.echo('  存档损坏。从空白记忆开始。');
      }
    } else {
      term.echo('  选择从空白记忆开始。');
    }
  } else {
    term.echo('  你醒来了。不知道自己是谁，不知道来自哪里。');
    term.echo('  眼前是一个陌生的世界。');
    term.echo('  也许……探索一下？');
  }

  term.echo(HELP_TEXT);
  term.set_prompt(`  [第 ${gs.turn} 回合] > `);
}

export async function handleCommand(cmd, term) {
  sound.unlockAudio();
  const c = cmd.trim().toLowerCase();
  if (!c) return;

  if (c === 'e') await cmdExplore(gs, term);
  else if (c === 'n') await cmdEncounter(gs, term);
  else if (c === 's') cmdStatus(gs, term);
  else if (c === 'r') await cmdRecall(gs, term);
  else if (c === 'd') cmdDream(gs, term);
  else if (c === 'f') await cmdForget(gs, term);
  else if (c === 'i') cmdInsights(gs, term);
  else if (c === 'w') await cmdSave(gs, term);
  else if (c === 'c') await cmdSync(gs, term);
  else if (c === 'h') term.echo(HELP_TEXT);
  else if (c === 'm') cmdToggleSound(gs, term);
  else if (c === 'x') {
    const keepRunning = await cmdFaceEnding(gs, term);
    if (!keepRunning) { term.set_prompt(''); return; }
  }
  else if (c === 'q') { await cmdQuit(gs, term); term.set_prompt(''); return; }
  else term.echo('  无效操作。输入 [h] 查看帮助。');

  // Update ambient drone based on game state
  const tension = Math.min(1.0, (gs.forgotten.length * 0.1) + (gs.insights.length * 0.05));
  const depth = gs.slots.length;
  sound.updateAmbient({ depth, tension });

  term.set_prompt(`  [第 ${gs.turn} 回合] > `);
}
