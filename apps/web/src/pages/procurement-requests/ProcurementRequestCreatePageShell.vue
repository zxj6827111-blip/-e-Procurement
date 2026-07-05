<script setup lang="ts">
import { computed, ref } from "vue";
import { RouterLink, useRouter } from "vue-router";
import { apiPost, uploadFile, type UploadedFileMetadata } from "../../api/http";
import ErrorAlert from "../../components/ErrorAlert.vue";
import {
  EnterpriseButton,
  EnterpriseSurface,
  FormSection,
  RiskAlertPanel,
  SummaryCards,
  type SummaryCardItem
} from "../../components/base";

const router = useRouter();

const title = ref("");
const category = ref("");
const requestDepartment = ref("");
const requesterName = ref("");
const budgetAmount = ref<number | null>(null);
const purpose = ref("");
const expectedArrivalAt = ref("");
const receivingLocation = ref("");
const externalTradeFlag = ref(false);

const lineItemName = ref("");
const lineItemCategory = ref("");
const lineItemSpec = ref("");
const lineItemQuantity = ref(1);
const lineItemUnit = ref("");
const lineItemEstimatedUnitPrice = ref<number | null>(null);
const lineItemBudgetAmount = ref<number | null>(null);
const lineItemRequiredByDate = ref("");
const lineItemRemark = ref("");

const attachmentFile = ref<File | null>(null);
const attachmentFileName = ref("");
const busy = ref(false);
const error = ref("");

const estimatedRowBudget = computed(() => {
  if (lineItemBudgetAmount.value !== null) return lineItemBudgetAmount.value;
  if (lineItemEstimatedUnitPrice.value === null) return null;
  return Number((lineItemEstimatedUnitPrice.value * lineItemQuantity.value).toFixed(2));
});

const draftSummaryItems = computed<SummaryCardItem[]>(() => [
  { label: "审批去向", value: "集团需求审批" },
  { label: "预算金额", value: formatMoney(budgetAmount.value ?? estimatedRowBudget.value) },
  { label: "需求交期", value: expectedArrivalAt.value || "待填写" },
  { label: "附件状态", value: attachmentFileName.value || "未上传" }
]);

const requestPreviewItems = computed<SummaryCardItem[]>(() => [
  { label: "使用部门", value: requestDepartment.value || "待填写" },
  { label: "申请人", value: requesterName.value || "待填写" },
  { label: "采购品类", value: category.value || "待填写" },
  { label: "执行路径", value: externalTradeFlag.value ? "外部交易备案" : "内部采购" }
]);

