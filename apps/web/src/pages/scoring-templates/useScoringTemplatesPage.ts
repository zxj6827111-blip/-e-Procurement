import { computed, onMounted, ref } from "vue";
import { apiGet, apiPatch, apiPost } from "../../api/http";
import type { SummaryCardItem } from "../../components/base";
import { useSessionStore } from "../../stores/session";
import { categoryLabel, statusTone } from "./display";
import type { ScoringCategory, ScoringItem, ScoringTemplate, TemplateFormState, TemplateMutationResponse } from "./types";

export function useScoringTemplatesPage() {
  const session = useSessionStore();
  const templates = ref<ScoringTemplate[]>([]);
  const selectedTemplateId = ref("");
  const loading = ref(false);
  const saving = ref(false);
  const error = ref("");
  const auditLogId = ref("");
  const form = ref<TemplateFormState>({
    templateCode: "",
    templateName: "",
    status: "draft",
    items: []
  });

  const canMaintain = computed(() => ["group_manager", "platform_operator"].includes(session.roleId));
  const selectedTemplate = computed(() => templates.value.find((item) => item.id === selectedTemplateId.value) ?? null);
  const enabledTemplate = computed(() => templates.value.find((item) => item.status === "enabled") ?? null);
  const totalScore = computed(() => Number(form.value.items.reduce((sum, item) => sum + Number(item.maxScore || 0), 0).toFixed(2)));
  const categoryTotals = computed(() => ({
    technical: scoreByCategory("technical"),
    service: scoreByCategory("service"),
    price: scoreByCategory("price")
  }));
  const canEditItems = computed(() => canMaintain.value && !selectedTemplate.value?.inUse);
  const hasScoreError = computed(() => totalScore.value !== 100);
  const summaryItems = computed<SummaryCardItem[]>(() => [
    { label: "模板总数", value: templates.value.length, meta: "评分模板" },
    { label: "当前启用模板", value: enabledTemplate.value?.templateName ?? "未启用", meta: enabledTemplate.value?.templateCode ?? "无" },
    { label: "当前表单总分", value: totalScore.value, meta: hasScoreError.value ? "需等于 100 分" : "可用于启用" },
    { label: "当前权限", value: canMaintain.value ? "可维护" : "只读", meta: session.roleId || "未登录" }
  ]);

  function scoreByCategory(category: ScoringCategory) {
    return Number(form.value.items.filter((item) => item.category === category).reduce((sum, item) => sum + Number(item.maxScore || 0), 0).toFixed(2));
  }

  function defaultItems(): ScoringItem[] {
    return [
      {
        id: "technical_quality",
        category: "technical",
        categoryLabel: "技术分",
        label: "技术响应与质量保障",
        reference: "规格、参数、样品和质量承诺是否满足采购文件要求。",
        evidence: "响应文件、样品、检测报告或质量证明材料。",
        maxScore: 40
      },
      {
        id: "business_service",
        category: "service",
        categoryLabel: "商务分",
        label: "服务承诺与履约条件",
        reference: "交付、售后、账期、培训、响应时效和履约安排是否清晰可执行。",
        evidence: "服务方案、商务偏离表、交付计划或售后承诺。",
        maxScore: 30
      },
      {
        id: "price_reasonableness",
        category: "price",
        categoryLabel: "价格分",
        label: "报价合理性",
        reference: "报价水平、分项完整性、价格偏离和成本合理性。",
        evidence: "报价清单、分项报价、价格说明或澄清材料。",
        maxScore: 30
      }
    ];
  }

  function emptyItem(index: number): ScoringItem {
    return {
      id: `item_${index + 1}`,
      category: "technical",
      categoryLabel: "技术分",
      label: "",
      reference: "",
      evidence: "",
      maxScore: 10
    };
  }

  function resetForm() {
    selectedTemplateId.value = "";
    auditLogId.value = "";
    error.value = "";
    form.value = {
      templateCode: "",
      templateName: "",
      status: "draft",
      items: defaultItems()
    };
  }

  function editTemplate(template: ScoringTemplate) {
    selectedTemplateId.value = template.id;
    form.value = {
      templateCode: template.templateCode,
      templateName: template.templateName,
      status: template.status,
      items: template.items.map((item) => ({ ...item }))
    };
  }

  function addItem() {
    form.value.items.push(emptyItem(form.value.items.length));
  }

  function removeItem(index: number) {
    form.value.items.splice(index, 1);
  }

  function syncCategoryLabel(item: ScoringItem) {
    item.categoryLabel = categoryLabel(item.category);
  }

  function mutationPayload() {
    return {
      templateCode: form.value.templateCode.trim(),
      templateName: form.value.templateName.trim(),
      status: form.value.status,
      items: form.value.items.map((item) => ({
        id: item.id.trim(),
        category: item.category,
        categoryLabel: item.categoryLabel || categoryLabel(item.category),
        label: item.label.trim(),
        reference: item.reference.trim(),
        evidence: item.evidence.trim(),
        maxScore: Number(item.maxScore)
      }))
    };
  }

  async function loadTemplates() {
    loading.value = true;
    error.value = "";
    try {
      const result = await apiGet<{ scoringTemplates: ScoringTemplate[] }>("/api/scoring-templates");
      templates.value = result.scoringTemplates;
      if (selectedTemplateId.value) {
        const current = templates.value.find((item) => item.id === selectedTemplateId.value);
        if (current) {
          editTemplate(current);
          return;
        }
      }
      if (templates.value.length > 0) {
        editTemplate(templates.value.find((item) => item.status === "enabled") ?? templates.value[0]);
      } else {
        resetForm();
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : "评分模板加载失败";
    } finally {
      loading.value = false;
    }
  }

  async function runMutation(action: () => Promise<TemplateMutationResponse>) {
    if (!canMaintain.value) return;
    saving.value = true;
    error.value = "";
    auditLogId.value = "";
    try {
      const result = await action();
      selectedTemplateId.value = result.scoringTemplate.id;
      auditLogId.value = result.auditLogId ?? "";
      await loadTemplates();
    } catch (err) {
      const typed = err as Error & { auditLogId?: string };
      error.value = typed.message;
      auditLogId.value = typed.auditLogId ?? "";
    } finally {
      saving.value = false;
    }
  }

  function saveTemplate() {
    const current = selectedTemplate.value;
    if (current) {
      return runMutation(() => apiPatch<TemplateMutationResponse>(`/api/scoring-templates/${current.id}`, mutationPayload()));
    }
    return runMutation(() => apiPost<TemplateMutationResponse>("/api/scoring-templates", mutationPayload()));
  }

  function cloneTemplate() {
    const current = selectedTemplate.value;
    if (!current) return;
    return runMutation(() =>
      apiPost<TemplateMutationResponse>(`/api/scoring-templates/${current.id}/clone`, {
        ...mutationPayload(),
        templateCode: `${form.value.templateCode.trim()}-new`,
        templateName: `${form.value.templateName.trim()} 新版本`,
        status: "draft"
      })
    );
  }

  function enableTemplate(templateId = selectedTemplateId.value) {
    if (!templateId) return;
    return runMutation(() => apiPost<TemplateMutationResponse>(`/api/scoring-templates/${templateId}/enable`, {}));
  }

  onMounted(loadTemplates);

  return {
    addItem,
    auditLogId,
    canEditItems,
    canMaintain,
    categoryLabel,
    categoryTotals,
    cloneTemplate,
    editTemplate,
    enableTemplate,
    error,
    form,
    hasScoreError,
    loading,
    removeItem,
    resetForm,
    saveTemplate,
    saving,
    selectedTemplate,
    selectedTemplateId,
    statusTone,
    summaryItems,
    syncCategoryLabel,
    templates,
    totalScore
  };
}
