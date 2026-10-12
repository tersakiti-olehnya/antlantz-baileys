# ANTLANTZ Baileys

Starter project for a WhatsApp bot built with the Baileys library.

## Requirements
- Node.js 20 or newer
- A WhatsApp account you are authorized to connect
- Keep the `auth_info/` session directory private

## Install
```bash
npm install
cp .env.example .env
```
Edit `.env` and put the WhatsApp number in international format without `+`, spaces, or dashes.

## Run
```bash
npm start
```
If `PAIRING_NUMBER` is set and the session is not registered, the bot requests a WhatsApp-issued pairing code in the console. The code itself cannot be chosen arbitrarily; WhatsApp generates it. Never share pairing codes or `auth_info/`.

## Auto reconnect and recovery
- Temporary disconnects reconnect with exponential backoff.
- The console reports status codes and safe troubleshooting hints.
- Logged-out sessions stop retrying because they need a new pairing flow; the bot does not delete session files automatically.
- Fatal uncaught exceptions exit non-zero so a process manager can restart the process.

### Pterodactyl restart setting
Enable the server's **restart on failure / crash** behavior in the panel if your host exposes it. The bot process cannot restart the Pterodactyl server itself. Configure sensible restart limits to avoid a crash loop.

## Starter commands
- `.ping` — connection test
- `.menu` — list available commands
- `.meta https://example.com` — read basic page metadata
- `.download <airich|ytmate> <url>` — downloader scaffold; requires official API docs and adapter implementation.

## Downloader status
Airich and YTMate are not active yet. Their API endpoint formats must come from official documentation. This starter does not guess undocumented endpoints or fake successful downloads.

## Compatibility notes
WhatsApp interactive-message formats change and may not render consistently across clients. This starter uses text as the baseline; custom buttons/lists and link previews need separate implementation and testing.

## Security
- Do not commit `.env` or `auth_info/`.
- Never share API keys, session files, or pairing codes.
- Only scrape public pages you're allowed to access.
- Audit URL fetching against SSRF and add rate limits before production use.
