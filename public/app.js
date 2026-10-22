// ─── Colour palette ──────────────────────────────────────────────────────────
const COLOURS = [
  { name: "Black",      hex: "#000000" },
  { name: "White",      hex: "#ffffff" },
  { name: "Saffron",    hex: "#FFCC00" },
  { name: "Red",        hex: "#CC0000" },
  { name: "Royal Blue", hex: "#214DCF" },
  { name: "Green",      hex: "#008A2E" },
  { name: "Maroon",     hex: "#690000" },
  { name: "Purple",     hex: "#360088" },
  { name: "Orange",     hex: "#FF8400" },
  { name: "Navy",       hex: "#000F60" },
  { name: "Sky Blue",   hex: "#49C3FC" },
];

// ─── DOM refs ─────────────────────────────────────────────────────────────────
const form            = document.querySelector("#urlForm");
const urlInput        = document.querySelector("#urlInput");
const autoFields      = document.querySelector("#autoFields");
const autoSource      = document.querySelector("#autoSource");
const autoTitle       = document.querySelector("#autoTitle");
const manualForm      = document.querySelector("#manualForm");
const manualImageUpload = document.querySelector("#manualImageUpload");
const manualSource    = document.querySelector("#manualSource");
const manualTitle     = document.querySelector("#manualTitle");
const tabAuto         = document.querySelector("#tabAuto");
const tabManual       = document.querySelector("#tabManual");
const tabTelegram     = document.querySelector("#tabTelegram");
const autoPanel       = document.querySelector("#autoPanel");
const manualPanel     = document.querySelector("#manualPanel");
const telegramPanel   = document.querySelector("#telegramPanel");
const telegramSelect  = document.querySelector("#telegramSelect");
const telegramRefresh = document.querySelector("#telegramRefresh");
const telegramFields  = document.querySelector("#telegramFields");
const telegramTitle   = document.querySelector("#telegramTitle");
const telegramSource  = document.querySelector("#telegramSource");
const telegramGenerate = document.querySelector("#telegramGenerate");
const resetButton     = document.querySelector("#resetButton");
const downloadButton  = document.querySelector("#downloadButton");
const statusEl        = document.querySelector("#status");
const canvas          = document.querySelector("#previewCanvas");
const ctx             = canvas.getContext("2d");

const controls = {
  titleSize:      document.querySelector("#titleSize"),
  imageAlign:     document.querySelector("#imageAlign"),
  textAlign:      document.querySelector("#textAlign"),
  titleCase:      document.querySelector("#titleCase"),
  layoutOrder:    document.querySelector("#layoutOrder"),
  imageFit:       document.querySelector("#imageFit"),
  titleFit:       document.querySelector("#titleFit"),
  logoToggle:     document.querySelector("#logoToggle"),
  bgImageUpload:  document.querySelector("#bgImageUpload"),
  // Colour values (set by custom pickers)
  background: { value: "#000000" },
  text:        { value: "#ffffff" },
  trim:        { value: "#FFCC00" },
};

const fontStack   = "Inter, ui-sans-serif, system-ui, sans-serif";
const titleFont   = "Saira Condensed, ui-sans-serif, system-ui, sans-serif";
const titleWeight = "800";

let uploadedBgImageSrc = "";
let telegramImageUrl   = "";
let telegramLoaded     = false;

