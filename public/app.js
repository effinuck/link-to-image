const form = document.querySelector("#urlForm");
const urlInput = document.querySelector("#urlInput");
const sampleButton = document.querySelector("#sampleButton");
const downloadButton = document.querySelector("#downloadButton");
const statusEl = document.querySelector("#status");
const canvas = document.querySelector("#previewCanvas");
const ctx = canvas.getContext("2d");
const fontStack = "Poppins, Arial, sans-serif";

const controls = {
  width: document.querySelector("#cardWidth"),
  titleSize: document.querySelector("#titleSize"),
  background: document.querySelector("#backgroundColor"),
  text: document.querySelector("#textColor"),
  trim: document.querySelector("#trimColor"),
  logoUpload: document.querySelector("#logoUpload"),
  logoText: document.querySelector("#logoText")
};

let uploadedLogoSrc = "";

let currentData = {
  displayUrl: "irishmirror.ie",
  title: "What time and TV channel is Kilkenny v Galway on in the Leinster U20 final?",
  image: "/sample-image.svg"
};

function setStatus(message) {
  statusEl.textContent = message;
}

function fitText(ctx, text, maxWidth, baseSize, minSize) {
  let size = baseSize;
  ctx.font = `800 ${size}px ${fontStack}`;
  while (size > minSize && ctx.measureText(text).width > maxWidth) {
    size -= 1;
    ctx.font = `800 ${size}px ${fontStack}`;
  }
  return size;
}

function wrapText(ctx, text, maxWidth, baseSize, minSize) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines = [];
  let line = "";
  let size = baseSize;

  for (const word of words) {
    const testLine = line ? `${line} ${word}` : word;
    ctx.font = `800 ${size}px ${fontStack}`;

    if (ctx.measureText(testLine).width <= maxWidth) {
      line = testLine;
      continue;
    }

    if (line) lines.push(line);

    if (ctx.measureText(word).width > maxWidth) {
      size = fitText(ctx, word, maxWidth, size, minSize);
    }

    line = word;
  }

  if (line) lines.push(line);
  return { lines, size };
}

function drawCoverImage(image, x, y, width, height) {
  const sourceRatio = image.naturalWidth / image.naturalHeight;
  const targetRatio = width / height;
  let sx = 0;
  let sy = 0;
  let sw = image.naturalWidth;
  let sh = image.naturalHeight;

  if (sourceRatio > targetRatio) {
    sw = image.naturalHeight * targetRatio;
    sx = (image.naturalWidth - sw) / 2;
  } else {
    sh = image.naturalWidth / targetRatio;
    sy = (image.naturalHeight - sh) / 2;
  }

  ctx.drawImage(image, sx, sy, sw, sh, x, y, width, height);
}

function roundedRect(ctx, x, y, width, height, radius) {
  const safeRadius = Math.min(radius, width / 10, height / 10);
  ctx.beginPath();
  ctx.moveTo(x + safeRadius, y);
  ctx.lineTo(x + width - safeRadius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + safeRadius);
  ctx.lineTo(x + width, y + height - safeRadius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - safeRadius, y + height);
  ctx.lineTo(x + safeRadius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - safeRadius);
  ctx.lineTo(x, y + safeRadius);
  ctx.quadraticCurveTo(x, y, x + safeRadius, y);
  ctx.closePath();
}

