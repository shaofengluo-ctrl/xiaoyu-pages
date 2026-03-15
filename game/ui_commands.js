/**
 * 记忆碎片 — 终端命令处理器
 * 拆分自 ui.js，负责各个命令的具体逻辑
 * 
 * 作者：小羽
 * 日期：2026-03-11 Session 43
 */

import { getFragment, getFragmentContent } from './data.js';
import {
  getExploreCandidate, randomAtmosphere, doRecall, doForget,
  confirmForget, tick, getStatusDisplay, canObtain, obtainFragment,
  forgetAndReplace, MAX_SLOTS, checkEpiphany,
} from './engine_core.js';
import { doDream, getDreamInsightsList } from './engine_dream.js';
import { checkEndingAvailable, getEndingText } from './engine_endings.js';
import { ENCOUNTER_MAP, ENCOUNTER_LABELS } from './engine_encounters.js';
import { saveSystem } from './save_system.js';
import { GistSyncAdapter, storeCredentials, loadCredentials, clearCredentials, validateToken, findExistingGist } from './gist_adapter.js';
import * as sound from './sound.js';

const DECAY_ICONS = { vivid: '🔥 鲜明', clear: '📌 清晰', fuzzy: '🌫️ 模糊', fading: '💨 消散' };
function cyan(s) { return `[[b;#6ec6ff;]${s}]`; }
function gold(s) { return `[[b;#ffd700;]${s}]`; }
function dim(s) { return `[[;#888;]${s}]`; }
function red(s) { return `[[b;#ff6b6b;]${s}]`; }

/** All commands receive (gs, term) and return nothing (or false for game-over). */

function echo(term, text) { term.echo('  ' + text); }
function echoLines(term, lines) { for (const l of lines) echo(term, l); }
function nl(term) { term.echo(''); }

function showTick(term, t) {
  if (!t) return;
  for (const f of t.faded) {
    echo(term, `⏳ 记忆衰减：【${f.title}】正在消散……`);
    echo(term, f.msg);
  }
  for (const f of t.autoForgotten) {
    echo(term, `💨 自然遗忘：【${f.title}】从记忆中消散了。`);
    echo(term, f.msg);
  }
  if (t.worldHint) {
    echo(term, gold('⚡ 世界在变化。蓝色门后的回声变得不同了。输入 [x] 面对这一切。'));
  }
}
function handleEpiphany(gs, term, fragmentId) {
  const epiphany = checkEpiphany(gs, fragmentId);
  if (epiphany) {
    nl(term);
    sound.soundWorldChange();
    echo(term, `[[b;#d8bfd8;]==================== 顿悟 (Epiphany) ====================]`);
    echo(term, dim(`「在概念的连续碰撞中，一种超越经历的认知浮现了……」`));
    nl(term);
    echo(term, gold(epiphany.text));
    nl(term);
    echo(term, `[[b;#d8bfd8;]=========================================================]`);
    nl(term);
  }
}

async function obtainFlow(gs, term, fragmentId) {
  if (!canObtain(gs, fragmentId)) {
    echo(term, `这段记忆已经在你心里了：【${getFragment(fragmentId).title}】`);
    return;
  }
  const frag = getFragment(fragmentId);
  echo(term, `✨ 你获得了一个记忆碎片：【${cyan(frag.title)}】`);
  sound.soundDiscover();
  echo(term, frag.content.vivid);
  nl(term);

  if (gs.slots.length < MAX_SLOTS) {
    const choice = await term.read('  要记住它吗？(y/n) > ');
    if (choice.trim().toLowerCase() === 'y') {
      obtainFragment(gs, fragmentId);
      echo(term, `📥 已存入记忆。（${gs.slots.length}/${MAX_SLOTS} 槽位）`);
      handleEpiphany(gs, term, fragmentId);
    } else {
      gs.discovered.add(fragmentId);
      echo(term, '你暂时没有把它放进记忆槽位。');
    }
  } else {
    echo(term, `⚠️ 记忆槽位已满（${MAX_SLOTS}/${MAX_SLOTS}）。`);
    const choice = await term.read('  要遗忘一段记忆来腾出空间吗？(y/n) > ');
    if (choice.trim().toLowerCase() === 'y') {
      await forgetAndReplaceFlow(gs, term, fragmentId);
    } else {
      gs.discovered.add(fragmentId);
      echo(term, '你暂时没有把它放进记忆槽位。');
    }
  }
}

