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

const BASE_RETRY_MS = 2000;
const MAX_RETRY_MS = 60000;
let reconnectTimer = null;
let reconnectAttempts = 0;
let isShuttingDown = false;
let activeSocket = null;

function printBanner() {
  const cyan = "\x1b[36m";
  const blue = "\x1b[34m";
  const reset = "\x1b[0m";
  const shadow = "\x1b[90m";
  console.log("");
  console.log(cyan + "███████╗███████╗ █████╗ ███╗   ██╗" + reset);
  console.log(cyan + "╚══███╔╝██╔════╝██╔══██╗████╗  ██║" + reset);
  console.log(cyan + "  ███╔╝ █████╗  ███████║██╔██╗ ██║" + reset);
  console.log(cyan + " ███╔╝  ██╔══╝  ██╔══██║██║╚██╗██║" + reset);
  console.log(cyan + "███████╗███████╗██║  ██║██║ ╚████║" + reset);
  console.log(cyan + "╚══════╝╚══════╝╚═╝  ╚═╝╚═╝  ╚═══╝" + reset);
  console.log(blue + "████████╗███████╗██╗  ██╗████████╗" + reset);
  console.log(blue + "╚══██╔══╝██╔════╝╚██╗██╔╝╚══██╔══╝" + reset);
  console.log(blue + "   ██║   █████╗   ╚███╔╝    ██║   " + reset);
  console.log(blue + "   ██║   ██╔══╝   ██╔██╗    ██║   " + reset);
  console.log(blue + "   ██║   ███████╗██╔╝ ██╗   ██║   " + reset);
  console.log(blue + "   ╚═╝   ╚══════╝╚═╝  ╚═╝   ╚═╝   " + reset);
  console.log(shadow + "          ▄▄▄  ▄▄▄ ▄▄▄  ▄▄▄" + reset);
  console.log("");
  console.log(cyan + "Thank you for using our baileys, we hope you like it. :>" + reset);
  console.log("");
}

function errorAdvice(code, error) {
  const message = String(error?.message || error || "");
  if (code === DisconnectReason.loggedOut || code === 401 || /logged.?out|unauthorized/i.test(message)) {
    return "SESSION LOGGED OUT: pairing ulang diperlukan. Jangan hapus auth_info otomatis.";
  }
  if (code === DisconnectReason.restartRequired || code === 515) {
    return "RESTART REQUIRED: membuat koneksi baru dengan sesi yang sama.";
  }
  if (code === 408 || code === 428 || code === 503 || /timed? out|timeout|connection closed|socket/i.test(message)) {
    return "KONEKSI SEMENTARA: akan mencoba reconnect dengan jeda bertahap.";
  }
  if (code === 440 || /conflict|replaced/i.test(message)) {
    return "KONFLIK PERANGKAT: periksa apakah akun sedang terhubung dari sesi bot lain.";
  }
  if (code === 500 || /bad session/i.test(message)) {
    return "SESI BERMASALAH: periksa versi Baileys dan sesi; jangan hapus data sesi tanpa konfirmasi.";
  }
  return "ERROR TIDAK DIKENALI: dicatat ke log; reconnect dicoba jika sesi masih valid.";
}

function scheduleReconnect(reason) {
  if (isShuttingDown || reconnectTimer) return;
  reconnectAttempts += 1;
  const delay = Math.min(BASE_RETRY_MS * (2 ** Math.min(reconnectAttempts - 1, 5)), MAX_RETRY_MS);
  const jitter = Math.floor(Math.random() * 1000);
  logger.warn({ reason, attempt: reconnectAttempts, delayMs: delay + jitter }, "Reconnect dijadwalkan");
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    startSocket().catch((error) => {
      logger.error({ err: error }, "Gagal membuat koneksi baru");
      scheduleReconnect("socket-start-failed");
    });
  }, delay + jitter);
}

