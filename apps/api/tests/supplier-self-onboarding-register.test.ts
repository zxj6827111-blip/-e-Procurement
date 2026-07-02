import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { createAppContext } from "../src/app-context.js";

function boot() {
  const ctx = createAppContext({
    runtime: {
      appEnv: "test",
      dataRoot: fs.mkdtempSync(path.join(os.tmpdir(), "eproc-supplier-self-register-")),
      mockAuthEnabled: true
    }
  });
  return { ctx, app: createApp(ctx) };
}

describe("supplier self-service onboarding registration", () => {
  it("returns a Chinese validation reason when local real-name mock check fails", async () => {
    const runtime = boot();
    const registered = await request(runtime.app)
      .post("/api/suppliers/register")
      .send({
        account: { mobile: "13800138009", captchaCode: "123456", agreementAccepted: true },
        captchaCode: "123456",
        agreementAccepted: true,
        basic: {
          companyName: "1",
          socialCreditCode: "1",
          legalRepresentative: "1"
        },
        contacts: [{ name: "测试联系人", mobile: "13800138009" }],
        products: [{ category: "客房日用品", name: "测试产品" }]
      });

    expect(registered.status).toBe(400);
    expect(registered.body.error).toMatchObject({
      code: "SUPPLIER_REAL_NAME_MOCK_FAILED",
      message: expect.stringContaining("企业实名校验未通过")
    });
  });

  it("captures White-Swan-style registration materials and routes them to group admission review", async () => {
    const runtime = boot();
    const registered = await request(runtime.app)
      .post("/api/suppliers/register")
      .send({
        account: { mobile: "13800138009", captchaCode: "123456", agreementAccepted: true },
        captchaCode: "123456",
        agreementAccepted: true,
        basic: {
          companyName: "白天鹅自助注册供应商",
          socialCreditCode: "91310000REG000001",
          businessLicenseNo: "BL-SELF-001",
          legalRepresentative: "张三",
          registeredAddress: "上海市黄浦区",
          detailAddress: "中山东一路 1 号",
          website: "https://supplier.example.com",
          businessScope: "酒店客房用品生产与配送",
          supplierType: "正式供应商",
          supplierSource: "供应商自助注册"
        },
        contacts: [{ name: "李四", position: "销售经理", email: "supplier@example.com", mobile: "13800138009", phone: "021-88888888", fax: "021-66666666" }],
        products: [
          {
            category: "客房日用品",
            name: "洗护套装",
            specification: "500ml",
            monthlyCapacity: "10000 套",
            description: "可覆盖集团酒店客房用品供应",
            attachments: [{ fileName: "product-intro.pdf", contentType: "application/pdf", contentBase64: Buffer.from("product").toString("base64"), sizeBytes: 7 }]
          }
        ],
        sites: [
          {
            siteType: "factory",
            name: "广州工厂",
            address: "广州市番禺区",
            description: "具备稳定生产线",
            attachments: [{ fileName: "factory.jpg", contentType: "image/jpeg", contentBase64: Buffer.from("factory").toString("base64"), sizeBytes: 7 }]
          }
        ],
        companyMaterials: {
          enterpriseNature: "民营",
          taxpayerType: "一般纳税人",
          registeredCapital: "500 万元",
          employeeScale: "100 人",
          annualRevenue: "3000 万元",
          qualitySystem: "ISO9001",
          qualityDescription: "有质量管理体系",
          cooperationCases: "服务多家酒店",
          developmentPlan: "扩大华东配送",
          sunshineCommitmentAccepted: true,
          attachments: [{ fileName: "license.pdf", contentType: "application/pdf", contentBase64: Buffer.from("license").toString("base64"), sizeBytes: 7 }]
        },
        questionnaire: {
          cooperationScope: "集团酒店客房用品",
          serviceCapability: "7 天配送",
          deliveryCoverage: "华东、华南",
          afterSalesCommitment: "48 小时响应",
          complianceCommitment: "遵守阳光采购规则",
          remark: "自助注册"
        }
      });

    expect(registered.status).toBe(201);
    expect(registered.body.supplier).toMatchObject({
      name: "白天鹅自助注册供应商",
      admissionStatus: "pending",
      qualification: "pending_initial_review",
      supplierSource: "供应商自助注册"
    });
    expect(registered.body.accounts.admin.username).toContain("u-supplier-admin-");
    expect(registered.body.accounts.quotation.username).toContain("u-supplier-quotation-");

    const supplierId = registered.body.supplier.id as string;
    const stored = runtime.ctx.r3SupplierProductRepository.getSupplier(supplierId);
    expect(stored?.onboardingProfile?.products[0]).toMatchObject({ category: "客房日用品", name: "洗护套装" });
    expect(stored?.onboardingProfile?.sites[0]).toMatchObject({ siteType: "factory", name: "广州工厂" });
    expect(stored?.onboardingProfile?.companyMaterials?.taxpayerType).toBe("一般纳税人");
    expect(stored?.qualificationAttachments?.map((item) => item.fileName).sort()).toEqual(["factory.jpg", "license.pdf", "product-intro.pdf"]);

    const groupRead = await request(runtime.app).get(`/api/suppliers/${supplierId}`).set("x-mock-user-id", "u1");
    expect(groupRead.status).toBe(200);
    expect(groupRead.body.supplier.onboardingProfile.questionnaire.cooperationScope).toBe("集团酒店客房用品");
    expect(groupRead.body.supplier.onboardingProfile.account.mobile).toBe("13800138009");
    expect(groupRead.body.supplier.onboardingProfile.basic.businessLicenseNo).toBe("BL-SELF-001");
    expect(groupRead.body.supplier.onboardingProfile.basic.website).toBe("https://supplier.example.com");
    expect(groupRead.body.supplier.onboardingProfile.contacts[0].fax).toBe("021-66666666");
    expect(groupRead.body.supplier.onboardingProfile.companyMaterials.developmentPlan).toBe("扩大华东配送");
    expect(groupRead.body.supplier.onboardingProfile.questionnaire.remark).toBe("自助注册");

    const supplierAdminUserId = registered.body.accounts.admin.userId as string;
    const passwordChange = await request(runtime.app)
      .post("/api/me/change-password")
      .set("x-mock-user-id", supplierAdminUserId)
      .send({
        currentPassword: `pass-${supplierAdminUserId}`,
        newPassword: "supplier-pass-1",
        confirmPassword: "supplier-pass-1"
      });
    expect(passwordChange.status).toBe(200);

    const supplierRead = await request(runtime.app).get("/api/suppliers").set("x-mock-user-id", supplierAdminUserId);
    expect(supplierRead.status).toBe(200);
    expect(supplierRead.body.suppliers).toHaveLength(1);
    expect(supplierRead.body.suppliers[0]).toMatchObject({
      id: supplierId,
      onboardingProfile: {
        account: { mobile: "13800138009" },
        basic: { businessLicenseNo: "BL-SELF-001" },
        questionnaire: { remark: "自助注册" }
      }
    });

    const process = await request(runtime.app).get(`/api/process/business/supplier_onboarding/${supplierId}`).set("x-mock-user-id", "u1");
    expect(process.status).toBe(200);
    expect(process.body.processInstances[0]).toMatchObject({ businessType: "supplier_onboarding", status: "running", currentNodeKey: "profile_completion" });

    const qualification = await request(runtime.app)
      .post(`/api/suppliers/${supplierId}/reviews`)
      .set("x-mock-user-id", "u1")
      .send({ reviewType: "qualification_initial_review", status: "passed", score: 88, opinion: "注册资料完整，进入准入评审" });
    expect(qualification.status).toBe(201);
    expect(qualification.body.supplier.qualification).toBe("initial_review_passed");

    const updatedProcess = await request(runtime.app).get(`/api/process/business/supplier_onboarding/${supplierId}`).set("x-mock-user-id", "u1");
    expect(updatedProcess.body.processInstances[0].currentNodeKey).toBe("admission_approval");
  });

  it("allows supplier quotation account to maintain own profile, qualifications and seal samples", async () => {
    const runtime = boot();
    const registered = await request(runtime.app)
      .post("/api/suppliers/register")
      .send({
        account: { mobile: "13800138012", captchaCode: "123456", agreementAccepted: true },
        captchaCode: "123456",
        agreementAccepted: true,
        basic: {
          companyName: "供应商端维护测试公司",
          socialCreditCode: "91310000REG000012",
          legalRepresentative: "张三"
        },
        contacts: [{ name: "张三", mobile: "13800138012" }],
        products: [{ category: "客房日用品", name: "测试产品" }]
      });

    expect(registered.status).toBe(201);
    const supplierId = registered.body.supplier.id as string;
    const quotationUserId = registered.body.accounts.quotation.userId as string;
    const passwordChange = await request(runtime.app)
      .post("/api/me/change-password")
      .set("x-mock-user-id", quotationUserId)
      .send({
        currentPassword: `pass-${quotationUserId}`,
        newPassword: "quotation-pass-1",
        confirmPassword: "quotation-pass-1"
      });
    expect(passwordChange.status).toBe(200);

    const profile = await request(runtime.app)
      .patch(`/api/suppliers/${supplierId}/profile`)
      .set("x-mock-user-id", quotationUserId)
      .send({
        name: "供应商端维护测试公司更新",
        contactName: "李四",
        contactPhone: "13800138099",
        contactEmail: "supplier-maintain@example.com",
        socialCreditCode: "91310000REG000099",
        businessLicenseNo: "BL-SUPPLIER-099",
        legalRepresentative: "王五",
        registeredAddress: "上海市黄浦区测试路 99 号",
        businessScope: "酒店客房日用品供应",
        categoryAuth: ["客房日用品"],
        serviceRegions: [{ region: "上海", storeName: "滨江店", category: "客房日用品" }],
        qualificationAttachments: [{ fileName: "supplier-license.pdf", contentType: "application/pdf", contentBase64: Buffer.from("license").toString("base64"), sizeBytes: 7 }]
      });
    expect(profile.status).toBe(200);
    expect(profile.body.supplier).toMatchObject({
      name: "供应商端维护测试公司更新",
      contactName: "李四",
      socialCreditCode: "91310000REG000099",
      legalRepresentative: "王五"
    });
    expect(profile.body.supplier.qualificationAttachments.map((item: { fileName: string }) => item.fileName)).toContain("supplier-license.pdf");
    expect(profile.body.supplier.onboardingProfile.basic).toMatchObject({
      companyName: "供应商端维护测试公司更新",
      socialCreditCode: "91310000REG000099",
      businessLicenseNo: "BL-SUPPLIER-099",
      legalRepresentative: "王五",
      registeredAddress: "上海市黄浦区测试路 99 号"
    });
    expect(profile.body.supplier.onboardingProfile.companyMaterials.attachments.map((item: { fileName: string }) => item.fileName)).toContain("supplier-license.pdf");

    const sample = await request(runtime.app)
      .post(`/api/suppliers/${supplierId}/seal-samples`)
      .set("x-mock-user-id", quotationUserId)
      .send({
        sampleName: "供应商端封样",
        specification: "标准套装",
        attachments: [{ fileName: "supplier-sample.png", contentType: "image/png", contentBase64: Buffer.from("sample").toString("base64"), sizeBytes: 6 }]
      });
    expect(sample.status).toBe(201);
    expect(sample.body.supplier.sealSamples.map((item: { fileName: string }) => item.fileName)).toContain("supplier-sample.png");

    const groupRead = await request(runtime.app).get(`/api/suppliers/${supplierId}`).set("x-mock-user-id", "u1");
    expect(groupRead.status).toBe(200);
    expect(groupRead.body.supplier.onboardingProfile.basic.socialCreditCode).toBe("91310000REG000099");
    expect(groupRead.body.supplier.qualificationAttachments.map((item: { fileName: string }) => item.fileName)).toContain("supplier-license.pdf");
    expect(groupRead.body.supplier.sealSamples.map((item: { fileName: string }) => item.fileName)).toContain("supplier-sample.png");
  });

  it("blocks group review pass until supplier qualification materials and initial review are complete", async () => {
    const runtime = boot();
    const missingMaterials = await request(runtime.app)
      .post("/api/suppliers/register")
      .send({
        account: { mobile: "13800138010", captchaCode: "123456", agreementAccepted: true },
        captchaCode: "123456",
        agreementAccepted: true,
        basic: {
          companyName: "测试自助注册无附件供应商",
          socialCreditCode: "91310000REG000010",
          legalRepresentative: "张三"
        },
        contacts: [{ name: "李四", mobile: "13800138010" }],
        products: [{ category: "客房日用品", name: "测试产品" }]
      });

    expect(missingMaterials.status).toBe(201);
    const missingMaterialSupplierId = missingMaterials.body.supplier.id as string;
    const blockedQualification = await request(runtime.app)
      .post(`/api/suppliers/${missingMaterialSupplierId}/reviews`)
      .set("x-mock-user-id", "u1")
      .send({ reviewType: "qualification_initial_review", status: "passed", score: 85, opinion: "尝试通过" });
    expect(blockedQualification.status).toBe(400);
    expect(blockedQualification.body.error).toMatchObject({
      code: "SUPPLIER_REVIEW_MATERIALS_INCOMPLETE",
      message: expect.stringContaining("尚未上传资质附件")
    });
    expect(runtime.ctx.r3SupplierProductRepository.getSupplier(missingMaterialSupplierId)?.qualification).toBe("pending_initial_review");

    const withMaterials = await request(runtime.app)
      .post("/api/suppliers/register")
      .send({
        account: { mobile: "13800138011", captchaCode: "123456", agreementAccepted: true },
        captchaCode: "123456",
        agreementAccepted: true,
        basic: {
          companyName: "测试自助注册有附件供应商",
          socialCreditCode: "91310000REG000011",
          legalRepresentative: "王五"
        },
        contacts: [{ name: "赵六", mobile: "13800138011" }],
        products: [{ category: "客房日用品", name: "测试产品" }],
        companyMaterials: {
          attachments: [{ fileName: "license.pdf", contentType: "application/pdf", contentBase64: Buffer.from("license").toString("base64"), sizeBytes: 7 }]
        }
      });

    expect(withMaterials.status).toBe(201);
    const supplierId = withMaterials.body.supplier.id as string;
    const blockedAdmission = await request(runtime.app)
      .post(`/api/suppliers/${supplierId}/reviews`)
      .set("x-mock-user-id", "u1")
      .send({ reviewType: "admission_assessment", status: "passed", score: 90, opinion: "跳过资质初审" });
    expect(blockedAdmission.status).toBe(400);
    expect(blockedAdmission.body.error).toMatchObject({
      code: "SUPPLIER_ADMISSION_REVIEW_BLOCKED",
      message: expect.stringContaining("先完成资质初审")
    });

    const qualification = await request(runtime.app)
      .post(`/api/suppliers/${supplierId}/reviews`)
      .set("x-mock-user-id", "u1")
      .send({ reviewType: "qualification_initial_review", status: "passed", score: 88, opinion: "资质资料完整" });
    expect(qualification.status).toBe(201);

    const admission = await request(runtime.app)
      .post(`/api/suppliers/${supplierId}/reviews`)
      .set("x-mock-user-id", "u1")
      .send({ reviewType: "admission_assessment", status: "passed", score: 90, opinion: "准入资料符合要求" });
    expect(admission.status).toBe(201);
    expect(admission.body.supplier.admissionStatus).toBe("admitted");
  });
});