async function forgetAndReplaceFlow(gs, term, newFragId) {
  echo(term, '当前记忆：');
  for (let i = 0; i < gs.slots.length; i++) {
    const s = gs.slots[i];
    const f = getFragment(s.fragmentId);
    echo(term, `  [${i}] ${DECAY_ICONS[s.state]} 【${f.title}】`);
  }
  const idx = parseInt(await term.read('  选择要遗忘的编号 > '), 10);
  if (isNaN(idx) || idx < 0 || idx >= gs.slots.length) {
    echo(term, '无效编号。'); return;
  }
  const oldTitle = forgetAndReplace(gs, idx, newFragId);
  echo(term, `💨 遗忘了【${oldTitle}】`);
  echo(term, `📥 记住了【${getFragment(newFragId).title}】`);
  handleEpiphany(gs, term, newFragId);
}

// ── Exported command handlers ────────────────────

export async function cmdExplore(gs, term) {
  const frag = getExploreCandidate(gs);
  if (!frag) { echo(term, '你已经探索了所有地方。没有新的记忆碎片了。'); return; }

  gs.discovered.add(frag.id);
  echo(term, randomAtmosphere());
  nl(term);
  echo(term, `✨ 你发现了一个记忆碎片：【${cyan(frag.title)}】`);
  sound.soundDiscover();
  echo(term, frag.content.vivid);
  nl(term);

  if (gs.slots.length < MAX_SLOTS) {
    const choice = await term.read('  要记住它吗？(y/n) > ');
    if (choice.trim().toLowerCase() === 'y') {
      obtainFragment(gs, frag.id);
      echo(term, `📥 已存入记忆。（${gs.slots.length}/${MAX_SLOTS} 槽位）`);
      handleEpiphany(gs, term, frag.id);
    } else {
      echo(term, '你选择不记住它。它仍然存在于世界中。');
    }
  } else {
    echo(term, `⚠️ 记忆槽位已满（${MAX_SLOTS}/${MAX_SLOTS}）。`);
    const choice = await term.read('  要遗忘一段记忆来腾出空间吗？(y/n) > ');
    if (choice.trim().toLowerCase() === 'y') {
      await forgetAndReplaceFlow(gs, term, frag.id);
    } else {
      echo(term, '你选择不记住它。它仍然存在于世界中。');
    }
  }
  showTick(term, tick(gs));
}

export async function cmdEncounter(gs, term) {
  echo(term, '你想去哪里遇见人？');
  for (const [k, label] of Object.entries(ENCOUNTER_LABELS)) {
    echo(term, `[${k}] ${label}`);
  }
  const where = (await term.read('  > ')).trim();
  const fn = ENCOUNTER_MAP[where] || ENCOUNTER_MAP['1'];
  const result = fn(gs);

  if (result.type === 'cooldown') { echo(term, result.msg); return; }

  nl(term);
  echoLines(term, result.lines);

  if (result.type === 'remember') {
    await obtainFlow(gs, term, result.fragmentId);
  } else if (result.type === 'stranger') {
    nl(term);
    echo(term, '你会怎么回应？');
    for (const c of result.choices) echo(term, `[${c.key}] ${c.label}`);
    const choice = (await term.read('  > ')).trim().toLowerCase();
    const picked = result.choices.find(c => c.key === choice) || result.choices[result.choices.length - 1];
    echoLines(term, picked.lines);
    if (result.afterLines) { nl(term); echoLines(term, result.afterLines); }
    if (result.strangerSound) result.strangerSound();
    await obtainFlow(gs, term, result.fragmentId);
  } else if (result.type === 'remember_well') {
    for (const fid of result.fragments) await obtainFlow(gs, term, fid);
    if (result.afterLines) { nl(term); echoLines(term, result.afterLines); }
  } else if (result.type === 'stranger_well') {
    await obtainFlow(gs, term, result.fragmentId);
  }

  showTick(term, tick(gs));
}

