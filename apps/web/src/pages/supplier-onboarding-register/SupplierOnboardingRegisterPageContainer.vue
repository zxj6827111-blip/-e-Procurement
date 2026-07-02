<script setup lang="ts">
import AuditLogRef from "../../components/AuditLogRef.vue";
import ErrorAlert from "../../components/ErrorAlert.vue";
import { EnterpriseButton, SubmitPanel } from "../../components/base";
import AccountSection from "./AccountSection.vue";
import BasicInfoSection from "./BasicInfoSection.vue";
import CompanyMaterialsSection from "./CompanyMaterialsSection.vue";
import ContactSection from "./ContactSection.vue";
import ProductsSection from "./ProductsSection.vue";
import QuestionnaireSection from "./QuestionnaireSection.vue";
import RegisterResultPanel from "./RegisterResultPanel.vue";
import SitesSection from "./SitesSection.vue";
import SupplierOnboardingRegisterShell from "./SupplierOnboardingRegisterShell.vue";
import SupplierOnboardingStepTable from "./SupplierOnboardingStepTable.vue";
import { useSupplierOnboardingRegisterPage } from "./useSupplierOnboardingRegisterPage";

const {
  account,
  activeStep,
  addProduct,
  addSite,
  attachFiles,
  auditLogId,
  basic,
  busy,
  canGoNext,
  canGoPrev,
  companyMaterials,
  contact,
  currentStepName,
  error,
  nextStep,
  prevStep,
  products,
  questionnaire,
  removeProduct,
  removeSite,
  result,
  setActiveStep,
  sites,
  stepRows,
  stepSummary,
  submit
} = useSupplierOnboardingRegisterPage();
</script>

<template>
  <section class="eds-section">
    <SupplierOnboardingRegisterShell :busy="busy" :result-submitted="Boolean(result)" />

    <SupplierOnboardingStepTable :rows="stepRows" @select-step="setActiveStep" />

    <AccountSection v-if="activeStep === 0" v-model:account="account" :step-summary="stepSummary" />
    <BasicInfoSection v-else-if="activeStep === 1" v-model:basic="basic" :step-summary="stepSummary" />
    <ContactSection v-else-if="activeStep === 2" v-model:contact="contact" :step-summary="stepSummary" />
    <ProductsSection
      v-else-if="activeStep === 3"
      v-model:products="products"
      :step-summary="stepSummary"
      @add-product="addProduct"
      @attach-files="attachFiles"
      @remove-product="removeProduct"
    />
    <SitesSection
      v-else-if="activeStep === 4"
      v-model:sites="sites"
      :step-summary="stepSummary"
      @add-site="addSite"
      @attach-files="attachFiles"
      @remove-site="removeSite"
    />
    <CompanyMaterialsSection v-else-if="activeStep === 5" v-model:company-materials="companyMaterials" :step-summary="stepSummary" @attach-files="attachFiles" />
    <QuestionnaireSection v-else v-model:questionnaire="questionnaire" :step-summary="stepSummary" />

    <RegisterResultPanel :result="result" />

    <SubmitPanel>
      <EnterpriseButton :disabled="!canGoPrev" @click="prevStep">上一步</EnterpriseButton>
      <EnterpriseButton v-if="activeStep < 6" type="primary" :disabled="!canGoNext" @click="nextStep">下一步</EnterpriseButton>
      <EnterpriseButton v-else type="primary" :disabled="busy || Boolean(result)" @click="submit">{{ busy ? "提交中" : "提交入驻申请" }}</EnterpriseButton>
    </SubmitPanel>

    <ErrorAlert v-if="error" :message="error" />
    <AuditLogRef :audit-log-id="auditLogId" />
  </section>
</template>

