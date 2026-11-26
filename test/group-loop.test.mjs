import test from 'node:test';
import assert from 'node:assert/strict';
import { bareBody, isIdleText, picksFrom, stepOf, IDLE_LIMIT, MAX_DEPTH, MAX_REPLIES } from '../lib/group-loop.mjs';

const CAST = [
  { id: 'a', handle: 'atlas', name: 'Atlas' },
  { id: 'b', handle: 'bob', name: 'Bob' },
  { id: 'c', handle: 'bo', name: 'Bo' },
];

test('a body keeps only its words: names, @all and punctuation go', () => {
  assert.equal(bareBody('@bob 收到，谢谢！', ['bob']), '收到 谢谢');
  assert.equal(bareBody('@all 大家看下这个方案', ['bob']), '大家看下这个方案');
  assert.equal(bareBody('  ', ['bob']), '');
});

test('nothing new: acknowledgements, status lines, and repeats stop the round', () => {
  // Acknowledgements, alone or strung together, with the names taken out.
  assert.equal(isIdleText('收到', ['bob']), true);
  assert.equal(isIdleText('@bob 收到，待命', ['bob']), true, 'a call with an ack is still nothing new');
  assert.equal(isIdleText('好嘞，明白！', ['bob']), true);
  assert.equal(isIdleText('Thanks, noted.', ['bob']), true);
  // Status posts: the ones a group spins on.
  assert.equal(isIdleText('暂无待办', ['bob']), true);
  assert.equal(isIdleText('当前没有新进展，等待指令', ['bob']), true);
  assert.equal(isIdleText('保持待命', ['bob']), true);
  assert.equal(isIdleText('Nothing pending, standing by', ['bob']), true);
  // An empty body: a post that only names people.
  assert.equal(isIdleText('@bob', ['bob']), true);
  // Something said is not idle, even when it is short.
  assert.equal(isIdleText('周三上线', ['bob']), false);
  assert.equal(isIdleText('这个方案我反对，成本太高', ['bob']), false);
  // A long post is never an acknowledgement, whatever it starts with.
  assert.equal(isIdleText(`收到，${'详细说明'.repeat(12)}`, ['bob']), false);
  // A repeat of something already said in the round.
  assert.equal(isIdleText('方案 A 的成本更高一些', ['bob'], ['方案 a 的成本更高一些']), true);
  assert.equal(isIdleText('方案 A 的成本更高一些，而且慢', ['bob'], ['方案 a 的成本更高一些']), true, 'one swallows the other');
  assert.equal(isIdleText('周三上线', ['bob'], ['周四上线']), false);
});

test('a post calls the members it names, whole words only, never its own speaker', () => {
  assert.deepEqual(picksFrom('@bob 你看下', CAST, 'a').map((m) => m.id), ['b']);
  assert.deepEqual(picksFrom('@Bob 你看下', CAST, 'a').map((m) => m.id), ['b'], 'a handle is case-insensitive');
  assert.deepEqual(picksFrom('@bo 你来', CAST, 'a').map((m) => m.id), ['c'], '@bo does not call @bob');
  assert.deepEqual(picksFrom('@atlas 自己说', CAST, 'a').map((m) => m.id), [], 'a member does not call itself');
  assert.deepEqual(picksFrom('@all 开会', CAST, 'b').map((m) => m.id), ['a', 'c'], '@all calls everyone but the speaker');
  assert.deepEqual(picksFrom('@bob 和 @atlas 一起看', CAST, 'c').map((m) => m.id), ['a', 'b'], 'in the order named');
  assert.deepEqual(picksFrom('没有点名', CAST, 'a'), []);
});

test('a round stops at its budget, its depth, its idle posts, and when nobody is called', () => {
  assert.deepEqual(stepOf({ replies: 0, depth: 0, idleRelays: 0, next: [{ id: 'b' }] }), { go: true, next: [{ id: 'b' }] });
  assert.deepEqual(stepOf({ replies: MAX_REPLIES, next: [{ id: 'b' }] }), { go: false, next: [], reason: 'budget' });
  assert.deepEqual(stepOf({ replies: 1, depth: MAX_DEPTH, next: [{ id: 'b' }] }), { go: false, next: [], reason: 'depth' });
  assert.deepEqual(stepOf({ replies: 1, idleRelays: IDLE_LIMIT, next: [{ id: 'b' }] }), { go: false, next: [], reason: 'idle' });
  assert.deepEqual(stepOf({ replies: 1, next: [] }), { go: false, next: [], reason: 'nobody' });
});
