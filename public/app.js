const form = document.querySelector("#urlForm");
const urlInput = document.querySelector("#urlInput");
const manualForm = document.querySelector("#manualForm");
const manualImageUpload = document.querySelector("#manualImageUpload");
const manualSource = document.querySelector("#manualSource");
const manualTitle = document.querySelector("#manualTitle");
const tabAuto = document.querySelector("#tabAuto");
const tabManual = document.querySelector("#tabManual");
const autoPanel = document.querySelector("#autoPanel");
const manualPanel = document.querySelector("#manualPanel");
const resetButton = document.querySelector("#resetButton");
const downloadButton = document.querySelector("#downloadButton");
const statusEl = document.querySelector("#status");
const canvas = document.querySelector("#previewCanvas");
const ctx = canvas.getContext("2d");
const fontStack = "Poppins, Arial, sans-serif";

const controls = {
  titleSize: document.querySelector("#titleSize"),
  imageAlign: document.querySelector("#imageAlign"),
  background: document.querySelector("#backgroundColor"),
  text: document.querySelector("#textColor"),
  trim: document.querySelector("#trimColor"),
  logoUpload: document.querySelector("#logoUpload"),
  bgImageUpload: document.querySelector("#bgImageUpload")
};

let uploadedLogoSrc = "";
let uploadedBgImageSrc = "";

const defaultData = {
  displayUrl: "sitename.com",
  title: "Title of the webpage or article will appear here",
  image: "https://images.unsplash.com/photo-1558637845-c8b7ead71a3e?q=80&w=1632&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
};

const defaultControls = {
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
    // Image is wider than target: crop sides equally (centre crop)
    sw = image.naturalHeight * targetRatio;
    sx = (image.naturalWidth - sw) / 2;
  } else {
    // Image is taller than target: crop from bottom only (keep top)
    sh = image.naturalWidth / targetRatio;
    sy = 0;
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
  if (src.startsWith("data:") || src.startsWith("/") || src.startsWith(location.origin)) return src;
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

function decodeHtmlEntities(str) {
  return str
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(Number(dec)))
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&ndash;/g, "–")
    .replace(/&mdash;/g, "—")
    .replace(/&lsquo;/g, "\u2018")
    .replace(/&rsquo;/g, "\u2019")
    .replace(/&ldquo;/g, "\u201C")
    .replace(/&rdquo;/g, "\u201D");
}

