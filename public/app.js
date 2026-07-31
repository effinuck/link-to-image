const form               = document.querySelector("#urlForm");
const urlInput           = document.querySelector("#urlInput");
const manualForm         = document.querySelector("#manualForm");
const manualImageUpload  = document.querySelector("#manualImageUpload");
const manualSource       = document.querySelector("#manualSource");
const manualTitle        = document.querySelector("#manualTitle");
const tabAuto            = document.querySelector("#tabAuto");
const tabManual          = document.querySelector("#tabManual");
const autoPanel          = document.querySelector("#autoPanel");
const manualPanel        = document.querySelector("#manualPanel");
const resetButton        = document.querySelector("#resetButton");
const downloadButton     = document.querySelector("#downloadButton");
const statusEl           = document.querySelector("#status");
const canvas             = document.querySelector("#previewCanvas");
const ctx                = canvas.getContext("2d");
const fontStack          = "Poppins, Arial, sans-serif";

const controls = {
  titleSize:    document.querySelector("#titleSize"),
  imageAlign:   document.querySelector("#imageAlign"),
  background:   document.querySelector("#backgroundColor"),
  text:         document.querySelector("#textColor"),
  trim:         document.querySelector("#trimColor"),
  logoUpload:   document.querySelector("#logoUpload"),
  bgImageUpload:document.querySelector("#bgImageUpload"),
  titleFont:    document.querySelector("#titleFont"),
};

let uploadedLogoSrc    = "";
let uploadedBgImageSrc = "";

const defaultData = {
  displayUrl: "sitename.com",
  title: "Title of the webpage or article will appear here",
  image: "https://images.unsplash.com/photo-1558637845-c8b7ead71a3e?q=80&w=1632&auto=format&fit=crop"
};

const defaultControls = {
  titleSize:  "58",
  background: "#000000",
  text:       "#ffffff",
  trim:       "#FFCC00",
  titleFont:  "Poppins, Arial, sans-serif",
};

let currentData = { ...defaultData };

function setStatus(message) { statusEl.textContent = message; }

// ── Text helpers ──────────────────────────────────────────
function fitText(ctx, text, maxWidth, baseSize, minSize, font, weight = "700") {
  let size = baseSize;
  ctx.font = `${weight} ${size}px ${font}`;
  while (size > minSize && ctx.measureText(text).width > maxWidth) {
    size -= 1;
    ctx.font = `${weight} ${size}px ${font}`;
  }
  return size;
}

function wrapText(ctx, text, maxWidth, baseSize, minSize, font, weight = "700") {
  const words = text.split(/\s+/).filter(Boolean);
  const lines = [];
  let line = "";
  let size  = baseSize;

  for (const word of words) {
    const testLine = line ? `${line} ${word}` : word;
    ctx.font = `${weight} ${size}px ${font}`;
    if (ctx.measureText(testLine).width <= maxWidth) {
      line = testLine;
      continue;
    }
    if (line) lines.push(line);
    if (ctx.measureText(word).width > maxWidth) {
      size = fitText(ctx, word, maxWidth, size, minSize, font, weight);
    }
    line = word;
  }
  if (line) lines.push(line);
  return { lines, size };
}

// ── Image helpers ─────────────────────────────────────────
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload  = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

function proxiedImageUrl(src) {
  if (!src) return "";
  if (src.startsWith("data:") || src.startsWith(location.origin)) return src;
  return `/api/image?url=${encodeURIComponent(src)}`;
}

async function drawLogo(data, x, y, size) {
  if (!uploadedLogoSrc) return false;
  try {
    const logo = await loadImage(uploadedLogoSrc);
    const sr   = logo.naturalWidth / logo.naturalHeight;
    const tr   = size / size;
    let dw = size, dh = size;
    if (sr > tr) { dh = size / sr; } else { dw = size * sr; }
    ctx.drawImage(logo, x, y + (size - dh) / 2, dw, dh);
    return true;
  } catch {
    uploadedLogoSrc = "";
    return false;
  }
}

