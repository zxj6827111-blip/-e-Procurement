export const enterpriseTokens = {
  "color": {
    "primary": "#245F5B",
    "primaryHover": "#1C504D",
    "primaryActive": "#153D3B",
    "primarySoft": "#E6F0EF",
    "primarySubtle": "#F3F8F7",
    "primaryContrast": "#FFFFFF",
    "accent": "#173F3D",
    "accentHover": "#102F2D",
    "accentSoft": "#E2ECEA",
    "accentContrast": "#FFFFFF",
    "success": "#2F6E4F",
    "successSoft": "#E8F2EC",
    "warning": "#7C5A20",
    "warningSoft": "#F6EFE3",
    "error": "#9F4D37",
    "errorSoft": "#F7EDE9",
    "info": "#3D6B78",
    "infoSoft": "#E8F1F3",
    "locked": "#64716E",
    "lockedSoft": "#F1F4F2",
    "bg": "#F4F6F5",
    "bgSubtle": "#EDF2F0",
    "surface": "#FFFFFF",
    "surfaceElevated": "#FFFFFF",
    "panel": "#FAFBFA",
    "sidebar": "#173F3D",
    "sidebarElevated": "#102F2D",
    "sidebarMuted": "#C8DDD9",
    "sidebarActive": "rgba(255, 255, 255, 0.12)",
    "sidebarActiveBorder": "#B8872F",
    "sidebarText": "#FFFFFF",
    "border": "#DDE5E2",
    "borderSubtle": "#E9EFED",
    "borderStrong": "#C8D5D1",
    "text": "#172624",
    "textSecondary": "#435553",
    "textMuted": "#74827E",
    "textInverse": "#FFFFFF",
    "primaryBg": "var(--ep-color-primary-soft)",
    "successBg": "var(--ep-color-success-soft)",
    "warningBg": "var(--ep-color-warning-soft)",
    "errorBg": "var(--ep-color-error-soft)"
  },
  "radius": {
    "xs": 6,
    "sm": 10,
    "md": 12,
    "lg": 16,
    "xl": 20
  },
  "spacing": {
    "2": 2,
    "4": 4,
    "6": 6,
    "8": 8,
    "10": 10,
    "12": 12,
    "14": 14,
    "16": 16,
    "20": 20,
    "24": 24,
    "32": 32,
    "40": 40,
    "xs": 4,
    "sm": 8,
    "md": 16,
    "lg": 24,
    "xl": 32
  },
  "typography": {
    "fontFamily": "\"PingFang SC\", \"Helvetica Neue\", \"Microsoft YaHei\", \"Segoe UI\", Arial, sans-serif",
    "fontFamilyNumber": "\"PingFang SC\", \"Microsoft YaHei\", \"Segoe UI\", Arial, sans-serif",
    "pageTitle": 18,
    "sectionTitle": 16,
    "cardTitle": 15,
    "body": 14,
    "meta": 12,
    "lineHeightBody": 1.58,
    "lineHeightTight": 1.42,
    "weightRegular": 400,
    "weightMedium": 500,
    "weightSemibold": 600,
    "weightBold": 600
  },
  "border": {
    "base": "1px solid var(--ep-color-border)",
    "subtle": "1px solid var(--ep-color-border-subtle)",
    "strong": "1px solid var(--ep-color-border-strong)"
  },
  "shadow": {
    "xs": "0 2px 8px rgba(17, 42, 40, 0.04)",
    "sm": "0 8px 22px rgba(17, 42, 40, 0.055)",
    "md": "0 14px 34px rgba(17, 42, 40, 0.07)",
    "lg": "0 24px 56px rgba(17, 42, 40, 0.11)"
  },
  "layout": {
    "contentMax": 1760,
    "contentWide": 1880,
    "sidebarWidth": 220,
    "topbarHeight": 56,
    "tableMinWidth": 880
  },
  "focus": {
    "ring": "0 0 0 3px rgba(36, 95, 91, 0.22)",
    "outline": "2px solid var(--ep-color-primary)"
  },
  "density": {
    "controlHeight": 38,
    "controlHeightSm": 34,
    "tableRowHeight": 48,
    "surfacePadding": 18,
    "pageGap": 16
  },
  "zIndex": {
    "shell": 20,
    "modal": 60
  }
} as const;

export type EnterpriseTokens = typeof enterpriseTokens;
