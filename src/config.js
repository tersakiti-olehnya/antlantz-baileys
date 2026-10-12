require("dotenv").config();

const config = {
  botName: process.env.BOT_NAME || "ANTLANTZ Baileys",
  ownerNumber: (process.env.OWNER_NUMBER || "").replace(/\D/g, ""),
  pairingNumber: (process.env.PAIRING_NUMBER || "").replace(/\D/g, ""),
  prefix: process.env.PREFIX || ".",
  logLevel: process.env.LOG_LEVEL || "info",
  maxDownloadMb: Math.max(1, Number(process.env.MAX_DOWNLOAD_MB || 50))
};

module.exports = config;
