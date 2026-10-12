const config = require("../config");

/**
 * Provider adapter intentionally stays unimplemented until official API docs
 * and response schemas are supplied. It must not guess undocumented endpoints.
 */
async function downloadMedia(providerName, inputUrl) {
  const provider = String(providerName || "").toLowerCase();
  if (!["airich", "ytmate"].includes(provider)) {
    throw new Error("Provider tidak dikenal. Pilih airich atau ytmate.");
  }

  const configuredUrl = provider === "airich"
    ? process.env.AIRICH_API_URL
    : process.env.YTMATE_API_URL;

  if (!configuredUrl) {
    throw new Error(
      `${provider} belum dikonfigurasi. Isi endpoint API resmi dan API key di .env setelah memeriksa dokumentasi.`
    );
  }

  const parsed = new URL(inputUrl);
  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("URL harus HTTP atau HTTPS.");
  }

  throw new Error(
    `Adapter ${provider} belum aktif. MAX_DOWNLOAD_MB=${config.maxDownloadMb}. Diperlukan dokumentasi API resmi untuk implementasi dan pengujian.`
  );
}

module.exports = { downloadMedia };
