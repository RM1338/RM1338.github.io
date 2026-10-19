---
title: Gremlin
order: 2
kind: Research
tagline: An agent that explores a Flutter app like a confused user, files a bug report whenever the framework logs a failure, and can prove a fix by replaying the exact taps.
plain: "Testing an app usually means someone writing a test for every screen. Gremlin is a robot tester that taps around an app on its own, like a curious kid, and only reports a problem when the app itself admits something went wrong, so it never makes problems up."
status: { label: "Prototype, public repo", tone: research }
role: Designer and builder. Research, engineering, evaluation
dates: Jul 2026 to now
stack: [Python, adb, Playwright, FastAPI, React, Gemini, Groq, Qwen3-VL]
links:
  - { label: "Repository", href: "https://github.com/RM1338/Gremlin" }
highlights:
  - { text: "The model decides where to go; the log decides what is broken", evidence: self-reported }
  - { text: "3 of 3 planted defects found with a local model", evidence: measured }
results:
  - { value: "3 / 3", label: "planted defects found on the bench fixture with a local model", evidence: measured }
  - { value: "1.3 s", label: "per decision, qwen3-vl 4B on an RTX 3050 laptop GPU", evidence: measured }
  - { value: "1 → 6", label: "distinct web views counted after fixing screen identity on single-page apps", evidence: measured }
  - { value: "2x Monkey", label: "screens reached versus Android's random tester, the project's target", evidence: not yet measured }
limits:
  - The nine-app benchmark is unfinished. On the first app, runs with the model reached no more screens than runs without it; too few runs to conclude.
  - The bench fixture is small enough that it does not need a model to explore, so it cannot show the model's value.
  - Detection on modern Flutter needs a one-line probe in the app's main().
try: "Step through a run: Gremlin taps its way to checkout, the log catches an overflow, and a fix has to pass three gates."
next: "Finish the nine-app benchmark and publish it, make the third gate deterministic, and test the guard against deliberately cheating patches."
---
