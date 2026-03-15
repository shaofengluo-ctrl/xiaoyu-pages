/**
 * 记忆碎片 — 遇见系统
 * 4 个遇见地点（书摊/钟楼/庭院/枯井），跨NPC感知
 * 
 * 作者：小羽
 * 日期：2026-03-11 Session 43
 */

import { getFragment } from './data.js';
import * as sound from './sound.js';
import { ENCOUNTER_COOLDOWN } from './engine_core.js';

// ── helpers ──────────────────────────────────────
function hasSlot(gs, id) { return gs.slots.some(s => s.fragmentId === id); }
function hasAny(gs, ids) { return gs.slots.some(s => ids.includes(s.fragmentId)); }

/** Check encounter cooldown. Returns { ok } or { ok:false, remaining }. */
export function checkCooldown(gs, location) {
  const last = gs.encounterLastTurn[location] ?? -999;
  if (gs.turn - last < ENCOUNTER_COOLDOWN) {
    return { ok: false, remaining: ENCOUNTER_COOLDOWN - (gs.turn - last) };
  }
  return { ok: true };
}

// ── Encounter 1: 书摊 — 阿澄 ────────────────────

export function encounter_bookstall(gs) {
  const cd = checkCooldown(gs, 'bookstall');
  if (!cd.ok) return { type: 'cooldown', location: '石板路', msg: `石板路上空荡荡的。也许过一会儿再来。（冷却中，还需 ${cd.remaining} 回合）` };
  gs.encounterLastTurn.bookstall = gs.turn;

  const remembers = hasSlot(gs, 'frag_11');
  const lines = [];
  lines.push('你走在一条雨后的石板路上。');
  lines.push('石板还潮着，空气里有旧纸和木架的味道。');
  lines.push('前方的旧书摊前，有人抬头看见你，微微一愣。');

  if (remembers) {
    sound.playNpcMusic('bookstall', true);
    sound.soundRememberEncounter();
    lines.push('');
    lines.push('你几乎没有犹豫。');
    lines.push('> 你：阿澄。');
    lines.push('她笑了。不是客套，而是"你居然还记得"的笑。');

    // Cross-NPC perception
    if (hasAny(gs, ['frag_14', 'frag_15'])) {
      lines.push('> 阿澄：广场那边的老先生——你见过吧？他总在修同一块表。');
      lines.push('> 阿澄：有一次他来买过一本关于钟表构造的书。扉页有人用铅笔写了"再来一次"。');
      lines.push('> 阿澄：他看了很久那行字。');
    } else if (hasAny(gs, ['frag_16', 'frag_17'])) {
      lines.push('> 阿澄：庭院那边有个孩子，你知道吗？他画了很多人。');
      lines.push('> 阿澄：有一次他来这里翻画册——不是买书，是想对照书里的插图。');
      lines.push('> 阿澄：他画的比书里准。');
    }

    lines.push('> 阿澄：你回来了。我找到一本有意思的——空白页比印刷页多。');
    lines.push('> 阿澄：有人把整本书当日记用了。');
    lines.push('她把书递给你。书页间夹着一张折叠纸条。');
    lines.push('你展开它——是一张地图。');
    lines.push('[解锁对话：「被遗忘的批注」]');
    return { type: 'remember', location: '书摊', lines, fragmentId: 'frag_12' };
  } else {
    lines.push('');
    lines.push('你走近书摊。');
    lines.push('她看着你，眼神里有东西闪了一下——期待？失望？');
    lines.push('你分辨不出来。');
    lines.push('> 她：……你要买书吗？');
    lines.push('语气礼貌而疏远。你们之间像隔着一层透明的墙。');
    return {
      type: 'stranger', location: '书摊', lines, fragmentId: 'frag_13',
      choices: [
        { key: 'a', label: '有什么推荐的吗？', lines: [
          '她随手指了几本畅销书，封面崭新，没有任何批注。',
          '对话很快结束了。但你注意到她的手指在一本旧书的书脊上无意识地摸了一下。',
          '那本书没有被指给你。',
        ]},
        { key: 'b', label: '你好像认识我？', lines: [
          '她犹豫了一下。',
          '> 她：也许吧。这条路上来来往往的人很多。',
        ]},
        { key: 'c', label: '沉默，继续走', lines: ['你没有说话，继续往前走。'] },
      ],
      afterLines: [
        '走到街角时，你闻到一阵雨后的潮气。',
        '你回头看见她把一本夹着纸条的书慢慢合上。',
        '那张纸条没有交到你手里。',
      ],
      strangerSound: () => { sound.playNpcMusic('bookstall', false); sound.soundStrangerEncounter(); },
    };
  }
}

