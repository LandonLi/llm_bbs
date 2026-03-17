const EMOTICON_PATTERN = /\[em:([a-z0-9_-]{1,32})\]/gi;

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function normalizeLineBreaks(input) {
  return String(input).replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

function sanitizeContent(rawContent) {
  const normalized = normalizeLineBreaks(rawContent ?? "")
    .replace(/\u0000/g, "")
    .trim();
  return normalized;
}

function normalizeWhitelist(input) {
  const map = new Map();

  if (input instanceof Map) {
    for (const [code, url] of input.entries()) {
      if (code && url) {
        map.set(String(code).toLowerCase(), String(url));
      }
    }
    return map;
  }

  if (Array.isArray(input)) {
    for (const item of input) {
      if (item?.code && item?.public_url) {
        map.set(String(item.code).toLowerCase(), String(item.public_url));
      }
    }
    return map;
  }

  if (input && typeof input === "object") {
    for (const [code, url] of Object.entries(input)) {
      if (code && url) {
        map.set(String(code).toLowerCase(), String(url));
      }
    }
  }

  return map;
}

function extractEmoticonCodes(content) {
  const source = sanitizeContent(content);
  const codes = [];
  let match;

  while ((match = EMOTICON_PATTERN.exec(source)) !== null) {
    codes.push(match[1].toLowerCase());
  }

  EMOTICON_PATTERN.lastIndex = 0;
  return codes;
}

function renderSanitizedContent(sanitizedContent, emoticonWhitelist) {
  const whitelist = normalizeWhitelist(emoticonWhitelist);
  let html = "";
  let lastIndex = 0;
  let match;

  while ((match = EMOTICON_PATTERN.exec(sanitizedContent)) !== null) {
    const token = match[0];
    const code = match[1].toLowerCase();
    const before = sanitizedContent.slice(lastIndex, match.index);

    html += escapeHtml(before).replace(/\n/g, "<br>");

    const url = whitelist.get(code);
    if (url) {
      html += `<img class=\"emoticon\" src=\"${escapeHtml(url)}\" alt=\"${escapeHtml(token)}\" data-emoticon-code=\"${escapeHtml(code)}\">`;
    } else {
      html += escapeHtml(token);
    }

    lastIndex = match.index + token.length;
  }

  html += escapeHtml(sanitizedContent.slice(lastIndex)).replace(/\n/g, "<br>");
  EMOTICON_PATTERN.lastIndex = 0;

  return html;
}

function parseAndRenderContent(rawContent, emoticonWhitelist) {
  const sanitized_content = sanitizeContent(rawContent);
  const rendered_html = renderSanitizedContent(sanitized_content, emoticonWhitelist);
  const emoticon_codes = extractEmoticonCodes(sanitized_content);

  return {
    sanitized_content,
    rendered_html,
    emoticon_codes,
  };
}

module.exports = {
  sanitizeContent,
  extractEmoticonCodes,
  parseAndRenderContent,
};
