const config = require("./config");
const { scrapeMetadata } = require("./lib/scraper");
const { downloadMedia } = require("./lib/downloader");

function getText(message) {
  const m = message.message || {};
  return m.conversation ||
    m.extendedTextMessage?.text ||
    m.imageMessage?.caption ||
    m.videoMessage?.caption ||
    "";
}

async function handleMessage(sock, message, logger) {
  if (!message.message || message.key.fromMe) return;
  const chat = message.key.remoteJid;
  if (!chat || chat === "status@broadcast") return;

  const text = getText(message).trim();
  if (!text.startsWith(config.prefix)) return;

  const [rawCommand, ...args] = text.slice(config.prefix.length).trim().split(/\s+/);
  const command = (rawCommand || "").toLowerCase();
  const reply = async (body) => sock.sendMessage(chat, { text: body }, { quoted: message });

  try {
    switch (command) {
      case "ping":
        return reply("ANTLANTZ Baileys aktif.");
      case "menu":
        return reply(
          `*${config.botName}*\n\n` +
          `${config.prefix}ping — cek koneksi\n` +
          `${config.prefix}menu — daftar command\n` +
          `${config.prefix}meta <url> — metadata halaman\n` +
          `${config.prefix}download <airich|ytmate> <url> — downloader (perlu API resmi)`
        );
      case "meta": {
        if (!args[0]) return reply(`Contoh: ${config.prefix}meta https://example.com`);
        const data = await scrapeMetadata(args[0]);
        return reply(
          `*${data.title}*\n${data.description || "Tidak ada deskripsi"}\n\nURL: ${data.url}` +
          (data.image ? `\nThumbnail: ${data.image}` : "")
        );
      }
      case "download": {
        if (args.length < 2) return reply(`Contoh: ${config.prefix}download ytmate https://example.com/video`);
        const result = await downloadMedia(args[0], args[1]);
        return reply(JSON.stringify(result));
      }
      default:
        return;
    }
  } catch (error) {
    logger.error({ err: error, command }, "Command failed");
    return reply(`Command gagal: ${error.message}`);
  }
}

module.exports = { handleMessage };
