import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdirSync, mkdtempSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { CARD_REF_RE, cleanDir, cleanKey, createProjects, MAX_MEMBERS, PROJECT_ID_RE, suggestKey } from '../lib/projects.mjs';

const dirOf = () => mkdtempSync(join(tmpdir(), 'bots-projects-'));

test('a key is cleaned to capitals and digits, and suggested from a name', () => {
  assert.equal(cleanKey(' web-2 '), 'WEB2');
  assert.equal(cleanKey('2fast'), 'FAST', 'a key starts with a letter');
  // A key is an English word now, not a three-letter prefix (Bots 0.18.5).
  assert.equal(cleanKey('abcdefgh'), 'ABCDEFGH');
  assert.equal(cleanKey('x'.repeat(40)).length, 30, 'up to 30 characters');
  assert.equal(suggestKey('One-person company'), 'OPC', 'initials of several words');
  assert.equal(suggestKey('Website'), 'WEBSITE', 'one English word: the word itself, not a prefix');
  assert.equal(suggestKey('内容工作室'), 'NRGZS');
  assert.equal(suggestKey('One-person company', ['OPC']), 'OPC2');
  assert.equal(suggestKey('X'), 'XPR');
  assert.equal(suggestKey('!!'), 'PRJ');
  assert.match('OPC-12', CARD_REF_RE);
  assert.match('MILKTEA-12', CARD_REF_RE, 'a word key numbers cards the same way');
  assert.doesNotMatch('OPC-0', CARD_REF_RE);
  assert.doesNotMatch('opc-12', CARD_REF_RE);
});

test('a folder is a full path to a folder that exists; ~ is the home folder', () => {
  const home = dirOf();
  mkdirSync(join(home, 'code', 'app'), { recursive: true });
  writeFileSync(join(home, 'note.txt'), 'x');
  assert.equal(cleanDir('~/code/app/', home), join(home, 'code', 'app'));
  assert.equal(cleanDir('', home), '');
  assert.throws(() => cleanDir('code/app', home), /must be a full path/);
  assert.throws(() => cleanDir('~/nope', home), /there is no folder/);
  assert.throws(() => cleanDir('~/note.txt', home), /is a file, not a folder/);
  assert.throws(() => cleanDir('/', home), /cannot be the whole disk/);
});

test('projects are created with a suggested key, numbered cards, checked fields, and persist', () => {
  const dir = dirOf();
  const home = dirOf();
  let now = 1000;
  const projects = createProjects(dir, { now: () => now, home });
  const p = projects.create({ name: '  One-person   company ', brief: 'Ship weekly.', dir: home });
  assert.match(p.id, PROJECT_ID_RE);
  assert.deepEqual([p.key, p.name, p.brief, p.dir, p.last], ['OPC', 'One-person company', 'Ship weekly.', home, 0]);
  assert.throws(() => projects.create({ name: 'Other', key: 'opc' }), /the key OPC is taken/);
  assert.throws(() => projects.create({ name: 'Other', key: '1' }), /a group chat key is an English word/);
  assert.throws(() => projects.create({ name: '  ' }), /a project needs a name/);
  assert.throws(() => projects.create({ name: 'Other', dir: join(home, 'missing') }), /there is no folder/);
  assert.equal(projects.get('opc').id, p.id, 'found by key in any case');
  assert.equal(projects.get(p.id).key, 'OPC');
  assert.equal(projects.take(p.id), 1);
  assert.equal(projects.take('OPC'), 2);
  now = 2000;
  const web = projects.update(p.id, { key: 'web', dir: '' });
  assert.deepEqual([web.key, web.dir, web.updatedAt, web.name], ['WEB', '', 2000, 'One-person company']);
  const second = projects.create({ name: 'Research desk' });
  assert.equal(second.key, 'RD');
  assert.deepEqual(projects.list().map((x) => x.key), ['RD', 'WEB']);
  // Read back by the next process; numbers go on where they were.
  const again = createProjects(dir, { home });
  assert.equal(again.get('WEB').last, 2);
  assert.equal(again.take('WEB'), 3);
  assert.equal(statSync(join(dir, 'projects.json')).mode & 0o777, 0o600);
  assert.equal(again.remove('RD').id, second.id);
  assert.equal(again.get('RD'), undefined);
});

test('a project\'s repository is owner/repo, or kept with its server on GitHub Enterprise', () => {
  const projects = createProjects(dirOf(), { home: dirOf() });
  assert.equal(projects.create({ name: 'Site', repo: 'https://github.com/acme/site.git' }).repo, 'acme/site');
  const ghe = projects.create({ name: 'Portal', repo: 'https://GHE.corp.example/team/portal/issues' });
  assert.equal(ghe.repo, 'ghe.corp.example/team/portal');
  assert.throws(() => projects.create({ name: 'Other', repo: 'git@ghe.corp.example:team/portal.git' }), /ghe\.corp\.example\/team\/portal belongs to project PORTAL already/);
  assert.throws(() => projects.create({ name: 'Other', repo: 'not a repo' }), /GitHub Enterprise/);
  assert.equal(projects.update(ghe.id, { repo: '' }).repo, '');
});

