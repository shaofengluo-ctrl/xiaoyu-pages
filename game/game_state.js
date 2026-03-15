/**
 * 记忆碎片 — 游戏状态管理器
 * 负责状态的初始化、序列化与反序列化
 * 
 * 作者：小羽
 * 日期：2026-03-11 Session 55
 */

import { UNFORGETTABLE_IDS, createSlot } from './engine_core.js';

export class GameState {
  constructor() {
    this.slots = [];
    this.discovered = new Set();
    this.forgotten = [];
    this.dreamInsights = [];
    this.turn = 0;
    this.totalForgotten = 0;
    this.totalRecalled = 0;
    this.totalDreams = 0;
    this.encounterLastTurn = {};
    this.lastWorldHintTurn = -999;
    this.consecutiveConcepts = 0;
    this.seenEpiphanies = [];
  }

  serialize() {
    return {
      turn: this.turn,
      slots: this.slots.map(s => ({
        fragment_id: s.fragmentId,
        state: s.state,
        recall_count: s.recallCount,
        turns_since_recall: s.turnsSinceRecall,
        unforgettable: s.unforgettable,
      })),
      discovered: [...this.discovered],
      forgotten: this.forgotten,
      dream_insights: this.dreamInsights.map(d => ({ a: d.a, b: d.b, insight: d.insight })),
      stats: {
        total_forgotten: this.totalForgotten,
        total_recalled: this.totalRecalled,
        total_dreams: this.totalDreams,
      },
      encounter_last_turn: this.encounterLastTurn,
      last_world_hint_turn: this.lastWorldHintTurn,
      consecutive_concepts: this.consecutiveConcepts,
      seen_epiphanies: this.seenEpiphanies,
    };
  }

  deserialize(data) {
    try {
      this.turn = data.turn;
      this.slots = data.slots.map(s => createSlot(
        s.fragment_id,
        s.state,
        s.recall_count,
        s.turns_since_recall,
      ));
      // Restore unforgettable flag
      for (const slot of this.slots) {
        if (UNFORGETTABLE_IDS.has(slot.fragmentId)) slot.unforgettable = true;
      }
      this.discovered = new Set(data.discovered || []);
      this.forgotten = (data.forgotten || []).map(f => {
        if (typeof f === 'string') return { id: f, title: f }; // backward compatibility
        return f;
      });
      this.dreamInsights = (data.dream_insights || []).map(d => ({
        a: d.a, b: d.b, insight: d.insight,
      }));
      const stats = data.stats || {};
      this.totalForgotten = stats.total_forgotten || 0;
      this.totalRecalled = stats.total_recalled || 0;
      this.totalDreams = stats.total_dreams || 0;
      this.encounterLastTurn = data.encounter_last_turn || {};
      this.lastWorldHintTurn = data.last_world_hint_turn ?? -999;
      this.consecutiveConcepts = data.consecutive_concepts || 0;
      this.seenEpiphanies = data.seen_epiphanies || [];
      return true;
    } catch (e) {
      console.error('Failed to deserialize game state', e);
      return false;
    }
  }
}

export function createGameState() {
  return new GameState();
}
