<script setup lang="ts">
import { computed, ref } from "vue";
import { RouterLink } from "vue-router";
import AuditLogRef from "../components/AuditLogRef.vue";
import ErrorAlert from "../components/ErrorAlert.vue";
import { apiPost, toUploadPayload, type UploadPayload } from "../api/http";

interface SupplierAccount {
  username: string;
  initialPassword?: string;
}

interface RegisterResult {
  supplier: { id: string; name: string; admissionStatus?: string };
  accounts: {
    admin?: SupplierAccount;
    quotation?: SupplierAccount;
  };
  adapterBoundary: string;
  auditLogId?: string;
}

interface ProductDraft {
  category: string;
  name: string;
  specification: string;
  monthlyCapacity: string;
  description: string;
  attachments: UploadPayload[];
}

interface SiteDraft {
  siteType: "office" | "factory" | "showroom" | "warehouse" | "other";
  name: string;
  address: string;
  description: string;
  attachments: UploadPayload[];
}

const steps = ["账号注册", "基础信息", "联系人信息", "主营产品", "办公室、工厂及展厅", "企业资料", "入驻问卷"];
const activeStep = ref(0);
const busy = ref(false);
const error = ref("");
const auditLogId = ref("");
const result = ref<RegisterResult | null>(null);

const account = ref({
  mobile: "",
  captchaCode: "123456",
  password: "",
  confirmPassword: "",
  agreementAccepted: true
});

