---
title: Crewbo
order: 1
kind: My startup
tagline: Run every teammate's AI coding agent on the same repository, at the same time, without collisions.
status: { label: "Preview v0.x, private repo", tone: preview }
role: Founder. Product, architecture, engineering and testing
dates: Oct 2026 to now
stack: [Go, WebSocket, SQLite, Protobuf, TypeScript, VS Code API]
links:
  - { label: "Repository is private until the licence decision" }
highlights:
  - { text: "Claude Code, Codex and Antigravity on Linux, macOS and Windows", evidence: self-reported }
  - { text: "109 merged PRs in 8 days", evidence: measured }
results:
  - { value: "10", label: "team interviews before writing code; 9 of the teams mix agent vendors", evidence: measured }
  - { value: "2.3 ms", label: "hook process start, p50 (p95 3.3 ms, 200 runs, Linux spike)", evidence: measured }
  - { value: "81% / 87%", label: "shell commands whose write targets are caught statically (POSIX / PowerShell)", evidence: measured }
  - { value: "109", label: "merged PRs, about 24.5k lines of Go and 11.7k lines of tests", evidence: measured }
  - { value: "5 teams", label: "in a real hackathon, the v1 success criterion", evidence: not yet measured }
limits:
  - Preview software. Works end to end on Linux; main flows checked on Linux and macOS; Windows partly tested.
  - The shell-detection corpus is small and hand-built.
  - No real hackathon has used it yet. The first is planned for 23 to 29 November 2026.
try: "Drive one teammate’s agent. Try to edit a file someone else holds, then ask for it."
next: "A first real hackathon in late November, then more agents (Cursor, Gemini CLI, Copilot CLI), symbol-level claims, signed installers and a free hosted sync server."
---
