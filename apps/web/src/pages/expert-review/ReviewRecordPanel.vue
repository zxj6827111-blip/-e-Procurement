<script setup lang="ts">
import {
  DataTable,
  EnterpriseButton,
  EnterpriseSurface,
  StatusTag,
  SubmitPanel,
  SummaryCards,
  type DataTableColumn,
  type SummaryCardItem
} from "../../components/base";
import type { ReviewRecordDetail, ReviewReport, ScoringCategory, StatusTone } from "./types";
import { labelStatus } from "../../utils/status-labels";

defineProps<{
  canViewExpertReviewProgress: boolean;
  canMaintainExpertReview: boolean;
  reviewStageHint: string;
  reviewDetail: ReviewRecordDetail | null;
  reviewDetailSummaryItems: SummaryCardItem[];
  reports: ReviewReport[];
  supplierScoreColumns: DataTableColumn[];
  scoreDetailColumns: DataTableColumn[];
  reportColumns: DataTableColumn[];
  formatDateTime: (value?: string | null) => string;
  categoryLabel: (category: ScoringCategory) => string;
  statusTone: (status: string) => StatusTone;
}>();

const emit = defineEmits<{
  printReviewDetail: [];
  generateReport: [];
  freezeReport: [];
}>();

const reportNote = defineModel<string>("reportNote", { required: true });
</script>

<template>
  <EnterpriseSurface title="评标记录明细页" description="汇总专家逐项评分、供应商排名、附件材料和专家意见，用于生成、冻结和打印评标记录。">
    <template #actions>
      <EnterpriseButton type="text" :disabled="!reviewDetail" @click="emit('printReviewDetail')">打印评标表</EnterpriseButton>
    </template>

    <p v-if="!canViewExpertReviewProgress" class="eds-meta">{{ reviewStageHint }}</p>
    <p v-else-if="!reviewDetail" class="eds-meta">报价锁定并进入专家评审后，将显示评标记录明细。</p>
    <template v-else>
      <SummaryCards :items="reviewDetailSummaryItems" />

      <div class="eds-form-section">
        <label>评标记录说明<input v-model="reportNote" /></label>
        <label>项目<input :value="`${reviewDetail.project.code} / ${reviewDetail.project.name}`" disabled /></label>
        <label>评分模板<input :value="reviewDetail.template?.templateName || '默认评标模板'" disabled /></label>
        <label>
          报告状态
          <input :value="reports.find((report) => report.status === 'frozen') ? '已冻结' : reports.length ? '已生成' : '未生成'" disabled />
        </label>
      </div>
      <SubmitPanel v-if="canMaintainExpertReview">
        <EnterpriseButton :disabled="!reviewDetail.summary.allSubmitted" @click="emit('generateReport')">
          生成评标记录
        </EnterpriseButton>
        <EnterpriseButton type="primary" :disabled="!reports.some((report) => report.status === 'generated')" @click="emit('freezeReport')">
          冻结评标记录
        </EnterpriseButton>
      </SubmitPanel>

      <DataTable :columns="supplierScoreColumns" :rows="reviewDetail.supplierRecords" row-key="supplierId" empty-text="暂无供应商评分汇总">
        <template #supplier="{ row }">{{ row.supplierName }}</template>
        <template #total="{ row }"><strong>{{ row.total }}</strong></template>
      </DataTable>

      <EnterpriseSurface
        v-for="record in reviewDetail.sheetRecords"
        :key="record.sheetId"
        :title="`${record.supplierName} / ${record.expertName}`"
        :description="`提交：${formatDateTime(record.submittedAt)}；版本：${record.versionNo}；状态：${labelStatus(record.status)}`"
      >
        <SummaryCards
          :items="[
            { label: '技术分', value: record.technical, meta: '专家评分' },
            { label: '商务分', value: record.service, meta: '专家评分' },
            { label: '价格分', value: record.price, meta: '专家评分' },
            { label: '总分', value: record.total, meta: '汇总得分' }
          ]"
        />
        <DataTable :columns="scoreDetailColumns" :rows="record.details" row-key="id" empty-text="暂无评分项">
          <template #category="{ row }">{{ categoryLabel(row.category) }}</template>
          <template #score="{ row }">{{ row.score ?? 0 }}</template>
          <template #comment="{ row }">{{ row.comment || "-" }}</template>
        </DataTable>
        <SummaryCards
          :items="[
            { label: '报名资料', value: record.materials.registrationMaterials.length, meta: record.materials.registrationMaterials.map((file) => file.fileName).join('，') || '暂无' },
            { label: '补充资料', value: record.materials.supplementMaterials.length, meta: record.materials.supplementMaterials.map((file) => file.fileName).join('，') || '暂无' },
            { label: '响应文件', value: record.materials.bidMaterials.length, meta: record.materials.bidMaterials.map((file) => file.fileName).join('，') || record.materials.bidSummary?.fileName || '暂无' }
          ]"
        />
        <p class="eds-meta">专家总意见：{{ record.opinion || "-" }}</p>
      </EnterpriseSurface>

      <EnterpriseSurface title="评标记录历史" description="已生成或冻结的评标记录。">
        <DataTable :columns="reportColumns" :rows="reports" row-key="id" empty-text="暂无已生成的评标记录">
          <template #status="{ row }">
            <StatusTag :tone="statusTone(row.status)">{{ row.status }}</StatusTag>
          </template>
          <template #generatedAt="{ row }">{{ formatDateTime(row.generatedAt) }}</template>
          <template #frozenAt="{ row }">{{ formatDateTime(row.frozenAt) }}</template>
        </DataTable>
      </EnterpriseSurface>
    </template>
  </EnterpriseSurface>
</template>
