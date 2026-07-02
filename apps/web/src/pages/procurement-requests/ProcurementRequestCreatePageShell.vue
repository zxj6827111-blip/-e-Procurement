<script setup lang="ts">
import { ref } from "vue";
import { RouterLink, useRouter } from "vue-router";
import { apiPost, uploadFile, type UploadedFileMetadata } from "../../api/http";
import ErrorAlert from "../../components/ErrorAlert.vue";
import EnterpriseButton from "../../components/base/EnterpriseButton.vue";
import FormSection from "../../components/base/FormSection.vue";
import PageHeader from "../../components/base/PageHeader.vue";
import SubmitPanel from "../../components/base/SubmitPanel.vue";

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
    <PageHeader title="新建采购申请" eyebrow="采购申请" description="按业务字段分区填写申请信息，提交后进入集团审批。">
      <template #actions>
        <RouterLink class="eds-button" to="/procurement-requests">返回列表</RouterLink>
      </template>
    </PageHeader>

    <FormSection title="基础信息">
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
        <input v-model.number="budgetAmount" type="number" />
      </label>
      <label>
        需求用途
        <input v-model="purpose" />
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
        <input v-model="externalTradeFlag" type="checkbox" />
      </label>
    </FormSection>

    <FormSection title="采购明细">
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
        <input v-model.number="lineItemQuantity" type="number" />
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
        <input v-model.number="lineItemBudgetAmount" type="number" />
      </label>
      <label>
        行需求日期
        <input v-model="lineItemRequiredByDate" type="date" />
      </label>
      <label>
        备注
        <input v-model="lineItemRemark" />
      </label>
    </FormSection>

    <FormSection title="附件">
      <label>
        申请附件
        <input type="file" @change="onAttachmentChange" />
      </label>
      <span class="eds-meta">{{ attachmentFileName || "未选择文件" }}</span>
    </FormSection>

    <SubmitPanel>
      <RouterLink class="eds-button" to="/procurement-requests">取消</RouterLink>
      <EnterpriseButton type="primary" :disabled="busy" @click="createRequest">提交申请</EnterpriseButton>
    </SubmitPanel>

    <ErrorAlert v-if="error" :message="error" />
  </section>
</template>