function formatMoney(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) return "待填写";
  return `¥${value.toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function onAttachmentChange(event: Event) {
  const target = event.target as HTMLInputElement;
  attachmentFile.value = target.files?.[0] ?? null;
  attachmentFileName.value = attachmentFile.value?.name ?? "";
}

async function buildAttachments() {
  if (!attachmentFile.value) return [];
  const suffix = `${Date.now()}`;
  const uploaded = await uploadFile(attachmentFile.value, {
    attachmentKind: "procurement_request_attachment",
    objectType: "procurement_request",
    objectId: `pending-request-${suffix}`
  });
  return [uploaded.file] satisfies UploadedFileMetadata[];
}

function buildLineItems() {
  return [
    {
      itemName: lineItemName.value,
      category: lineItemCategory.value,
      specification: lineItemSpec.value,
      quantity: lineItemQuantity.value,
      unit: lineItemUnit.value,
      estimatedUnitPrice: lineItemEstimatedUnitPrice.value ?? undefined,
      budgetAmount: lineItemBudgetAmount.value ?? undefined,
      requiredByDate: lineItemRequiredByDate.value,
      remark: lineItemRemark.value
    }
  ];
}

async function createRequest() {
  busy.value = true;
  error.value = "";
  try {
    await apiPost("/api/procurement-requests", {
      title: title.value,
      orgId: "org-hotel",
      category: category.value,
      requestDepartment: requestDepartment.value,
      requesterName: requesterName.value,
      budgetLabel: "按酒店制度执行",
      budgetAmount: budgetAmount.value ?? undefined,
      purpose: purpose.value,
      expectedArrivalAt: expectedArrivalAt.value,
      receivingLocation: receivingLocation.value,
      externalTradeFlag: externalTradeFlag.value,
      lineItems: buildLineItems(),
      attachments: await buildAttachments()
    });
    await router.replace("/procurement-requests");
  } catch (err) {
    error.value = err instanceof Error ? err.message : "创建采购申请失败";
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <section class="eds-section">
    <header class="eds-page-header eds-business-context">
      <div class="eds-business-context-main">
        <p class="eds-business-eyebrow">采购申请 / 发起录入</p>
        <h2>新建采购申请</h2>
        <p>把需求摘要、采购明细与附件留痕放在同一条发起链路中，提交后进入集团审批。</p>
      </div>
      <div class="eds-business-context-aside">
        <span class="eds-meta">当前状态</span>
        <strong>待提交</strong>
        <RouterLink class="eds-action-link" to="/procurement-requests">返回列表 <span>→</span></RouterLink>
      </div>
    </header>

    <div class="eds-process-hero">
      <EnterpriseSurface title="填报摘要" eyebrow="版式 C / 发起式工作流" description="避免空洞大块视觉，把提交前真正影响审批与承接的字段固定显示。">
        <SummaryCards :items="draftSummaryItems" />
      </EnterpriseSurface>

      <RiskAlertPanel title="提交前确认" description="本页只强调会影响审批、方式判定和后续转项目的核心信息。">
        <div class="eds-process-reference">
          <article class="eds-process-reference-item">
            <span>当前明细预算</span>
            <strong>{{ formatMoney(estimatedRowBudget) }}</strong>
          </article>
          <article class="eds-process-reference-item">
            <span>执行路径</span>
            <strong>{{ externalTradeFlag ? "外部交易备案" : "内部采购" }}</strong>
          </article>
        </div>
        <ul class="eds-process-checklist">
          <li>
            <strong>先填能支撑审批的业务事实</strong>
            <span>标题、部门、申请人、预算口径和需求用途要能说明为什么采购，而不是只填一个物料名。</span>
          </li>
          <li>
            <strong>先填能支撑后续转项目的明细</strong>
            <span>品类、规格、数量、交期和收货地点必须足够清晰，后续才能承接到项目执行链路。</span>
          </li>
          <li>
            <strong>先判断是否走外部交易备案</strong>
            <span>一旦勾选外部交易备案，后续项目工作台会进入不同的执行路径和审计要求。</span>
          </li>
        </ul>
      </RiskAlertPanel>
    </div>

    <div class="eds-process-shell">
      <section class="eds-panel-stack">
        <FormSection title="基础信息" description="先填审批人最先要判断的需求背景和预算信息。">
          <label>
            申请标题
            <input v-model="title" />
          </label>
          <label>
            使用部门
            <input v-model="requestDepartment" />
          </label>
          <label>
            申请人
            <input v-model="requesterName" />
          </label>
          <label>
            采购品类
            <input v-model="category" />
          </label>
          <label>
            预算金额
            <input v-model.number="budgetAmount" type="number" step="0.01" />
          </label>
          <label class="eds-form-full-row">
            需求用途
            <textarea v-model="purpose" rows="4" />
          </label>
          <label>
            需求日期
            <input v-model="expectedArrivalAt" type="date" />
          </label>
          <label>
            收货地点
            <input v-model="receivingLocation" />
          </label>
          <label>
            外部交易备案路径
            <select v-model="externalTradeFlag">
              <option :value="false">否，内部采购</option>
              <option :value="true">是，走外部备案</option>
            </select>
          </label>
        </FormSection>

        <FormSection title="采购明细" description="最少保证当前主明细完整，后续项目承接才不会断层。">
          <label>
            明细名称
            <input v-model="lineItemName" />
          </label>
          <label>
            明细品类
            <input v-model="lineItemCategory" />
          </label>
          <label>
            规格
            <input v-model="lineItemSpec" />
          </label>
          <label>
            数量
            <input v-model.number="lineItemQuantity" type="number" min="1" />
          </label>
          <label>
            单位
            <input v-model="lineItemUnit" />
          </label>
          <label>
            预估单价
            <input v-model.number="lineItemEstimatedUnitPrice" type="number" step="0.01" />
          </label>
          <label>
            行预算
            <input v-model.number="lineItemBudgetAmount" type="number" step="0.01" />
          </label>
          <label>
            行需求日期
            <input v-model="lineItemRequiredByDate" type="date" />
          </label>
          <label class="eds-form-full-row">
            备注
            <textarea v-model="lineItemRemark" rows="3" />
          </label>
        </FormSection>

        <FormSection title="附件与补充说明" description="附件不是装饰字段，而是后续审批和审计取证入口。">
          <label class="eds-form-full-row">
            申请附件
            <input type="file" @change="onAttachmentChange" />
          </label>
          <p class="eds-meta">当前文件：{{ attachmentFileName || "未选择文件" }}</p>
        </FormSection>
      </section>

      <aside class="eds-panel-stack">
        <EnterpriseSurface title="当前录入预览" description="让业务人员在提交前先看到审批侧真正会看到的摘要。">
          <SummaryCards :items="requestPreviewItems" />
          <p class="eds-meta">主明细预算：{{ formatMoney(estimatedRowBudget) }}</p>
        </EnterpriseSurface>

        <EnterpriseSurface title="关键操作" eyebrow="提交锁定" description="提交后进入审批与方式判定链路，建议确认字段后再锁定。">
          <div class="eds-actions">
            <RouterLink class="eds-button" to="/procurement-requests">取消</RouterLink>
            <EnterpriseButton type="primary" :disabled="busy" @click="createRequest">
              {{ busy ? "提交中..." : "提交申请" }}
            </EnterpriseButton>
          </div>
        </EnterpriseSurface>

        <ErrorAlert v-if="error" :message="error" />
      </aside>
    </div>
  </section>
</template>
