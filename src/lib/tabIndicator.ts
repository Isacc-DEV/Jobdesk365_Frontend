const BADGE_BG = "#ef4444";
const BADGE_TEXT = "#ffffff";
const FALLBACK_BG = "#0f172a";
const FALLBACK_TEXT = "#ffffff";

let baseTitle = "";
let baseFaviconHref = "";
let initialized = false;
let renderVersion = 0;

const hasDom = () => typeof window !== "undefined" && typeof document !== "undefined";

const getFaviconLink = () => {
  if (!hasDom()) return null;
  const existing = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
  if (existing) return existing;
  const link = document.createElement("link");
  link.rel = "icon";
  document.head.appendChild(link);
  return link;
};

const ensureBase = () => {
  if (!hasDom()) return;
  if (initialized) return;
  initialized = true;
  baseTitle = document.title || "JobDesk365";
  const favicon = getFaviconLink();
  baseFaviconHref = favicon?.href || "";
};

const drawFallbackBase = (ctx: CanvasRenderingContext2D, size: number) => {
  ctx.fillStyle = FALLBACK_BG;
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = FALLBACK_TEXT;
  ctx.font = `700 ${Math.round(size * 0.42)}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("J", size / 2, size / 2 + 1);
};

const drawBadge = (ctx: CanvasRenderingContext2D, count: number, size: number) => {
  const display = count > 99 ? "99+" : String(count);
  const radius = Math.round(size * 0.22);
  const centerX = size - radius - 3;
  const centerY = radius + 3;
  ctx.fillStyle = BADGE_BG;
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = BADGE_TEXT;
  ctx.font = `700 ${Math.round(size * 0.23)}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(display, centerX, centerY + 1);
};

const renderFaviconDataUrl = (count: number, image?: HTMLImageElement | null) => {
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  if (image) {
    ctx.drawImage(image, 0, 0, size, size);
  } else {
    drawFallbackBase(ctx, size);
  }
  drawBadge(ctx, count, size);
  return canvas.toDataURL("image/png");
};

const renderBadgedFavicon = async (count: number, version: number) => {
  if (!hasDom()) return;
  const link = getFaviconLink();
  if (!link) return;

  const apply = (dataUrl: string) => {
    if (!dataUrl) return;
    if (version !== renderVersion) return;
    link.href = dataUrl;
  };

  if (!baseFaviconHref) {
    apply(renderFaviconDataUrl(count, null));
    return;
  }

  const img = new Image();
  img.crossOrigin = "anonymous";
  img.onload = () => {
    apply(renderFaviconDataUrl(count, img));
  };
  img.onerror = () => {
    apply(renderFaviconDataUrl(count, null));
  };
  img.src = baseFaviconHref;
};

export const setTabIndicator = (count: number) => {
  if (!hasDom()) return;
  ensureBase();
  const normalized = Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0;
  if (normalized <= 0) {
    clearTabIndicator();
    return;
  }

  document.title = `(${normalized}) ${baseTitle || "JobDesk365"}`;
  renderVersion += 1;
  void renderBadgedFavicon(normalized, renderVersion);
};

export const clearTabIndicator = () => {
  if (!hasDom()) return;
  ensureBase();
  document.title = baseTitle || "JobDesk365";
  const link = getFaviconLink();
  if (!link) return;
  if (baseFaviconHref) {
    link.href = baseFaviconHref;
  }
};