// ─── Built-in HH logo SVG (recoloured at draw time) ──────────────────────────
function buildLogoSvg(circleColour, markColour) {
  // Encode colours for safe SVG attribute use
  const cc = circleColour.replace(/#/g, "%23");
  const mc = markColour.replace(/#/g, "%23");
  return `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 413.265 413.265'><circle cx='206.633' cy='206.633' r='206.633' fill='${cc}'/><path fill='${mc}' d='M286.639 129.276v57.79c0 15.962-28.646 19.244-28.646 19.244v-.013c-7.646-.14-13.805-6.371-13.805-14.051 0-10.82 12.507-14.219 13.805-14.774 6.731-2.882 13.099-12.513 13.099-24.623v-23.573h-55.816v154.155h48.308v-55.839h23.054v55.839h48.309V129.276h-48.309z'/><path fill='${mc}' d='M131.557 283.431v-57.79c0-15.962 28.646-19.244 28.646-19.244v.013c7.646.14 13.805 6.371 13.805 14.051 0 10.82-12.507 14.219-13.805 14.774-6.731 2.882-13.099 12.513-13.099 24.623v23.573h55.816V129.276h-48.308v55.839h-23.054v-55.839H83.249v154.155h48.308z'/></svg>`;
}

// ─── Colour picker ────────────────────────────────────────────────────────────
function buildColourPicker(triggerId, dropdownId, dotId, nameId, controlKey, defaultHex, redraw = false) {
  const trigger  = document.getElementById(triggerId);
  const dropdown = document.getElementById(dropdownId);
  const dot      = document.getElementById(dotId);
  const nameEl   = document.getElementById(nameId);

  function closeDropdown() {
    dropdown.hidden = true;
    trigger.setAttribute("aria-expanded", "false");
  }

  function select(colour) {
    controls[controlKey].value = colour.hex;
    dot.style.background = colour.hex;
    dot.style.outline = colour.hex === "#ffffff" ? "1px solid #555" : "none";
    nameEl.textContent = colour.name;
    closeDropdown();
    if (redraw) drawCard(currentData);
  }

  function openDropdown() {
    // Close any other open dropdowns first
    document.querySelectorAll(".colour-dropdown").forEach(d => {
      if (d !== dropdown) d.hidden = true;
    });
    document.querySelectorAll(".colour-select").forEach(t => {
      if (t !== trigger) t.setAttribute("aria-expanded", "false");
    });

    dropdown.innerHTML = "";
    for (const colour of COLOURS) {
      const item = document.createElement("div");
      item.className = "colour-option";
      item.setAttribute("role", "option");
      item.setAttribute("tabindex", "0");
      const d = document.createElement("span");
      d.className = "colour-dot";
      d.style.background = colour.hex;
      if (colour.hex === "#ffffff") d.style.outline = "1px solid #555";
      const n = document.createElement("span");
      n.textContent = colour.name;
      item.append(d, n);
      item.addEventListener("click", e => { e.stopPropagation(); select(colour); });
      item.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); select(colour); } });
      dropdown.append(item);
    }
    dropdown.hidden = false;
    trigger.setAttribute("aria-expanded", "true");
  }

  trigger.addEventListener("click", e => {
    e.stopPropagation();
    if (dropdown.hidden) openDropdown(); else closeDropdown();
  });
  trigger.addEventListener("keydown", e => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (dropdown.hidden) openDropdown(); else closeDropdown();
    }
  });

  // Set initial value only — no redraw yet
  const initial = COLOURS.find(c => c.hex.toLowerCase() === defaultHex.toLowerCase()) || COLOURS[0];
  controls[controlKey].value = initial.hex;
  dot.style.background = initial.hex;
  dot.style.outline = initial.hex === "#ffffff" ? "1px solid #555" : "none";
  nameEl.textContent = initial.name;
}

// Single document-level click handler to close all dropdowns
document.addEventListener("click", () => {
  document.querySelectorAll(".colour-dropdown").forEach(d => d.hidden = true);
  document.querySelectorAll(".colour-select").forEach(t => t.setAttribute("aria-expanded", "false"));
});

buildColourPicker("backgroundSelect", "backgroundDropdown", "backgroundDot", "backgroundName", "background", "#000000");
buildColourPicker("textSelect",       "textDropdown",       "textDot",       "textName",       "text",       "#ffffff");
buildColourPicker("trimSelect",       "trimDropdown",       "trimDot",       "trimName",       "trim",       "#FFCC00");

// ─── Default data ─────────────────────────────────────────────────────────────
const defaultData = {
  displayUrl: "sitename.com",
  title: "Title of the webpage or article will appear here",
  image: "/sample-image.svg"
};

let currentData = { ...defaultData };

// ─── Helpers ──────────────────────────────────────────────────────────────────
function setStatus(message) { statusEl.textContent = message; }

function decodeHtmlEntities(str) {
  return str
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(Number(dec)))
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ").replace(/&ndash;/g, "–").replace(/&mdash;/g, "—")
    .replace(/&lsquo;/g, "‘").replace(/&rsquo;/g, "’")
    .replace(/&ldquo;/g, "“").replace(/&rdquo;/g, "”");
}

function fitText(ctx, text, maxWidth, baseSize, minSize, font, weight) {
  let size = baseSize;
  ctx.font = `${weight} ${size}px ${font}`;
  while (size > minSize && ctx.measureText(text).width > maxWidth) {
    size -= 1;
    ctx.font = `${weight} ${size}px ${font}`;
  }
  return size;
}

