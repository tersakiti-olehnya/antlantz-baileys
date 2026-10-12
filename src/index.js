const fs = require("node:fs");
const path = require("node:path");
const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion
} = require("@whiskeysockets/baileys");
const config = require("./config");
const logger = require("./logger");
const { handleMessage } = require("./commands");

async function start() {
  const authDir = path.join(process.cwd(), "auth_info");
  fs.mkdirSync(authDir, { recursive: true });
  const { state, saveCreds } = await useMultiFileAuthState(authDir);

  let version;
  try {
    const latest = await fetchLatestBaileysVersion();
    version = latest.version;
    logger.info({ version }, "Baileys version selected");
  } catch (error) {
    logger.warn({ err: error }, "Could not fetch latest Baileys version; using library default");
  }

  const sock = makeWASocket({
    ...(version ? { version } : {}),
    auth: state,
    printQRInTerminal: false,
    logger: logger.child({ component: "baileys" }),
    browser: [config.botName, "Chrome", "1.0.0"],
    markOnlineOnConnect: false,
    syncFullHistory: false
  });

  sock.ev.on("creds.update", saveCreds);
  let pairingRequested = false;
  sock.ev.on("connection.update", async ({ connection, lastDisconnect }) => {
    if (connection === "connecting") logger.info("Connecting to WhatsApp...");
    if (connection === "open") logger.info("WhatsApp connected.");
    if (connection === "close") {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const loggedOut = statusCode === DisconnectReason.loggedOut;
      logger.warn({ statusCode, loggedOut }, "WhatsApp connection closed");
      if (!loggedOut) setTimeout(() => start().catch(err => logger.error({ err }, "Reconnect failed")), 3000);
      else logger.error("Session logged out. Remove auth_info only if you intend to pair again.");
    }

    if (connection === "connecting" && config.pairingNumber && !sock.authState.creds.registered && !pairingRequested) {
      pairingRequested = true;
      try {
        const code = await sock.requestPairingCode(config.pairingNumber);
        logger.info({ pairingCode: code }, "Enter this pairing code in WhatsApp linked devices");
      } catch (error) {
        pairingRequested = false;
        logger.error({ err: error }, "Could not request pairing code");
      }
    }
  });

  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    if (type !== "notify") return;
    for (const message of messages) {
      try {
        await handleMessage(sock, message, logger);
      } catch (error) {
        logger.error({ err: error }, "Unhandled message error");
      }
    }
  });
}

start().catch(error => {
  logger.fatal({ err: error }, "Startup failed");
  process.exitCode = 1;
});