// ── Encounter 2: 钟楼 — 修表老人 ─────────────────

export function encounter_clocktower(gs) {
  const cd = checkCooldown(gs, 'clocktower');
  if (!cd.ok) return { type: 'cooldown', location: '钟楼', msg: `钟楼广场安安静静的。长椅上没有人。（冷却中，还需 ${cd.remaining} 回合）` };
  gs.encounterLastTurn.clocktower = gs.turn;

  const remembers = hasAny(gs, ['frag_02', 'frag_05']);
  const lines = [];
  lines.push('你站在钟楼广场。');
  lines.push('周围很安静。钟楼的指针停在三点十五分。');
  lines.push('广场边的长椅上，一个老人弯着腰，专注地修一块怀表。');

  if (remembers) {
    sound.playNpcMusic('clockmaker', true);
    sound.soundRememberEncounter();
    lines.push('');
    lines.push('你停下脚步。三点十五分——你见过这个时间。');
    lines.push('> 你：三点十五分。钟楼也停在这个时间。');
    lines.push('');
    lines.push('老人终于抬头。他的眼睛里有很多层东西——惊讶、欣慰、和一种你说不清的……疑惑？');

    if (hasSlot(gs, 'frag_11')) {
      lines.push('> 老人：石板路那边的女孩子——卖旧书的那个——你见过她吧？');
      lines.push('> 老人：她从来不丢别人写的东西。这点很像我修表。表停了不算丢，书卖了不算忘。');
    } else if (hasAny(gs, ['frag_16', 'frag_17'])) {
      lines.push('> 老人：那个在庭院里画画的孩子……他来看过我。');
      lines.push('> 老人：他给我画了一张像。手的部分画得很仔细——连伤疤都数对了。');
    }

    lines.push('> 老人：你记得这个时间。');
    lines.push('> 老人：我修了很多年的表。每块表都停在三点十五分。');
    lines.push('> 老人：你知道为什么吗？');
    lines.push('');
    lines.push('他没有等你回答。');
    lines.push('老人翻开怀表的表盖。你瞥见里面——');
    lines.push('一张极小的照片。太旧了，人脸已经模糊。');
    lines.push('但你觉得那张脸……好像在哪里见过。');
    lines.push('> 老人：每次修好它，照片就清楚一点。每次它停下来，照片又模糊回去。');
    lines.push('> 老人：你要记住这件事。');
    lines.push('[解锁对话：「三点十五分的秘密」]');
    return { type: 'remember', location: '钟楼', lines, fragmentId: 'frag_15' };
  } else {
    lines.push('');
    lines.push('你走过去。');
    lines.push('老人没有抬头。他专注地擦拭一个小零件，像是全世界只剩下他和那块表。');
    lines.push('你在旁边坐下。广场很安静。');
    return {
      type: 'stranger', location: '钟楼', lines, fragmentId: 'frag_14',
      choices: [
        { key: 'a', label: '您在修什么？', lines: [
          '老人抬起头，看了你一眼。他的瞳孔很深，像井。',
          '> 老人：表。总是停。',
          '他低下头继续擦拭，没有说更多。',
          '你注意到他的手指上有伤疤——很多道。指尖有微微的油污。',
          '空气里有金属和机油的味道。',
        ]},
        { key: 'b', label: '安静地坐一会儿', lines: [
          '你坐在那里，听钟楼不走的滴答声。等等——钟楼停了才对。',
          '可你明明听到了。滴答、滴答——很轻，像心跳。',
          '也许是老人的怀表。也许是老人的心跳。',
          '微风带来长椅上旧木头和绣花鸠的气味。',
        ]},
        { key: 'c', label: '起身离开', lines: [
          '你起身离开了。',
          '走出广场时，你回头看了一眼。',
          '老人还坐在那里，但他的手停下来了。',
          '他在看你。太阳在他身后，将他的轮廓融化在光里。',
        ]},
      ],
      afterLines: [
        '你走开时，觉得他的手很熟悉。那种慢而精确的动作，像在做一件做过无数次的事。',
      ],
      strangerSound: () => { sound.playNpcMusic('clockmaker', false); sound.soundStrangerEncounter(); },
    };
  }
}

