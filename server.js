import http from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const publicDir = join(__dirname, "public");
const host = process.env.HOST || (process.env.NODE_ENV === "production" ? "0.0.0.0" : "127.0.0.1");
const port = Number(process.env.PORT || 4173);

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml; charset=utf-8"
};

const sampleImage = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675" viewBox="0 0 1200 675">
  <defs>
    <linearGradient id="sky" x1="0" x2="0" y1="0" y2="1">
      <stop stop-color="#dce5ef"/>
      <stop offset="1" stop-color="#eef4f7"/>
    </linearGradient>
    <linearGradient id="grass" x1="0" x2="1">
      <stop stop-color="#2f7d35"/>
      <stop offset="1" stop-color="#71a144"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="675" fill="url(#sky)"/>
  <path d="M0 470 C180 430 330 460 510 430 C780 384 920 440 1200 390 L1200 675 L0 675 Z" fill="url(#grass)"/>
  <path d="M130 250 L980 205 L1100 250 L1030 290 L190 330 Z" fill="#1b2732"/>
  <path d="M172 287 L1038 247 L1025 281 L188 324 Z" fill="#2b9ac4"/>
  <g fill="#2a68b7">
    <rect x="205" y="330" width="105" height="90"/><rect x="330" y="324" width="105" height="90"/>
    <rect x="455" y="318" width="105" height="90"/><rect x="580" y="312" width="105" height="90"/>
    <rect x="705" y="306" width="105" height="90"/><rect x="830" y="300" width="105" height="90"/>
  </g>
  <g fill="#f3f7fb" opacity=".95">
    <rect x="245" y="360" width="28" height="18"/><rect x="275" y="360" width="28" height="18"/>
    <rect x="512" y="345" width="28" height="18"/><rect x="542" y="345" width="28" height="18"/>
    <rect x="772" y="333" width="28" height="18"/><rect x="802" y="333" width="28" height="18"/>
  </g>
  <path d="M0 580 C210 545 400 600 605 560 C800 522 980 552 1200 510" fill="none" stroke="#d9f1d7" stroke-width="5" opacity=".65"/>
</svg>`;

function sendJson(res, status, body) {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store"
  });
  res.end(JSON.stringify(body));
}

function absolutize(value, baseUrl) {
  if (!value) return "";
  try {
    return new URL(value, baseUrl).href;
  } catch {
    return "";
  }
}

function decodeHtml(value = "") {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", "\"")
    .replaceAll("&#39;", "'")
    .replaceAll("&apos;", "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .trim();
}

function getMeta(html, keys) {
  for (const key of keys) {
    const patterns = [
      new RegExp(`<meta[^>]+property=["']${key}["'][^>]+content=["']([^"']+)["'][^>]*>`, "i"),
      new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${key}["'][^>]*>`, "i"),
      new RegExp(`<meta[^>]+name=["']${key}["'][^>]+content=["']([^"']+)["'][^>]*>`, "i"),
      new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${key}["'][^>]*>`, "i")
    ];
    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match?.[1]) return decodeHtml(match[1]);
    }
  }
  return "";
}

function getTitle(html) {
  return decodeHtml(
    getMeta(html, ["og:title", "twitter:title"]) ||
      html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ||
      "Untitled page"
  );
}

async function handleMetadata(req, res, target) {
  if (!/^https?:\/\//i.test(target)) {
    sendJson(res, 400, { error: "Paste a full URL starting with http:// or https://." });
    return;
  }

  try {
    const response = await fetch(target, {
      redirect: "follow",
      headers: {
        "accept": "text/html,application/xhtml+xml",
        "user-agent": "Mozilla/5.0 link-preview-card-agent"
      }
    });

    if (!response.ok) {
      sendJson(res, 502, { error: `The page returned ${response.status}.` });
      return;
    }

    const html = await response.text();
    const finalUrl = response.url || target;
    const title = getTitle(html);
    const image = absolutize(getMeta(html, ["og:image", "twitter:image", "twitter:image:src"]), finalUrl);
    const siteName = decodeHtml(getMeta(html, ["og:site_name"])) || new URL(finalUrl).hostname.replace(/^www\./, "");

    sendJson(res, 200, {
      url: finalUrl,
      displayUrl: new URL(finalUrl).hostname.replace(/^www\./, ""),
      title,
      siteName,
      image
    });
  } catch (error) {
    sendJson(res, 500, { error: error instanceof Error ? error.message : "Could not read that page." });
  }
}

async function handleImageProxy(req, res, target) {
  if (!/^https?:\/\//i.test(target)) {
    res.writeHead(400);
    res.end("Invalid image URL");
    return;
  }

  try {
    const image = await fetch(target, {
      redirect: "follow",
      headers: { "user-agent": "Mozilla/5.0 link-preview-card-agent" }
    });

    if (!image.ok) {
      res.writeHead(502);
      res.end("Image fetch failed");
      return;
    }

    res.writeHead(200, {
      "content-type": image.headers.get("content-type") || "image/jpeg",
      "cache-control": "public, max-age=3600",
      "access-control-allow-origin": "*"
    });
    const buffer = Buffer.from(await image.arrayBuffer());
    res.end(buffer);
  } catch {
    res.writeHead(500);
    res.end("Image proxy failed");
  }
}

async function serveStatic(req, res, pathname) {
  const filePath = pathname === "/" ? join(publicDir, "index.html") : join(publicDir, pathname);
  if (!filePath.startsWith(publicDir)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  try {
    const body = await readFile(filePath);
    res.writeHead(200, { "content-type": mimeTypes[extname(filePath)] || "application/octet-stream" });
    res.end(body);
  } catch {
    res.writeHead(404);
    res.end("Not found");
  }
}

const server = http.createServer(async (req, res) => {
  const requestUrl = new URL(req.url || "/", `http://${req.headers.host}`);

  if (requestUrl.pathname === "/api/metadata") {
    await handleMetadata(req, res, requestUrl.searchParams.get("url") || "");
    return;
  }

  if (requestUrl.pathname === "/api/image") {
    await handleImageProxy(req, res, requestUrl.searchParams.get("url") || "");
    return;
  }

  if (requestUrl.pathname === "/sample-image.svg") {
    res.writeHead(200, { "content-type": "image/svg+xml; charset=utf-8" });
    res.end(sampleImage);
    return;
  }

  await serveStatic(req, res, decodeURIComponent(requestUrl.pathname));
});

server.listen(port, host, () => {
  console.log(`Link preview card agent running at http://${host}:${port}`);
});
