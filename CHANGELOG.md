# Changelog

English | [简体中文](CHANGELOG.zh-CN.md)

What changed in each version of Bots, newest first, and what to do after upgrading. Bots tells you when a new
version is out ([Updates](README.md#updates)).

## 0.19.2 — 2026-11-26

- **Picking a lead no longer shuffles the cast.** The switch used to move that bot to the front of the array, so the
  whole column re-ordered and it looked like nothing happened. The rows stay in the order the bots were added; the
  switch only changes who leads, and the lead is put first when the cast is saved (which is how the data carries it).
- If the lead is removed from the group, the lead passes to the first bot left, so there is never none.
- The hint under the cast now says "pick it with the switch" instead of "the first one picked leads".

## 0.19.1 — 2026-11-25

- **Fixed: a group chat never received the answer.** The bot's reply was logged without its `project`, so it landed in
  that bot's own workspace conversation and the group kept only what the person said. A reply now carries the group it
  was produced in.
- **A member can be named with `@` inside a group chat.** `@someone` sends that message to that member and the page
  follows to their conversation; with no name it goes to the member whose conversation is open. The line under the
  composer lists who can be named.

## 0.19.0 — 2026-11-25

- **A group chat's lead can be picked now.** Under the cast picker each member has a **Lead** switch: turn it on and
  that bot leads. Before, the rule was "whichever bot was added first leads", which left nothing to choose; flipping
  the switch moves that bot to the front and the rest keep their order (the first member *is* the lead in the data).
- The lead's own switch is on and cannot be turned off: while the cast is not empty there is exactly one lead, never
  none.

## 0.18.9 — 2026-11-25

- **A group chat row in the rail now matches a team's row.** It used a lighter, smaller name; it shares the team
  header's style (same weight, spacing and count on the right), so the two read as the same level.
- **Each chat row carries an edit button**, like the pencil on a team's row: it opens that chat's form (name, key,
  cast, memory) straight from the list instead of going into the chat first.

## 0.18.8 — 2026-11-25

- **Group chats are listed in the rail itself, at the level of a team.** They used to be reachable only through the
  Groups view; the rail now opens with a **Group chats** block — one row each, name and cast size — and one click opens
  that chat. It sits beside the team headers, not under them.
- The search box filters them too; the rail shows the first 20, and the Groups view keeps the full list.

## 0.18.7 — 2026-11-25

- **Making a group chat no longer asks for a folder.** The **Folder** field and its **Choose folder…** button are gone
  from the form. A group chat never needed you to decide where files live: each one has its own folder under
  `<bots cache>/groups/<KEY>`, made when the group is, and the memory bank is bound to it.
- The folder still exists — a task has to run somewhere, and a bank is resolved by path — it is just not a field you
  fill in. Groups already in use keep the folder they had.

## 0.18.6 — 2026-11-25

- **A group chat key goes up to 50 characters.** The old 2–6 came from the key doubling as a card prefix, and the
  previous release's 30 was still tight; it is 50 letters or digits now, and the form's input allows it. Longer input
  is trimmed to 50 rather than refused.
- The key still numbers cards (`MILKTEA-12`) and names the bank (`bots::chat::KEY`), so both follow the longer key.

## 0.18.5 — 2026-11-25

- **One name: group chat.** The panel called the same thing a project and a project group; it is a **group chat**
  everywhere now — board, rail, form, charter and memory text alike.
- **The key is an English word.** No more "numbering prefix": 2–30 characters instead of 2–6, and a one-word name
  suggests the word itself (Milktea → MILKTEA) instead of its first three letters. Cards still read `KEY-12`.
- **The bank is made from the Key, and no folder has to be bound.** A new group chat binds `bots::chat::KEY` by
  default, and every group gets a folder of its own (`<bots cache>/groups/<KEY>`) that the bank is bound to — the
  person never picks one. Setting a folder of your own is still possible.

## 0.18.4 — 2026-11-25

- **A group can be bound to its own memory when you make or edit it.** The group form gained a **Memory** field:
  pick **Create a bank for this project** (named `bots::project::KEY`), pick an existing Hindsight bank, or leave it
  unbound — and that applies on save. The section comes from the **dsh-hindsight-manager** plugin, through its own
  same-origin API; with that plugin absent nothing about memory is drawn, so Bots stays usable on its own.
- A bank is bound by **folder**, so the field waits for one: it is disabled and says so until the group has a folder,
  and picking a bank without one is refused with the same explanation.
- The binding runs after the project is saved (it needs the key and folder). A refusal never loses the project: it is
  reported on its own and the group is still created.

## 0.18.3 — 2026-11-25

- **新建群聊 sits in the New menu, beside New team.** The button that makes a bot also makes a group chat now: it opens
  the groups page with the new-group form already up (name, folder, cast), and saving goes straight into the group.

## 0.18.2 — 2026-11-25

- **A group can be made from the groups page.** Before, the only way was the board's project dialog; the rail's list could
  only be read. The **Groups** page now has a **New project group** button (and one in the empty state), and it opens the
  group it just created; each row has an edit button too.
- The rail entry reads **Groups**, with Project groups as the page title.
- Deleting a project group removes the charter kept in the bots cache with it; a charter pointed into the project's own
  folder (`CHARTER.md`) is left exactly where it is.

## 0.18.1 — 2026-11-24

- **A project can have a charter of its own.** Its page gained a **Charter** pane: one Markdown file saying who does what,
  how the cast works together, and where the memory goes. Every conversation of the project, and every task filed under
  it, reads it — so editing it changes how the work is done. By default `~/.dsh/cache/bots/charters/<project id>.md`;
  with a folder set on the board it can live there as `CHARTER.md` and be committed with the code. **Fill from the
  cast** writes a starting skeleton; saving it empty removes it, so no project carries an empty document.
- New `bot_charter` tool: a bot may read and write the charter of the project it is in (read first — it is the
  person's file).
- A charter that cannot be read never fails a conversation; it is logged once.

## 0.18.0 — 2026-11-24

- **Project groups: a project is a standing cast, with a memory of its own.** A project used to decide only card numbers
  and a task folder; people belonged to teams, so one architect working on both the mini-app and the Android app had
  everything they noted read on both. A project now has members (the project form's **The cast**, or `bot_update`'s
  `projects` / `project`), and each member gets a **conversation of its own inside that project** that reads that
  project's memory only: `memory_save` with `scope: "project"` lands there without naming the project. The first member
  added leads it.
- Deleting a bot or a project archives those conversations; taking a bot off a project ends its conversation there and
  leaves the notes for whoever takes the work over.
- **A project has a page of its own**: **Projects** in the rail lists them, and opening one shows its cast (★ on the
  lead) beside the conversation with the member picked. Those messages stay in the project and never show in the bot's
  own conversation.
- `bot_list` shows which projects each bot staffs; `bot_create` and `bot_update` take `project` (join, or `!KEY` to
  leave) and `projects` (the whole list).
- The panel's project list shows the cast, with ★ on the lead.
- **Nothing to migrate**: a project written before this has no members, which reads as an empty cast, and
  `project-sessions.json` is made on first use.

## 0.17.4 — 2026-11-24

- **A chat no longer hears about other tasks.** When one task finished in its own chat and another failed in a Feishu
  topic, the dispatcher's answer in that topic spoke of both. The note it gets about a finished task now asks it to
  leave that task out of later answers, and a failed, stalled or reported task names the chat it came from, where
  only that task belongs.
- **News of a task from no chat stays in the panel.** A task with no chat of its own (a scheduled run with nowhere to
  report, say) whose report came in the same turn as a chat message sent the whole answer into that chat. It counts
  as the panel now: the chat gets its own answer with `bot_reply`, the rest stays in the panel, and a task opened in
  such a turn has to say which one it is for (`thread`: the chat, or `panel`).
- Plain text left over from a turn with the panel and a chat shows in the panel as the panel's answer once the chat
  has its answer; it used to be hidden.
- **Feishu images reach the bot.** An image message, and the images in a rich-text post, used to be dropped. The bot
  sees them now, like images attached in the panel, and the work it hands out carries them. An image it cannot read
  (no permission, over 20 MB) is left out and logged.
- Keenable Search is in the app catalog.

## 0.17.3 — 2026-11-24

- **Tells you when a new version is out.** A card in the bottom-right corner, one for all installed `@kadaliao/dsh-*`
  plugins; **Update** has Harness install the new version and puts the old one back if that fails. See
  [Updates](README.md#updates).

## 0.17.2 — 2026-11-23

- A message the dispatcher adds to a task it opened earlier shows in the chat as its own words marked **Added**, not
  as the task a second time.
- **Tool approvals in the panel.** When a bot or a task waits for Harness to approve a tool, the panel shows it with
  **Allow once** and **Reject**; the task says it waits for your approval, and the watchdog leaves it alone.
- **Add from Magpie**: the skills of Magpie's library on this machine, linked rather than copied.
- A task with no project works in its bot's own workspace.

## 0.17.1 — 2026-11-21

- After a restart, only tasks that were already working are taken up again.

## 0.17.0 — 2026-11-21

- **Images in the chat.** Attach, paste or drop images in a bot's chat, a thread or a task; the bot sees them, and work
  it hands on takes them along. `bot_send_message` takes `images`. See
  [The chat](README.md#the-chat-reply-to-a-message-to-open-a-thread).
- **Your own teams.** Make a team with your own name, description, colour and lead, or rename a hired one. See
  [Hire a whole team](README.md#hire-a-whole-team-in-one-click).
- **Team memory consolidation works on models that route by conversation** (OpenCode Go answered **Consolidate
  now** with `400 MissingSessionID`). Each consolidation call names a conversation of its own now.
- **With Harness's sidebar collapsed**, the window buttons no longer sit over the Bots title and the **New bot** button.

## 0.16.2 — 2026-11-21

- **Feishu messages come with their chat context.** To use it, add the permission `im:message:readonly` to your Feishu
  app (and `im:message.group_msg` for the earlier messages of a topic, a sensitive scope an admin approves), then
  publish a new version of the app in the developer console. Until then messages arrive as before, and the Harness log
  says once which permission is missing. See [Feishu / Lark](README.md#feishu--lark).
- Chat history forwarded to the bot in a private chat is read now; it used to be dropped without a word.
- Tasks opened from now on keep the chat message they came from (any chat app); tasks opened before stay as they were.

## 0.16.1 — 2026-11-19

- **A turn that fails says so.** When a bot's answer fails after Harness's retries (the model gateway down, say), a
  notice takes its place in the panel and in the chat it was for; the chat used to go quiet.
- **The rail fits many teams.** A team folds to one line, and the views below the list are one-line tiles, two to a
  line.

## 0.16.0 — 2026-11-19

- **Every team has a lead, listed first.** The one-person company gets a fifth bot, **Compass** (operations): it keeps
  the week's plan (`plan.md`), hands each part to the role that fits, and runs the team's inbox sweep, weekly
  numbers and market pulse. A one-person company you hired before is offered Compass once in the panel: **Add**
  hires it with those routines and removes your dispatcher's copies still as hired (an edited one stays, and the
  dispatcher hands its work to Compass); **No thanks** is not asked again. The content studio lists Quill first.
- Quill is **Quill 主编** and Memo **Memo 主笔** in Chinese, where the name is still as hired.
- **Teams for your own bots**: **Team** in **New bot** and on the **Profile**.
- **Memory**: shared notes, project memory, and a last day on dated notes. Nothing to migrate: your notes stay
  shared, and the nightly consolidation is told to move a note about one project into it and to drop notes that only
  record the state of work. Review **Team memory** once and delete what is out of date.
- **Projects**: **Choose folder…** for the folder; the GitHub repository may be on GitHub Enterprise.
- **GitHub Issues** watches a GitHub Enterprise server when its repositories are written as their addresses (one
  server per app).

## 0.15.0 — 2026-11-19

0.12, 0.13 and 0.14 were not published on their own: they came with this version.

- **Team leads.** The dispatcher hands a team's work to the bot that leads it, and the lead answers you once.
- Teams hired since 0.11.1 get their lead at the first start: Builder in the software squad, Quill in the content
  studio, Memo in the research desk (the bot with that handle). Taking it away on the bot's Profile sticks.
- Builder's persona and bio, and the content studio's **Plan this week** task, take their new words where they still
  read as hired; ones you edited stay as they are.

## 0.14.0 — 2026-11-19

- **Hand work out from GitHub issues.** A labelled issue becomes a card, and comments go both ways. Nothing to
  migrate: GitHub Issues is a new app, and projects have a new **GitHub repository** field.
- The board's four columns share the window's width.
- A `done` report that comes while your message to the task waits unread keeps the task open, so that message is
  answered too.
- A card you hand to a bot on the board reads on its task as asked by you.

## 0.13.0 — 2026-11-19

- **Name a card in a message to reach it.** A message that starts with a card's reference (`OPC-12 …`) goes to that
  card's task when it has one; to ask the dispatcher about the card instead, put the reference later in the message.
- **Cards that wait for others**: **Starts after** on the page of a card in To do.

## 0.12.0 — 2026-11-19

- **The board.** **Requests** is a board now: the same requests, in columns (To do, In progress, Waiting for you,
  Done) instead of groups. Nothing to migrate: your requests stay as they were, under no project, without numbers.
- **Projects.** Make them with **Projects** on the board when you want cards numbered and their tasks working in a
  folder; the dispatcher sees them at its next step. Requests from before can be filed under one from their page.
  Tasks under way keep working where they started; a task opened after you give a project a folder works there.
- File a card yourself from the board.

## 0.11.1 — 2026-11-19

- **Every team joins the one dispatcher.** Team templates have no lead any more (0.16 brought leads back), and teams
  you hired are brought along at the first start. Only what still reads exactly as it was hired changes; a persona,
  bio or scheduled task you edited stays as it is:
  - a lead that is your dispatcher (Atlas, Lead, Editor or Desk) keeps its name and becomes the front desk: its persona
    and bio are the dispatcher's, the skills of its lead role go, and an app of that role (Lead's GitHub) is turned
    off, its keys kept;
  - members get their current persona and bio (Forge asks you itself, Builder has Tester and Review check its change,
    Quill keeps the calendar…);
  - the team's routine (morning brief, weekly review, inbox sweep, numbers, market pulse, topic planning) is the
    dispatcher's, at the times it had; one the dispatcher already has by that name is not added twice.
- A lead that is not your dispatcher would only pass its messages on: the panel names it once and offers to remove it
  (its teammates stay, its routine is already the dispatcher's).
- New members and skills (the research desk's Memo, Builder's GitHub, Echo's deep-research) come when you hire the
  team again, which updates the members you have, their personas included.
- Hiring no longer asks whether the team's lead becomes the dispatcher: the team joins the one you have.

## 0.11.0 — 2026-11-18

- **Requests.** Everything you asked for is listed with how far it got. Nothing to do: 0.11 adds `needs.json` for
  them. Tasks from before the upgrade belong to no request; when you follow one up in a chat, your words name a
  request for it.
- **One way for the dispatcher to work.** Hands-on mode is gone, and there is no mode to pick: with a teammate the
  dispatcher routes, on its own it does the work itself. A team that had picked Hands-on switches to routing and sees
  the notice once; turn on the small jobs you want the dispatcher to do itself under its **Abilities**.
- **No empty answers.** With models that follow the prompt to the letter (GPT, say), the occasional `returned a
  completed response with no content` (a bot answered with nothing after a report, and its task failed) is gone.

## 0.10.2 — 2026-11-18

- Memory notes and the nightly digest are written in the language you write to the bots in.
- A consolidation may answer at greater length: a thinking model used to spend it all on reasoning and come back empty.
- The package lives in its own repository, [kadaliao/dsh-bots](https://github.com/kadaliao/dsh-bots).

## 0.10.1 — 2026-11-18

- The dispatcher puts no question cards to you, so it keeps answering: "ask me first" goes to the teammate with the
  work, and what the dispatcher must know itself it asks in a line of its reply.
- A teammate's message to the dispatcher goes into its conversation instead of opening a task for it.
- A note about a task that comes while the dispatcher is working waits for its turn to end, so it is not answered to
  you.

## 0.10.0 — 2026-11-17

- **Threads.** Replies quote what they answer, and each is answered in a thread forked at that message: it sees what
  came before, and nothing said in the main chat since. In a chat app, replying to one of the bot's messages makes a
  thread for messages sent since this version.
- The dispatcher no longer hands work to itself: work that needs a tool it does not have goes to a teammate.
- **Quit and reopen Harness** once after the upgrade. A page reload alone gives you the new page while Harness still
  runs the old Bots, and replies don't land in threads; a banner at the top of the panel says so until you reopen it.
- Nothing else to do: bots, tasks, memory, schedules, chat apps and pairings stay as they are; 0.10 adds
  `discussions.json` for threads.
- The messages of 0.9's topics show in the chat in the order they were said, with a link to each topic's thread under
  its first message; in one with a live task, what you write there still goes to the task.
- Messages from before the upgrade can be replied to: Bots finds the message's place in the conversation's log by its
  time and forks there. When it cannot (a very long conversation, or one that is gone), it forks at the
  conversation's latest turn and tells the bot that the chat may have gone on past that message.
- Threads use Harness's session fork; on a Harness without it, a reply says to update Harness first.

## 0.9.0 — 2026-11-17

- **The panel chat in topics**: every message is a topic, or joins one, and shows at once.
- **A task answers you itself**, in the topic or chat its request came from.
- Nothing to do: bots, tasks, memory, schedules, chat apps and pairings stay as they are. The timeline in
  `messages.jsonl` gains fields for topics; older messages stay in the main timeline.
- A task opened before the upgrade that came from a chat or the panel now answers the person itself when it
  reports, like new ones.
- The dispatcher in **Router** mode loses web search in its own conversation (it hands searches to a task); **Turn back
  on** under its **Abilities** gives it back.

## 0.8.0 — 2026-11-17

- **Tasks**: each piece of work handed out runs in a conversation of its own, and the dispatcher routes the work
  instead of doing it. Chat threads route to their tasks; `bot_reply`, `bot_recall` and `bot_ticket`; a watchdog for
  stuck tasks; tasks pick up after a restart. A bot's question shows as a card in the panel. Bots draw their own
  avatars.
- Bots, memory, scheduled tasks, topics, chat apps and pairings stay as they are. 0.8 adds `tickets.json` for tasks.
- A team that already had bots switches to **Router**: the dispatcher stops doing work itself and loses the
  tools listed under [The dispatcher as a router](README.md#the-dispatcher-as-a-router) in its own conversation, and
  work handed from one bot to another becomes a task. The Bots panel says so once, with **Open its profile** and
  **Got it**; the notice waits until the team has a bot besides the dispatcher. (From 0.8 to 0.10 the dispatcher's
  **Profile** could switch **How it works** back to **Hands-on**; 0.11 has no such choice.)
- Replies to chat apps follow the request they answer ([Chats and threads](README.md#chats-and-threads)); in 0.7 they
  went to the chat of the latest request.
- Thread history starts here: messages from before the upgrade belong to no thread, so reading a chat thread with
  `bot_recall` shows only what was said there since.
- In **Usage**, what 0.7 called tasks are runs now (**Runs**, **Recent runs**), with the same numbers. **By task**
  starts with the first task after the upgrade.

## 0.7.1 — 2026-11-17

- Dollar amounts stay amounts in bot replies (`$9 … $90` no longer reads as a formula).

## 0.7.0 — 2026-11-16

- Each bot on its own model, a usage view, topics that keep conversations from growing forever, and memory.

## 0.6.1 — 2026-11-16

- Up to 50 skills on at once, up to 200 kept.

## 0.6.0 — 2026-11-16

0.5.0 was not published on its own: it came with this version.

- Message the team from Feishu / Lark and Slack too.

## 0.5.0 — 2026-11-16

- Add skills from a local folder; no duplicate skills; the list of Harness skills scrolls.

## 0.4.0 — 2026-11-16

- Message the team from Telegram or Discord; apps show their logos.

## 0.3.0 – 0.3.3 — 2026-11-15

- The first release: Grok-style bot teams that message each other. Later patches kept the descriptions of a hired
  team's Harness skills and gave the robot in the icon a smile.
