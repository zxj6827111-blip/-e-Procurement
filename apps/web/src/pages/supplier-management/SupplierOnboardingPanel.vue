<script setup lang="ts">
import AttachmentList from "../../components/AttachmentList.vue";
import { DataTable, EnterpriseSurface, FeedbackMessage, StatusTag, SummaryCards } from "../../components/base";
import type { Supplier, SupplierOnboardingProfile } from "./types";

const props = defineProps<{
  supplier: Supplier;
  labels: {
    field: (value: unknown) => string;
    boolean: (value: boolean | undefined, trueLabel?: string, falseLabel?: string) => string;
    submittedFrom: (value?: string) => string;
    siteType: (value?: string) => string;
    registeredAddress: (profile?: SupplierOnboardingProfile) => string;
    dateTime: (value?: string | null) => string;
  };
}>();

const profile = props.supplier.onboardingProfile;

const contactColumns = [
  { key: "name", label: "姓名" },
  { key: "position", label: "职位" },
  { key: "mobile", label: "手机" },
  { key: "email", label: "Email" },
  { key: "phone", label: "固定电话" },
  { key: "fax", label: "传真" }
];
</script>

<template>
  <div class="eds-section">
    <EnterpriseSurface title="供应商入驻资料">
      <template #actions>
        <StatusTag>{{ profile?.submittedAt ? labels.dateTime(profile.submittedAt) : "暂无提交时间" }}</StatusTag>
      </template>
    </EnterpriseSurface>

    <template v-if="profile">
      <EnterpriseSurface title="账号注册">
        <SummaryCards
          :items="[
            { label: '注册手机号', value: labels.field(profile.account?.mobile) },
            { label: '注册协议', value: labels.boolean(profile.account?.agreementAccepted, '已同意', '未同意') },
            { label: '协议版本', value: labels.field(profile.account?.agreementVersion) },
            { label: '提交来源', value: labels.submittedFrom(profile.account?.submittedFrom) }
          ]"
        />
      </EnterpriseSurface>

      <EnterpriseSurface title="基础信息">
        <SummaryCards
          :items="[
            { label: '公司全称', value: labels.field(profile.basic?.companyName || supplier.name) },
            { label: '统一社会信用代码', value: labels.field(profile.basic?.socialCreditCode || supplier.socialCreditCode) },
            { label: '营业执照编号', value: labels.field(profile.basic?.businessLicenseNo) },
            { label: '法定代表人', value: labels.field(profile.basic?.legalRepresentative || supplier.legalRepresentative) },
            { label: '注册地址', value: labels.field(profile.basic?.registeredAddress) },
            { label: '详细地址', value: labels.field(profile.basic?.detailAddress) },
            { label: '公司网址', value: labels.field(profile.basic?.website) },
            { label: '供应商类型', value: labels.field(profile.basic?.supplierType) },
            { label: '供应商来源', value: labels.field(profile.basic?.supplierSource || supplier.supplierSource) },
            { label: '完整注册地址', value: labels.registeredAddress(profile) }
          ]"
        />
        <p class="eds-meta">经营范围：{{ labels.field(profile.basic?.businessScope) }}</p>
      </EnterpriseSurface>

      <SummaryCards
        :items="[
          { label: '企业名称', value: profile.basic?.companyName || supplier.name },
          { label: '统一社会信用代码', value: profile.basic?.socialCreditCode || supplier.socialCreditCode || '-' },
          { label: '法定代表人', value: profile.basic?.legalRepresentative || supplier.legalRepresentative || '-' },
          { label: '供应商来源', value: profile.basic?.supplierSource || supplier.supplierSource || '-' },
          { label: '纳税人形式', value: profile.companyMaterials?.taxpayerType || '-' },
          { label: '注册资金', value: profile.companyMaterials?.registeredCapital || '-' },
          { label: '员工规模', value: profile.companyMaterials?.employeeScale || '-' },
          { label: '年营业额', value: profile.companyMaterials?.annualRevenue || '-' }
        ]"
      />

      <EnterpriseSurface title="联系人">
        <DataTable :columns="contactColumns" :rows="profile.contacts ?? []" row-key="id" empty-text="暂无联系人">
          <template #position="{ row }">{{ row.position || "-" }}</template>
          <template #mobile="{ row }">{{ row.mobile || "-" }}</template>
          <template #email="{ row }">{{ row.email || "-" }}</template>
          <template #phone="{ row }">{{ row.phone || "-" }}</template>
          <template #fax="{ row }">{{ row.fax || "-" }}</template>
        </DataTable>
      </EnterpriseSurface>

      <EnterpriseSurface title="主营产品">
        <div class="eds-responsive-grid">
          <article v-for="product in profile.products" :key="product.id" class="eds-surface eds-section">
            <strong>{{ product.name }}</strong>
            <span>{{ product.category }} / {{ product.specification || "暂无规格" }}</span>
            <small>供货能力：{{ product.monthlyCapacity || "-" }}</small>
            <p>{{ product.description || "-" }}</p>
            <AttachmentList :attachments="product.attachments" compact empty-text="暂无产品附件" />
          </article>
        </div>
      </EnterpriseSurface>

      <EnterpriseSurface title="办公室、工厂及展厅">
        <div class="eds-responsive-grid">
          <article v-for="site in profile.sites" :key="site.id" class="eds-surface eds-section">
            <strong>{{ site.name }}</strong>
            <span>{{ labels.siteType(site.siteType) }} / {{ site.address || "-" }}</span>
            <p>{{ site.description || "-" }}</p>
            <AttachmentList :attachments="site.attachments" compact empty-text="暂无场所附件" />
          </article>
        </div>
      </EnterpriseSurface>

      <EnterpriseSurface title="企业资料与入驻问卷">
        <SummaryCards
          :items="[
            { label: '企业性质', value: profile.companyMaterials?.enterpriseNature || '-' },
            { label: '质量体系', value: profile.companyMaterials?.qualitySystem || '-' },
            { label: '廉洁承诺', value: profile.companyMaterials?.sunshineCommitmentAccepted ? '已承诺' : '未确认' },
            { label: '合作范围', value: profile.questionnaire?.cooperationScope || '-' },
            { label: '服务能力', value: profile.questionnaire?.serviceCapability || '-' },
            { label: '配送覆盖', value: profile.questionnaire?.deliveryCoverage || '-' },
            { label: '发展计划', value: profile.companyMaterials?.developmentPlan || '-' },
            { label: '备注', value: profile.questionnaire?.remark || '-' }
          ]"
        />
        <div class="eds-record">
          <p><strong>质量管理说明：</strong>{{ profile.companyMaterials?.qualityDescription || "-" }}</p>
          <p><strong>合作案例：</strong>{{ profile.companyMaterials?.cooperationCases || "-" }}</p>
          <p><strong>发展计划：</strong>{{ profile.companyMaterials?.developmentPlan || "-" }}</p>
          <p><strong>售后承诺：</strong>{{ profile.questionnaire?.afterSalesCommitment || "-" }}</p>
          <p><strong>合规承诺：</strong>{{ profile.questionnaire?.complianceCommitment || "-" }}</p>
          <p><strong>备注：</strong>{{ profile.questionnaire?.remark || "-" }}</p>
        </div>
        <AttachmentList :attachments="profile.companyMaterials?.attachments" variant="document" empty-text="暂无企业资料附件" />
      </EnterpriseSurface>
    </template>

    <FeedbackMessage v-else>该供应商暂无自助入驻资料，可能由集团后台手工新增。</FeedbackMessage>
  </div>
</template>