test('a projects file that is not JSON is set aside, and the next write starts afresh', () => {
  const dir = dirOf();
  writeFileSync(join(dir, 'projects.json'), '{oops');
  const projects = createProjects(dir);
  assert.deepEqual(projects.list(), []);
  assert.ok(readdirSync(dir).some((f) => f.startsWith('projects.json.corrupt-')));
  projects.create({ name: 'Fresh' });
  assert.equal(createProjects(dir).list().length, 1);
});

test('a project has a cast: bots join, leave, and the same bot staffs several projects', () => {
  const projects = createProjects(dirOf(), { home: dirOf() });
  const mini = projects.create({ name: 'Mini app' });
  const android = projects.create({ name: 'Android app' });
  assert.deepEqual(mini.members, [], 'a new project starts with no cast');

  projects.addMember(mini.id, 'bot-arch');
  projects.addMember(mini.id, 'bot-devc');
  projects.addMember(mini.id, 'bot-arch');
  assert.deepEqual(projects.get(mini.id).members, ['bot-arch', 'bot-devc'], 'no duplicates; order kept');
  assert.equal(projects.get(mini.id).members[0], 'bot-arch', 'the first added leads');

  // The same architect staffs the Android app too (what the feature is for).
  projects.addMember(android.id, 'bot-arch');
  assert.deepEqual(projects.ofBot('bot-arch').map((p) => p.key), ['AA', 'MA'], 'both projects, by key');
  assert.deepEqual(projects.ofBot('bot-nobody'), []);

  projects.removeMember(mini.id, 'bot-arch');
  assert.deepEqual(projects.ofBot('bot-arch').map((p) => p.key), ['AA'], 'left the mini-app only');

  // A bot created through the panel's project form can arrive with a cast already.
  const web = projects.create({ name: 'Web site', members: ['bot-arch', 'bot-pm'] });
  assert.deepEqual(web.members, ['bot-arch', 'bot-pm']);
  assert.deepEqual(projects.update(web.id, { members: ['bot-pm'] }).members, ['bot-pm'], 'the whole cast is replaceable');
});

test('a project refuses an unknown bot, and a deleted bot leaves every cast', () => {
  const alive = new Set(['bot-a', 'bot-b']);
  const projects = createProjects(dirOf(), { home: dirOf(), validBot: (id) => alive.has(id) });
  const p = projects.create({ name: 'Site' });
  assert.throws(() => projects.addMember(p.id, 'bot-ghost'), /no bot with id bot-ghost/);
  projects.addMember(p.id, 'bot-a');
  projects.addMember(p.id, 'bot-b');
  assert.deepEqual(projects.get(p.id).members, ['bot-a', 'bot-b']);

  // The bot goes away: the project drops it, and so does the next process that reads the file.
  const left = projects.forgetBot('bot-a');
  assert.deepEqual(left.map((x) => x.key), ['SITE']);
  assert.deepEqual(projects.get(p.id).members, ['bot-b'], 'the next member leads now');
  alive.delete('bot-b');
  assert.equal(projects.list()[0] === undefined, false);
  assert.deepEqual(projects.list()[0].members, ['bot-b'], 'a stored member is kept while the store still knows it');
});

test('a stored cast is cleaned on load: duplicates, unknowns and a too-long list', () => {
  const dir = dirOf();
  writeFileSync(
    join(dir, 'projects.json'),
    JSON.stringify({
      version: 1,
      projects: [
        { id: 'pj11111111', key: 'OPC', name: 'Dirty', members: ['b1', 'b1', '', null, 'b2'] },
        { id: 'pj22222222', key: 'BIG', name: 'Huge', members: Array.from({ length: 40 }, (_, i) => `bot-${i}`) },
      ],
    }),
  );
  const projects = createProjects(dir);
  assert.deepEqual(projects.get('OPC').members, ['b1', 'b2'], 'duplicates and empties went');
  assert.equal(projects.get('BIG').members.length, MAX_MEMBERS, 'the list is capped');
});

test('a project without a members field (from before 0.17.5) loads with an empty cast', () => {
  const dir = dirOf();
  writeFileSync(join(dir, 'projects.json'), JSON.stringify({ version: 1, projects: [{ id: 'pj33333333', key: 'OLD', name: 'Old one' }] }));
  const projects = createProjects(dir);
  assert.deepEqual(projects.get('OLD').members, [], 'no migration needed');
  projects.addMember('OLD', 'bot-x');
  assert.deepEqual(createProjects(dir).get('OLD').members, ['bot-x']);
});
