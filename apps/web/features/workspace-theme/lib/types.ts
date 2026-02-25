export const WORKSPACE_THEME_FONT_FAMILIES = [
  "inter",
  "system",
  "serif",
  "mono",
] as const;

export type WorkspaceThemeFontFamily =
  (typeof WORKSPACE_THEME_FONT_FAMILIES)[number];

export type WorkspaceThemeMediaType = "logo" | "banner";

export interface WorkspacePublicTheme {
  primaryColor: string;
  backgroundColor: string;
  surfaceColor: string;
  surfaceAccentColor: string;
  textColor: string;
  mutedColor: string;
  borderColor: string;
  cornerRadius: number;
  fontFamily: WorkspaceThemeFontFamily;
  logoUrl: string | null;
  bannerUrl: string | null;
}

export interface WorkspaceThemePermissions {
  canEditTheme: boolean;
}

export interface WorkspaceThemeSnapshot {
  workspaceId: string;
  workspaceSlug: string;
  workspaceName: string;
  theme: WorkspacePublicTheme;
  permissions: WorkspaceThemePermissions;
}

export interface WorkspaceThemeUploadedMedia {
  key: string;
  url: string;
  fileName: string;
  contentType: string;
  size: number;
  width: number;
  height: number;
  mediaType: WorkspaceThemeMediaType;
}