function wrapText(ctx, text, maxWidth, baseSize, minSize, font, weight) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines = [];
  let line = "";
  let size = baseSize;

  for (const word of words) {
    const testLine = line ? `${line} ${word}` : word;
    ctx.font = `${weight} ${size}px ${font}`;
    if (ctx.measureText(testLine).width <= maxWidth) { line = testLine; continue; }
    if (line) lines.push(line);
    if (ctx.measureText(word).width > maxWidth) size = fitText(ctx, word, maxWidth, size, minSize, font, weight);
    line = word;
  }
  if (line) lines.push(line);
  return { lines, size };
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

function drawContainedImage(image, x, y, width, height) {
  const sourceRatio = image.naturalWidth / image.naturalHeight;
  const targetRatio = width / height;
  let drawWidth = width;
  let drawHeight = height;
  if (sourceRatio > targetRatio) { drawHeight = width / sourceRatio; }
  else { drawWidth = height * sourceRatio; }
  ctx.drawImage(image, x + (width - drawWidth) / 2, y + (height - drawHeight) / 2, drawWidth, drawHeight);
}

async function drawLogoOnTrim(trimY, trimHeight, layoutFlipped, width, padding) {
  if (!controls.logoToggle?.checked) return;
  const logoSize = Math.round(width * 0.13); // diameter — sits centred on trim line
  const logoY    = trimY + trimHeight / 2 - logoSize / 2;
  const logoX    = layoutFlipped
    ? padding                          // text-top: left, matching text margin
    : width - padding - logoSize;      // image-top: right, matching text margin
  try {
    const src  = buildLogoSvg(controls.trim.value, controls.background.value);
    const logo = await loadImage(src);
    ctx.drawImage(logo, logoX, logoY, logoSize, logoSize);
  } catch { /* skip if load fails */ }
}