const basic = ref({
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

const contact = ref({
  name: "",
  position: "",
  email: "",
  mobile: "",
  phone: "",
  fax: ""
});

const products = ref<ProductDraft[]>([
  { category: "", name: "", specification: "", monthlyCapacity: "", description: "", attachments: [] }
]);
const sites = ref<SiteDraft[]>([
  { siteType: "office", name: "", address: "", description: "", attachments: [] }
]);
const companyMaterials = ref({
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
  attachments: [] as UploadPayload[]
});
const questionnaire = ref({
  cooperationScope: "",
  serviceCapability: "",
  deliveryCoverage: "",
  afterSalesCommitment: "",
  complianceCommitment: "",
  remark: ""
});

const stepSummary = computed(() => `${activeStep.value + 1} / ${steps.length}`);
const canGoPrev = computed(() => activeStep.value > 0 && !busy.value);
const canGoNext = computed(() => activeStep.value < steps.length - 1 && !busy.value);
const socialCreditPattern = /^[0-9A-Z]{15,18}$/;

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
  if (activeStep.value < steps.length - 1) activeStep.value += 1;
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
    activeStep.value = steps.length - 1;
  } catch (err) {
    error.value = err instanceof Error ? err.message : "提交注册失败";
    auditLogId.value = String((err as { auditLogId?: string }).auditLogId ?? "");
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <section class="supplier-register-page">
    <div class="supplier-register-hero">
      <div>
        <p class="eyebrow">供应商入驻</p>
        <h1>供应商注册</h1>
        <p>按集团准入要求提交企业、联系人、主营产品、场所和资质资料。提交后由集团进行资质初审和准入审批。</p>
      </div>
      <RouterLink class="secondary-button" to="/login">返回登录</RouterLink>
    </div>

    <div class="supplier-register-shell">
      <aside class="register-stepper">
        <button
          v-for="(step, index) in steps"
          :key="step"
          type="button"
          :class="{ active: activeStep === index, done: activeStep > index || Boolean(result) }"
          @click="activeStep = index"
        >
          <span>{{ index + 1 }}</span>
          {{ step }}
        </button>
      </aside>

      <section class="register-form-panel">
        <div class="panel-head">
          <div>
            <p class="eyebrow">第 {{ stepSummary }} 步</p>
            <h2>{{ steps[activeStep] }}</h2>
          </div>
        </div>

        <div v-if="activeStep === 0" class="form-grid">
          <label>手机号<input v-model="account.mobile" placeholder="用于接收注册验证码" /></label>
          <label>验证码<input v-model="account.captchaCode" placeholder="本地演示验证码为 123456" /></label>
          <label>密码<input v-model="account.password" type="password" autocomplete="new-password" /></label>
          <label>确认密码<input v-model="account.confirmPassword" type="password" autocomplete="new-password" /></label>
          <label class="checkbox-line"><input v-model="account.agreementAccepted" type="checkbox" /> 同意《供应链平台注册协议》</label>
        </div>

        <div v-else-if="activeStep === 1" class="form-grid">
          <label>公司全称<input v-model="basic.companyName" /></label>
          <label>统一社会信用代码<input v-model="basic.socialCreditCode" maxlength="18" /></label>
          <label>营业执照编号<input v-model="basic.businessLicenseNo" /></label>
          <label>法定代表人<input v-model="basic.legalRepresentative" /></label>
          <label>注册地址<input v-model="basic.registeredAddress" /></label>
          <label>详细地址<input v-model="basic.detailAddress" /></label>
          <label>公司网址<input v-model="basic.website" /></label>
          <label>供应商类型<input v-model="basic.supplierType" /></label>
          <label class="full-row">经营范围<textarea v-model="basic.businessScope" rows="3" /></label>
        </div>

        <div v-else-if="activeStep === 2" class="form-grid">
          <label>姓名<input v-model="contact.name" /></label>
          <label>职位<input v-model="contact.position" /></label>
          <label>Email<input v-model="contact.email" type="email" /></label>
          <label>手机号码<input v-model="contact.mobile" /></label>
          <label>固定电话<input v-model="contact.phone" /></label>
          <label>传真<input v-model="contact.fax" /></label>
        </div>

        <div v-else-if="activeStep === 3" class="stack-list">
          <article v-for="(product, index) in products" :key="index" class="draft-card">
            <div class="panel-head">
              <h3>产品 {{ index + 1 }}</h3>
              <button type="button" class="secondary-button" :disabled="products.length === 1" @click="removeProduct(index)">删除</button>
            </div>
            <div class="form-grid">
              <label>产品分类<input v-model="product.category" placeholder="例如：客房日用品" /></label>
              <label>产品名称<input v-model="product.name" /></label>
              <label>规格说明<input v-model="product.specification" /></label>
              <label>月产量 / 供货能力<input v-model="product.monthlyCapacity" /></label>
              <label class="full-row">产品说明<textarea v-model="product.description" rows="3" /></label>
              <label>产品资料<input type="file" multiple @change="(event) => attachFiles(event, product.attachments)" /></label>
              <div class="notice">{{ product.attachments.length ? `已选择 ${product.attachments.length} 个文件` : "可上传产品介绍、检测报告、图片等资料" }}</div>
            </div>
          </article>
          <button type="button" class="secondary-button" @click="addProduct">新增产品</button>
        </div>

        <div v-else-if="activeStep === 4" class="stack-list">
          <article v-for="(site, index) in sites" :key="index" class="draft-card">
            <div class="panel-head">
              <h3>场所 {{ index + 1 }}</h3>
              <button type="button" class="secondary-button" :disabled="sites.length === 1" @click="removeSite(index)">删除</button>
            </div>
            <div class="form-grid">
              <label>
                场所类型
                <select v-model="site.siteType">
                  <option value="office">办公室</option>
                  <option value="factory">工厂</option>
                  <option value="showroom">展厅</option>
                  <option value="warehouse">仓库</option>
                  <option value="other">其他</option>
                </select>
              </label>
              <label>名称<input v-model="site.name" /></label>
              <label class="full-row">地址<input v-model="site.address" /></label>
              <label class="full-row">附加说明<textarea v-model="site.description" rows="3" /></label>
              <label>场所照片 / 资料<input type="file" multiple @change="(event) => attachFiles(event, site.attachments)" /></label>
              <div class="notice">{{ site.attachments.length ? `已选择 ${site.attachments.length} 个文件` : "可上传办公室、工厂或展厅照片" }}</div>
            </div>
          </article>
          <button type="button" class="secondary-button" @click="addSite">新增场所</button>
        </div>

        <div v-else-if="activeStep === 5" class="form-grid">
          <label>企业性质<input v-model="companyMaterials.enterpriseNature" placeholder="例如：民营 / 国有 / 外资" /></label>
          <label>纳税人形式<input v-model="companyMaterials.taxpayerType" /></label>
          <label>注册资金<input v-model="companyMaterials.registeredCapital" /></label>
          <label>员工规模<input v-model="companyMaterials.employeeScale" /></label>
          <label>年营业额<input v-model="companyMaterials.annualRevenue" /></label>
          <label>质量管理体系<input v-model="companyMaterials.qualitySystem" /></label>
          <label class="full-row">质量管理状况说明<textarea v-model="companyMaterials.qualityDescription" rows="3" /></label>
          <label class="full-row">合作案例<textarea v-model="companyMaterials.cooperationCases" rows="3" /></label>
          <label class="full-row">发展计划<textarea v-model="companyMaterials.developmentPlan" rows="3" /></label>
          <label>企业资料附件<input type="file" multiple @change="(event) => attachFiles(event, companyMaterials.attachments)" /></label>
          <div class="notice">{{ companyMaterials.attachments.length ? `已选择 ${companyMaterials.attachments.length} 个文件` : "可上传营业执照、体系证书、合同范本、企业介绍、产品资料、合作案例等" }}</div>
          <label class="checkbox-line"><input v-model="companyMaterials.sunshineCommitmentAccepted" type="checkbox" /> 承诺遵守集团阳光采购和廉洁合作要求</label>
        </div>

        <div v-else class="form-grid">
          <label class="full-row">合作范围<textarea v-model="questionnaire.cooperationScope" rows="3" /></label>
          <label class="full-row">服务能力<textarea v-model="questionnaire.serviceCapability" rows="3" /></label>
          <label class="full-row">配送覆盖<textarea v-model="questionnaire.deliveryCoverage" rows="3" /></label>
          <label class="full-row">售后承诺<textarea v-model="questionnaire.afterSalesCommitment" rows="3" /></label>
          <label class="full-row">合规承诺<textarea v-model="questionnaire.complianceCommitment" rows="3" /></label>
          <label class="full-row">备注<textarea v-model="questionnaire.remark" rows="3" /></label>
        </div>

        <div v-if="result" class="success-panel">
          <h3>入驻申请已提交</h3>
          <p>供应商编号：{{ result.supplier.id }}。当前资料已转集团进行资质初审和准入审批。</p>
          <p v-if="result.accounts.admin">管理员账号：{{ result.accounts.admin.username }}<template v-if="result.accounts.admin.initialPassword"> / 初始密码：{{ result.accounts.admin.initialPassword }}</template></p>
          <p v-if="result.accounts.quotation">报价账号：{{ result.accounts.quotation.username }}<template v-if="result.accounts.quotation.initialPassword"> / 初始密码：{{ result.accounts.quotation.initialPassword }}</template></p>
          <small>{{ result.adapterBoundary }}</small>
        </div>

        <div class="register-actions">
          <button type="button" class="secondary-button" :disabled="!canGoPrev" @click="prevStep">上一步</button>
          <button v-if="activeStep < steps.length - 1" type="button" :disabled="!canGoNext" @click="nextStep">下一步</button>
          <button v-else type="button" :disabled="busy || Boolean(result)" @click="submit">{{ busy ? "提交中" : "提交入驻申请" }}</button>
        </div>

        <ErrorAlert v-if="error" :message="error" />
        <AuditLogRef :audit-log-id="auditLogId" />
      </section>
    </div>
  </section>
</template>
