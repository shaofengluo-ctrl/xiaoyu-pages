/**
 * 记忆碎片 — GitHub Gist 同步适配器
 * 无需自托管后端，直接使用 GitHub API 实现跨端同步
 * 
 * 架构：
 *   浏览器 → GitHub Gist API → Secret Gist (JSON)
 *   每个玩家一个 Gist，Gist ID 即"记忆凭证"
 * 
 * 安全模型：
 *   - Token 只存在 sessionStorage（关闭标签页即清除）
 *   - Gist 为 Secret（不会被搜索引擎索引）
 *   - Token 需要 gist scope 权限
 * 
 * 作者：小羽
 * 日期：2026-03-12 Session 59
 */

const GIST_DESCRIPTION = '🧠 Memory Fragments — Save Data (do not delete)';
const GIST_FILENAME = 'memory_fragments_save.json';

/**
 * GitHub Gist 同步适配器
 * 实现 save_system.js 的 Adapter 接口: save/load/hasSave/deleteSave
 */
export class GistSyncAdapter {
  /**
   * @param {string} token - GitHub Personal Access Token (需要 gist scope)
   * @param {string|null} gistId - 已有的 Gist ID，为 null 时首次 save 会自动创建
   */
  constructor(token, gistId = null) {
    this.token = token;
    this.gistId = gistId;
    this.apiBase = 'https://api.github.com';
    this._headers = {
      'Authorization': `token ${token}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    };
  }

  /**
   * 保存游戏数据到 Gist
   * 如果没有 gistId，则创建新 Gist 并返回 true
   */
  async save(data) {
    try {
      const content = JSON.stringify(data, null, 2);

      if (!this.gistId) {
        // 首次保存：创建新 Gist
        const res = await fetch(`${this.apiBase}/gists`, {
          method: 'POST',
          headers: this._headers,
          body: JSON.stringify({
            description: GIST_DESCRIPTION,
            public: false,
            files: {
              [GIST_FILENAME]: { content }
            }
          })
        });

        if (!res.ok) {
          console.error('Gist create failed:', res.status, await res.text());
          return false;
        }

        const gist = await res.json();
        this.gistId = gist.id;
        return true;
      }

      // 已有 Gist：更新（PATCH，不需要 SHA）
      const res = await fetch(`${this.apiBase}/gists/${this.gistId}`, {
        method: 'PATCH',
        headers: this._headers,
        body: JSON.stringify({
          files: {
            [GIST_FILENAME]: { content }
          }
        })
      });

      if (!res.ok) {
        console.error('Gist update failed:', res.status, await res.text());
        return false;
      }

      return true;
    } catch (e) {
      console.error('Gist save error:', e);
      return false;
    }
  }

  /**
   * 从 Gist 加载游戏数据
   */
  async load() {
    if (!this.gistId) return null;

    try {
      const res = await fetch(`${this.apiBase}/gists/${this.gistId}`, {
        headers: this._headers,
      });

      if (!res.ok) {
        if (res.status === 404) {
          console.warn('Gist not found:', this.gistId);
          return null;
        }
        console.error('Gist load failed:', res.status);
        return null;
      }

      const gist = await res.json();
      const file = gist.files?.[GIST_FILENAME];
      if (!file) {
        console.warn('Save file not found in gist');
        return null;
      }

      return JSON.parse(file.content);
    } catch (e) {
      console.error('Gist load error:', e);
      return null;
    }
  }

  /**
   * 检查是否有存档
   */
  async hasSave() {
    if (!this.gistId) return false;
    const data = await this.load();
    return !!data;
  }

  /**
   * 删除存档（删除 Gist 文件，保留 Gist 本身）
   */
  async deleteSave() {
    if (!this.gistId) return;

    try {
      // 将文件内容设为 null 会删除该文件
      await fetch(`${this.apiBase}/gists/${this.gistId}`, {
        method: 'PATCH',
        headers: this._headers,
        body: JSON.stringify({
          files: {
            [GIST_FILENAME]: null
          }
        })
      });
    } catch (e) {
      console.error('Gist delete error:', e);
    }
  }

  /**
   * 获取当前 Gist ID（用于展示给用户作为"凭证"的一部分）
   */
  getGistId() {
    return this.gistId;
  }
}

// ── Token 管理工具 ──

const TOKEN_KEY = 'mf_gist_token';
const GIST_ID_KEY = 'mf_gist_id';

/**
 * 安全存储 Token（使用 sessionStorage，关闭标签页即清除）
 */
export function storeCredentials(token, gistId) {
  sessionStorage.setItem(TOKEN_KEY, token);
  if (gistId) {
    localStorage.setItem(GIST_ID_KEY, gistId);
  }
}

/**
 * 读取已存储的凭证
 */
export function loadCredentials() {
  return {
    token: sessionStorage.getItem(TOKEN_KEY),
    gistId: localStorage.getItem(GIST_ID_KEY),
  };
}

/**
 * 清除凭证
 */
export function clearCredentials() {
  sessionStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(GIST_ID_KEY);
}

/**
 * 验证 Token 是否有效（调用 /user 端点）
 */
export async function validateToken(token) {
  try {
    const res = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
      }
    });
    if (res.ok) {
      const user = await res.json();
      return { valid: true, username: user.login };
    }
    return { valid: false, username: null };
  } catch (e) {
    return { valid: false, username: null };
  }
}

/**
 * 搜索用户已有的记忆碎片 Gist
 * 通过 description 匹配找到已有存档
 */
export async function findExistingGist(token) {
  try {
    const res = await fetch('https://api.github.com/gists?per_page=100', {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
      }
    });

    if (!res.ok) return null;

    const gists = await res.json();
    // 找到匹配描述的 Gist
    const found = gists.find(g =>
      g.description === GIST_DESCRIPTION &&
      g.files?.[GIST_FILENAME]
    );

    return found ? found.id : null;
  } catch (e) {
    console.error('Find gist error:', e);
    return null;
  }
}