// ─── Draw card ────────────────────────────────────────────────────────────────
async function drawCard(data = currentData) {
  currentData = data;

  const width      = 900;
  const trimHeight = Math.max(7, Math.round(width * 0.014));
  const padding    = Math.round(width * 0.062);
  const gap        = Math.round(width * 0.042);

  const titleBase     = Number(controls.titleSize.value) || Math.round(width * 0.069);
  const titleMaxWidth = width - padding * 2;
  let   rawTitle      = decodeHtmlEntities(data.title || "Untitled page");
  if (!controls.titleCase || controls.titleCase.value !== "lower") rawTitle = rawTitle.toUpperCase();

  const labelSize       = Math.round(width * 0.043);
  const sourceRowHeight = labelSize;

  const align  = controls.textAlign?.value || "left";
  const textX  = align === "center" ? width / 2 : padding;
  const textTop = gap;

  const layoutFlipped = controls.layoutOrder?.value === "text-top";
  const imageFitFull  = controls.imageFit?.value === "full";

  // ── Fixed canvas size always 4:5 ──
  const totalHeight = Math.round(width * 5 / 4);

  canvas.width  = width;
  canvas.height = totalHeight;

  // ── Determine image dimensions ──
  let loadedImage = null;
  try {
    loadedImage = await loadImage(proxiedImageUrl(data.image));
  } catch { /* handled below */ }

  let imageHeight;
  if (imageFitFull && loadedImage) {
    // Scale image to full width, use natural proportional height, capped so text area has a minimum
    const naturalScaledH = Math.round(loadedImage.naturalHeight * (width / loadedImage.naturalWidth));
    const minTextArea    = Math.round(totalHeight * 0.25); // at least 25% for text
    imageHeight = Math.min(naturalScaledH, totalHeight - trimHeight - minTextArea);
  } else {
    // Default: half the canvas
    imageHeight = Math.round(totalHeight / 2);
  }

  const textAreaHeight = totalHeight - imageHeight - trimHeight;

  // Pre-measure title
  ctx.font = `${titleWeight} ${titleBase}px ${titleFont}`;
  const { lines, size } = wrapText(ctx, rawTitle, titleMaxWidth, titleBase, 20, titleFont, titleWeight);
  const lineHeight = Math.round(size * 1.0);

  // ── Determine y positions based on layout order ──
  let imageY, trimY, textAreaY;
  if (layoutFlipped) {
    // Text on top, trim in middle, image at bottom
    textAreaY = 0;
    trimY     = textAreaHeight;
    imageY    = textAreaHeight + trimHeight;
  } else {
    // Image on top, trim in middle, text at bottom (default)
    imageY    = 0;
    trimY     = imageHeight;
    textAreaY = imageHeight + trimHeight;
  }

  // ── Fill canvas background ──
  ctx.fillStyle = controls.background.value;
  ctx.fillRect(0, 0, width, totalHeight);

  // ── Featured image ──
  if (loadedImage) {
    if (imageFitFull) {
      // Draw full image scaled to width
      ctx.drawImage(loadedImage, 0, imageY, width, imageHeight);
    } else {
      // Crop: scale to fill height, align horizontally
      const scale = imageHeight / loadedImage.naturalHeight;
      const drawW = loadedImage.naturalWidth * scale;
      if (drawW >= width) {
        const imgAlign = controls.imageAlign?.value || "center";
        const drawX = imgAlign === "left" ? 0 : imgAlign === "right" ? width - drawW : (width - drawW) / 2;
        ctx.drawImage(loadedImage, drawX, imageY, drawW, imageHeight);
      } else {
        const scaleW = width / loadedImage.naturalWidth;
        const fitH   = loadedImage.naturalHeight * scaleW;
        ctx.drawImage(loadedImage, 0, imageY, width, fitH);
      }
    }
  } else {
    ctx.fillStyle = "#20242b";
    ctx.fillRect(0, imageY, width, imageHeight);
    ctx.fillStyle = "#8f98a5";
    ctx.font = `700 ${Math.round(width * 0.035)}px ${fontStack}`;
    ctx.textAlign = "left";
    ctx.fillText("No featured image found", padding, imageY + imageHeight / 2);
  }

  // ── Trim bar ──
  ctx.fillStyle = controls.trim.value;
  ctx.fillRect(0, trimY, width, trimHeight);

  // ── Background image / colour behind text area ──
  if (uploadedBgImageSrc) {
    try {
      const bgImage = await loadImage(uploadedBgImageSrc);
      const scale = textAreaHeight / bgImage.naturalHeight;
      const drawW = bgImage.naturalWidth * scale;
      ctx.drawImage(bgImage, width - drawW, textAreaY, drawW, textAreaHeight);
    } catch {
      ctx.fillStyle = controls.background.value;
      ctx.fillRect(0, textAreaY, width, textAreaHeight);
    }
  } else {
    ctx.fillStyle = controls.background.value;
    ctx.fillRect(0, textAreaY, width, textAreaHeight);
  }

  // ── Logo centred on trim line (drawn after bg so it sits on top) ──
  await drawLogoOnTrim(trimY, trimHeight, layoutFlipped, width, padding);

  // ── Source name ──
  const sourceTop      = textAreaY + gap;
  const sourceX        = align === "center" ? width / 2 : padding;
  const sourceBaseline = sourceTop + labelSize;

  ctx.font      = `400 ${labelSize}px ${fontStack}`;
  ctx.fillStyle = controls.trim.value;
  ctx.textAlign = align;
  ctx.fillText(data.displayUrl || "", sourceX, sourceBaseline);

  // ── Title ──
  const titleTop        = sourceTop + sourceRowHeight + gap * 0.4;
  const titleAreaBottom = textAreaY + textAreaHeight - padding;

  const maxLines     = Math.max(1, Math.floor((titleAreaBottom - titleTop) / lineHeight));
  const visibleLines = lines.slice(0, maxLines);


  ctx.fillStyle = controls.text.value;
  ctx.font      = `${titleWeight} ${size}px ${titleFont}`;
  ctx.textAlign = align;
  let y = titleTop + size;
  for (const line of visibleLines) {
    ctx.fillText(line, textX, y);
    y += lineHeight;
  }

  if (lines.length > visibleLines.length) {
    setStatus("⚠️ Title is cropped — reduce the font size to fit.");
  }
}

// ─── Fetch metadata ───────────────────────────────────────────────────────────
async function fetchMetadata(url) {
  const response = await fetch(`/api/metadata?url=${encodeURIComponent(url)}`);
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || "Could not generate the preview.");
  return body;
}

// ─── Tab / mode switching ─────────────────────────────────────────────────────
function setMode(mode) {
  const isAuto     = mode === "auto";
  const isManual   = mode === "manual";
  const isTelegram = mode === "telegram";

  tabAuto.classList.toggle("active", isAuto);
  tabAuto.setAttribute("aria-selected", String(isAuto));
  tabManual.classList.toggle("active", isManual);
  tabManual.setAttribute("aria-selected", String(isManual));
  tabTelegram.classList.toggle("active", isTelegram);
  tabTelegram.setAttribute("aria-selected", String(isTelegram));

  autoPanel.hidden     = !isAuto;
  manualPanel.hidden   = !isManual;
  telegramPanel.hidden = !isTelegram;

  if (isTelegram && !telegramLoaded) loadTelegramPosts();
}

