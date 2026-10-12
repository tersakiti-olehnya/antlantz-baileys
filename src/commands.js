const config = require("./config");
const { scrapeMetadata } = require("./lib/scraper");
const { downloadMedia } = require("./lib/downloader");

function getText(message) {
  const m = message.message || {};
  const text = m.conversation ||
    m.extendedTextMessage?.text ||
    m.imageMessage?.caption ||
    m.videoMessage?.caption;

  if (text) return text;

  // Support replies from legacy buttons, list selections, and Elaina native-flow buttons.
  const nativeFlow = m.interactiveResponseMessage?.nativeFlowResponseMessage;
  let nativeParams = {};
  if (nativeFlow?.paramsJson) {
    try {
      nativeParams = JSON.parse(nativeFlow.paramsJson);
    } catch {
      nativeParams = {};
    }
  }

  const selectedId =
    m.buttonsResponseMessage?.selectedButtonId ||
    m.templateButtonReplyMessage?.selectedId ||
    m.listResponseMessage?.singleSelectReply?.selectedRowId ||
    nativeParams.id ||
    nativeParams.selectedId ||
    nativeParams.buttonId;

  if (typeof selectedId !== "string" || !selectedId.trim()) return "";
  const selected = selectedId.trim();
  return selected.startsWith(config.prefix) ? selected : config.prefix + selected;
}

function menuText() {
  return (
    "*" + config.botName + "*\n\n" +
    config.prefix + "ping — cek koneksi\n" +
    config.prefix + "menu — daftar command\n" +
    config.prefix + "meta <url> — metadata halaman\n" +
    config.prefix + "download <airich|ytmate> <url> — downloader (perlu API resmi)\n\n" +
    "Pilih tombol untuk mencoba command."
  );
}

async function sendInteractiveMenu(sock, chat, message, logger) {
  try {
    const { MB } = await import("@rexxhayanasi/elaina-baileys");
    if (!MB?.Button) throw new Error("MessageBuilder MB.Button tidak tersedia di paket ini.");

    const menu = new MB.Button(sock)
      .setTitle(config.botName)
      .setBody("Pilih command di bawah. Tombol interaktif memerlukan klien WhatsApp yang mendukung formatnya.")
      .setFooter("ZEAN • ANTLANTZ Baileys")
      .addReply("Ping", ".ping")
      .addCopy("Salin nama bot", config.botName)
      .addUrl("Buka GitHub", "https://github.com/tersakiti-olehnya/antlantz-baileys");

    await menu.send(chat, { quoted: message });
    return true;
  } catch (error) {
    logger.warn({ err: error }, "Interactive menu gagal; memakai menu teks fallback");
    return false;
  }
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
      case "menu": {
        const sent = await sendInteractiveMenu(sock, chat, message, logger);
        if (!sent) return reply(menuText());
        return;
      }
      case "meta": {
        if (!args[0]) return reply("Contoh: " + config.prefix + "meta https://example.com");
        const data = await scrapeMetadata(args[0]);
        return reply(
          "*" + data.title + "*\n" + (data.description || "Tidak ada deskripsi") +
          "\n\nURL: " + data.url + (data.image ? "\nThumbnail: " + data.image : "")
        );
      }
      case "download": {
        if (args.length < 2) return reply("Contoh: " + config.prefix + "download ytmate https://example.com/video");
        const result = await downloadMedia(args[0], args[1]);
        return reply(JSON.stringify(result));
      }
      default:
        return;
    }
  } catch (error) {
    logger.error({ err: error, command }, "Command failed");
    return reply("Command gagal: " + error.message);
  }
}

module.exports = { handleMessage, getText };
