# ANTLANTZ Baileys

WhatsApp bot starter using **@rexxhayanasi/elaina-baileys 1.4.3**, with reconnect handling and an interactive menu.

## Requirements
- Node.js 20 or newer (Node.js 22+ recommended by Elaina Baileys)
- A WhatsApp account you are authorized to connect
- Keep the \`auth_info/\` session directory private

## Install
\`\`\`bash
npm install
cp .env.example .env
\`\`\`
Edit \`.env\`. Set \`PAIRING_NUMBER\` in international format without \`+\`, spaces, or dashes.

### Optional custom pairing code
Set \`PAIRING_CODE\` to exactly 8 alphanumeric characters, for example \`ZEAN2026\`, if you want to request a custom code supported by this Elaina Baileys version. Leave it blank to let WhatsApp generate the code. The pairing process still needs to be approved from WhatsApp's **Linked devices** screen. Never share the pairing code or \`auth_info/\`.

## Run
\`\`\`bash
npm start
\`\`\`

## Current bot commands
- \`.ping\` — connection test
- \`.menu\` — tries to send an Elaina native-flow interactive menu with reply, copy and repository URL actions; uses a text menu if the builder fails
- \`.meta https://example.com\` — read basic page metadata
- \`.download <airich|ytmate> <url>\` — downloader scaffold; requires official API docs and adapter implementation

Interactive messages vary by WhatsApp client/version. The handler recognizes common legacy button/list responses and Elaina native-flow response IDs, but live compatibility still needs testing on the recipient clients.

## Auto reconnect and recovery
- Temporary disconnects reconnect with exponential backoff and jitter.
- The console reports status codes and safe troubleshooting hints.
- Logged-out sessions stop retrying because they need a new pairing flow; the bot does not delete session files automatically.
- Fatal uncaught exceptions exit non-zero so a process manager can restart the process.
- A stale socket's close event is ignored to reduce duplicate reconnect loops.

### Pterodactyl restart setting
Enable **restart on failure / crash** in the panel if your host exposes it. The bot process cannot restart the Pterodactyl server itself. Configure sensible restart limits to avoid a crash loop.

## Engine integration status
The dependency is pinned to \`@rexxhayanasi/elaina-baileys\` \`1.4.3\`. The application loads its ESM exports through dynamic import while retaining the current CommonJS app layout.

Integrated in this pass:
- Elaina MessageBuilder interactive \`.menu\`
- Optional Elaina custom pairing code via \`PAIRING_CODE\`
- Parsing of common interactive reply IDs
- Existing reconnect logic retained

Not yet implemented as bot commands: carousel, album sending, channel management, polling, rich link card commands, and advanced status operations. The library advertises additional APIs, but each should be integrated and tested individually before being treated as production-ready.

## Downloader status
Airich and YTMate are not active yet. Their API endpoint formats must come from official documentation. This starter does not guess undocumented endpoints or fake successful downloads.

## Security
- Do not commit \`.env\` or \`auth_info/\`.
- Never share API keys, session files, or pairing codes.
- Only scrape public pages you're allowed to access.
- Audit URL fetching against SSRF and add rate limits before production use.
