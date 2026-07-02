<script setup lang="ts">
import { computed } from "vue";
import { EnterpriseButton, EnterpriseSurface, FeedbackMessage } from "../../components/base";
import type { Supplier, SupplierActionMode } from "./types";

const props = defineProps<{
  actionMode: SupplierActionMode;
  selectedSupplier: Supplier | null;
  isSupplierPortal: boolean;
  currentReviewBlockReason: string;
  attachmentCount: number;
  qualificationReviewPassed: boolean;
  selectedSupplierStatus: string;
}>();

const emit = defineEmits<{
  close: [];
  fileChange: [event: Event, mode: "profile" | "seal"];
  saveProfile: [];
  submitReview: [];
  submitSealSample: [];
  deactivateSupplier: [];
  reactivateSupplier: [];
}>();

const profileName = defineModel<string>("profileName", { required: true });
const profileContactName = defineModel<string>("profileContactName", { required: true });
const profileContactPhone = defineModel<string>("profileContactPhone", { required: true });
const profileContactEmail = defineModel<string>("profileContactEmail", { required: true });
const profileSocialCreditCode = defineModel<string>("profileSocialCreditCode", { required: true });
const profileBusinessLicenseNo = defineModel<string>("profileBusinessLicenseNo", { required: true });
const profileLegalRepresentative = defineModel<string>("profileLegalRepresentative", { required: true });
const profileRegisteredAddress = defineModel<string>("profileRegisteredAddress", { required: true });
const profileBusinessScope = defineModel<string>("profileBusinessScope", { required: true });
const profileCategory = defineModel<string>("profileCategory", { required: true });
const profileRegion = defineModel<string>("profileRegion", { required: true });
const profileStore = defineModel<string>("profileStore", { required: true });
const profileQualificationFileName = defineModel<string>("profileQualificationFileName", { required: true });
const reviewType = defineModel<string>("reviewType", { required: true });
const reviewStatus = defineModel<string>("reviewStatus", { required: true });
const reviewScore = defineModel<number | null>("reviewScore", { required: true });
const reviewOpinion = defineModel<string>("reviewOpinion", { required: true });
const sealSampleName = defineModel<string>("sealSampleName", { required: true });
const sealSampleSpec = defineModel<string>("sealSampleSpec", { required: true });
const sealSampleFileName = defineModel<string>("sealSampleFileName", { required: true });
const deactivateReason = defineModel<string>("deactivateReason", { required: true });

const title = computed(() => {
  if (props.actionMode === "profile") return "档案资料维护";
  if (props.actionMode === "review") return "记录准入评审";
  if (props.actionMode === "sample") return "上传封样样品";
  if (props.actionMode === "deactivate") return "作废停用供应商";
  return "重新启用供应商";
});
</script>

