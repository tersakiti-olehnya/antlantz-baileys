# ANTLANTZ Baileys

Starter project for a WhatsApp bot built with the Baileys library.

## Requirements
- Node.js 20 or newer
- A WhatsApp account you are authorized to connect
- A private, secure place to keep the `auth_info/` session directory

## Install
```bash
npm install
cp .env.example .env
```
Edit `.env`. Put the phone number in international format without `+`, spaces, or dashes.

## Run
```bash
npm start
```
If `PAIRING_NUMBER` is set and the session is not registered, the bot requests a pairing code in the terminal. Never share pairing codes or `auth_info/`.

## Starter commands
- `.ping` — connection test
- `.menu` — list available commands
- `.meta https://example.com` — read basic page metadata
- `.download <airich|ytmate> <url>` — downloader scaffold (requires official API docs and adapter implementation).

## Downloader status
Airich and YTMate are not active yet. Their API endpoint formats must come from official documentation. This starter does not guess undocumented endpoints or fake successful downloads.

## Compatibility notes
WhatsApp interactive-message formats change and may not render consistently across clients. This starter uses text as the baseline; custom buttons/lists and link previews need separate implementation and testing.

## Security
- Do not commit `.env` or `auth_info/`.
- Never share API keys, session files, or pairing codes.
- Only scrape public pages you're allowed to access.
- Audit URL fetching against SSRF and add rate limits before production use.