async function startSocket() {
  if (isShuttingDown) return;
  const authDir = path.join(process.cwd(), "auth_info");
  fs.mkdirSync(authDir, { recursive: true });
  const { state, saveCreds } = await useMultiFileAuthState(authDir);

  let version;
  try {
    const latest = await fetchLatestBaileysVersion();
    version = latest.version;
    logger.info({ version }, "Versi Baileys dipilih");
  } catch (error) {
    logger.warn({ err: error }, "Gagal memeriksa versi terbaru; memakai default library");
  }

  const sock = makeWASocket({
    ...(version ? { version } : {}),
    auth: state,
    printQRInTerminal: false,
    logger: logger.child({ component: "baileys" }),
    browser: [config.botName, "Chrome", "1.0.0"],
    markOnlineOnConnect: false,
    syncFullHistory: false,
    connectTimeoutMs: 60000,
    defaultQueryTimeoutMs: 60000,
    keepAliveIntervalMs: 25000
  });
  activeSocket = sock;
  let pairingRequested = false;

  sock.ev.on("creds.update", () => {
    saveCreds().catch((error) => logger.error({ err: error }, "Gagal menyimpan kredensial sesi"));
  });

  sock.ev.on("connection.update", async ({ connection, lastDisconnect }) => {
    if (connection === "connecting") logger.info("Menghubungkan ke WhatsApp...");
    if (connection === "open") {
      reconnectAttempts = 0;
      logger.info("WhatsApp tersambung. Bot siap.");
    }

    if (connection === "close") {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const loggedOut = statusCode === DisconnectReason.loggedOut;
      logger.error({
        statusCode: statusCode ?? "unknown",
        advice: errorAdvice(statusCode, lastDisconnect?.error),
        err: lastDisconnect?.error
      }, "Koneksi WhatsApp terputus");

      if (activeSocket === sock) activeSocket = null;
      if (loggedOut) {
        logger.error("Perlu pairing ulang. Bot tidak akan menghapus sesi secara otomatis.");
        return;
      }
      scheduleReconnect(statusCode ?? "unknown");
    }

    if (
      connection === "connecting" &&
      config.pairingNumber &&
      !sock.authState.creds.registered &&
      !pairingRequested
    ) {
      pairingRequested = true;
      try {
        const code = await sock.requestPairingCode(config.pairingNumber);
        console.log("");
        console.log("\x1b[1m\x1b[36mPAIRING CODE\x1b[0m");
        console.log("\x1b[1m\x1b[33m  " + code + "  \x1b[0m");
        console.log("Masukkan kode ini di WhatsApp > Perangkat tertaut > Tautkan dengan nomor telepon.");
        console.log("Jangan bagikan kode pairing ini ke siapa pun.");
        console.log("");
      } catch (error) {
        pairingRequested = false;
        logger.error({ err: error, advice: errorAdvice(error?.output?.statusCode, error) }, "Gagal meminta pairing code");
      }
    }
  });

  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    if (type !== "notify") return;
    for (const message of messages) {
      try {
        await handleMessage(sock, message, logger);
      } catch (error) {
        logger.error({ err: error }, "Error saat memproses pesan");
      }
    }
  });
}

async function shutdown(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  logger.warn({ signal }, "Mematikan bot dengan aman");
  if (reconnectTimer) clearTimeout(reconnectTimer);
  reconnectTimer = null;
  try {
    if (activeSocket?.ws && activeSocket.ws.readyState !== 3) activeSocket.end(undefined);
  } catch (error) {
    logger.error({ err: error }, "Error saat menutup koneksi");
  }
  setTimeout(() => process.exit(0), 500).unref();
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

process.on("uncaughtException", (error) => {
  logger.fatal({ err: error, advice: errorAdvice(undefined, error) }, "Uncaught exception; process akan keluar agar panel dapat restart");
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  logger.error({ err: reason, advice: errorAdvice(undefined, reason) }, "Unhandled promise rejection");
});

printBanner();
startSocket().catch((error) => {
  logger.fatal({ err: error, advice: errorAdvice(undefined, error) }, "Startup gagal");
  process.exit(1);
});
