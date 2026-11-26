import test from 'node:test';
import assert from 'node:assert/strict';
import { bankOf, BLOCK_MAX, memoryBlock, recallMemories, recallUrl } from '../lib/hindsight-recall.mjs';

const okResponse = (body) => ({ ok: true, json: async () => body });
const badResponse = (status) => ({ ok: false, status, json: async () => ({}) });

test('a group bank is named after its key, and its recall has one address', () => {
  assert.equal(bankOf('MILKTEA'), 'bots::chat::MILKTEA');
  assert.equal(bankOf('  '), 'bots::chat::');
  assert.equal(recallUrl('http://127.0.0.1:8888/', 'bots::chat::A'), 'http://127.0.0.1:8888/v1/default/banks/bots%3A%3Achat%3A%3AA/memories/recall');
});

test('the recall endpoint is asked once, and its observations come back cleaned', async () => {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push([url, JSON.parse(init.body)]);
    return okResponse({ results: [{ text: '  定价按美元  结算 ' }, { text: '定价按美元 结算' }, { text: '每周三发一篇' }, { text: '' }] });
  };
  const got = await recallMemories({ apiUrl: 'http://h:1', bankId: 'bots::chat::K', query: ' 定价 ', fetchImpl });
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0][1].query, '定价', 'the query is trimmed');
  assert.deepEqual(got.map((m) => m.text), ['定价按美元 结算', '每周三发一篇'], 'blank and repeated lines dropped');
});

test('a service that is down, refuses, or is slow reads as no memories — never an error', async () => {
  assert.deepEqual(await recallMemories({ apiUrl: 'http://h:1', bankId: 'b', query: 'q', fetchImpl: async () => badResponse(500) }), []);
  assert.deepEqual(await recallMemories({ apiUrl: 'http://h:1', bankId: 'b', query: 'q', fetchImpl: async () => { throw new Error('down'); } }), []);
  assert.deepEqual(await recallMemories({ apiUrl: '', bankId: 'b', query: 'q', fetchImpl: async () => okResponse({}) }), []);
  assert.deepEqual(await recallMemories({ apiUrl: 'http://h:1', bankId: 'b', query: '   ', fetchImpl: async () => okResponse({}) }), []);
});

test('the block says the memory is shared, and stays within its budget', () => {
  assert.equal(memoryBlock([]), '');
  const short = memoryBlock([{ text: '定价按美元结算' }], { key: 'MILK' });
  assert.match(short, /What this group remembers/);
  assert.match(short, /bots::chat::MILK/);
  assert.match(short, /Every member of this group chat reads the same memories/);
  assert.match(short, /^- 定价按美元结算$/m);
  // A long memory list is cut at the budget instead of crowding the prompt out.
  const many = Array.from({ length: 40 }, (_, i) => ({ text: `第 ${i} 条：很长的一条记忆内容，用来把预算撑满看看会怎么处理。` }));
  const block = memoryBlock(many, { key: 'K' });
  assert.ok(block.length <= BLOCK_MAX + 8, `block stays bounded (${block.length})`);
  assert.match(block, /^- 第 0 条/m);
  assert.doesNotMatch(block, /^- 第 39 条/m);
});
