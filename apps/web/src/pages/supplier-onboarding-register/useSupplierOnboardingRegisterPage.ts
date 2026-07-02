import { computed, ref } from "vue";
import { apiPost, toUploadPayload, type UploadPayload } from "../../api/http";
import { ONBOARDING_STEPS } from "./display";
import type {
  AccountDraft,
  BasicDraft,
  CompanyMaterialsDraft,
  ContactDraft,
  ProductDraft,
  QuestionnaireDraft,
  RegisterResult,
  SiteDraft
} from "./types";

export function useSupplierOnboardingRegisterPage() {
  const activeStep = ref(0);
  const busy = ref(false);
  const error = ref("");
  const auditLogId = ref("");
  const result = ref<RegisterResult | null>(null);

  const account = ref<AccountDraft>({
    mobile: "",
    captchaCode: "123456",
    password: "",
    confirmPassword: "",
    agreementAccepted: true
  });

  const basic = ref<BasicDraft>({
    companyName: "",
    socialCreditCode: "",
    businessLicenseNo: "",
    legalRepresentative: "",
    registeredAddress: "",
    detailAddress: "",
    website: "",
    businessScope: "",
    supplierType: "正式供应商",
    supplierSource: "供应商自助注册"
  });

  const contact = ref<ContactDraft>({
    name: "",
    position: "",
    email: "",
    mobile: "",
    phone: "",
    fax: ""
  });

  const products = ref<ProductDraft[]>([{ category: "", name: "", specification: "", monthlyCapacity: "", description: "", attachments: [] }]);
  const sites = ref<SiteDraft[]>([{ siteType: "office", name: "", address: "", description: "", attachments: [] }]);
  const companyMaterials = ref<CompanyMaterialsDraft>({
    enterpriseNature: "",
    taxpayerType: "",
    registeredCapital: "",
    employeeScale: "",
    annualRevenue: "",
    qualitySystem: "",
    qualityDescription: "",
    cooperationCases: "",
    developmentPlan: "",
    sunshineCommitmentAccepted: true,
    attachments: []
  });
  const questionnaire = ref<QuestionnaireDraft>({
    cooperationScope: "",
    serviceCapability: "",
    deliveryCoverage: "",
    afterSalesCommitment: "",
    complianceCommitment: "",
    remark: ""
  });

  const stepSummary = computed(() => `${activeStep.value + 1} / ${ONBOARDING_STEPS.length}`);
  const currentStepName = computed(() => ONBOARDING_STEPS[activeStep.value] ?? ONBOARDING_STEPS[0]);
  const canGoPrev = computed(() => activeStep.value > 0 && !busy.value);
  const canGoNext = computed(() => activeStep.value < ONBOARDING_STEPS.length - 1 && !busy.value);
  const stepRows = computed(() =>
    ONBOARDING_STEPS.map((name, index) => ({
      id: name,
      index: index + 1,
      name,
      status: result.value ? "done" : activeStep.value === index ? "active" : activeStep.value > index ? "done" : "pending"
    }))
  );
  const socialCreditPattern = /^[0-9A-Z]{15,18}$/;

  function setActiveStep(index: number) {
    if (index < 0 || index >= ONBOARDING_STEPS.length) return;
    error.value = "";
    activeStep.value = index;
  }

  function addProduct() {
    products.value.push({ category: "", name: "", specification: "", monthlyCapacity: "", description: "", attachments: [] });
  }

  function removeProduct(index: number) {
    if (products.value.length <= 1) return;
    products.value.splice(index, 1);
  }

  function addSite() {
    sites.value.push({ siteType: "factory", name: "", address: "", description: "", attachments: [] });
  }

  function removeSite(index: number) {
    if (sites.value.length <= 1) return;
    sites.value.splice(index, 1);
  }

  async function attachFiles(event: Event, target: UploadPayload[]) {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    const payloads = await Promise.all(files.map((file) => toUploadPayload(file)));
    target.splice(0, target.length, ...payloads);
  }

  function requiredMessage() {
    const companyName = basic.value.companyName.trim();
    const socialCreditCode = basic.value.socialCreditCode.trim().toUpperCase();
    const legalRepresentative = basic.value.legalRepresentative.trim();
    const contactName = contact.value.name.trim();
    const contactMobile = (contact.value.mobile || account.value.mobile).trim();
    if (!account.value.mobile.trim() || !account.value.captchaCode.trim() || !account.value.agreementAccepted) return "请先填写手机号、验证码并勾选注册协议。";
    if (account.value.password && account.value.password !== account.value.confirmPassword) return "两次输入的密码不一致。";
    if (!companyName || !socialCreditCode || !legalRepresentative) return "请补充公司名称、统一社会信用代码和法定代表人。";
    if (companyName.length < 2) return "公司全称至少需要 2 个字，不能只填测试数字。";
    if (!socialCreditPattern.test(socialCreditCode)) return "统一社会信用代码需要填写 15-18 位大写字母或数字。";
    if (legalRepresentative.length < 2) return "法定代表人姓名至少需要 2 个字。";
    if (!contactName || !contactMobile) return "请填写主联系人姓名和手机号。";
    if (!products.value[0]?.category.trim() || !products.value[0]?.name.trim()) return "请至少填写一项主营产品。";
    return "";
  }

  function nextStep() {
    error.value = "";
    if (activeStep.value < ONBOARDING_STEPS.length - 1) activeStep.value += 1;
  }

  function prevStep() {
    error.value = "";
    if (activeStep.value > 0) activeStep.value -= 1;
  }

  function payload() {
    const primaryCategory = products.value[0]?.category ?? "";
    const accountMobile = account.value.mobile.trim();
    const basicPayload = {
      ...basic.value,
      companyName: basic.value.companyName.trim(),
      socialCreditCode: basic.value.socialCreditCode.trim().toUpperCase(),
      legalRepresentative: basic.value.legalRepresentative.trim()
    };
    const contactMobile = (contact.value.mobile || accountMobile).trim();
    const contactPayload = {
      ...contact.value,
      name: contact.value.name.trim(),
      mobile: contactMobile
    };
    return {
      account: {
        mobile: accountMobile,
        captchaCode: account.value.captchaCode.trim(),
        agreementAccepted: account.value.agreementAccepted,
        agreementVersion: "local-supplier-entry-agreement-v1"
      },
      captchaCode: account.value.captchaCode.trim(),
      agreementAccepted: account.value.agreementAccepted,
      basic: basicPayload,
      contacts: [{ ...contactPayload, primary: true }],
      products: products.value.filter((item) => item.category || item.name),
      sites: sites.value.filter((item) => item.name || item.address),
      companyMaterials: companyMaterials.value,
      questionnaire: questionnaire.value,
      name: basicPayload.companyName,
      socialCreditCode: basicPayload.socialCreditCode,
      legalRepresentative: basicPayload.legalRepresentative,
      contactName: contactPayload.name,
      contactPhone: contactPayload.mobile,
      category: primaryCategory,
      supplierType: basicPayload.supplierType,
      supplierSource: basicPayload.supplierSource
    };
  }

  async function submit() {
    error.value = requiredMessage();
    if (error.value) return;
    busy.value = true;
    try {
      const data = await apiPost<RegisterResult>("/api/suppliers/register", payload());
      result.value = data;
      auditLogId.value = data.auditLogId ?? "";
      activeStep.value = ONBOARDING_STEPS.length - 1;
    } catch (err) {
      error.value = err instanceof Error ? err.message : "提交注册失败";
      auditLogId.value = String((err as { auditLogId?: string }).auditLogId ?? "");
    } finally {
      busy.value = false;
    }
  }

  return {
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
  };
}
