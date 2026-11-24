import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { createProjectSessions, MAX_PROJECT_SESSIONS, pairKey, splitPair } from '../lib/project-sessions.mjs';

const dirOf = () => mkdtempSync(join(tmpdir(), 'bots-psess-'));

test('a pair key round-trips, and a malformed one is refused', () => {
  assert.equal(pairKey('bot-aaa', 'pj11111111'), 'bot-aaa|pj11111111');
  assert.deepEqual(splitPair('bot-aaa|pj11111111'), { botId: 'bot-aaa', projectId: 'pj11111111' });
  assert.equal(splitPair('bot-aaa'), null);
  assert.equal(splitPair('|pj11111111'), null);
  assert.equal(splitPair(''), null);
});

test('a conversation is remembered per (bot, project) pair, and found by its session', () => {
  const sessions = createProjectSessions(dirOf());
  assert.equal(sessions.get('b1', 'p1'), '', 'none until one is set');
  sessions.set('b1', 'p1', 'session-a');
  sessions.set('b1', 'p2', 'session-b');
  sessions.set('b2', 'p1', 'session-c');
  assert.equal(sessions.get('b1', 'p1'), 'session-a');
  assert.equal(sessions.get('b1', 'p2'), 'session-b', 'the same bot has a different conversation per project');
  assert.deepEqual(sessions.bySession('session-b'), { botId: 'b1', projectId: 'p2' });
  assert.equal(sessions.bySession('session-zzz'), null);
  assert.deepEqual(sessions.ofBot('b1'), [
    { projectId: 'p1', sessionId: 'session-a' },
    { projectId: 'p2', sessionId: 'session-b' },
  ]);
  assert.deepEqual(sessions.ofProject('p1'), [
    { botId: 'b1', sessionId: 'session-a' },
    { botId: 'b2', sessionId: 'session-c' },
  ]);
});

test('setting the same pair again replaces it, and an empty id removes it', () => {
  const sessions = createProjectSessions(dirOf());
  sessions.set('b1', 'p1', 'session-a');
  sessions.set('b1', 'p1', 'session-b');
  assert.equal(sessions.get('b1', 'p1'), 'session-b');
  assert.equal(sessions.bySession('session-a'), null, 'the old conversation is no longer this pair');
  sessions.set('b1', 'p1', '');
  assert.equal(sessions.get('b1', 'p1'), '');
  assert.equal(sessions.size(), 0);
});

test('a bot going away drops its conversations; a project going away drops its own', () => {
  const dir = dirOf();
  const sessions = createProjectSessions(dir);
  sessions.set('b1', 'p1', 's1');
  sessions.set('b1', 'p2', 's2');
  sessions.set('b2', 'p1', 's3');
  assert.equal(sessions.forgetBot('b1'), 2);
  assert.deepEqual(sessions.ofBot('b1'), []);
  assert.deepEqual(sessions.ofProject('p1'), [{ botId: 'b2', sessionId: 's3' }], 'the other bot stays');
  assert.equal(sessions.forgetProject('p1'), 1);
  assert.equal(sessions.size(), 0);
});

test('prune drops pairs whose bot or project is gone, so a deleted pair cannot come back', () => {
  const sessions = createProjectSessions(dirOf());
  sessions.set('b1', 'p1', 's1');
  sessions.set('b1', 'p2', 's2');
  sessions.set('b2', 'p1', 's3');
  const dropped = sessions.prune({ bot: (id) => id === 'b1', project: (id) => id === 'p1' });
  assert.equal(dropped, 2);
  assert.deepEqual(sessions.ofBot('b1'), [{ projectId: 'p1', sessionId: 's1' }]);
  assert.equal(sessions.size(), 1);
});

test('the file is private and read back by the next process', () => {
  const dir = dirOf();
  const sessions = createProjectSessions(dir);
  sessions.set('b1', 'p1', 'session-a');
  const raw = JSON.parse(readFileSync(join(dir, 'project-sessions.json'), 'utf8'));
  assert.equal(raw.version, 1);
  assert.equal(raw.sessions['b1|p1'], 'session-a');
  const again = createProjectSessions(dir);
  assert.equal(again.get('b1', 'p1'), 'session-a');
});

test('a file that is not JSON, or holds nonsense, starts empty instead of throwing', () => {
  const dir = dirOf();
  const sessions = createProjectSessions(dir);
  sessions.set('b1', 'p1', 'session-a');
  const file = join(dir, 'project-sessions.json');
  writeFileSync(file, 'not json at all');
  const broken = createProjectSessions(dir);
  assert.equal(broken.get('b1', 'p1'), '');

  writeFileSync(file, JSON.stringify({ version: 1, sessions: { 'no-separator': 'x', 'b2|p2': 42, 'b3|p3': 'ok' } }));
  const partial = createProjectSessions(dir);
  assert.equal(partial.get('b2', 'p2'), '', 'a non-string id is not a conversation');
  assert.equal(partial.get('b3', 'p3'), 'ok');
  assert.equal(partial.size(), 1);
});

test('change listeners hear writes and bulk removals', () => {
  const sessions = createProjectSessions(dirOf());
  const heard = [];
  const off = sessions.onChange((pair) => heard.push(pair));
  sessions.set('b1', 'p1', 's1');
  sessions.forgetBot('b1');
  assert.deepEqual(heard, [{ botId: 'b1', projectId: 'p1' }, null]);
  off();
  sessions.set('b1', 'p1', 's2');
  assert.equal(heard.length, 2, 'unsubscribed');
});
