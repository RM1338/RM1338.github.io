---
title: "Gremlin: An Agent That Breaks Your Flutter App Before Your Users Do"
subtitle: "Why the model only chooses where to tap, how a fix gets graded with nobody watching, and the bugs that hid inside my own evaluation"
date: 2026-10-19
description: "Why the model only chooses where to tap, how a fix gets graded with nobody watching, and the bugs that hid inside my own evaluation"
---

![Gremlin: let it break your app before your users do](/writing/gremlin/00-cover.png)

- [1] [Flutter: Common Flutter errors (RenderFlex overflow)](https://docs.flutter.dev/testing/common-errors)
- [2] [Flutter: Handling errors](https://docs.flutter.dev/testing/errors)
- [3] [Android: Logcat command-line tool](https://developer.android.com/tools/logcat)
- [4] [Android: UI/Application Exerciser Monkey](https://developer.android.com/studio/test/other-testing-tools/monkey)
- [5] [Android: UI Automator](https://developer.android.com/training/testing/other-components/ui-automator)
- [6] [Firebase Test Lab: Robo test](https://firebase.google.com/docs/test-lab/android/robo-ux-test)
- [7] [Mao, Harman and Jia, Sapienz: Multi-objective Automated Testing for Android Applications (ISSTA 2016)](https://discovery.ucl.ac.uk/id/eprint/1508043/)
- [8] [imagehash: perceptual image hashing for Python](https://github.com/JohannesBuchner/imagehash)
- [9] [Qwen3-VL](https://github.com/QwenLM/Qwen3-VL)
- [10] [Ollama](https://ollama.com)
- [11] [redroid: Android in a container](https://github.com/remote-android/redroid-doc)
- [12] [Chrome DevTools Protocol](https://chromedevtools.github.io/devtools-protocol/)
- [13] [Playwright for Python](https://playwright.dev/python/)
- [14] [Gremlin source code on GitHub](https://github.com/RM1338/Gremlin)

> **Description**
> A walkthrough of Gremlin, an autonomous UI-testing agent for Flutter apps on Android. A vision model explores the app while an exact match on the device log decides what is broken, so the agent never reports a bug the framework did not report itself. It covers the explore loop, how an opt-in autofix is graded by replaying the taps that caused the bug, two bugs that undermined the tool from the inside, and what the benchmark can and cannot say yet.

***Author: Ronel Abraham Mathew***

#### An autonomous testing agent that never has to judge whether a screen looks broken, because Flutter already tells it

Imagine you ship a Flutter update on a Friday. Every test passes. On Monday someone with a small phone sends a screenshot: the checkout button is cut off by yellow and black stripes.

Flutter knew. The moment that screen laid out, it printed `A RenderFlex overflowed by 42 pixels on the right` to the device log, with the widget and the file it came from [1]. Nobody had written a test that opened that screen on that size, so nobody was listening.

Gremlin is an agent built to listen. It opens your app, wanders through it like a confused user, and files a reproducible bug report every time the framework reports a failure. Opt-in, it can also hand the bug to a coding agent and then prove whether the fix actually worked. This post covers how it works, followable enough to build something similar, and the two bugs that quietly broke it from the inside.

### The one idea

There are three usual ways to test the screens nobody wrote a test for, and each breaks differently. Hand-written UI tests cover only what someone thought of. Random tappers like Android’s Monkey [4] need no script but cannot form intent. Crawlers like Firebase’s Robo test [6] and research tools like Sapienz [7] explore systematically, but are built mainly around crashes. The newest tools point a language model at a screenshot and ask whether it looks broken.

That last question has no checkable answer. A model that says “this screen looks wrong” is as convincing when it is wrong as when it is right, so every report needs a human to confirm it, which brings back the cost the tool was meant to remove.

Gremlin splits the job in two.

![The model decides where to go; the log decides what is broken](/writing/gremlin/01-split.png)

- **The policy** is a vision model, and it only decides where to tap next. That question has no wrong answer, only slower ones. A bad choice costs one wasted tap.
- **The oracle** is an exact string match on the device log [3]. It is never asked for an opinion: the failure string is in the log or it is not.

For Flutter, the oracle’s vocabulary is short:

```python
_FLUTTER_SIGNALS = (
    Signal(CRASH, "native-crash", re.compile(r"FATAL EXCEPTION")),
    Signal(CRASH, "dart-exception", re.compile(r"Unhandled Exception", re.IGNORECASE)),
    Signal(LAYOUT, "renderflex-overflow", re.compile(r"A RenderFlex overflowed by", re.IGNORECASE)),
    Signal(LAYOUT, "render-error", re.compile(r"Exception caught by rendering library", re.IGNORECASE)),
    Signal(HANG, "jank", re.compile(r"Skipped \d+ frames")),
)
```

The same structure holds for React Native, with JavaScript exception strings instead, and for web pages, where the log is the browser’s own console and network events.

### How a run works

A run repeats four steps until every control on every reachable screen has been tapped, or the action budget runs out.

![One run: observe, decide, act, check](/writing/gremlin/02-loop.png)

**Observe.** Gremlin takes a screenshot and dumps the accessibility tree with UI Automator [5], turning it into a numbered list of real elements with their centres and labels. The model then picks an element by number instead of guessing pixel coordinates, which removes a whole class of near-miss taps.

**Decide.** The model gets the screenshot, the element list and the names of screens already visited, and replies with one JSON action and one sentence of reasoning. Coverage memory keeps it honest: Gremlin tracks which controls have been tapped on each screen, and works through the untapped ones instead of tapping the same button forever. Screens are identified by a perceptual hash of the screenshot [8], so a scroll or a small animation does not count as a new screen.

**Act.** Only four verbs exist: tap, type, back and scroll, all over adb. Keeping the action set that small is what makes every recorded sequence replayable later.

**Check.** A background thread streams the app’s log, and after every action Gremlin drains only the lines that arrived since the last one. A failure is therefore pinned to the action that just ran, not to “somewhere in the run”.

When a signal fires, the report carries the screenshot, the matched line with context, the source file and line, and the exact sequence of actions that produced it. That last part is what makes the next section possible.

One practical catch: on modern Flutter builds, I found that framework errors often never reach logcat at all, even though the red error box appears on screen. So the app under test can opt in to a tiny probe in `main()`. It sets the two handlers Flutter documents for exactly this, `FlutterError.onError` and `PlatformDispatcher.instance.onError` [2], and prints one greppable line per error. It swallows nothing, so it composes with crash reporters. Native crashes are caught either way, because Android logs those itself.

### What a run looks like

Here is a real run against a small demo shop I wrote for this post, with three bugs planted in it: a coupon button that throws, a price API that returns a server error, and a settings page that logs an error. It ran in coverage mode, with no model at all:

```text
$ python run.py --url http://localhost:5180 --policy coverage --steps 30
target: http://localhost:5180  [localhost]  Web
Gremlin exploring localhost for up to 30 steps...
  !! BUG [crash] uncaught-exception at step 3
  !! BUG [crash] server-error at step 5
  !! BUG [layout] console-error at step 8
  ✓ coverage complete at step 15: every reachable control tapped

=== done: 4 distinct screens, 3 bug(s) ===
wrote 6 report file(s) to runs/latest/reports/
```

All three bugs, in fifteen actions. The console shows the same run: the overview, each bug with the exact error the page threw and the taps that reproduce it, and the full trace.

![The Gremlin console: overview of the run](/writing/gremlin/07-console-overview.png)

![A bug report: the uncaught TypeError, where it was thrown, and the three taps that reproduce it](/writing/gremlin/08-console-bugs.png)

![The trace: every action of the run, in order](/writing/gremlin/09-console-trace.png)

### From a bug report to a fix you can trust

Most people never need an agent to write the fix, so Gremlin has three tiers. Tier 0 is the plain report. Tier 1, the default, renders it as a self-contained prompt with the relevant source inlined, to paste into whatever assistant you already use. Tier 2 is opt-in: a coding agent (Claude Code, Codex, Copilot, or any command you configure) edits the code on a scratch branch.

The interesting part is not who writes the patch, it is how Gremlin decides whether to believe it.

![From a bug report to a fix you can trust](/writing/gremlin/03-gates.png)

An unconstrained fixer is rewarded for making the log line disappear, and that is not the same as fixing the bug. Wrapping an overflowing `Row` in a scroll view silences the overflow without fixing the layout. Wrapping `build()` in `try/catch` hides the exception. Deleting the widget silences everything. These are easier than the real fix, so a fixer will find them.

So a patch has to clear three gates after Gremlin rebuilds the app:

1. **Signal gone.** Replay the exact trace that produced the bug. The failure must not appear.
2. **Screen still looks like itself.** The screen must not be blank, and for layout bugs it must stay perceptually close to the screen before the fix. A deleted widget fails here.
3. **Nothing new broke.** Replaying the run’s other recorded bug traces must surface no signal that was not there before.

A static guard runs first and rejects the cheapest cheats, like an added `try/catch` or a pure deletion, before paying for a rebuild. To be honest about it, that guard is a speed bump rather than a defence: reformatting gets around a regex. The gates are the defence. A patch that clears all three is left on its branch for a human to read. It is never pushed or merged.

### Where it actually broke, part one: the oracle went deaf

The oracle filtered the log by the app’s process ID, so other apps’ noise could not be blamed on it. That pin was resolved once, at the start of the run.

![The oracle that went deaf after its first find](/writing/gremlin/04-deaf.png)

The problem: any crash the oracle detected killed the app, and Android restarted it under a new process ID. From then on the oracle was listening to a process that no longer existed. The run carried on normally and finished with the rest of the app reported as clean.

For a tool whose whole job is finding crashes, that meant going deaf exactly when it mattered most: right after its first real find. It was also completely silent. Nothing crashed and no test failed. The numbers were just wrong.

The fix re-checks the process ID on every step. If it changed, the stream restarts and the old buffer is dropped. If the app is only momentarily down, the filter is kept, because restarting then would silently let every other app’s noise in. The cost is one `pidof` per step.

### Where it actually broke, part two: the correct fix that got reverted

On 21 August, the first real autofix attempt ran end to end on a sandboxed Android instance. The agent’s patch for the overflow was correct and idiomatic: one line, wrapping a fixed-width `Container` in `Expanded` inside the `Row`. Gremlin reverted it.

![The correct fix that got reverted](/writing/gremlin/05-reverted.png)

`lib/main.dart:127` was a different planted bug, a crash on a button tap, which existed before the patch and had nothing to do with a `Row`. At the time, gate 3 worked by running a fresh, short, random exploration of the patched app and comparing what it found with the original run. The original run had never tapped that button; the new one did. So a bug that was already there read as damage the patch had caused.

The deeper problem was the premise. The baseline was not a list of the app’s bugs. It was a list of what one random run happened to find, and anything that explored further would look like breakage.

The fix makes gate 3 deterministic like the other two. It now replays the other bugs’ recorded traces from the same run: fixed paths that cannot wander onto a screen the baseline never reached, so they can neither miss real damage nor invent it. Bugs are also matched by their log message instead of `file:line`, because a fix that adds a line moves every bug below it, and a moved bug looked like a brand-new one. That change is in the code now; re-running the full benchmark with it is still on my list.

### Measuring it honestly

The obvious headline for a tool like this is “Gremlin reaches N times more screens than the Monkey”. The first measurement said 5×. The zero variance was the tell: a random walk that lands on exactly one screen across every seed is not exploring badly, it is not exploring at all.

Two bugs in my own harness were working against the baseline. The Monkey was fired in bursts, each with the same `-s` seed, and the same seed generates the same sequence of events [4], so the same five taps were replayed again and again. The Monkey’s screen was also sampled once per burst, while Gremlin’s was sampled after every action. Both bugs flattered my number, and neither showed up as an error.

I fixed both, then re-measured. The Monkey still reached one screen, for a real reason: random coordinates on a 1080×1920 screen mostly hit empty space, which is exactly what accessibility-tree grounding fixes. But the lesson stuck: a silent failure that returns a plausible number is the most dangerous kind, so every defect and every hole in the evaluation now goes into a written ledger, ranked by how much it could mislead a result.

![What the benchmark fixture says, and does not say](/writing/gremlin/06-results.png)

The next question was whether the model matters at all. The answer on the benchmark fixture so far: not measurably. A coverage-only arm with no model ties the model arms, once an ordering bug was fixed (coverage used to tap the app bar’s back arrow first and never returned to the screen). The local model, `qwen3-vl` 4B served through Ollama [9][10] on a 6 GB laptop GPU, takes about 1.3 seconds per decision and finds all three planted defects, but so does the no-model arm. A five-screen app runs out of screens before it runs out of budget, so it cannot tell a good policy from an adequate one. That needs real apps with deep navigation.

### Running without a phone

Gremlin drives a real device over USB, but it does not need one. With no device attached it boots a headless emulator. On Linux it can instead start a containerised Android instance with redroid [11], which runs Android’s userspace on the host kernel: about 2 to 3 GB instead of an emulator image, and ephemeral, so every run starts from the same image. Its screen size is a boot parameter, which matters because overflow bugs depend on screen size.

It also tests web apps. Playwright [13] drives the page, and the oracle listens to the Chrome DevTools Protocol [12] instead of logcat: uncaught exceptions, unhandled promise rejections, console errors, failed requests and server errors.

### What comes next

First, finishing the nine-app benchmark: open-source Flutter apps from F-Droid, built from the same commits F-Droid built, with the local model against no model. That answers whether the model earns its cost on apps with real navigation. Then an adversarial suite of deliberately cheating patches, to measure how many the gates actually reject rather than assume it.

### The bigger picture

The current wave of AI testing tools asks a model to judge correctness, and then needs a human to check the judge. Gremlin goes the other way: let the framework say what is broken, use the model only to get there, and grade every fix by re-running the exact interaction that broke it.

The same idea runs through the evaluation. Two of the most important bugs in this project produced no errors at all: one made the tool deaf, one made the baseline look worse than it was. Both returned plausible numbers. Writing them down, and checking the flattering results hardest, turned out to matter as much as the agent itself.

The code is open on GitHub [14].

*B.Tech CSE Student at Karunya Institute of Technology and Sciences, Agentic AI Engineer at the Karunya Innovation and Design Studio (KIDS)*

*LinkedIn:* [*https://www.linkedin.com/in/ronelm/*](https://www.linkedin.com/in/ronelm/)

*Github:* [*https://github.com/RM1338*](https://github.com/RM1338)
