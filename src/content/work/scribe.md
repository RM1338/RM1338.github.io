---
title: Scribe
order: 3
kind: Shipped app
tagline: An AI meeting recorder that runs on an API key you control and stores recordings only on your phone.
plain: "A meeting recorder for your phone. Press record, and afterwards it hands you the decisions and the to-do list. Your recordings stay on your phone."
status: { label: "v0.1.2 on Android", tone: live }
role: Sole developer
dates: Mar to Sep 2026
stack: [Flutter, Supabase, Edge Functions, Groq Whisper, GPT-OSS]
links:
  - { label: "Website", href: "https://getscribe.pages.dev/" }
  - { label: "Repository", href: "https://github.com/RM1338/Scribe" }
  - { label: "Releases", href: "https://github.com/RM1338/Scribe/releases" }
highlights:
  - { text: "Shared API key kept off the device", evidence: self-reported }
  - { text: "3 public releases", evidence: measured }
results:
  - { value: "3", label: "public releases: v0.1.0, v0.1.1 with cloud sync, v0.1.2", evidence: measured }
  - { value: "~16k", label: "lines of Dart", evidence: measured }
limits:
  - No usage numbers. Scribe is shown as a shipped product, not a traction story.
try: "Record a short meeting on a working mock of the app. Watch it transcribe and summarise, then switch whose key it uses, including the one you should never ship."
next: "Speaker diarization (who said what), shareable summary links, and audio sync across devices."
---