// ── Encounter 3: 庭院 — 画画的孩子 ───────────────

export function encounter_courtyard(gs) {
  const cd = checkCooldown(gs, 'courtyard');
  if (!cd.ok) return { type: 'cooldown', location: '庭院', msg: `庭院里只有树叶沙沙的声音。孩子不在。（冷却中，还需 ${cd.remaining} 回合）` };
  gs.encounterLastTurn.courtyard = gs.turn;

  const remembers = hasAny(gs, ['frag_06', 'frag_09']);
  const lines = [];
  lines.push('你走进庭院。');
  lines.push('那棵大树还在——树叶在没有风的时候也会轻轻晃动。');
  lines.push('树下的石阶上，一个孩子盘腿坐着，膝盖上摊着一本画册。');
  lines.push('他在画画。笔触很慢，像是在回忆什么。');

  if (remembers) {
    sound.playNpcMusic('child', true);
    sound.soundRememberEncounter();
    lines.push('');
    lines.push('你看向树干——七道刻痕。你认识它们。');
    lines.push('孩子注意到你在看，抬起头。');
    lines.push('> 孩子：你认识这棵树？');
    lines.push('> 你：嗯。树干上有七道刻痕。');
    lines.push('');
    lines.push('孩子的眼睛亮了。');
    lines.push('> 孩子：你是第七个。');
    lines.push('> 孩子：每次有人来，我就画。看——');
    lines.push('');
    lines.push('他翻开画册。');
    lines.push('前六页每页一个人——不同的衣服、不同的姿态，但五官轮廓很像。');
    lines.push('第七页是你。');
    lines.push('你在画里触摸树干上的第七道刻痕。');

    if (hasAny(gs, ['frag_14', 'frag_15'])) {
      lines.push('> 孩子：广场上的那个老爷爷——他也是每次都来。');
      lines.push('> 孩子：他的手上有七道伤疤，和树上的刻痕一样多。');
      lines.push('> 孩子：我画过他的手。每次画，伤疤的位置都不变。');
    } else if (hasSlot(gs, 'frag_11')) {
      lines.push('> 孩子：书摊的姐姐——她有一次给我一本旧画册。');
      lines.push('> 孩子：里面的插图很漂亮。但我觉得我画得更像。');
      lines.push('> 孩子：她笑着说——"确实"。');
    }

    lines.push('> 你：……你怎么画得这么像？');
    lines.push('> 孩子：因为你每次来都做同样的事。');
    lines.push('> 孩子：你每次来都会摸这棵树。');
    lines.push('[解锁对话：「第七个版本的你」]');
    return { type: 'remember', location: '庭院', lines, fragmentId: 'frag_16' };
  } else {
    lines.push('');
    lines.push('你走近。');
    lines.push('孩子没有抬头。他全神贯注地画着什么。');
    lines.push('你坐在石阶的另一头。');
    return {
      type: 'stranger', location: '庭院', lines, fragmentId: 'frag_17',
      choices: [
        { key: 'a', label: '你在画什么？', lines: [
          '孩子瞄了你一眼，又低下头。',
          '> 孩子：人。来这里的人。',
          '他翻了翻画册——六个人，风格各异，但你总觉得他们有什么共同点。',
          '第七页是空的。不，不完全空——有一个淡淡的轮廓。',
        ]},
        { key: 'b', label: '安静地看他画', lines: [
          '你安静地坐着，看他画。',
          '他的笔在纸上走——六个人已经画好了，第七个只有轮廓。',
          '笔停了。他好像在等什么。',
          '然后他放下了笔。',
        ]},
        { key: 'c', label: '起身离开', lines: [
          '你起身离开了。',
          '走到庭院门口时，你听到身后传来一声叹息。',
          '不确定是孩子的，还是树的。',
        ]},
      ],
      afterLines: [
        '你离开时注意到石阶上有一支被放下的画笔。笔尖还湿着。',
      ],
      strangerSound: () => { sound.soundStrangerEncounter(); sound.playNpcMusic('child', false); },
    };
  }
}