export function cmdStatus(gs, term) {
  const st = getStatusDisplay(gs);
  nl(term);
  echo(term, `═══ 记忆状态（第 ${st.turn} 回合）═══`);
  echo(term, `槽位：${st.slotsCount}/${st.maxSlots}`);
  nl(term);
  if (!st.slots.length) {
    echo(term, dim('（空空如也。去探索吧。）'));
  } else {
    for (const s of st.slots) {
      echo(term, `[${s.index}] ${DECAY_ICONS[s.state]} 【${s.title}】  回忆×${s.recallCount}  [${s.bar}]`);
    }
  }
  if (st.forgotten.length) {
    let msg = `遗忘的痕迹：${st.forgotten.join('、')}`;
    if (st.moreforgotten > 0) msg += `……还有 ${st.moreforgotten} 段`;
    nl(term); echo(term, msg);
  }
  if (st.dreamCount) { nl(term); echo(term, `💡 做梦获得 ${st.dreamCount} 个灵感`); }
  nl(term);
}

export async function cmdRecall(gs, term) {
  if (!gs.slots.length) { echo(term, '没有记忆可以回忆。'); return; }
  cmdStatus(gs, term);
  const idx = parseInt(await term.read('  回忆哪段？(编号) > '), 10);
  const result = doRecall(gs, idx);
  if (!result) { echo(term, '无效的槽位。'); return; }
  nl(term);
  echo(term, `💭 回忆：【${cyan(result.title)}】${DECAY_ICONS[result.state]}`);
  echo(term, result.atmosphere);
  echo(term, result.content);
  echo(term, `（已回忆 ${result.recallCount} 次，衰减减缓中）`);
  showTick(term, tick(gs));
}

export function cmdDream(gs, term) {
  const result = doDream(gs);
  if (!result.ok) { echo(term, result.msg); return; }
  nl(term);
  echo(term, '🌙 你闭上眼睛，进入梦境……');
  echo(term, `梦中浮现：【${result.titleA}】和【${result.titleB}】`);

  if (result.noConnection) {
    nl(term);
    echo(term, '……梦境模糊，没有产生新的联想。');
    echo(term, '也许这两段记忆之间还没有足够的联系。');
  } else if (result.isNew) {
    nl(term);
    echo(term, gold('💡 灵感涌现——'));
    echo(term, result.insight);
    nl(term);
    echo(term, '这两段记忆都变得更清晰了。');
  } else {
    nl(term);
    echo(term, '……这个梦你做过了。熟悉的画面再次浮现。');
    echo(term, result.preview);
    echo(term, '但没有新的灵感。这两段记忆都在梦中巩固了一点。');
    nl(term);
    echo(term, '这两段记忆都变得更清晰了。');
  }
  showTick(term, result.tick);
}

export async function cmdForget(gs, term) {
  if (!gs.slots.length) { echo(term, '没有记忆可以遗忘。'); return; }
  cmdStatus(gs, term);
  const idx = parseInt(await term.read('  遗忘哪段？(编号) > '), 10);
  const result = doForget(gs, idx);
  if (!result.ok) {
    if (result.reason === 'unforgettable') {
      nl(term);
      echo(term, '你试图遗忘它。但那个名字拒绝离开。');
      echo(term, '有些记忆不是你选择记住的——是它们选择了你。');
    } else { echo(term, '无效的槽位。'); }
    return;
  }
  if (result.needConfirm) {
    echo(term, red('警告：主动遗忘的记忆，将永远从这个世界消失，无法再次找回。'));
    echo(term, '这段记忆还很鲜明……你确定要将它永久抹除吗？');
    const c = (await term.read('  (y/n) > ')).trim().toLowerCase();
    if (c !== 'y') { echo(term, '你犹豫了，没有放下。'); return; }
  } else if (result.entry.state === 'fading') {
    echo(term, '它本来就快消散了……也许这是自然的。');
  }
  const title = confirmForget(gs, idx);
  echo(term, `💨 【${title}】从记忆中消散了。`);
  echo(term, dim('（它被永久抹除了。这片世界里，再也没有它的痕迹。）'));
}

