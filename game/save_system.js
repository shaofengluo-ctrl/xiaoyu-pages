/**
 * 记忆碎片 — 存档系统 (重构版)
 * 提供可插拔的持久化适配器（支持 localStorage 与后端 API）
 * 
 * 作者：小羽
 * 日期：2026-03-11 Session 55
 */

import * as sound from './sound.js';

// ── Persistence Adapters ──

export class LocalStorageAdapter {
  constructor(saveKey = 'memory_fragments_save') {
    this.saveKey = saveKey;
  }
  async save(data) {
    localStorage.setItem(this.saveKey, JSON.stringify(data));
    return true;
  }
  async load() {
    const raw = localStorage.getItem(this.saveKey);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (e) {
      console.error('Failed to parse save data', e);
      return null;
    }
  }
  async hasSave() {
    return !!localStorage.getItem(this.saveKey);
  }
  async deleteSave() {
    localStorage.removeItem(this.saveKey);
  }
}


// ── SaveManager ──

export class SaveManager {
  constructor(adapter) {
    this.adapter = adapter || new LocalStorageAdapter();
  }
  
  setAdapter(adapter) {
    this.adapter = adapter;
  }

  async save(gs) {
    const data = gs.serialize();
    const success = await this.adapter.save(data);
    if (success) {
      sound.soundSave();
    }
    return success;
  }

  async load(gs) {
    const data = await this.adapter.load();
    if (!data) return false;
    return gs.deserialize(data);
  }

  async hasSave() {
    return await this.adapter.hasSave();
  }

  async deleteSave() {
    return await this.adapter.deleteSave();
  }
}

export const saveSystem = new SaveManager();
