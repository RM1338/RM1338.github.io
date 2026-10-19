---
title: "Crewbo: Letting a Whole Team Run AI Coding Agents on One Repository"
subtitle: "Claims that every agent respects, conflicts found before merge, and the silent failures that only showed up on real machines"
date: 2026-10-19
description: "Claims that every agent respects, conflicts found before merge, and the silent failures that only showed up on real machines"
---

![A crew of Bos, Crewbo’s mascot, one for each teammate’s agent](/writing/crewbo/00-cover.png)

- [1] [Xu, Subramanian and Karthik, AI Agent Pull Requests on GitHub: Frequency, Structure, and Merge Conflict Rates (arXiv 2607.04697)](https://arxiv.org/abs/2607.04697)
- [2] [Claude Code: Hooks reference](https://code.claude.com/docs/en/hooks)
- [3] [Codex: Hooks](https://learn.chatgpt.com/docs/hooks)
- [4] [Antigravity: Hooks](https://antigravity.google/docs/hooks)
- [5] [Model Context Protocol](https://modelcontextprotocol.io/)
- [6] [git merge-tree](https://git-scm.com/docs/git-merge-tree)
- [7] [git worktree](https://git-scm.com/docs/git-worktree)
- [8] [RFC 8032: Edwards-Curve Digital Signature Algorithm (Ed25519)](https://datatracker.ietf.org/doc/html/rfc8032)
- [9] [GitHub: OAuth device flow](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps#device-flow)
- [10] [mvdan/sh: a shell parser for Go](https://github.com/mvdan/sh)
- [11] [coder/websocket](https://github.com/coder/websocket)
- [12] [zalando/go-keyring](https://github.com/zalando/go-keyring)
- [13] [AF_UNIX comes to Windows](https://devblogs.microsoft.com/commandline/af_unix-comes-to-windows/)

> **Description**
> A walkthrough of Crewbo, a coordination layer that lets every teammate run their own AI coding agent on the same repository at the same time, across machines, operating systems and agent vendors. It covers why parallel agents collide, how file claims are enforced through each agent’s own hooks, how conflicts are found before merge, how a lead can send work without being able to run anything on a teammate’s machine, and two silent failures that only appeared in live tests on real hardware.

***Author: Ronel Abraham Mathew***

#### A Go daemon on every laptop, a sync server that never sees code, and the rules that make AI agents work as a team

Imagine a hackathon. Four of you, one repository, six hours left, and each of you has an AI coding agent that can write a feature in minutes. So who gets to drive?

If one person drives, three people watch. If everyone drives, four agents start editing the same files at once, each one sure it is alone, and the team finds out at merge time, after both people have built on top of the clash.

That is the problem Crewbo exists for, and it is my startup. Each teammate keeps their own agent, on their own machine and operating system. Every agent knows which files the others are working on, is stopped before it edits one of them, and conflicts between branches show up before anyone merges. Here is how it works, and what broke on the way.

### Why parallel agents collide

Every coding agent assumes it owns the repository. None of them can see that a teammate’s agent is editing the file next door, and git only reports the collision when someone merges.

![Four agents, one file, and nobody can see anybody](/writing/crewbo/01-problem.png)

This is measurable. A 2026 study of 33,596 agent-written pull requests replayed merges between pairs of them: 19.8% conflicted when the same agent wrote both, and 41.7% when two different agents did [1]. Mixing vendors makes it twice as bad.

Before writing any code, I interviewed ten teams. Nine of them mixed agent vendors in the same room: Claude Code on one laptop, Codex on another. So the answer could not belong to one vendor, one operating system or one cloud. That shaped every decision that followed.

### How Crewbo is put together

Crewbo is a single Go binary. Each laptop runs it as a small daemon, and the same binary can run the team’s sync server.

![How Crewbo is put together](/writing/crewbo/02-architecture.png)

- **The daemon** holds the room’s claims, manages task worktrees and runs the git checks. Agents and the editor extension talk to it over a local socket, which is a Unix domain socket on every operating system, Windows included [13].
- **The sync server** carries claims, tasks and presence between daemons over WebSocket [11], as an append-only event log per room. It sees file paths, task text and status, and never file contents. One teammate can run it, or a team can host it.
- **Your git remote** carries the code, with each person’s own credentials. Crewbo never hosts code.

Sign-in uses GitHub’s device flow [9], so a teammate proves who they are without pasting a token anywhere.

### Claims that every agent respects

The core idea is a claim: a file or a glob held by one agent session for one person. Claude Code, Codex and Antigravity all have hook systems that run a command before a tool call and let that command allow or deny it [2][3][4]. Crewbo installs itself into each one, so every agent asks the local daemon before it edits a file.

Here is the real output, captured from the current build: a claim made from a terminal, then a captured Claude Code edit payload replayed against the claimed file.

![What the agent is told: real hook output](/writing/crewbo/03-hook.png)

The agent gets a reason it can act on: who holds the file, until when, and the exact command to ask for it. An edit to a free file gets no output at all, which is how a hook says “allow”.

A few decisions sit behind that one line:

- **Hooks enforce, MCP only informs.** Crewbo also serves read-only tools over the Model Context Protocol [5], so an agent can ask who holds what. But a tool the agent chooses to call cannot be a guard. In the first spike, just telling the agent a file was claimed already stopped it from trying; the hook’s refusal is the backstop, and it held even with Claude Code running in bypass-permissions mode.
- **The daemon answers locally.** It keeps its own copy of the room’s claims, so a hook never waits on the network. Starting the hook process took 2.3 ms at the median in the first spike.
- **Shell commands are parsed.** An agent can write a file with `sed -i` or `echo >>` as easily as with its edit tool. A POSIX parser [10] and a PowerShell tokenizer find the files a command writes before it runs: 81% and 87% of the writes in a hand-built corpus. A hash check after each command reports what the parser missed.
- **Claims are leases.** An agent’s claim expires unless its hooks keep renewing it, so a crashed agent cannot hold a file for long.

When two people need the same file, a conflict climbs a ladder rather than becoming a fight.

![When two people need the same file](/writing/crewbo/04-ladder.png)

### Conflicts found before anyone merges

Claims stop two agents editing the same file at the same time. They do not stop two branches from conflicting in ways nobody predicted. So every piece of work is a task, on its own branch and its own git worktree [7].

![Conflicts found before anyone merges](/writing/crewbo/05-tasks.png)

When a task’s agent finishes a reply, Crewbo commits the work as that person and pushes it as a checkpoint ref. Then it fetches every other task’s latest checkpoint and runs `git merge-tree` [6] on each pair. Because that is git’s own merge logic, the answer matches what a real merge would do, and it runs without touching anyone’s working copy. A conflicting pair is announced to both people, naming the other task and the files.

Two small details mattered here. Checkpoints are pushed when the agent stops, not on a timer, to stay well inside GitHub’s push-rate guidance. And `git merge-tree` exits with status 1 both for a conflict and for a ref it cannot find, so Crewbo only treats exit 1 as a conflict when a result tree was actually printed.

Merging goes through the same check. `crewbo task merge` re-runs it against `main` and every other active task, refuses a merge that would conflict, and retries if someone else pushed first.

### Sending work to a teammate, safely

A room lead can send a task to a teammate’s agent. That is the most dangerous feature in Crewbo, because it means text from one machine leads to an agent running on another. So it has the most locks.

![A lead can send work, but nothing runs until a person says yes](/writing/crewbo/06-dispatch.png)

The lead’s device signs the exact task bytes with Ed25519 [8], using a key kept in the operating system’s keychain [12]. The teammate’s daemon verifies the signature against the room’s current lead before showing anything, shows the full text verbatim, and runs nothing until a person types `yes` in a terminal. The task then runs in a fresh worktree, with the teammate’s own agent and login, and never in a bypass-permissions mode.

### Where it actually broke

Two of the most important bugs in Crewbo made no noise at all.

![Two failures that made no noise](/writing/crewbo/07-failures.png)

**The guard that failed open.** In the Windows spike, a claimed file was edited anyway. No error, no warning. The cause was a single space: Codex runs hook commands through a shell, and an unquoted hook path containing a space never runs. Codex reported nothing, so the agent simply carried on. A coordination tool that fails open is worse than none, because the team believes it is protected. The installer now refuses such paths, and `crewbo doctor` checks whether each agent’s hooks have actually fired since the daemon started.

**The approval an agent could reach.** In the two-machine check for lead dispatch, an agent ran `crewbo task approve` itself. Approval is supposed to refuse anything that is not a person at a terminal, but the check treated any character device as a terminal, and agents point stdin at `/dev/null`, which is one. Nothing could type `yes`, so nothing was approved, but the agent should never have reached the prompt. The check now requires a real terminal.

The same habit of testing live on every operating system caught more of the same shape: a byte-order mark on hook input that made the parser read nothing and allow the edit; a keychain library that blocked for over a minute when no secret service was running; and claims that did not apply inside a `git worktree`, because each worktree looked like a separate repository.

### Seeing the whole room

Everything is visible from the CLI, a VS Code extension and a local dashboard the daemon serves. This is the dashboard from the same live capture: two claims, no room, so it says it is running locally only.

![The local dashboard, live](/writing/crewbo/09-dashboard-live.png)

And with a full room, using example data: claims across three teammates, two tasks whose checkpoints conflict, and a hand-off request in progress.

![The dashboard with example data](/writing/crewbo/10-dashboard-example.png)

### How it was built

Crewbo is built in gates. Nothing in a milestone starts until the one before it has a written go decision, and every decision that is costly to reverse gets an architecture decision record.

![How it was built: gates before code](/writing/crewbo/08-process.png)

The rules are short: verify every external fact against its source, never claim something works unless it was run, and check every feature live on Linux, macOS and Windows. Two-machine checks with a teammate on macOS covered claims across machines and signed lead dispatch end to end, through a tunnel to a sync server on my laptop.

### Where it stands

Crewbo is in preview. It works end to end on Linux, the main flows have run across Linux and macOS, and Windows is partly tested. Claude Code, Codex and Antigravity are all supported, with Antigravity able to block and inform but not yet run dispatched tasks. The sync server will be AGPL-3.0 and everything else Apache-2.0.

The next test is the one that matters most: real teams using it in a real hackathon in November. After that come more agents, claims on symbols rather than whole files, signed installers and a free hosted sync server.

### The bigger picture

Most tools for running several coding agents assume one person, one machine and one vendor. Teams do not work like that. The interesting problem is not making agents faster, it is making them aware of each other, and doing it without moving anyone’s code into somebody else’s cloud.

The lesson I keep relearning is that the dangerous failures are the quiet ones. A hook that never runs, an approval check that is almost right, a merge check that misreads an exit code: none of them crash. The only defence I have found is to test every path live, on every platform, and believe nothing until it has been run.

*B.Tech CSE Student at Karunya Institute of Technology and Sciences, Agentic AI Engineer at the Karunya Innovation and Design Studio (KIDS)*

*LinkedIn:* [*https://www.linkedin.com/in/ronelm/*](https://www.linkedin.com/in/ronelm/)

*Github:* [*https://github.com/RM1338*](https://github.com/RM1338)
