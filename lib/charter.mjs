/**
 * A project's charter (Bots 0.18.1): one Markdown file per project that says what the project is, who
 * does what, how they work together, and where its memory goes — the AGENTS.md of one project group.
 *
 * It is a real file, not a prompt constant: the person writes it, edits it, and keeps it in the
 * project's repository when they want it versioned with the code. Every conversation of the project
 * reads it — a bot's conversation there, and every task filed under it — so the cast works from the
 * same rules instead of each bot guessing from its persona.
 *
 * Where it lives: the project's `charter` path when set (a full path, or one relative to the project's
 * folder), else `<bots cache>/charters/<projectId>.md`. A project with no charter file yet simply has
 * none: nothing is created until the person writes one, so no project carries an empty document.
 *
 * @module @kadaliao/dsh-bots/lib/charter
 */

import { existsSync, mkdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join, normalize } from 'node:path';

/** The name a charter takes inside a project's folder, when the person keeps it with the code. */
export const CHARTER_FILE = 'CHARTER.md';
/** What a charter may hold, in characters: it is in the prompt of every conversation of the project. */
export const MAX_CHARTER = 16_000;
/** What the prompt shows of it before clipping (a huge charter still leaves room for the rest). */
export const PROMPT_CHARTER = 12_000;

/** `<bots cache>/charters/<projectId>.md`: where a project's charter lives unless it names a path. */
export const defaultCharterPath = (cacheDir, projectId) => join(cacheDir, 'charters', `${String(projectId ?? '')}.md`);

/**
 * The charter file of `project`: its own `charter` path when it names one (`~` expanded, a relative
 * path taken from the project's folder), else the default under the cache. '' when the project has
 * neither a path nor an id to name one by.
 * @param {{id?: string, dir?: string, charter?: string}} project
 * @param {{cacheDir?: string, home?: string}} [opts]
 */
export function charterPathOf(project, { cacheDir = '', home = '' } = {}) {
  const raw = String(project?.charter ?? '').trim();
  if (raw) {
    const expanded = raw === '~' ? home : raw.startsWith('~/') ? join(home, raw.slice(2)) : raw;
    const base = project?.dir && !isAbsolute(expanded) ? project.dir : '';
    return normalize(base ? join(base, expanded) : expanded).replace(/(.)\/+$/, '$1');
  }
  if (!project?.id || !cacheDir) return '';
  return defaultCharterPath(cacheDir, project.id);
}

/**
 * A charter's text, or '' when there is no file yet (not an error: most projects start with none).
 * A file that is there but cannot be read throws, so a permission problem never reads as "no charter".
 * @param {string} path
 */
export function readCharter(path) {
  if (!path) return '';
  let text = '';
  try {
    text = readFileSync(path, 'utf8');
  } catch (error) {
    if (error?.code === 'ENOENT') return '';
    throw new Error(`cannot read the project charter ${path} (${error?.code ?? error?.message ?? error})`, { cause: error });
  }
  // A leading BOM would show up in the prompt and confuse the heading match.
  return text.replace(/^\uFEFF/, '').slice(0, MAX_CHARTER);
}

/**
 * Write a charter (`''` removes the file: the project then has none). Goes through a temp file, so a
 * crash never leaves half a document.
 * @param {string} path
 * @param {string} text
 */
export function writeCharter(path, text) {
  if (!path) throw new Error('this project has no place for a charter');
  const body = String(text ?? '');
  if (body.length > MAX_CHARTER) throw new Error(`a project charter is at most ${MAX_CHARTER} characters; this one is ${body.length}`);
  if (!body.trim()) {
    try {
      unlinkSync(path);
    } catch (error) {
      if (error?.code !== 'ENOENT') throw new Error(`cannot remove the project charter ${path} (${error?.code ?? error?.message ?? error})`, { cause: error });
    }
    return '';
  }
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(`${path}.tmp`, body, { encoding: 'utf8' });
  renameSync(`${path}.tmp`, path);
  return body;
}

/** Whether a charter file is there. */
export const hasCharter = (path) => Boolean(path) && existsSync(path);

/**
 * The charter a new project starts from (Bots 0.18.1): the three things the person asked it to define —
 * who does what, how they work together, where the memory goes — as headings to fill in.
 * @param {{key: string, name: string, members?: {handle: string, name: string}[]}} project
 * @param {'zh'|'en'} [lang]
 */
export function charterTemplate(project, lang = 'en') {
  const key = String(project?.key ?? 'PRJ');
  const cast = (project?.members ?? []).filter(Boolean);
  const list = cast.length ? cast.map((b, i) => `- @${b.handle} — ${b.name}${i === 0 ? (lang === 'zh' ? '（负责人）' : ' (lead)') : ''}`).join('\n') : lang === 'zh' ? '- （还没有成员：先加入项目成员）' : '- (no cast yet: add the project members first)';
  if (lang === 'zh') {
    return `# ${project?.name ?? key} · 项目章程

> 这份文件是这个项目的章程，项目里的每个 bot 和它的每个任务都会读到。
> 写清楚"谁负责什么""怎么配合""记住的东西放哪儿"，它们就照这个来，不用每次重新交代。

## 一、这是什么项目

（一句话说清：做什么、给谁用、什么算做完了。）

## 二、角色职责

${list}

对照上面的人，逐个写清楚：
- **负责人**：统筹整个项目——任务安排、进度把控、风险管控，以及所有统筹相关的事。
- 其余每个角色：负责哪一块、交付什么、哪些事不归它管。

## 三、协作机制

- 谁向谁汇报，中间要不要经过负责人。
- 什么情况必须停下来问人，什么情况自己决定。
- 交付的形式（文件、链接、卡片）放在哪。
- 有分歧时怎么定。

## 四、记忆的存储位置

- 关于**这个项目**的事，写进项目记忆（\`memory_save\` 的 \`scope: "project"\`），它会自动落到 ${key}。
- **不要**写进 bot 自己的笔记或团队共享笔记：那些跟着 bot 去别的项目。
- 需要进版本库的长文（方案、接口、决策记录）写进项目目录里的文件，不要塞进记忆。

## 五、当前状态

（想让人一眼看出做到哪了，就写在这里；日常进度以看板上的卡片为准。）
`;
  }
  return `# ${project?.name ?? key} · Project charter

> This file is the charter of this project. Every bot in it, and every task filed under it, reads it.
> Write down who does what, how they work together, and where the memory goes, and they will work from
> that instead of being told again each time.

## 1. What this project is

(One paragraph: what it is, who it is for, what counts as done.)

## 2. Roles

${list}

For each of them, write down:
- **The lead**: runs the project — who does what, the schedule, the risks, and everything else that is
  about keeping it on track.
- Everyone else: the part it owns, what it delivers, and what is not its job.

## 3. How they work together

- Who reports to whom, and whether that goes through the lead.
- What must stop and ask the person, and what they decide themselves.
- Where the deliverables go (files, links, cards).
- How a disagreement is settled.

## 4. Where the memory goes

- What concerns **this project** goes in the project memory (\`memory_save\` with \`scope: "project"\`),
  which lands on ${key} by itself.
- Do **not** put it in a bot's own notes or the shared team notes: those follow the bot into every project.
- Long documents that belong in version control (designs, APIs, decision records) go in the project's
  folder as files, not in memory.

## 5. Where it stands

(Write the current state here if you want it in one look; day-to-day progress stays on the board.)
`;
}
