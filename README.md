# CmdDeck

![CmdDeck screenshot](./ScreenShot_2026-03-18_141031_636.png)

CmdDeck is a Windows desktop UI for Claude Code and Codex CLI.

It keeps the real CLI workflow underneath, but removes some of the daily friction around long chats and multi-session work.

## Why CmdDeck

CmdDeck is built around a few common pain points:

- Editing long prompts in a terminal is slow. Moving the cursor back to fix one part is annoying.
- Copying and pasting screenshots or files into the CLI is clumsy.
- Watching multiple coding sessions across separate windows is tiring, and it is easy to miss which one already finished.
- When history gets large, finding the right conversation again becomes harder than it should be.

CmdDeck makes those parts easier:

- Write and revise long prompts in a normal chat input instead of fighting terminal editing.
- Paste screenshots with `Ctrl+V` or attach files directly in the UI.
- Keep multiple chats in one window with clear status, per-chat settings, and optional auto-run.
- Search, review, and continue local CLI history from one place.
- Jump back into the external CLI whenever you want without losing the desktop view.

## What It Adds

- chat-style sessions for Claude Code and Codex
- local history browsing with search
- resume/open in external CLI
- screenshot paste and file attachments
- per-chat model, reasoning, and mode settings
- simple auto-run helpers
- light and dark themes

## Status

- Current releases are for Windows only.
- The project is developed and tested on Windows.
- macOS and Linux are not tested yet.
- Claude Code and Codex CLI are not bundled. Users install them separately.
- Session data and settings stay on the local machine.

## Download

- Recommended GitHub asset: `CmdDeck-*-portable.zip`
- Unzip it and run the included `.exe`
- Users still need to install Claude Code or Codex CLI separately

## Development

- `npm run dev`
- `npm run build`
- `npm run build:portable:zip`
- `npm run build:installer`