function decodeHtmlEntities(str) {
  return str
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#(\d+);/g,            (_, dec) => String.fromCharCode(Number(dec)))
    .replace(/&amp;/g,  "&").replace(/&lt;/g,   "<").replace(/&gt;/g,    ">")
    .replace(/&quot;/g, '"').replace(/&#39;/g,   "'").replace(/&apos;/g,  "'")
    .replace(/&nbsp;/g, " ").replace(/&ndash;/g, "–").replace(/&mdash;/g, "—")
    .replace(/&lsquo;/g,"\u2018").replace(/&rsquo;/g,"\u2019")
    .replace(/&ldquo;/g,"\u201C").replace(/&rdquo;/g,"\u201D");
}

// ── Draw card ─────────────────────────────────────────────
async function drawCard(data = currentData) {
  currentData = data;

  const width       = 900;
  const totalHeight = Math.round(width * 5 / 4);
  const imageHeight = Math.round(totalHeight / 2);
  const trimHeight  = Math.max(7, Math.round(width * 0.014));
  const padding     = Math.round(width * 0.062);
  const gap         = Math.round(width * 0.042);
  const lowerHeight = totalHeight - imageHeight - trimHeight;

  const titleBase    = Number(controls.titleSize.value) || Math.round(width * 0.069);
  const titleMaxWidth= width - padding * 2;
  const rawTitle     = decodeHtmlEntities(data.title || "Untitled page");
  const logoSize     = Math.round(width * 0.059);
  const labelSize    = Math.round(width * 0.043);
  const sourceRowHeight = uploadedLogoSrc ? logoSize : labelSize;

  canvas.width  = width;
  canvas.height = totalHeight;

  ctx.fillStyle = controls.background.value;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // ── Featured image
  try {
    const image  = await loadImage(proxiedImageUrl(data.image));
    const scale  = imageHeight / image.naturalHeight;
    const drawW  = image.naturalWidth * scale;
    const drawH  = imageHeight;
    if (drawW >= width) {
      const align = controls.imageAlign.value;
      const drawX = align === "left" ? 0 : align === "right" ? width - drawW : (width - drawW) / 2;
      ctx.drawImage(image, drawX, 0, drawW, drawH);
    } else {
      const scaleW = width / image.naturalWidth;
      const fitH   = image.naturalHeight * scaleW;
      ctx.drawImage(image, 0, 0, width, fitH);
    }
  } catch {
    ctx.fillStyle = "#20242b";
    ctx.fillRect(0, 0, width, imageHeight);
    ctx.fillStyle = "#8f98a5";
    ctx.font = `700 ${Math.round(width * 0.035)}px ${fontStack}`;
    ctx.fillText("No featured image found", padding, imageHeight / 2);
  }

  // ── Trim bar
  ctx.fillStyle = controls.trim.value;
  ctx.fillRect(0, imageHeight, width, trimHeight);

  const bodyTop = imageHeight + trimHeight;

  // ── Text background / bg image
  if (uploadedBgImageSrc) {
    try {
      const bgImage = await loadImage(uploadedBgImageSrc);
      const scale   = lowerHeight / bgImage.naturalHeight;
      const drawW   = bgImage.naturalWidth * scale;
      ctx.drawImage(bgImage, width - drawW, bodyTop, drawW, lowerHeight);
    } catch {
      ctx.fillStyle = controls.background.value;
      ctx.fillRect(0, bodyTop, width, lowerHeight);
    }
  } else {
    ctx.fillStyle = controls.background.value;
    ctx.fillRect(0, bodyTop, width, lowerHeight);
  }

  // ── Source / logo row
  const activeTitleFont  = controls.titleFont?.value || fontStack;

  // Anton and Anton SC are single-weight display fonts — don't synthesise bold
  const isAnton     = /^Anton/.test(activeTitleFont);
  const titleWeight = isAnton ? "400" : "700";

  // Build a canvas-safe font string: quote the primary family name if it contains spaces
  // e.g. "Anton SC, Arial, sans-serif" → '"Anton SC", Arial, sans-serif'
  function canvasFontStack(stack) {
    return stack.replace(/^([^,]+)/, (family) => {
      family = family.trim();
      if (family.includes(" ") && !family.startsWith('"') && !family.startsWith("'")) {
        return `"${family}"`;
      }
      return family;
    });
  }
  const safeTitleFont = canvasFontStack(activeTitleFont);

  // Ensure Anton SC is fully loaded before drawing
  if (activeTitleFont.startsWith("Anton SC")) {
    try { await document.fonts.load(`400 60px "Anton SC"`); } catch {}
  }

  const displayUrl  = data.displayUrl || "";
  const sourceTop   = bodyTop + gap;
  const hasLogo     = await drawLogo(data, padding, sourceTop, logoSize);
  const sourceX     = hasLogo ? padding + logoSize + Math.round(width * 0.022) : padding;
  // Source line-height: 1 (single line, baseline is top + labelSize)
  const sourceBaseline = hasLogo ? sourceTop + Math.round(logoSize * 0.72) : sourceTop + labelSize;

  ctx.font      = `400 ${labelSize}px ${fontStack}`;
  ctx.fillStyle = controls.trim.value;
  ctx.fillText(displayUrl, sourceX, sourceBaseline);

  // Anton always renders uppercase; Poppins uses title as-is
  const rawTitleFinal = isAnton ? rawTitle.toUpperCase() : rawTitle;
  const titleTop         = sourceTop + sourceRowHeight + gap;
  const titleAreaBottom  = bodyTop + lowerHeight - padding;
  const { lines, size }  = wrapText(ctx, rawTitleFinal, titleMaxWidth, titleBase, 20, safeTitleFont, titleWeight);
  const lineHeightMultiplier = isAnton ? 1.1 : 1.2;
  const lineHeight       = Math.round(size * lineHeightMultiplier);
  const maxLines         = Math.max(1, Math.floor((titleAreaBottom - titleTop) / lineHeight));
  const visibleLines     = lines.slice(0, maxLines);

  ctx.fillStyle = controls.text.value;
  ctx.font      = `${titleWeight} ${size}px ${safeTitleFont}`;
  ctx.letterSpacing = activeTitleFont.startsWith("Anton") ? "1px" : "0px";
  let y = titleTop + size;
  for (const line of visibleLines) {
    ctx.fillText(line, padding, y);
    y += lineHeight;
  }
  ctx.letterSpacing = "0px"; // reset after title

  if (lines.length > visibleLines.length) {
    setStatus("⚠️ Title is cropped — reduce the font size to fit.");
  }
}

// ── API ───────────────────────────────────────────────────
async function fetchMetadata(url) {
  const response = await fetch(`/api/metadata?url=${encodeURIComponent(url)}`);
  const body     = await response.json();
  if (!response.ok) throw new Error(body.error || "Could not generate the preview.");
  return body;
}

// ── Tabs ──────────────────────────────────────────────────
function setMode(mode) {
  const isManual = mode === "manual";
  tabAuto.classList.toggle("active", !isManual);
  tabAuto.setAttribute("aria-selected", String(!isManual));
  tabManual.classList.toggle("active", isManual);
  tabManual.setAttribute("aria-selected", String(isManual));
  autoPanel.hidden  = isManual;
  manualPanel.hidden = !isManual;
}

tabAuto.addEventListener("click",   () => setMode("auto"));
tabManual.addEventListener("click", () => setMode("manual"));

// ── Manual form ───────────────────────────────────────────
manualForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const source = manualSource.value.trim() || "source.com";
  const title  = manualTitle.value.trim()  || "Untitled";
  const file   = manualImageUpload.files?.[0];

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

// ── Auto form ─────────────────────────────────────────────
form.addEventListener("submit", async (event) => {
  event.preventDefault();
  setStatus("Reading the page...");
  hideAutoEditFields();

  try {
    const metadata = await fetchMetadata(urlInput.value);
    setStatus("Drawing the card...");
    await drawCard(metadata);
    showAutoEditFields(metadata);
    setStatus("Card ready — edit title or source above if needed.");
  } catch (error) {
    setStatus(error instanceof Error ? error.message : "Something went wrong.");
  }
});

// ── Reset ─────────────────────────────────────────────────
resetButton.addEventListener("click", async () => {
  urlInput.value = "";
  manualImageUpload.value = "";
  manualSource.value = "";
  manualTitle.value  = "";
  hideAutoEditFields();
  controls.titleSize.value  = defaultControls.titleSize;
  if (controls.titleFont)    controls.titleFont.value    = defaultControls.titleFont;
  // Reset swatch selections
  [
    ["backgroundColor", defaultControls.background],
    ["textColor",       defaultControls.text],
    ["trimColor",       defaultControls.trim],
  ].forEach(([id, val]) => {
    const picker = document.querySelector(`.swatch-picker[data-target="${id}"]`);
    picker?.querySelectorAll(".swatch").forEach(s =>
      s.classList.toggle("selected", s.dataset.color.toLowerCase() === val.toLowerCase())
    );
    const hidden = document.querySelector(`#${id}`);
    if (hidden) hidden.value = val;
  });
  controls.logoUpload.value    = "";
  controls.bgImageUpload.value = "";
  uploadedLogoSrc    = "";
  uploadedBgImageSrc = "";
  await drawCard({ ...defaultData });
  setStatus("Reset.");
});

// ── Swatch pickers ────────────────────────────────────────
document.querySelectorAll(".swatch-picker").forEach((picker) => {
  const targetId    = picker.dataset.target;
  const hiddenInput = document.querySelector(`#${targetId}`);
  picker.querySelectorAll(".swatch").forEach((swatch) => {
    swatch.addEventListener("click", () => {
      picker.querySelectorAll(".swatch").forEach(s => s.classList.remove("selected"));
      swatch.classList.add("selected");
      hiddenInput.value = swatch.dataset.color;
      hiddenInput.dispatchEvent(new Event("input"));
    });
  });
});

// ── Editable auto fields ──────────────────────────────────
const autoEditFields = document.querySelector("#autoEditFields");
const autoSource     = document.querySelector("#autoSource");
const autoTitle      = document.querySelector("#autoTitle");

function showAutoEditFields(data) {
  autoSource.value = data.displayUrl || "";
  autoTitle.value  = data.title      || "";
  autoEditFields.hidden = false;
}
function hideAutoEditFields() {
  autoEditFields.hidden = true;
  autoSource.value = "";
  autoTitle.value  = "";
}

autoSource.addEventListener("input", () => {
  currentData = { ...currentData, displayUrl: autoSource.value };
  drawCard(currentData);
});
autoTitle.addEventListener("input", () => {
  currentData = { ...currentData, title: autoTitle.value };
  drawCard(currentData);
});

// ── Control listeners ─────────────────────────────────────
for (const control of [controls.titleSize, controls.background, controls.text, controls.trim, controls.imageAlign, controls.titleFont]) {
  control.addEventListener("input", () => drawCard(currentData));
}

// ── Logo upload ───────────────────────────────────────────
controls.logoUpload.addEventListener("change", () => {
  const file = controls.logoUpload.files?.[0];
  if (!file) { uploadedLogoSrc = ""; drawCard(currentData); return; }
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

// ── Background image upload ───────────────────────────────
controls.bgImageUpload.addEventListener("change", () => {
  const file = controls.bgImageUpload.files?.[0];
  if (!file) { uploadedBgImageSrc = ""; drawCard(currentData); return; }
  const reader = new FileReader();
  reader.addEventListener("load", async () => {
    uploadedBgImageSrc = typeof reader.result === "string" ? reader.result : "";
    await drawCard(currentData);
    setStatus("Background image added.");
  });
  reader.readAsDataURL(file);
});

// ── Title size stepper ────────────────────────────────────
document.querySelector("#titleSizeMinus").addEventListener("click", () => {
  const input = controls.titleSize;
  input.value = Math.max(Number(input.min), Number(input.value) - Number(input.step));
  input.dispatchEvent(new Event("input"));
});
document.querySelector("#titleSizePlus").addEventListener("click", () => {
  const input = controls.titleSize;
  input.value = Math.min(Number(input.max), Number(input.value) + Number(input.step));
  input.dispatchEvent(new Event("input"));
});

// ── Download / Open Image ─────────────────────────────────
const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
downloadButton.textContent = isMobile ? "🖼 OPEN IMAGE" : "⬇ DOWNLOAD IMAGE";

downloadButton.addEventListener("click", () => {
  const dataUrl = canvas.toDataURL("image/png");
  if (isMobile) {
    const win = window.open("", "_blank");
    if (win) {
      win.document.write(
        `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1">` +
        `<title>Link Preview Card</title>` +
        `<style>
          * { margin:0; padding:0; box-sizing:border-box; }
          body { background:#111316; min-height:100vh; display:flex; flex-direction:column; }
          .toolbar { display:flex; align-items:center; justify-content:space-between;
            padding:12px 16px; background:#191c21; border-bottom:1px solid #2c3038; flex-shrink:0; }
          .toolbar-hint { color:#a8afb9; font-family:system-ui,sans-serif; font-size:13px; }
          .close-btn { background:#f4f5fb; color:#08090b; border:none; border-radius:6px;
            padding:8px 16px; font-family:system-ui,sans-serif; font-size:13px; font-weight:700; cursor:pointer; }
          .img-wrap { flex:1; display:flex; align-items:flex-start; justify-content:center; padding:16px; }
          img { display:block; width:100%; max-width:600px; height:auto; border-radius:8px; }
        </style></head>` +
        `<body>
          <div class="toolbar">
            <span class="toolbar-hint">Hold image → Save to Photos</span>
            <button class="close-btn" onclick="window.close()">✕ Close</button>
          </div>
          <div class="img-wrap"><img src="${dataUrl}" alt="Link Preview Card"></div>
        </body></html>`
      );
      win.document.close();
    }
  } else {
    const link = document.createElement("a");
    link.download = "link-preview-card.png";
    link.href = dataUrl;
    link.click();
  }
});

// ── Initial draw ──────────────────────────────────────────
document.fonts?.ready.then(() => drawCard()) || drawCard();