function getInitials(value = "") {
  return value
    .replace(/^www\./, "")
    .split(/[.\s-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "LP";
}

function drawLogoMark(label, x, y, size) {
  ctx.fillStyle = "#060708";
  ctx.font = `800 ${Math.round(size * 0.36)}px ${fontStack}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const logoText = controls.logoText.value.trim().toUpperCase() || getInitials(label);
  ctx.fillText(logoText, x + size / 2, y + size / 2 + 1);
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
}

function drawContainedImage(image, x, y, width, height) {
  const sourceRatio = image.naturalWidth / image.naturalHeight;
  const targetRatio = width / height;
  let drawWidth = width;
  let drawHeight = height;

  if (sourceRatio > targetRatio) {
    drawHeight = width / sourceRatio;
  } else {
    drawWidth = height * sourceRatio;
  }

  ctx.drawImage(image, x + (width - drawWidth) / 2, y + (height - drawHeight) / 2, drawWidth, drawHeight);
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

function proxiedImageUrl(src) {
  if (!src) return "";
  if (src.startsWith("/") || src.startsWith(location.origin)) return src;
  return `/api/image?url=${encodeURIComponent(src)}`;
}

async function drawLogo(data, x, y, size) {
  if (uploadedLogoSrc) {
    try {
      const logo = await loadImage(uploadedLogoSrc);
      drawContainedImage(logo, x, y, size, size);
      return;
    } catch {
      uploadedLogoSrc = "";
    }
  }

  roundedRect(ctx, x, y, size, size, Math.round(size * 0.18));
  ctx.fillStyle = controls.trim.value;
  ctx.fill();
  drawLogoMark(data.siteName || data.displayUrl || "LP", x, y, size);
}

async function drawCard(data = currentData) {
  currentData = data;

  const width = Number(controls.width.value) || 900;
  const imageHeight = Math.round(width * 9 / 16);
  const lowerHeight = Math.round(width * 0.55);
  const trimHeight = Math.max(7, Math.round(width * 0.014));
  const padding = Math.round(width * 0.062);
  const gap = Math.round(width * 0.042);

  canvas.width = width;
  canvas.height = imageHeight + trimHeight + lowerHeight;

  ctx.fillStyle = controls.background.value;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  try {
    const image = await loadImage(proxiedImageUrl(data.image));
    drawCoverImage(image, 0, 0, width, imageHeight);
  } catch {
    ctx.fillStyle = "#20242b";
    ctx.fillRect(0, 0, width, imageHeight);
    ctx.fillStyle = "#8f98a5";
    ctx.font = `700 ${Math.round(width * 0.035)}px ${fontStack}`;
    ctx.fillText("No featured image found", padding, imageHeight / 2);
  }

  ctx.fillStyle = controls.trim.value;
  ctx.fillRect(0, imageHeight, width, trimHeight);

  const bodyTop = imageHeight + trimHeight;
  ctx.fillStyle = controls.background.value;
  ctx.fillRect(0, bodyTop, width, lowerHeight);

  const displayUrl = data.displayUrl || "";
  const logoSize = Math.round(width * 0.059);
  const labelSize = Math.round(width * 0.043);
  const logoY = bodyTop + Math.round(padding * 0.72);
  await drawLogo(data, padding, logoY, logoSize);

  ctx.font = `400 ${labelSize}px ${fontStack}`;
  ctx.fillStyle = controls.trim.value;
  ctx.fillText(displayUrl, padding + logoSize + Math.round(width * 0.022), logoY + Math.round(logoSize * 0.72));

  const titleBase = Number(controls.titleSize.value) || Math.round(width * 0.069);
  const titleMaxWidth = width - padding * 2;
  const { lines, size } = wrapText(ctx, data.title || "Untitled page", titleMaxWidth, titleBase, 34);
  const lineHeight = Math.round(size * 1.2);
  const titleTop = logoY + logoSize + gap;
  const maxLines = Math.max(2, Math.floor((canvas.height - titleTop - padding) / lineHeight));
  const visibleLines = lines.slice(0, maxLines);
  if (lines.length > visibleLines.length) {
    visibleLines[visibleLines.length - 1] = `${visibleLines.at(-1).replace(/[.,;:!?]*$/, "")}...`;
  }

  ctx.fillStyle = controls.text.value;
  ctx.font = `800 ${size}px ${fontStack}`;
  let y = titleTop + size;
  for (const line of visibleLines) {
    ctx.fillText(line, padding, y);
    y += lineHeight;
  }
}

async function fetchMetadata(url) {
  const response = await fetch(`/api/metadata?url=${encodeURIComponent(url)}`);
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || "Could not generate the preview.");
  return body;
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  setStatus("Reading the page...");

  try {
    const metadata = await fetchMetadata(urlInput.value);
    setStatus("Drawing the card...");
    await drawCard(metadata);
    setStatus("Card ready.");
  } catch (error) {
    setStatus(error instanceof Error ? error.message : "Something went wrong.");
  }
});

sampleButton.addEventListener("click", async () => {
  urlInput.value = `${location.origin}/sample-article.html`;
  setStatus("Loading sample...");
  const metadata = await fetchMetadata(urlInput.value);
  await drawCard(metadata);
  setStatus("Sample card ready.");
});

downloadButton.addEventListener("click", () => {
  const link = document.createElement("a");
  link.download = "link-preview-card.png";
  link.href = canvas.toDataURL("image/png");
  link.click();
});

for (const control of [controls.width, controls.titleSize, controls.background, controls.text, controls.trim, controls.logoText]) {
  control.addEventListener("input", () => drawCard(currentData));
}

controls.logoUpload.addEventListener("change", () => {
  const file = controls.logoUpload.files?.[0];
  if (!file) {
    uploadedLogoSrc = "";
    drawCard(currentData);
    return;
  }

  if (file.type !== "image/png") {
    controls.logoUpload.value = "";
    setStatus("Please upload a PNG logo.");
    return;
  }

  const reader = new FileReader();
  reader.addEventListener("load", async () => {
    uploadedLogoSrc = typeof reader.result === "string" ? reader.result : "";
    await drawCard(currentData);
    setStatus("Logo added.");
  });
  reader.readAsDataURL(file);
});

document.fonts?.ready.then(() => drawCard()) || drawCard();
