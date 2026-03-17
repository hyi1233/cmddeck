# CmdDeck

CmdDeck is a local-first desktop UI for Claude Code and Codex CLI.

It keeps the CLI workflow, while adding a desktop chat interface, session history, CLI resume/open controls, file attachments, theme settings, and lightweight automation helpers.

## Notes

- CmdDeck is not an official Anthropic or OpenAI product.
- Claude Code and Codex CLI must be installed separately by the user.
- Session data and settings are primarily stored locally on your machine.

## Releases

- Main release format: `CmdDeck Portable.exe`
- Recommended GitHub asset: a `.zip` that contains the portable `.exe`
- Users still need to install Claude Code or Codex CLI separately

## Build

- `npm run dev`: start the app in development
- `npm run build`: build the portable Windows app
- `npm run build:portable:zip`: build the portable app and zip the generated `.exe` for GitHub Releases
- `npm run build:installer`: optional NSIS installer build