<template>
  <EnterpriseSurface :title="title">
    <template #actions>
      <EnterpriseButton type="text" @click="emit('close')">收起</EnterpriseButton>
    </template>

    <div v-if="actionMode === 'profile'" class="eds-form-section">
      <FeedbackMessage v-if="isSupplierPortal">
        <strong>供应商资料补充</strong>
        <span>这里保存的基础信息、资质附件会同步到集团供应商治理页，用于资质初审和准入评审。</span>
      </FeedbackMessage>
      <label>供应商名称<input v-model="profileName" /></label>
      <label>联系人<input v-model="profileContactName" /></label>
      <label>联系电话<input v-model="profileContactPhone" /></label>
      <label>联系邮箱<input v-model="profileContactEmail" /></label>
      <label>统一社会信用代码<input v-model="profileSocialCreditCode" /></label>
      <label>营业执照编号<input v-model="profileBusinessLicenseNo" /></label>
      <label>法定代表人<input v-model="profileLegalRepresentative" /></label>
      <label>注册地址<input v-model="profileRegisteredAddress" /></label>
      <label class="eds-form-full-row">经营范围<textarea v-model="profileBusinessScope" /></label>
      <label>主营品类<input v-model="profileCategory" /></label>
      <label>服务区域<input v-model="profileRegion" /></label>
      <label>门店 / 服务点<input v-model="profileStore" /></label>
      <label>追加资质附件<input type="file" multiple @change="(event) => emit('fileChange', event, 'profile')" /></label>
      <FeedbackMessage>{{ profileQualificationFileName || "点击浏览后可按 Ctrl 或 Shift 一次选择多份资质，保存后会追加到现有资质证照中" }}</FeedbackMessage>
      <EnterpriseButton type="primary" :disabled="!selectedSupplier?.id" @click="emit('saveProfile')">保存资料</EnterpriseButton>
    </div>

    <div v-else-if="actionMode === 'review'" class="eds-form-section">
      <FeedbackMessage :tone="currentReviewBlockReason ? 'warning' : 'neutral'">
        <strong>{{ currentReviewBlockReason ? "暂不能通过该评审" : "资料状态可进入当前评审" }}</strong>
        <span v-if="currentReviewBlockReason">{{ currentReviewBlockReason }}</span>
        <span v-else>
          已收集 {{ attachmentCount }} 份资质/企业/产品/场所附件；
          {{ qualificationReviewPassed ? "资质初审已通过，可继续准入评审。" : "可先完成资质初审。" }}
        </span>
      </FeedbackMessage>
      <label>
        评审类型
        <select v-model="reviewType">
          <option value="qualification_initial_review">资质初审</option>
          <option value="admission_assessment">准入评审</option>
          <option value="regularization_review">转正评审</option>
          <option value="periodic_assessment">周期考核</option>
        </select>
      </label>
      <label>
        评审结果
        <select v-model="reviewStatus">
          <option value="passed">通过</option>
          <option value="rejected">驳回</option>
          <option value="pending">待定</option>
        </select>
      </label>
      <label>评分<input v-model.number="reviewScore" type="number" /></label>
      <label>评审意见<input v-model="reviewOpinion" /></label>
      <EnterpriseButton type="primary" :disabled="Boolean(currentReviewBlockReason)" @click="emit('submitReview')">提交评审</EnterpriseButton>
    </div>

    <div v-else-if="actionMode === 'sample'" class="eds-form-section">
      <label>封样名称<input v-model="sealSampleName" /></label>
      <label>规格说明<input v-model="sealSampleSpec" /></label>
      <label>封样附件<input type="file" accept="image/*" multiple @change="(event) => emit('fileChange', event, 'seal')" /></label>
      <FeedbackMessage>{{ sealSampleFileName || "点击浏览后可按 Ctrl 或 Shift 一次选择多张图片，每张图片会生成一条封样记录" }}</FeedbackMessage>
      <EnterpriseButton type="primary" @click="emit('submitSealSample')">上传封样</EnterpriseButton>
    </div>

    <div v-else-if="actionMode === 'deactivate'" class="eds-form-section">
      <label>供应商名称<input :value="selectedSupplier?.name || ''" disabled /></label>
      <label>作废停用原因<input v-model="deactivateReason" placeholder="例如：误新增、资料录入错误" /></label>
      <FeedbackMessage tone="warning">停用后该供应商会从默认列表隐藏，但审计留痕和历史档案仍保留；可通过状态筛选“停用”查回。</FeedbackMessage>
      <EnterpriseButton type="primary" :disabled="!deactivateReason.trim()" @click="emit('deactivateSupplier')">确认作废停用</EnterpriseButton>
    </div>

    <div v-else class="eds-form-section">
      <label>供应商名称<input :value="selectedSupplier?.name || ''" disabled /></label>
      <label>当前状态<input :value="selectedSupplierStatus" disabled /></label>
      <FeedbackMessage>重新启用后，该供应商会恢复为已准入状态，并重新出现在默认“正常”列表；历史停用记录和审计留痕仍会保留。</FeedbackMessage>
      <EnterpriseButton type="primary" @click="emit('reactivateSupplier')">确认重新启用</EnterpriseButton>
    </div>
  </EnterpriseSurface>
</template>