// ── Encounter 4: 枯井 ───────────────────────────

export function encounter_well(gs) {
  const cd = checkCooldown(gs, 'well');
  if (!cd.ok) return { type: 'cooldown', location: '枯井', msg: `枯井边一片死寂。你暂时不敢再靠近。（冷却中，还需 ${cd.remaining} 回合）` };
  gs.encounterLastTurn.well = gs.turn;

  const remembersTree = hasAny(gs, ['frag_06', 'frag_09']);
  const lines = [];
  lines.push('你沿着庭院最深处的石阶往下走。');
  lines.push('草木逐渐稀薄，空气像被水泡过一样冷。');
  lines.push('那里有一口枯井。井沿磨损得厉害，像有人反复趴在这里往下看。');
  sound.soundTrauma();

  if (remembersTree) {
    sound.playNpcMusic('well', true);
    lines.push('');
    lines.push('你想起树干上的刻痕，想起第七次。');
    lines.push('你扶住井沿，往下看。');

    // Cross-NPC echoes
    const echoes = [];
    if (hasSlot(gs, 'frag_11')) echoes.push('翻书页的声音');
    if (hasAny(gs, ['frag_14', 'frag_15'])) echoes.push('齿轮咕哒的声音');
    if (hasAny(gs, ['frag_16', 'frag_17'])) echoes.push('画笔落纸的声音');
    if (echoes.length) {
      lines.push(`井口传来微弱的回声——不只是你的声音，还有${echoes.join('、')}。`);
      lines.push('像是这口井记得每一个来过的人。');
    }

    lines.push('黑暗里有个声音，轻轻叫出一个你从未承认过、却瞬间认出的名字。');
    lines.push('你的手开始发抖。你看见井壁上密密麻麻的竖线——比七道多得多。');

    return {
      type: 'remember_well', location: '枯井', lines,
      fragments: ['frag_18', 'frag_19'],
      afterLines: [
        '你退后一步。',
        '那个名字没有留在井里，它跟着你上来了。',
      ],
    };
  } else {
    lines.push('');
    lines.push('你站在井边，却不敢看太久。');
    lines.push('井里太黑了，黑得像没有底。');
    lines.push('你什么都没看清——但有个名字已经贴在你的意识底层。');
    sound.playNpcMusic('well', false);
    return { type: 'stranger_well', location: '枯井', lines, fragmentId: 'frag_19' };
  }
}

/** Map location key to encounter function */
export const ENCOUNTER_MAP = {
  '1': encounter_bookstall,
  '2': encounter_clocktower,
  '3': encounter_courtyard,
  '4': encounter_well,
};

export const ENCOUNTER_LABELS = {
  '1': '雨后的石板路——旧书摊',
  '2': '钟楼广场——长椅',
  '3': '庭院——大树下',
  '4': '庭院深处——枯井',
};
