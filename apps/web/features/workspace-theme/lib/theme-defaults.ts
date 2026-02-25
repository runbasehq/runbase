import type { WorkspacePublicTheme, WorkspaceThemeFontFamily } from "./types";
import { WORKSPACE_THEME_FONT_FAMILIES } from "./types";

const HEX_COLOR_PATTERN = /^#?([a-fA-F0-9]{3}|[a-fA-F0-9]{6})$/;
const ABSOLUTE_HTTP_URL_PATTERN = /^https?:\/\//i;

const MIN_CORNER_RADIUS = 8;
const MAX_CORNER_RADIUS = 28;

export const DEFAULT_WORKSPACE_PUBLIC_THEME: WorkspacePublicTheme = {
  primaryColor: "#4a22b7",
  backgroundColor: "#f7f8fa",
  surfaceColor: "#ffffff",
  surfaceAccentColor: "#fbfbfc",
  textColor: "#111214",
  mutedColor: "#5f636b",
  borderColor: "#e7e7ea",
  cornerRadius: 14,
  fontFamily: "inter",
  logoUrl: null,
  bannerUrl: null,
};

interface RgbColor {
  r: number;
  g: number;
  b: number;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function toRgb(hexColor: string): RgbColor {
  const normalized = normalizeHexColor(hexColor) || "#000000";
  const withoutHash = normalized.slice(1);
  const r = Number.parseInt(withoutHash.slice(0, 2), 16);
  const g = Number.parseInt(withoutHash.slice(2, 4), 16);
  const b = Number.parseInt(withoutHash.slice(4, 6), 16);

  return { r, g, b };
}

function toHexChannel(value: number) {
  return clamp(Math.round(value), 0, 255).toString(16).padStart(2, "0");
}

function toHexColor({ r, g, b }: RgbColor) {
  return `#${toHexChannel(r)}${toHexChannel(g)}${toHexChannel(b)}`;
}

function mixHexColors(
  baseColor: string,
  overlayColor: string,
  overlayWeight: number,
) {
  const base = toRgb(baseColor);
  const overlay = toRgb(overlayColor);
  const weight = clamp(overlayWeight, 0, 1);
  const inverse = 1 - weight;

  return toHexColor({
    r: base.r * inverse + overlay.r * weight,
    g: base.g * inverse + overlay.g * weight,
    b: base.b * inverse + overlay.b * weight,
  });
}

function toRgbAlpha(hexColor: string, alpha: number) {
  const rgb = toRgb(hexColor);
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${clamp(alpha, 0, 1)})`;
}

function toContrastColor(hexColor: string) {
  const { r, g, b } = toRgb(hexColor);
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return luminance < 0.55 ? "#ffffff" : "#111214";
}

function isThemeImageUrlValid(value: string) {
  if (!value.length || value.length > 2048) {
    return false;
  }

  if (value.startsWith("/")) {
    return true;
  }

  if (!ABSOLUTE_HTTP_URL_PATTERN.test(value)) {
    return false;
  }

  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function isWorkspaceThemeFontFamily(
  value: string,
): value is WorkspaceThemeFontFamily {
  return WORKSPACE_THEME_FONT_FAMILIES.some(
    (currentValue) => currentValue === value,
  );
}

export function normalizeHexColor(value: string) {
  const trimmed = value.trim();
  const matched = trimmed.match(HEX_COLOR_PATTERN);

  if (!matched) {
    return null;
  }

  const raw = matched[1]?.toLowerCase() || "";

  if (raw.length === 3) {
    const [r = "0", g = "0", b = "0"] = raw.split("");
    return `#${r}${r}${g}${g}${b}${b}`;
  }

  return `#${raw}`;
}

export function normalizeWorkspaceThemeImageUrl(
  value: string | null | undefined,
) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();

  if (!normalized.length) {
    return null;
  }

  if (!isThemeImageUrlValid(normalized)) {
    return null;
  }

  return normalized;
}

export function getWorkspaceThemeFontFamilyStack(fontFamily: string) {
  if (fontFamily === "system") {
    return 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  }

  if (fontFamily === "serif") {
    return 'Iowan Old Style, Palatino, "Times New Roman", serif';
  }

  if (fontFamily === "mono") {
    return 'var(--font-geist-mono), "SFMono-Regular", ui-monospace, Menlo, monospace';
  }

  return "var(--font-sans), Inter, ui-sans-serif, system-ui, sans-serif";
}

