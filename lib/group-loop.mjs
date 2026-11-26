/**
 * Whether a group chat should keep passing the microphone, and who gets it next (Bots 0.20).
 *
 * A group chat is a round: the person posts, members answer one at a time, and a member that
 * names another with `@` hands it on. That can spin forever — two bots thanking each other, or
 * both posting "nothing to do" — so a round stops on all of these:
 *
 * - nothing new: a post that is only an acknowledgement or a status line ("收到", "待命",
 *   "暂无任务"), or that repeats something already said in the round;
 * - nobody called: a post that names no member hands the microphone to no one;
 * - too deep: a chain of calls is bounded;
 * - too long: a round has a budget of replies, and a number of idle relays after which it
 *   pauses itself and says so.
 *
 * The words are the ones bots actually post, in both languages. A pure module: no I/O.
 *
 * @module @kadaliao/dsh-bots/lib/group-loop
 */

/** Reply budget for one round: past this, the round stops even if members keep calling each other. */
export const MAX_REPLIES = 12;

/** How far a chain of "@" calls may nest: the person's message is depth 0. */
export const MAX_DEPTH = 3;

/** Idle relays a round tolerates before it pauses itself (Bots 0.20): two enough-to-say-nothing turns. */
export const IDLE_LIMIT = 2;

/** A post longer than this is never treated as an acknowledgement: it says something. */
export const IDLE_TEXT_MAX = 45;

/** Acknowledgements: a turn that did nothing and says so. */
const ACK_WORDS = [
  '收到', '好的', '好', '明白', '明白了', '了解', '了解了', '没问题', '谢谢', '多谢', '感谢', '辛苦了', '辛苦',
  '不客气', '不用谢', '完毕', '完成', '好嘞', '行', '可以', '赞同', '同意', '对',
  'ok', 'okay', 'got it', 'understood', 'noted', 'thanks', 'thank you', "you're welcome", 'welcome',
  'np', 'no problem', 'roger', 'ack', 'done', 'all good', 'sounds good', 'agreed', 'agree',
];

/**
 * Status posts: a member saying there is nothing for it right now. Unchecked, a group answers
 * itself with these until the person writes again.
 */
const STATUS_WORDS = [
  '(?:收口)?(?:当前|目前|今日|今天)*(?:暂无|没有|无)+(?:待办|任务|新进展|新内容|进展|动作|变化|安排)',
  '待命', '保持待命', '继续待命', '原地待命', '静候', '静候下一步', '静候指令', '等候指令',
  '等待指令', '等待指示', '等待下一步', '等待安排', '等待新任务', '无事可做', '空转',
  'standby', 'standing by', 'idle', 'nothing (?:pending|to do|new)',
  'no pending (?:tasks?|work)', 'no new (?:work|tasks?|progress|updates?)',
  'no changes?', 'no updates?', 'waiting for (?:instructions?|the next steps?)',
];

const esc = (s) => String(s ?? '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** The words above as one anchored expression: a body made only of them (or nothing) is idle. */
const IDLE_ONLY = new RegExp(`^(?:(?:${[...ACK_WORDS.map(esc), ...STATUS_WORDS].join('|')})(?:[\\s，,、。.!！~～：:；;]+|$))+$`, 'i');

/** Punctuation and quoting, which carry nothing: what is left is the words themselves. */
const NOISE = /[\s，,、。.!！?？;；:：'"“”‘’()（）[\]【】~～-]+/g;

/**
 * A post with the names taken out, lowercased: the part that can say something new. `handles`
 * are the group's members, by `@handle`; `@all` and its cousins go too.
 * @param {string} text
 * @param {string[]} [handles]
 */
export function bareBody(text, handles = []) {
  let out = String(text ?? '');
  for (const h of handles) {
    if (!h) continue;
    out = out.replace(new RegExp(`@${esc(h)}`, 'gi'), ' ');
  }
  return out.replace(/@(?:all|everyone|所有人|全体|大家)/gi, ' ').replace(NOISE, ' ').trim().toLowerCase();
}

/**
 * Whether `text` adds nothing to the round: only acknowledgements and status words, or the same
 * thing as one of `prior` (a repeat, or one swallowing the other once both say something). An
 * empty body counts — mentioning people with no words is a call, not a contribution.
 *
 * @param {string} text what a member posted
 * @param {string[]} [handles] the group's members, so `@name` is not mistaken for content
 * @param {string[]} [prior] the round's earlier posts, already reduced with `bareBody`
 */
export function isIdleText(text, handles = [], prior = []) {
  const norm = bareBody(text, handles);
  if (norm === '') return true;
  if (norm.length <= IDLE_TEXT_MAX && IDLE_ONLY.test(norm)) return true;
  return prior.some((p) => p !== '' && (p === norm || (p.length >= 8 && norm.length >= 8 && (p.includes(norm) || norm.includes(p)))));
}

/**
 * The members a post calls, in the order it names them: `@handle` or `@name`, whole words only,
 * so `@bo` does not call `@bob`. `@all`/`@everyone` calls everyone but the speaker.
 *
 * @param {string} text
 * @param {{id: string, handle?: string, name?: string}[]} members
 * @param {string} [speaker] the id of whoever posted, never called by its own post
 * @returns {{id: string, handle?: string, name?: string}[]}
 */
export function picksFrom(text, members = [], speaker = '') {
  const body = String(text ?? '');
  const all = /@(?:all|everyone|所有人|全体|大家)\b/i.test(body);
  const out = [];
  for (const m of members) {
    if (!m?.id || m.id === speaker) continue;
    const words = [m.handle, m.name].filter(Boolean);
    const named = words.some((w) => new RegExp(`@${esc(w)}(?![\\w-])`, 'i').test(body));
    if (named || all) out.push(m);
  }
  return out;
}

/**
 * What a round does now: keep going with `next`, or stop for `reason`.
 *
 * @param {{replies: number, depth: number, idleRelays: number, next?: {id: string}[]}} state
 * @returns {{go: boolean, next: {id: string}[], reason?: 'budget'|'depth'|'idle'|'nobody'}}
 */
export function stepOf({ replies = 0, depth = 0, idleRelays = 0, next = [] } = {}) {
  if (replies >= MAX_REPLIES) return { go: false, next: [], reason: 'budget' };
  if (idleRelays >= IDLE_LIMIT) return { go: false, next: [], reason: 'idle' };
  if (!next.length) return { go: false, next: [], reason: 'nobody' };
  if (depth >= MAX_DEPTH) return { go: false, next: [], reason: 'depth' };
  return { go: true, next };
}