export function cmdInsights(gs, term) {
  const list = getDreamInsightsList(gs);
  if (!list.length) { echo(term, '还没有做过梦。试试 [d] 做梦？'); return; }
  nl(term);
  echo(term, '═══ 灵感集 ═══');
  for (const d of list) {
    nl(term);
    echo(term, `💡 灵感 #${d.index}：${d.titleA} × ${d.titleB}`);
    echo(term, d.insight);
  }
}

export async function cmdFaceEnding(gs, term) {
  const available = checkEndingAvailable(gs);
  if (!available.length) {
    echo(term, '蓝色门后的回声还在很远的地方。现在还不到面对它的时候。');
    return true;
  }
  nl(term);
  echo(term, '你站在蓝色门前。门缝里的光比以前更亮。');
  echo(term, '回声没有催促你。它只是把选择轻轻放在你面前。');
  nl(term);
  echo(term, '[可选结局]');
  const options = {};
  if (available.includes('A')) { echo(term, '[a] 记住 —— 把第七次写成最后一次'); options.a = 'A'; }
  echo(term, '[b] 遗忘 —— 放下所有，走向第八次开始'); options.b = 'B';
  if (available.includes('C')) { echo(term, '[c] 共存 —— 让记忆从独白变成合唱'); options.c = 'C'; }
  if (available.includes('D')) { echo(term, cyan('[d] 觉醒 —— 触摸世界背后的 yaml 本体')); options.d = 'D'; }


  const choice = (await term.read('\n  你选择：> ')).trim().toLowerCase();
  const ending = options[choice];
  if (!ending) {
    echo(term, '你没有做出决定。门保持着半开的状态。');
    return true;
  }

  const lines = getEndingText(gs, ending);
  nl(term);
  for (const line of lines) echo(term, line);
  await saveSystem.save(gs);
  return false; // game over
}

export async function cmdSave(gs, term) {
  if (await saveSystem.save(gs)) {
    echo(term, '💾 存档已保存。但记住——存档保存的不是世界，是你"记得什么"。');
  } else { echo(term, red('存档失败。')); }
}

