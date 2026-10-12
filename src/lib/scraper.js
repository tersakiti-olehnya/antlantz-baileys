const cheerio = require("cheerio");
const dns = require("node:dns/promises");
const net = require("node:net");

function isPrivateIp(ip) {
  if (net.isIPv4(ip)) {
    const p = ip.split(".").map(Number);
    return p[0] === 10 || p[0] === 127 ||
      (p[0] === 169 && p[1] === 254) ||
      (p[0] === 172 && p[1] >= 16 && p[1] <= 31) ||
      (p[0] === 192 && p[1] === 168) || p[0] === 0;
  }
  if (net.isIPv6(ip)) {
    const s = ip.toLowerCase();
    return s === "::1" || s.startsWith("fc") || s.startsWith("fd") ||
      s.startsWith("fe80:") || s === "::";
  }
  return true;
}

async function scrapeMetadata(rawUrl) {
  const url = new URL(rawUrl);
  if (!["http:", "https:"].includes(url.protocol)) throw new Error("URL harus HTTP atau HTTPS.");
  if (url.username || url.password) throw new Error("URL dengan kredensial tidak diizinkan.");

  const records = await dns.lookup(url.hostname, { all: true });
  if (!records.length || records.some(r => isPrivateIp(r.address))) {
    throw new Error("Alamat tujuan tidak diizinkan.");
  }

  const response = await fetch(url, {
    redirect: "error",
    signal: AbortSignal.timeout(8000),
    headers: { "user-agent": "ANTLANTZ-Baileys/0.1 (metadata preview)" }
  });
  if (!response.ok) throw new Error(`Website merespons HTTP ${response.status}.`);
  const type = response.headers.get("content-type") || "";
  if (!type.includes("text/html")) throw new Error("URL bukan halaman HTML.");

  const declaredLength = Number(response.headers.get("content-length") || 0);
  if (declaredLength > 1_000_000) throw new Error("Halaman terlalu besar.");

  const html = await response.text();
  if (Buffer.byteLength(html, "utf8") > 1_000_000) throw new Error("Halaman terlalu besar.");
  const $ = cheerio.load(html);
  return {
    url: url.href,
    title: $('meta[property="og:title"]').attr("content") || $("title").first().text().trim() || "Tanpa judul",
    description: $('meta[property="og:description"]').attr("content") ||
      $('meta[name="description"]').attr("content") || "",
    image: $('meta[property="og:image"]').attr("content") || null
  };
}

module.exports = { scrapeMetadata };
