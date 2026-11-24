/**
 * Project conversations (Bots 0.17.5): a project group is a standing cast of bots working on one
 * piece of work — a mini-app, an Android app — and each of them has its own conversation *inside*
 * that project.
 *
 * The point is memory. A bot's notes about the mini-app must not reach its work on the Android app,
 * and the same architect may staff both. So the conversation, not the bot, is what carries a project:
 * `bot_session` is the bot's own (project-less) conversation, and every (bot, project) pair has a
 * conversation of its own here. The project's notes are injected into that conversation only, and a
 * note written there is filed under that project without anyone naming it.
 *
 * `project-sessions.json` under the bots cache holds `{version: 1, sessions: {"<botId>|<projectId>": "<sessionId>"}}`.
 * A pair with no entry simply has not been talked to yet; its conversation is made on first need.
 * Stale entries (a bot or project gone) are dropped as they are read, and `forget*` removes them
 * outright so a deleted pair never resurrects an archived session.
 *
 * @module @kadaliao/dsh-bots/lib/project-sessions
 */

import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/** Most (bot, project) conversations one Bots keeps; the oldest idle ones go first. */
export const MAX_PROJECT_SESSIONS = 400;

/** The key a pair is stored under. Both halves are ids, so `|` cannot collide. */
export const pairKey = (botId, projectId) => `${String(botId ?? '')}|${String(projectId ?? '')}`;

/** A stored pair split back into its halves, or null when the key is malformed. */
export function splitPair(key) {
  const [botId, projectId] = String(key ?? '').split('|');
  if (!botId || !projectId) return null;
  return { botId, projectId };
}

/**
 * The project conversations file under `dir`.
 * @param {string} dir
 * @param {{now?: () => number}} [opts]
 */
export function createProjectSessions(dir, { now = Date.now } = {}) {
  const file = join(dir, 'project-sessions.json');
  /** @type {{version: 1, sessions: Record<string, string>}|null} */
  let data = null;
  const listeners = new Set();

  const load = () => {
    if (data) return data;
    let parsed = null;
    try {
      parsed = JSON.parse(readFileSync(file, 'utf8'));
    } catch {
      // First run, or unreadable: start empty; the next write replaces it.
      parsed = null;
    }
    data = { version: 1, sessions: {} };
    const raw = parsed && typeof parsed === 'object' && parsed.sessions && typeof parsed.sessions === 'object' ? parsed.sessions : {};
    for (const [key, value] of Object.entries(raw)) {
      if (!splitPair(key) || typeof value !== 'string' || !value) continue;
      data.sessions[key] = value;
    }
    return data;
  };

  const save = () => {
    try {
      mkdirSync(dir, { recursive: true });
      writeFileSync(`${file}.tmp`, JSON.stringify(data, null, 2), { encoding: 'utf8', mode: 0o600 });
      renameSync(`${file}.tmp`, file);
    } catch {
      // Kept in memory; the next write tries again.
    }
  };

  const changed = (pair) => {
    save();
    for (const fn of listeners) {
      try {
        fn(pair);
      } catch {
        // A listener must not break a write.
      }
    }
  };

  return {
    /** The conversation of a (bot, project) pair, or '' when it has none yet. */
    get(botId, projectId) {
      return load().sessions[pairKey(botId, projectId)] ?? '';
    },

    /** Remember that a pair's conversation is `sessionId`. */
    set(botId, projectId, sessionId) {
      const id = String(sessionId ?? '').trim();
      if (!id) return this.remove(botId, projectId);
      const key = pairKey(botId, projectId);
      if (!splitPair(key)) return undefined;
      load().sessions[key] = id;
      changed(splitPair(key));
      return id;
    },

    remove(botId, projectId) {
      const key = pairKey(botId, projectId);
      const sessions = load().sessions;
      if (!(key in sessions)) return undefined;
      const was = sessions[key];
      delete sessions[key];
      changed(splitPair(key));
      return was;
    },

    /**
     * Which pair `sessionId` is the conversation of, or null. This is how a Session knows it is a
     * project's: the caller asks by conversation, not by who is talking.
     * @param {string} sessionId
     */
    bySession(sessionId) {
      const id = String(sessionId ?? '').trim();
      if (!id) return null;
      for (const [key, value] of Object.entries(load().sessions)) {
        if (value !== id) continue;
        const pair = splitPair(key);
        if (pair) return pair;
      }
      return null;
    },

    /** Every pair `botId` has a conversation in, by project id. */
    ofBot(botId) {
      const id = String(botId ?? '');
      const out = [];
      for (const [key, value] of Object.entries(load().sessions)) {
        const pair = splitPair(key);
        if (pair && pair.botId === id) out.push({ projectId: pair.projectId, sessionId: value });
      }
      return out;
    },

    /** Every pair the project has a conversation for, by bot id. */
    ofProject(projectId) {
      const id = String(projectId ?? '');
      const out = [];
      for (const [key, value] of Object.entries(load().sessions)) {
        const pair = splitPair(key);
        if (pair && pair.projectId === id) out.push({ botId: pair.botId, sessionId: value });
      }
      return out;
    },

    /** Drop every conversation of a bot (it was deleted). Returns how many went. */
    forgetBot(botId) {
      const id = String(botId ?? '');
      const sessions = load().sessions;
      let n = 0;
      for (const key of Object.keys(sessions)) {
        if (splitPair(key)?.botId !== id) continue;
        delete sessions[key];
        n += 1;
      }
      if (n) changed(null);
      return n;
    },

    /** Drop every conversation of a project (it was removed). Returns how many went. */
    forgetProject(projectId) {
      const id = String(projectId ?? '');
      const sessions = load().sessions;
      let n = 0;
      for (const key of Object.keys(sessions)) {
        if (splitPair(key)?.projectId !== id) continue;
        delete sessions[key];
        n += 1;
      }
      if (n) changed(null);
      return n;
    },

    /** Drop pairs that are no longer real, so a deleted pair cannot resurrect an archived Session. */
    prune({ bot: botExists = () => true, project: projectExists = () => true } = {}) {
      const sessions = load().sessions;
      const gone = [];
      for (const key of Object.keys(sessions)) {
        const pair = splitPair(key);
        if (!pair || !botExists(pair.botId) || !projectExists(pair.projectId)) gone.push(key);
      }
      if (!gone.length) return 0;
      for (const key of gone) delete sessions[key];
      changed(null);
      return gone.length;
    },

    /** `fn(pair)` after each write (`null` for a bulk removal). Returns an unsubscribe. */
    onChange(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },

    size() {
      return Object.keys(load().sessions).length;
    },
  };
}
