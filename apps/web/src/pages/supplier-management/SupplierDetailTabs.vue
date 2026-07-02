<script setup lang="ts">
import SupplierBasicPanel from "./SupplierBasicPanel.vue";
import SupplierEvaluationsPanel from "./SupplierEvaluationsPanel.vue";
import SupplierOnboardingPanel from "./SupplierOnboardingPanel.vue";
import SupplierQualificationsPanel from "./SupplierQualificationsPanel.vue";
import SupplierReviewsPanel from "./SupplierReviewsPanel.vue";
import SupplierSamplesPanel from "./SupplierSamplesPanel.vue";
import { EnterpriseTabs } from "../../components/base";
import type { Attachment, SealSample, Supplier, SupplierManagedAccount, SupplierOnboardingProfile, SupplierTab } from "./types";

interface BasicPanelLabels {
  risk: (value?: string) => string;
  qualificationStatus: (supplier: Supplier | null) => string;
  supplierStatus: (supplier: Supplier | null) => string;
  admissionLevel: (supplier: Supplier | null) => string;
  periodicAssessment: (supplier: Supplier | null) => string;
  dateTime: (value?: string | null) => string;
}

interface OnboardingPanelLabels {
  field: (value: unknown) => string;
  boolean: (value: boolean | undefined, trueLabel?: string, falseLabel?: string) => string;
  submittedFrom: (value?: string) => string;
  siteType: (value?: string) => string;
  registeredAddress: (profile?: SupplierOnboardingProfile) => string;
  dateTime: (value?: string | null) => string;
}

interface SamplesPanelLabels {
  dateTime: (value?: string | null) => string;
  sealSampleAttachments: (sample: SealSample) => Attachment[];
}

defineProps<{
  supplier: Supplier;
  tabs: Array<{ key: SupplierTab; label: string }>;
  activeTab: SupplierTab;
  canMaintainSupplier: boolean;
  canEditOwnSupplier: boolean;
  inactive: boolean;
  accountLoading: boolean;
  supplierAccounts: SupplierManagedAccount[];
  latestResetPassword: { userId: string; temporaryPassword: string } | null;
  basicPanelLabels: BasicPanelLabels;
  onboardingPanelLabels: OnboardingPanelLabels;
  samplesPanelLabels: SamplesPanelLabels;
  reviewTypeLabels: Record<string, string>;
  supplierStatus: (supplier: Supplier | null) => string;
  dateTime: (value?: string | null) => string;
}>();

const emit = defineEmits<{
  selectTab: [tab: SupplierTab];
  refreshAccounts: [];
  resetPassword: [account: SupplierManagedAccount];
  addQualification: [];
  deleteQualification: [attachment: { id?: string }];
  uploadSample: [];
  deleteSample: [sample: SealSample];
}>();
</script>

<template>
  <section class="eds-surface eds-section">
    <EnterpriseTabs :tabs="tabs" :active-key="activeTab" @change="(tab) => emit('selectTab', tab as SupplierTab)" />

    <SupplierBasicPanel
      v-if="activeTab === 'basic'"
      :supplier="supplier"
      :can-maintain-supplier="canMaintainSupplier"
      :account-loading="accountLoading"
      :supplier-accounts="supplierAccounts"
      :latest-reset-password="latestResetPassword"
      :labels="basicPanelLabels"
      @refresh-accounts="emit('refreshAccounts')"
      @reset-password="emit('resetPassword', $event)"
    />

    <SupplierOnboardingPanel v-else-if="activeTab === 'onboarding'" :supplier="supplier" :labels="onboardingPanelLabels" />

    <SupplierQualificationsPanel
      v-else-if="activeTab === 'qualifications'"
      :supplier="supplier"
      :can-edit-own-supplier="canEditOwnSupplier"
      :inactive="inactive"
      @add-qualification="emit('addQualification')"
      @delete-qualification="emit('deleteQualification', $event as Attachment)"
    />

    <SupplierSamplesPanel
      v-else-if="activeTab === 'samples'"
      :supplier="supplier"
      :can-edit-own-supplier="canEditOwnSupplier"
      :inactive="inactive"
      :labels="samplesPanelLabels"
      @upload-sample="emit('uploadSample')"
      @delete-sample="emit('deleteSample', $event)"
    />

    <SupplierReviewsPanel v-else-if="activeTab === 'reviews'" :supplier="supplier" :review-type-labels="reviewTypeLabels" :date-time="dateTime" />

    <SupplierEvaluationsPanel v-else :supplier="supplier" :supplier-status="supplierStatus" :date-time="dateTime" />
  </section>
</template>
