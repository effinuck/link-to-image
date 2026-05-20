const form = document.querySelector("#urlForm");
const urlInput = document.querySelector("#urlInput");
const resetButton = document.querySelector("#resetButton");
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
  logoUpload: document.querySelector("#logoUpload")
};

let uploadedLogoSrc = "";

const defaultData = {
  displayUrl: "irishmirror.ie",
  title: "What time and TV channel is Kilkenny v Galway on in the Leinster U20 final?",
  image: "/sample-image.svg"
};

const defaultControls = {
  width: "900",
  titleSize: "58",
  background: "#000000",
  text: "#f4f5fb",
  trim: "#f0d13a"
};

let currentData = { ...defaultData };

function setStatus(message) {
  statusEl.textContent = message;
}

function fitText(ctx, text, maxWidth, baseSize, minSize) {
  let size = baseSize;
  ctx.font = `700 ${size}px ${fontStack}`;
  while (size > minSize && ctx.measureText(text).width > maxWidth) {
    size -= 1;
    ctx.font = `700 ${size}px ${fontStack}`;
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
    ctx.font = `700 ${size}px ${fontStack}`;

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
  if (!uploadedLogoSrc) return false;

  try {
    const logo = await loadImage(uploadedLogoSrc);
    drawContainedImage(logo, x, y, size, size);
    return true;
  } catch {
    uploadedLogoSrc = "";
    return false;
  }
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
  const sourceGap = gap;
  const sourceTop = bodyTop + sourceGap;
  const hasLogo = await drawLogo(data, padding, sourceTop, logoSize);
  const sourceRowHeight = hasLogo ? logoSize : labelSize;
  const sourceX = hasLogo ? padding + logoSize + Math.round(width * 0.022) : padding;
  const sourceBaseline = hasLogo
    ? sourceTop + Math.round(logoSize * 0.72)
    : sourceTop + labelSize;

  ctx.font = `400 ${labelSize}px ${fontStack}`;
  ctx.fillStyle = controls.trim.value;
  ctx.fillText(displayUrl, sourceX, sourceBaseline);

  const titleBase = Number(controls.titleSize.value) || Math.round(width * 0.069);
  const titleMaxWidth = width - padding * 2;
  const { lines, size } = wrapText(ctx, data.title || "Untitled page", titleMaxWidth, titleBase, 34);
  const lineHeight = Math.round(size * 1.2);
  const titleTop = sourceTop + sourceRowHeight + sourceGap;
  const maxLines = Math.max(2, Math.floor((canvas.height - titleTop - padding) / lineHeight));
  const visibleLines = lines.slice(0, maxLines);
  if (lines.length > visibleLines.length) {
    visibleLines[visibleLines.length - 1] = `${visibleLines.at(-1).replace(/[.,;:!?]*$/, "")}...`;
  }

  ctx.fillStyle = controls.text.value;
  ctx.font = `700 ${size}px ${fontStack}`;
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

resetButton.addEventListener("click", async () => {
  urlInput.value = "";
  controls.width.value = defaultControls.width;
  controls.titleSize.value = defaultControls.titleSize;
  controls.background.value = defaultControls.background;
  controls.text.value = defaultControls.text;
  controls.trim.value = defaultControls.trim;
  controls.logoUpload.value = "";
  uploadedLogoSrc = "";
  await drawCard({ ...defaultData });
  setStatus("Reset.");
});

downloadButton.addEventListener("click", () => {
  const link = document.createElement("a");
  link.download = "link-preview-card.png";
  link.href = canvas.toDataURL("image/png");
  link.click();
});

for (const control of [controls.width, controls.titleSize, controls.background, controls.text, controls.trim]) {
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