async function drawCard(data = currentData) {
  currentData = data;

  const width = 900;
  const totalHeight = Math.round(width * 5 / 4); // overall card is 4:5
  const imageHeight = Math.round(totalHeight / 2); // top photo fills exactly half the card
  const trimHeight = Math.max(7, Math.round(width * 0.014));
  const padding = Math.round(width * 0.062);
  const gap = Math.round(width * 0.042);
  const lowerHeight = totalHeight - imageHeight - trimHeight;

  const titleBase = Number(controls.titleSize.value) || Math.round(width * 0.069);
  const titleMaxWidth = width - padding * 2;
  const rawTitle = decodeHtmlEntities(data.title || "Untitled page");
  const logoSize = Math.round(width * 0.059);
  const labelSize = Math.round(width * 0.043);
  const sourceRowHeight = uploadedLogoSrc ? logoSize : labelSize;

  canvas.width = width;
  canvas.height = totalHeight;

  ctx.fillStyle = controls.background.value;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  try {
    const image = await loadImage(proxiedImageUrl(data.image));
    const scale = imageHeight / image.naturalHeight;
    const drawW = image.naturalWidth * scale;
    const drawH = imageHeight;

    if (drawW >= width) {
      // Image is wide enough to fill — fit to height, crop left/right per alignment
      const align = controls.imageAlign.value;
      const drawX = align === "left" ? 0 : align === "right" ? width - drawW : (width - drawW) / 2;
      ctx.drawImage(image, drawX, 0, drawW, drawH);
    } else {
      // Image is too narrow — fit to width instead, crop top/bottom from top
      const scaleW = width / image.naturalWidth;
      const fitH = image.naturalHeight * scaleW;
      ctx.drawImage(image, 0, 0, width, fitH);
    }
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

  // Draw background image behind text area if uploaded
  if (uploadedBgImageSrc) {
    try {
      const bgImage = await loadImage(uploadedBgImageSrc);
      // Scale to fill height, maintain aspect ratio, align to right edge
      const scale = lowerHeight / bgImage.naturalHeight;
      const drawW = bgImage.naturalWidth * scale;
      const drawH = lowerHeight;
      const drawX = width - drawW; // right-aligned
      ctx.drawImage(bgImage, drawX, bodyTop, drawW, drawH);
    } catch {
      ctx.fillStyle = controls.background.value;
      ctx.fillRect(0, bodyTop, width, lowerHeight);
    }
  } else {
    ctx.fillStyle = controls.background.value;
    ctx.fillRect(0, bodyTop, width, lowerHeight);
  }

  const displayUrl = data.displayUrl || "";
  const sourceTop = bodyTop + gap;
  const hasLogo = await drawLogo(data, padding, sourceTop, logoSize);
  const sourceX = hasLogo ? padding + logoSize + Math.round(width * 0.022) : padding;
  const sourceBaseline = hasLogo
    ? sourceTop + Math.round(logoSize * 0.72)
    : sourceTop + labelSize;

  ctx.font = `400 ${labelSize}px ${fontStack}`;
  ctx.fillStyle = controls.trim.value;
  ctx.fillText(displayUrl, sourceX, sourceBaseline);

  const titleTop = sourceTop + sourceRowHeight + gap;
  const titleAreaBottom = bodyTop + lowerHeight - padding;

  // Measure and wrap title within fixed panel
  const { lines, size } = wrapText(ctx, rawTitle, titleMaxWidth, titleBase, 20);
  const lineHeight = Math.round(size * 1.2);

  // Only draw lines that fit within the fixed text panel
  const maxLines = Math.max(1, Math.floor((titleAreaBottom - titleTop) / lineHeight));
  const visibleLines = lines.slice(0, maxLines);
  const isClipped = lines.length > visibleLines.length;

  ctx.fillStyle = controls.text.value;
  ctx.font = `700 ${size}px ${fontStack}`;
  let y = titleTop + size;
  for (const line of visibleLines) {
    ctx.fillText(line, padding, y);
    y += lineHeight;
  }

  if (isClipped) {
    setStatus("⚠️ Title is cropped — reduce the font size to fit.");
  }
}

async function fetchMetadata(url) {
  const response = await fetch(`/api/metadata?url=${encodeURIComponent(url)}`);
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || "Could not generate the preview.");
  return body;
}

function setMode(mode) {
  const isManual = mode === "manual";
  tabAuto.classList.toggle("active", !isManual);
  tabAuto.setAttribute("aria-selected", String(!isManual));
  tabManual.classList.toggle("active", isManual);
  tabManual.setAttribute("aria-selected", String(isManual));
  autoPanel.hidden = isManual;
  manualPanel.hidden = !isManual;
}

tabAuto.addEventListener("click", () => setMode("auto"));
tabManual.addEventListener("click", () => setMode("manual"));

// Manual form submit
manualForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const source = manualSource.value.trim() || "source.com";
  const title = manualTitle.value.trim() || "Untitled";
  const file = manualImageUpload.files?.[0];

  const getImageSrc = () => new Promise((resolve) => {
    if (!file) { resolve(defaultData.image); return; }
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(reader.result));
    reader.readAsDataURL(file);
  });

  setStatus("Drawing the card...");
  const imageSrc = await getImageSrc();
  await drawCard({ displayUrl: source, title, image: imageSrc });
  setStatus("Card ready.");
});

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
  manualImageUpload.value = "";
  manualSource.value = "";
  manualTitle.value = "";
  controls.titleSize.value = defaultControls.titleSize;
  controls.background.value = defaultControls.background;
  controls.text.value = defaultControls.text;
  controls.trim.value = defaultControls.trim;
  controls.logoUpload.value = "";
  controls.bgImageUpload.value = "";
  uploadedLogoSrc = "";
  uploadedBgImageSrc = "";
  await drawCard({ ...defaultData });
  setStatus("Reset.");
});

