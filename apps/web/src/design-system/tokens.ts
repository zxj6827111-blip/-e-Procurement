export const enterpriseTokens = {
  "color": {
    "primary": "#1677FF",
    "success": "#52C41A",
    "warning": "#FAAD14",
    "error": "#FF4D4F",
    "bg": "#F5F6F8",
    "surface": "#FFFFFF",
    "border": "#E5E7EB",
    "text": "#1F1F1F",
    "textSecondary": "#666666",
    "textMuted": "#8C8C8C",
    "primaryBg": "#E6F4FF",
    "successBg": "#F6FFED",
    "warningBg": "#FFFBE6",
    "errorBg": "#FFF2F0"
  },
  "radius": {
    "sm": 6,
    "md": 8,
    "lg": 10
  },
  "spacing": {
    "xs": 4,
    "sm": 8,
    "md": 16,
    "lg": 24,
    "xl": 32
  },
  "typography": {
    "fontFamily": "\"Microsoft YaHei\", \"Segoe UI\", Arial, sans-serif",
    "pageTitle": 22,
    "sectionTitle": 16,
    "body": 14,
    "meta": 12
  },
  "border": {
    "base": "1px solid var(--ep-color-border)"
  },
  "zIndex": {
    "shell": 10,
    "modal": 50
  }
} as const;

export type EnterpriseTokens = typeof enterpriseTokens;