tabAuto.addEventListener("click",     () => setMode("auto"));
tabManual.addEventListener("click",   () => setMode("manual"));
tabTelegram.addEventListener("click", () => setMode("telegram"));

// ─── Auto tab: url form ───────────────────────────────────────────────────────
form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const url = urlInput.value.trim();
  if (!url) return;
  setStatus("Reading the page…");
  try {
    const metadata = await fetchMetadata(url);
    if (!metadata || typeof metadata !== "object") throw new Error("No data returned.");
    autoSource.value  = metadata.displayUrl || metadata.siteName || "";
    autoTitle.value   = metadata.title || "";
    autoFields.hidden = false;
    setStatus("Drawing the card…");
    await drawCard(metadata);
    setStatus("Card ready.");
  } catch (error) {
    setStatus("⚠️ " + (error instanceof Error ? error.message : "Something went wrong."));
  }
});

autoSource.addEventListener("input", () => {
  drawCard({ ...currentData, displayUrl: autoSource.value });
});
autoTitle.addEventListener("input", () => {
  drawCard({ ...currentData, title: autoTitle.value });
});

// ─── Manual tab ───────────────────────────────────────────────────────────────
manualForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const source = manualSource.value.trim() || "source.com";
  const title  = manualTitle.value.trim() || "Untitled";
  const file   = manualImageUpload.files?.[0];

  const getImageSrc = () => new Promise((resolve) => {
    if (!file) { resolve(defaultData.image); return; }
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(reader.result));
    reader.readAsDataURL(file);
  });

  setStatus("Drawing the card…");
  const imageSrc = await getImageSrc();
  await drawCard({ displayUrl: source, title, image: imageSrc });
  setStatus("Card ready.");
});

// ─── Telegram tab ─────────────────────────────────────────────────────────────
async function loadTelegramPosts() {
  telegramSelect.innerHTML = "<option value=''>Loading…</option>";
  telegramSelect.disabled = true;
  telegramFields.hidden = true;
  setStatus("Fetching Telegram posts…");

  try {
    const res = await fetch("/api/telegram");
    const posts = await res.json();

    if (!res.ok) throw new Error(posts.error || "Could not load posts.");
    if (!Array.isArray(posts) || posts.length === 0) {
      telegramSelect.innerHTML = "<option value=''>No posts found</option>";
      setStatus("No Telegram posts found.");
      telegramLoaded = true;
      telegramSelect.disabled = false;
      return;
    }

    telegramSelect.innerHTML = "<option value=''>— Select a post —</option>";
    for (const post of posts) {
      const opt = document.createElement("option");
      opt.value = post.messageId;
      opt.textContent = post.title.slice(0, 80) + (post.title.length > 80 ? "…" : "");
      opt.dataset.title   = post.title;
      opt.dataset.source  = post.source;
      opt.dataset.imageUrl = post.imageUrl;
      telegramSelect.append(opt);
    }

    telegramLoaded = true;
    telegramSelect.disabled = false;
    setStatus("Ready.");
  } catch (err) {
    telegramSelect.innerHTML = "<option value=''>Failed to load</option>";
    telegramSelect.disabled = false;
    setStatus(err.message || "Could not load Telegram posts.");
  }
}

telegramRefresh.addEventListener("click", () => {
  telegramLoaded = false;
  loadTelegramPosts();
});

telegramSelect.addEventListener("change", () => {
  const selected = telegramSelect.options[telegramSelect.selectedIndex];
  if (!selected || !selected.value) { telegramFields.hidden = true; return; }

  telegramTitle.value  = selected.dataset.title || "";
  telegramSource.value = selected.dataset.source || "";
  telegramImageUrl     = selected.dataset.imageUrl || "";
  telegramFields.hidden = false;
});

telegramGenerate.addEventListener("click", async () => {
  const title  = telegramTitle.value.trim();
  const source = telegramSource.value.trim();
  if (!title) { setStatus("Please enter a title."); return; }
  setStatus("Drawing the card…");
  await drawCard({
    displayUrl: source,
    title,
    image: telegramImageUrl ? proxiedImageUrl(telegramImageUrl) : defaultData.image
  });
  setStatus("Card ready.");
});

