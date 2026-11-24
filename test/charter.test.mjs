import assert from 'node:assert/strict';
import test from 'node:test';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { charterPathOf, charterTemplate, CHARTER_FILE, defaultCharterPath, hasCharter, MAX_CHARTER, readCharter, writeCharter } from '../lib/charter.mjs';

const dirOf = () => mkdtempSync(join(tmpdir(), 'bots-charter-'));

test('a charter defaults to the cache, by project id', () => {
  const cache = dirOf();
  const path = charterPathOf({ id: 'pj11111111' }, { cacheDir: cache });
  assert.equal(path, join(cache, 'charters', 'pj11111111.md'));
  assert.equal(charterPathOf({ id: 'pj11111111' }, { cacheDir: cache }), defaultCharterPath(cache, 'pj11111111'));
  assert.equal(charterPathOf({}, { cacheDir: cache }), '', 'no project, no place');
  assert.equal(charterPathOf({ id: 'pj11111111' }), '', 'no cache dir to fall back on');
});

test('a project can name its own charter: a full path, one under its folder, or ~', () => {
  const home = dirOf();
  const folder = join(home, 'code', 'app');
  mkdirSync(folder, { recursive: true });
  // A bare name sits beside the project's folder, which is how it gets committed with the code.
  assert.equal(charterPathOf({ id: 'pj11111111', dir: folder, charter: CHARTER_FILE }, { cacheDir: dirOf(), home }), join(folder, CHARTER_FILE));
  assert.equal(charterPathOf({ id: 'pj11111111', dir: folder, charter: 'docs/CHARTER.md' }, { cacheDir: dirOf(), home }), join(folder, 'docs', 'CHARTER.md'));
  assert.equal(charterPathOf({ id: 'pj11111111', charter: '~/notes/charter.md' }, { cacheDir: dirOf(), home }), join(home, 'notes', 'charter.md'));
  const absolute = join(home, 'elsewhere', 'CHARTER.md');
  assert.equal(charterPathOf({ id: 'pj11111111', dir: folder, charter: absolute }, { cacheDir: dirOf(), home }), absolute, 'a full path wins');
});

test('a charter that is not there yet reads as none, and the file is not created by reading', () => {
  const cache = dirOf();
  const path = charterPathOf({ id: 'pj22222222' }, { cacheDir: cache });
  assert.equal(readCharter(path), '');
  assert.equal(hasCharter(path), false);
  assert.equal(existsSync(path), false, 'reading never writes');
});

test('writing a charter makes the folders, and reading it back gives the same text', () => {
  const cache = dirOf();
  const path = charterPathOf({ id: 'pj33333333' }, { cacheDir: cache });
  const text = '# Milk tea caffeine log\n\n## Roles\n- @pm leads.\n';
  assert.equal(writeCharter(path, text), text);
  assert.equal(hasCharter(path), true);
  assert.equal(readCharter(path), text);
  assert.equal(readFileSync(path, 'utf8'), text, 'the file is exactly what was written');
});

test('an empty charter removes the file, so a project carries no empty document', () => {
  const cache = dirOf();
  const path = charterPathOf({ id: 'pj44444444' }, { cacheDir: cache });
  writeCharter(path, '# Something');
  assert.equal(writeCharter(path, '   \n\n '), '');
  assert.equal(existsSync(path), false);
  assert.equal(readCharter(path), '', 'and it reads as none again');
  writeCharter(path, '# Again');
  assert.equal(readCharter(path), '# Again', 'writing it again works after a removal');
});

test('a charter keeps a leading byte-order mark out of what the bots read', () => {
  const dir = dirOf();
  const path = join(dir, 'CHARTER.md');
  writeFileSync(path, `\uFEFF# With a BOM\n`);
  assert.equal(readCharter(path), '# With a BOM\n');
});

test('a charter longer than the limit is refused, and one too long on disk is clipped', () => {
  const cache = dirOf();
  const path = charterPathOf({ id: 'pj55555555' }, { cacheDir: cache });
  assert.throws(() => writeCharter(path, 'x'.repeat(MAX_CHARTER + 1)), /at most 16000 characters/);
  mkdirSync(join(cache, 'charters'), { recursive: true });
  writeFileSync(path, 'y'.repeat(MAX_CHARTER + 500));
  assert.equal(readCharter(path).length, MAX_CHARTER, 'a hand-written file is clipped, not refused');
});

test('a charter that cannot be read is an error, never read as "no charter"', () => {
  const dir = dirOf();
  // A directory where the file should be: reading it fails for a reason other than ENOENT.
  const path = join(dir, 'CHARTER.md');
  mkdirSync(path);
  assert.throws(() => readCharter(path), /cannot read the project charter/);
});

test('the template names the cast, the lead, and where the memory goes', () => {
  const project = { key: 'NAICHA', name: '奶茶咖啡因记录', members: [{ handle: 'pm', name: '项目经理' }, { handle: 'arch', name: '架构师' }] };
  const zh = charterTemplate(project, 'zh');
  assert.match(zh, /^# 奶茶咖啡因记录 · 项目章程/);
  assert.match(zh, /@pm — 项目经理（负责人）/);
  assert.match(zh, /@arch — 架构师/);
  assert.match(zh, /角色职责/);
  assert.match(zh, /协作机制/);
  assert.match(zh, /记忆的存储位置/);
  assert.match(zh, /scope: "project"/);
  assert.match(zh, /NAICHA/);

  const en = charterTemplate(project, 'en');
  assert.match(en, /^# 奶茶咖啡因记录 · Project charter/);
  assert.match(en, /@pm — 项目经理 \(lead\)/);
  assert.match(en, /## 2\. Roles/);
  assert.match(en, /## 4\. Where the memory goes/);
});

test('the template works for a project with no cast yet', () => {
  const zh = charterTemplate({ key: 'EMPTY', name: 'Empty' }, 'zh');
  assert.match(zh, /还没有成员/);
  const en = charterTemplate({ key: 'EMPTY', name: 'Empty' }, 'en');
  assert.match(en, /no cast yet/);
});