function triggerDownload() {
  const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
  const link = document.createElement("a");
  link.download = "link-preview-card.jpg";
  link.href = dataUrl;
  link.click();
}

downloadButton.addEventListener("click", triggerDownload);

// ── Share modal ───────────────────────────────────────────
const shareButton      = document.querySelector("#shareButton");
const shareOverlay     = document.querySelector("#shareOverlay");
const shareClose       = document.querySelector("#shareClose");
const sharePreviewImg  = document.querySelector("#sharePreviewImg");
const shareDownloadBtn = document.querySelector("#shareDownloadBtn");

function openShareModal() {
  sharePreviewImg.src = canvas.toDataURL("image/jpeg", 0.92);
  shareOverlay.hidden = false;
  document.body.style.overflow = "hidden";
}

function closeShareModal() {
  shareOverlay.hidden = true;
  document.body.style.overflow = "";
}

shareButton.addEventListener("click", openShareModal);
shareClose.addEventListener("click", closeShareModal);
shareDownloadBtn.addEventListener("click", () => { triggerDownload(); closeShareModal(); });

// Close on backdrop click
shareOverlay.addEventListener("click", (e) => {
  if (e.target === shareOverlay) closeShareModal();
});

// Close on Escape
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !shareOverlay.hidden) closeShareModal();
});

// ── Meta Business Suite — copy to clipboard then open ────
const shareMetaBtn = document.querySelector("#shareMeta");

shareMetaBtn.addEventListener("click", async (e) => {
  e.preventDefault();

  const toastEl = document.querySelector("#metaToast");

  try {
    // Convert canvas to a PNG blob (clipboard API requires PNG)
    const blob = await new Promise((res, rej) =>
      canvas.toBlob(b => b ? res(b) : rej(new Error("Blob failed")), "image/png")
    );

    await navigator.clipboard.write([
      new ClipboardItem({ "image/png": blob })
    ]);

    // Show success toast then open MBS
    showToast(toastEl, "✓ Image copied! Paste it into your new post.", "success");
  } catch {
    // Clipboard API not supported (e.g. iOS Safari) — fall back to just opening MBS
    showToast(toastEl, "Open MBS and attach the downloaded image to your post.", "info");
  }

  // Open Meta Business Suite after a short delay so toast is visible
  setTimeout(() => window.open("https://business.facebook.com/", "_blank", "noopener"), 900);
});

function showToast(el, message, type) {
  el.textContent = message;
  el.dataset.type = type;
  el.hidden = false;
  clearTimeout(el._hideTimer);
  el._hideTimer = setTimeout(() => { el.hidden = true; }, 3500);
}

for (const control of [controls.titleSize, controls.background, controls.text, controls.trim, controls.imageAlign]) {
  control.addEventListener("input", () => drawCard(currentData));
}

controls.logoUpload.addEventListener("change", () => {
  const file = controls.logoUpload.files?.[0];
  if (!file) {
    uploadedLogoSrc = "";
    drawCard(currentData);
    return;
  }

  if (file.type !== "image/png" && file.type !== "image/svg+xml") {
    controls.logoUpload.value = "";
    setStatus("Please upload a PNG or SVG logo.");
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

controls.bgImageUpload.addEventListener("change", () => {
  const file = controls.bgImageUpload.files?.[0];
  if (!file) {
    uploadedBgImageSrc = "";
    drawCard(currentData);
    return;
  }

  const reader = new FileReader();
  reader.addEventListener("load", async () => {
    uploadedBgImageSrc = typeof reader.result === "string" ? reader.result : "";
    await drawCard(currentData);
    setStatus("Background image added.");
  });
  reader.readAsDataURL(file);
});

document.fonts?.ready.then(() => drawCard()) || drawCard();
