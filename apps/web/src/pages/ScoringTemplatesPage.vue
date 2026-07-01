<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { apiGet, apiPatch, apiPost } from "../api/http";
import AuditLogRef from "../components/AuditLogRef.vue";
import ErrorAlert from "../components/ErrorAlert.vue";
import { useSessionStore } from "../stores/session";

type ScoringCategory = "technical" | "service" | "price";
type TemplateStatus = "draft" | "enabled" | "disabled";

interface ScoringItem {
  id: string;
  category: ScoringCategory;
  categoryLabel: string;
  label: string;
  reference: string;
  evidence: string;
  maxScore: number;
}

interface ScoringTemplate {
  id: string;
  templateCode: string;
  templateName: string;
  versionNo: number;
  status: TemplateStatus;
  items: ScoringItem[];
  totalScore: number;
  inUse: boolean;
  sheetCount: number;
}

interface TemplateMutationResponse {
  scoringTemplate: ScoringTemplate;
  auditLogId?: string;
}

const session = useSessionStore();
const templates = ref<ScoringTemplate[]>([]);
const selectedTemplateId = ref("");
const loading = ref(false);
const saving = ref(false);
const error = ref("");
const auditLogId = ref("");

const form = ref({
  templateCode: "",
  templateName: "",
  status: "draft" as TemplateStatus,
  items: [] as ScoringItem[]
});

const categoryOptions: Array<{ value: ScoringCategory; label: string }> = [
  { value: "technical", label: "技术分" },
  { value: "service", label: "商务分" },
  { value: "price", label: "价格分" }
];

const statusLabels: Record<TemplateStatus, string> = {
  draft: "草稿",
  enabled: "启用中",
  disabled: "停用"
};

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

function scoreByCategory(category: ScoringCategory) {
  return Number(form.value.items.filter((item) => item.category === category).reduce((sum, item) => sum + Number(item.maxScore || 0), 0).toFixed(2));
}

function categoryLabel(category: ScoringCategory) {
  return categoryOptions.find((item) => item.value === category)?.label ?? category;
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
</script>

<template>
  <section class="panel">
    <div class="page-head">
      <div>
        <p class="eyebrow">评审定标配置</p>
        <h2>专家评分模板配置</h2>
      </div>
      <button type="button" class="secondary-button" :disabled="!canMaintain" @click="resetForm">新建模板</button>
    </div>
    <p class="notice">
      评分模板决定专家逐项评分表的字段、分值和材料要求。已被评分单使用的模板会锁定评分项，请另存为新版本后再启用，避免历史评标记录被重新解释。
    </p>
    <div class="metrics">
      <div><strong>{{ templates.length }}</strong><span>模板总数</span></div>
      <div><strong>{{ enabledTemplate?.templateName ?? "未启用" }}</strong><span>当前启用模板</span></div>
      <div><strong>{{ totalScore }}</strong><span>当前表单总分</span></div>
      <div><strong>{{ canMaintain ? "可维护" : "只读" }}</strong><span>当前权限</span></div>
    </div>
    <ErrorAlert v-if="error" :message="error" />
    <AuditLogRef :audit-log-id="auditLogId" />
  </section>

  <section class="template-config-layout">
    <div class="panel">
      <div class="panel-head">
        <h3>模板列表</h3>
        <span v-if="loading" class="tag">加载中</span>
      </div>
      <div class="template-list">
        <button
          v-for="template in templates"
          :key="template.id"
          type="button"
          class="template-row"
          :class="{ selected: template.id === selectedTemplateId }"
          @click="editTemplate(template)"
        >
          <span class="tag" :class="{ success: template.status === 'enabled' }">{{ statusLabels[template.status] }}</span>
          <strong>{{ template.templateName }}</strong>
          <small>{{ template.templateCode }} / v{{ template.versionNo }} / {{ template.totalScore }} 分</small>
          <small>{{ template.inUse ? `已用于 ${template.sheetCount} 张评分单` : "未被使用" }}</small>
        </button>
      </div>
    </div>

    <div class="panel">
      <div class="panel-head">
        <h3>模板表单</h3>
        <span class="tag">{{ selectedTemplate?.inUse ? "已使用，评分项锁定" : "可编辑评分项" }}</span>
      </div>
      <div class="form-grid">
        <label>
          模板编码
          <input v-model="form.templateCode" :disabled="Boolean(selectedTemplate) || !canMaintain" placeholder="例如 hotel-linen-v2" />
        </label>
        <label>
          模板名称
          <input v-model="form.templateName" :disabled="!canMaintain" placeholder="例如 客房布草评分模板 V2" />
        </label>
        <label>
          状态
          <select v-model="form.status" :disabled="!canMaintain">
            <option value="draft">草稿</option>
            <option value="disabled">停用</option>
            <option value="enabled">启用</option>
          </select>
        </label>
      </div>

      <div class="score-summary-grid compact-score-grid">
        <div><span>技术分</span><strong>{{ categoryTotals.technical }}</strong></div>
        <div><span>商务分</span><strong>{{ categoryTotals.service }}</strong></div>
        <div><span>价格分</span><strong>{{ categoryTotals.price }}</strong></div>
        <div><span>总分</span><strong :class="{ 'danger-text': hasScoreError }">{{ totalScore }}</strong></div>
      </div>

      <p v-if="hasScoreError" class="danger-text">评分模板总分必须等于 100 分，保存或启用前请先调整分值。</p>

      <div class="panel-head">
        <h3>评分项</h3>
        <button type="button" class="secondary-button" :disabled="!canEditItems" @click="addItem">新增评分项</button>
      </div>
      <div class="template-item-list">
        <div v-for="(item, index) in form.items" :key="`${item.id}-${index}`" class="template-item-card">
          <div class="form-grid">
            <label>
              项目 ID
              <input v-model="item.id" :disabled="!canEditItems" />
            </label>
            <label>
              分类
              <select v-model="item.category" :disabled="!canEditItems" @change="syncCategoryLabel(item)">
                <option v-for="option in categoryOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
              </select>
            </label>
            <label>
              分值
              <input v-model.number="item.maxScore" type="number" min="0" max="100" step="1" :disabled="!canEditItems" />
            </label>
            <label>
              评分项名称
              <input v-model="item.label" :disabled="!canEditItems" />
            </label>
            <label class="full-row">
              参考标准
              <textarea v-model="item.reference" rows="2" :disabled="!canEditItems" />
            </label>
            <label class="full-row">
              需查看材料
              <textarea v-model="item.evidence" rows="2" :disabled="!canEditItems" />
            </label>
          </div>
          <button type="button" class="danger-button" :disabled="!canEditItems || form.items.length <= 1" @click="removeItem(index)">删除评分项</button>
        </div>
      </div>

      <div class="action-row">
        <button type="button" :disabled="!canMaintain || saving || hasScoreError" @click="saveTemplate">保存模板</button>
        <button type="button" class="secondary-button" :disabled="!selectedTemplate || !canMaintain || saving || hasScoreError" @click="cloneTemplate">另存为新模板</button>
        <button type="button" :disabled="!selectedTemplate || !canMaintain || saving || hasScoreError" @click="enableTemplate()">启用为当前模板</button>
      </div>
    </div>
  </section>
</template>