telegramTitle.addEventListener("input",  () => {
  if (!telegramTitle.value) return;
  drawCard({ displayUrl: telegramSource.value, title: telegramTitle.value, image: telegramImageUrl ? proxiedImageUrl(telegramImageUrl) : defaultData.image });
});
telegramSource.addEventListener("input", () => {
  drawCard({ displayUrl: telegramSource.value, title: telegramTitle.value, image: telegramImageUrl ? proxiedImageUrl(telegramImageUrl) : defaultData.image });
});

// ─── Settings controls ────────────────────────────────────────────────────────
for (const control of [controls.titleSize, controls.imageAlign, controls.textAlign, controls.titleCase, controls.layoutOrder, controls.imageFit]) {
  control?.addEventListener("input", () => drawCard(currentData));
}

controls.logoToggle?.addEventListener("change", () => drawCard(currentData));

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

// Stepper buttons
document.querySelector("#titleSizeMinus")?.addEventListener("click", () => {
  const v = Number(controls.titleSize.value); if (v > 20) { controls.titleSize.value = v - 1; drawCard(currentData); }
});
document.querySelector("#titleSizePlus")?.addEventListener("click", () => {
  const v = Number(controls.titleSize.value); if (v < 200) { controls.titleSize.value = v + 1; drawCard(currentData); }
});

// ─── Reset ────────────────────────────────────────────────────────────────────
resetButton.addEventListener("click", async () => {
  urlInput.value = "";
  autoSource.value = "";
  autoTitle.value = "";
  autoFields.hidden = true;
  manualImageUpload.value = "";
  manualSource.value = "";
  manualTitle.value = "";
  telegramSelect.value = "";
  telegramTitle.value = "";
  telegramSource.value = "";
  telegramImageUrl = "";
  telegramFields.hidden = true;
  controls.titleSize.value   = "58";
  controls.titleCase.value   = "upper";
  controls.textAlign.value   = "left";
  controls.imageAlign.value  = "center";
  controls.layoutOrder.value = "image-top";
  controls.imageFit.value    = "crop";
  if (controls.logoToggle) controls.logoToggle.checked = false;
  controls.bgImageUpload.value = "";
  uploadedBgImageSrc = "";
  // Reset colour pickers to defaults
  function resetPicker(controlKey, hex, dotId, nameId) {
    const colour = COLOURS.find(c => c.hex.toLowerCase() === hex.toLowerCase()) || COLOURS[0];
    controls[controlKey].value = colour.hex;
    const dot = document.getElementById(dotId);
    const nameEl = document.getElementById(nameId);
    if (dot) { dot.style.background = colour.hex; dot.style.outline = colour.hex === "#ffffff" ? "1px solid #555" : "none"; }
    if (nameEl) nameEl.textContent = colour.name;
  }
  resetPicker("background", "#000000", "backgroundDot", "backgroundName");
  resetPicker("text",       "#ffffff", "textDot",       "textName");
  resetPicker("trim",       "#FFCC00", "trimDot",       "trimName");
  await drawCard({ ...defaultData });
  setStatus("Reset.");
});

// ─── Download ─────────────────────────────────────────────────────────────────
const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

if (isMobile) {
  downloadButton.textContent = "🖼 OPEN IMAGE";
  downloadButton.addEventListener("click", () => {
    const dataUrl = canvas.toDataURL("image/png");
    const win = window.open("", "_blank");
    if (win) {
      win.document.write(`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Preview</title><style>body{margin:0;background:#000;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;min-height:100vh;padding:12px;box-sizing:border-box}img{max-width:100%;border-radius:4px}p{color:#fff;font-family:sans-serif;font-size:14px;margin:12px 0 0;text-align:center}button{margin-top:16px;padding:10px 24px;background:#fff;border:0;border-radius:6px;font-weight:700;cursor:pointer;font-size:15px}</style></head><body><img src="${dataUrl}"><p>Hold image → Save to Photos</p><button onclick="window.close()">✕ Close</button></body></html>`);
      win.document.close();
    }
  });
} else {
  downloadButton.textContent = "⬇ DOWNLOAD IMAGE";
  downloadButton.addEventListener("click", () => {
    const link = document.createElement("a");
    link.download = "link-preview-card.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  });
}

// ─── Initial draw ─────────────────────────────────────────────────────────────
document.fonts?.ready.then(() => drawCard()) || drawCard();