export function normalizeWorkspacePublicTheme(
  input: Partial<WorkspacePublicTheme> | null | undefined,
): WorkspacePublicTheme {
  const candidate = input || {};

  return {
    primaryColor:
      typeof candidate.primaryColor === "string"
        ? normalizeHexColor(candidate.primaryColor) ||
          DEFAULT_WORKSPACE_PUBLIC_THEME.primaryColor
        : DEFAULT_WORKSPACE_PUBLIC_THEME.primaryColor,
    backgroundColor:
      typeof candidate.backgroundColor === "string"
        ? normalizeHexColor(candidate.backgroundColor) ||
          DEFAULT_WORKSPACE_PUBLIC_THEME.backgroundColor
        : DEFAULT_WORKSPACE_PUBLIC_THEME.backgroundColor,
    surfaceColor:
      typeof candidate.surfaceColor === "string"
        ? normalizeHexColor(candidate.surfaceColor) ||
          DEFAULT_WORKSPACE_PUBLIC_THEME.surfaceColor
        : DEFAULT_WORKSPACE_PUBLIC_THEME.surfaceColor,
    surfaceAccentColor:
      typeof candidate.surfaceAccentColor === "string"
        ? normalizeHexColor(candidate.surfaceAccentColor) ||
          DEFAULT_WORKSPACE_PUBLIC_THEME.surfaceAccentColor
        : DEFAULT_WORKSPACE_PUBLIC_THEME.surfaceAccentColor,
    textColor:
      typeof candidate.textColor === "string"
        ? normalizeHexColor(candidate.textColor) ||
          DEFAULT_WORKSPACE_PUBLIC_THEME.textColor
        : DEFAULT_WORKSPACE_PUBLIC_THEME.textColor,
    mutedColor:
      typeof candidate.mutedColor === "string"
        ? normalizeHexColor(candidate.mutedColor) ||
          DEFAULT_WORKSPACE_PUBLIC_THEME.mutedColor
        : DEFAULT_WORKSPACE_PUBLIC_THEME.mutedColor,
    borderColor:
      typeof candidate.borderColor === "string"
        ? normalizeHexColor(candidate.borderColor) ||
          DEFAULT_WORKSPACE_PUBLIC_THEME.borderColor
        : DEFAULT_WORKSPACE_PUBLIC_THEME.borderColor,
    cornerRadius:
      typeof candidate.cornerRadius === "number" &&
      Number.isFinite(candidate.cornerRadius)
        ? clamp(
            Math.round(candidate.cornerRadius),
            MIN_CORNER_RADIUS,
            MAX_CORNER_RADIUS,
          )
        : DEFAULT_WORKSPACE_PUBLIC_THEME.cornerRadius,
    fontFamily:
      typeof candidate.fontFamily === "string" &&
      isWorkspaceThemeFontFamily(candidate.fontFamily)
        ? candidate.fontFamily
        : DEFAULT_WORKSPACE_PUBLIC_THEME.fontFamily,
    logoUrl: normalizeWorkspaceThemeImageUrl(candidate.logoUrl),
    bannerUrl: normalizeWorkspaceThemeImageUrl(candidate.bannerUrl),
  };
}

export function parseWorkspacePublicThemeFromStorage(value: string | null) {
  if (!value) {
    return { ...DEFAULT_WORKSPACE_PUBLIC_THEME };
  }

  try {
    const decoded = JSON.parse(value) as Partial<WorkspacePublicTheme>;
    return normalizeWorkspacePublicTheme(decoded);
  } catch {
    return { ...DEFAULT_WORKSPACE_PUBLIC_THEME };
  }
}

export function serializeWorkspacePublicTheme(theme: WorkspacePublicTheme) {
  return JSON.stringify(normalizeWorkspacePublicTheme(theme));
}

export function getWorkspaceThemeCssVariables(theme: WorkspacePublicTheme) {
  const normalized = normalizeWorkspacePublicTheme(theme);
  const borderStrong = mixHexColors(
    normalized.borderColor,
    normalized.textColor,
    0.14,
  );
  const mutedSecondary = mixHexColors(
    normalized.mutedColor,
    normalized.backgroundColor,
    0.34,
  );
  const primarySoft = mixHexColors(
    normalized.primaryColor,
    normalized.backgroundColor,
    0.84,
  );
  const radiusSm = Math.max(6, normalized.cornerRadius - 4);
  const radiusMd = normalized.cornerRadius;
  const radiusLg = normalized.cornerRadius + 4;

  return {
    "--bg": normalized.backgroundColor,
    "--surface": normalized.surfaceColor,
    "--surface-2": normalized.surfaceAccentColor,
    "--border": normalized.borderColor,
    "--border-strong": borderStrong,
    "--text": normalized.textColor,
    "--muted": normalized.mutedColor,
    "--muted-2": mutedSecondary,
    "--placeholder": mutedSecondary,
    "--primary": normalized.primaryColor,
    "--primary-soft": primarySoft,
    "--ring": toRgbAlpha(normalized.primaryColor, 0.35),
    "--r-sm": `${radiusSm}px`,
    "--r-md": `${radiusMd}px`,
    "--r-lg": `${radiusLg}px`,
    "--primary-foreground": toContrastColor(normalized.primaryColor),
    "--public-font-family": getWorkspaceThemeFontFamilyStack(
      normalized.fontFamily,
    ),
  } as const;
}