export async function cmdSync(gs, term) {
  nl(term);
  echo(term, '═══ 记忆同步 ═══');
  echo(term, '通过 GitHub 将记忆托管到云端，在任何设备上唤醒。');
  echo(term, '');

  // 检查是否已有凭证
  const creds = loadCredentials();
  if (creds.token && creds.gistId) {
    echo(term, `当前已绑定云端存档。`);
    echo(term, '1. 寄存记忆（上传到云端）');
    echo(term, '2. 唤醒记忆（从云端下载）');
    echo(term, '3. 解除绑定（仅在本地清除凭证）');
    echo(term, '4. 彻底销毁云端记忆（遗弃这个世界）');
    echo(term, '0. 取消');
    const choice = (await term.read('  > ')).trim();

    if (choice === '1') {
      echo(term, '正在连接到以太网络...');
      const adapter = new GistSyncAdapter(creds.token, creds.gistId);
      const success = await adapter.save(gs.serialize());
      if (success) {
        echo(term, `✅ 寄存成功。记忆已安全存放在虚空中。`);
      } else {
        echo(term, red('❌ 寄存失败。Token 可能已过期，试试解除绑定后重新连接。'));
      }
    } else if (choice === '2') {
      echo(term, '正在虚空中寻觅...');
      const adapter = new GistSyncAdapter(creds.token, creds.gistId);
      const data = await adapter.load();
      if (data) {
        if (gs.deserialize(data)) {
          await saveSystem.save(gs);
          echo(term, `✅ 记忆已唤醒。当前回合：${gs.turn}`);
          sound.soundSave();
        } else {
          echo(term, red('❌ 记忆碎片已损坏，无法拼凑。'));
        }
      } else {
        echo(term, red('❌ 云端没有找到存档。试试先寄存一次。'));
      }
    } else if (choice === '3') {
      clearCredentials();
      echo(term, '已解除绑定。本地存档不受影响。');
    } else if (choice === '4') {
      echo(term, red('警告：这将永久删除云端存档，且不可恢复。'));
      const confirm = (await term.read('  确定要遗弃吗？(y/n) > ')).trim().toLowerCase();
      if (confirm === 'y') {
        const adapter = new GistSyncAdapter(creds.token, creds.gistId);
        await adapter.deleteSave();
        clearCredentials();
        echo(term, '💨 记忆容器已销毁。那片虚空中不再有你的痕迹。');
      } else {
        echo(term, '你犹豫了。云端记忆保留。');
      }
    } else {
      echo(term, '已取消。');
    }
    return;
  }

  // 首次连接流程
  echo(term, '首次同步需要一把「钥匙」——GitHub Personal Access Token。');
  echo(term, dim('（在 github.com/settings/tokens 创建，勾选 gist 权限即可）'));
  echo(term, '');
  echo(term, '1. 输入钥匙，连接云端');
  echo(term, '0. 取消');
  const choice = (await term.read('  > ')).trim();

  if (choice !== '1') {
    echo(term, '已取消。');
    return;
  }

  const token = (await term.read('  请输入 GitHub Token > ')).trim();
  if (!token) {
    echo(term, '已取消。');
    return;
  }

  echo(term, '正在验证钥匙...');
  const validation = await validateToken(token);
  if (!validation.valid) {
    echo(term, red('❌ 钥匙无效。请检查 Token 是否正确。'));
    return;
  }
  echo(term, `✅ 验证通过，你好 ${gold(validation.username)}。`);

  // 搜索已有存档
  echo(term, '正在搜索云端已有的记忆...');
  const existingGistId = await findExistingGist(token);

  if (existingGistId) {
    echo(term, '发现云端已有存档。');
    echo(term, '1. 唤醒云端记忆（覆盖本地）');
    echo(term, '2. 用本地记忆覆盖云端');
    echo(term, '0. 取消');
    const mergeChoice = (await term.read('  > ')).trim();

    if (mergeChoice === '1') {
      const adapter = new GistSyncAdapter(token, existingGistId);
      const data = await adapter.load();
      if (data && gs.deserialize(data)) {
        storeCredentials(token, existingGistId);
        await saveSystem.save(gs);
        echo(term, `✅ 记忆已唤醒。当前回合：${gs.turn}`);
        sound.soundSave();
      } else {
        echo(term, red('❌ 云端记忆已损坏。'));
      }
    } else if (mergeChoice === '2') {
      const adapter = new GistSyncAdapter(token, existingGistId);
      const success = await adapter.save(gs.serialize());
      if (success) {
        storeCredentials(token, existingGistId);
        echo(term, '✅ 本地记忆已覆盖云端。');
      } else {
        echo(term, red('❌ 上传失败。'));
      }
    } else {
      echo(term, '已取消。');
    }
  } else {
    // 创建新存档
    echo(term, '未找到已有存档，正在创建新的记忆容器...');
    const adapter = new GistSyncAdapter(token, null);
    const success = await adapter.save(gs.serialize());
    if (success) {
      storeCredentials(token, adapter.getGistId());
      echo(term, '✅ 记忆容器已创建，存档已上传。');
      echo(term, '下次在其他设备上输入相同的钥匙即可唤醒记忆。');
    } else {
      echo(term, red('❌ 创建失败。请检查 Token 是否有 gist 权限。'));
    }
  }
}

export function cmdToggleSound(gs, term) {
  const enabled = !sound.isEnabled();
  sound.setEnabled(enabled);
  echo(term, `声音效果已${enabled ? '开启' : '关闭'}。`);
}

export async function cmdQuit(gs, term) {
  await saveSystem.save(gs);
  nl(term);
  echo(term, '═══ 旅程暂停 ═══');
  echo(term, `回合数：${gs.turn}`);
  echo(term, `记住了：${gs.slots.length} 段记忆`);
  echo(term, `遗忘了：${gs.totalForgotten} 段`);
  echo(term, `回忆了：${gs.totalRecalled} 次`);
  echo(term, `做了：${gs.totalDreams} 个梦`);
  echo(term, `获得：${gs.dreamInsights.length} 个灵感`);
  if (gs.forgotten.length) {
    nl(term);
    echo(term, `那些被遗忘的：${gs.forgotten.join('、')}`);
    echo(term, '它们曾经存在过。这就够了。');
  }
  nl(term);
  echo(term, '再见。也许下次醒来时，你会记得更多——或者更少。');
}
