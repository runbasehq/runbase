const HTML_TAG_PATTERN = /<\/?[a-z][\s\S]*>/i;
const EMBEDDED_MEDIA_PATTERN = /<(img|video|audio|iframe|source)\b/i;

const ENTITY_MAP: Record<string, string> = {
  "&nbsp;": " ",
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
};

function decodeEntities(value: string) {
  return value.replace(
    /&nbsp;|&amp;|&lt;|&gt;|&quot;|&#39;/g,
    (entity) => ENTITY_MAP[entity] ?? entity,
  );
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function looksLikeHtml(value: string) {
  return HTML_TAG_PATTERN.test(value);
}

export function hasEmbeddedFeedbackMedia(value: string) {
  return EMBEDDED_MEDIA_PATTERN.test(value);
}

export function normalizeFeedbackContentToHtml(value: string) {
  const trimmed = value.trim();

  if (!trimmed.length) {
    return "<p></p>";
  }

  if (looksLikeHtml(trimmed)) {
    return trimmed;
  }

  const paragraphs = trimmed
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph.length)
    .map(
      (paragraph) => `<p>${escapeHtml(paragraph).replaceAll("\n", "<br />")}</p>`,
    );

  return paragraphs.length ? paragraphs.join("") : "<p></p>";
}

export function extractTextFromFeedbackContent(value: string) {
  if (!value.trim().length) {
    return "";
  }

  if (!looksLikeHtml(value)) {
    return decodeEntities(value).replace(/\s+/g, " ").trim();
  }

  const withoutScripts = value
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, " ");

  const withSpacing = withoutScripts
    .replace(/<\/(p|div|li|h[1-6]|blockquote|pre)>/gi, " ")
    .replace(/<br\s*\/?>/gi, " ");

  const withoutTags = withSpacing.replace(/<[^>]+>/g, " ");

  return decodeEntities(withoutTags).replace(/\s+/g, " ").trim();
}
