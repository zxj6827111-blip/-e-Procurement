export function isTestLikeText(value: unknown) {
  return /stage\s*\d|阶段\s*\d|runtime|uat|mock|test|本地测试/i.test(String(value ?? ""));
}

function extensionOf(fileName?: string) {
  const match = fileName?.match(/\.[^.]+$/);
  return match?.[0] ?? "";
}

export function formalFileName(fileName?: string, fallback = "业务附件") {
  if (!fileName) return fallback;
  const lower = fileName.toLowerCase();
  const ext = extensionOf(fileName);
  if (
    !isTestLikeText(fileName) &&
    !/(^|[-_])sup-\d|^sup-\d|^org-|^p-|^req-|^reg-|mprice-|local|codex-clipboard|\.tmp\.|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}/i.test(fileName)
  ) {
    return fileName;
  }
  if (lower.includes("business-license")) return `营业执照${ext || ".pdf"}`;
  if (lower.includes("food-license")) return `食品经营许可证${ext || ".pdf"}`;
  if (lower.includes("quality") || lower.includes("test-report")) return `质量检测报告${ext || ".pdf"}`;
  if (lower.includes("qualification") || lower.includes("registration")) return `报名资质文件${ext || ".pdf"}`;
  if (lower.includes("invoice")) return `发票${ext || ".pdf"}`;
  if (lower.includes("settlement")) return `结算资料${ext || ".pdf"}`;
  if (lower.includes("delivery")) return `送货单${ext || ".pdf"}`;
  return `${fallback}${ext}`;
}

export function businessRecordLabel(value: string | undefined | null, fallback = "业务记录") {
  if (!value) return fallback;
  if (/^(sup|org|p|req|reg|inv|bid|asr|ai|sqa|sr|ss|mprice|mp)-/i.test(value)) return fallback;
  if (/[a-z]+[._-][a-z]+/i.test(value) && !/^(CG|REQ|PO|SET|INV)-/i.test(value)) return fallback;
  return value;
}
