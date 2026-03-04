const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

export const wrapHtmlIfNeeded = (value: string) => {
  const html = String(value || "").trim();
  if (!html) {
    return "<!doctype html><html><body></body></html>";
  }
  const lowered = html.toLowerCase();
  if (!lowered.startsWith("<!doctype") && !lowered.startsWith("<html")) {
    return `<!doctype html><html><body>${html}</body></html>`;
  }
  return html;
};

const buildLoadingDoc = () =>
  `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Resume Preview</title>
    <style>
      :root { color-scheme: light; }
      body {
        margin: 0;
        font-family: "Segoe UI", system-ui, -apple-system, sans-serif;
        background: #f8fafc;
        color: #334155;
        display: grid;
        place-items: center;
        min-height: 100vh;
      }
      .card {
        border: 1px solid #e2e8f0;
        background: #ffffff;
        border-radius: 12px;
        padding: 16px 20px;
        font-size: 14px;
      }
    </style>
  </head>
  <body>
    <div class="card">Loading preview...</div>
  </body>
</html>`;

export const writePreviewHtml = (popup: Window | null, html: string) => {
  if (!popup || popup.closed) return;
  popup.document.open();
  popup.document.write(wrapHtmlIfNeeded(html));
  popup.document.close();
};

export const writePreviewError = (popup: Window | null, message: string) => {
  const safeMessage = escapeHtml(message || "Unable to load preview.");
  writePreviewHtml(
    popup,
    `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Preview Error</title>
    <style>
      :root { color-scheme: light; }
      body {
        margin: 0;
        font-family: "Segoe UI", system-ui, -apple-system, sans-serif;
        background: #fff7f7;
        color: #991b1b;
        display: grid;
        place-items: center;
        min-height: 100vh;
        padding: 24px;
        box-sizing: border-box;
      }
      .card {
        width: min(680px, 100%);
        border: 1px solid #fecaca;
        background: #ffffff;
        border-radius: 12px;
        padding: 18px 20px;
      }
      h1 {
        margin: 0 0 8px;
        font-size: 16px;
      }
      p {
        margin: 0;
        line-height: 1.5;
        font-size: 14px;
      }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>Preview unavailable</h1>
      <p>${safeMessage}</p>
    </div>
  </body>
</html>`
  );
};

export const openPreviewWindow = () => {
  if (typeof window === "undefined") return null;
  const popup = window.open("", "_blank");
  if (!popup) return null;
  try {
    popup.opener = null;
  } catch {
    // Ignore browsers that disallow writing opener.
  }
  writePreviewHtml(popup, buildLoadingDoc());
  return popup;
};
