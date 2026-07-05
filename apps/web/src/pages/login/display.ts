import type { DemoUser } from "./types";

export const demoUsers: DemoUser[] = [
  { id: "u1", role: "集团采购管理", org: "集团采购管理部", summary: "发布集团采购需求、组织评审定标" },
  { id: "u2", role: "采购经办", org: "华东区域公司", summary: "采购执行、供应商准入、订单履约" },
  { id: "u10", role: "平台运营", org: "集团采购运营中心", summary: "采购流程运营、模板维护、履约跟进" },
  { id: "u8", role: "酒店采购", org: "上海滨江华礼酒店", summary: "商品目录、采购申请、到货验收" },
  { id: "u9", role: "酒店财务", org: "上海滨江华礼酒店", summary: "发票审核、付款状态、结算资料" },
  { id: "u13", role: "财务审核", org: "集团财务共享中心", summary: "结算材料复核、发票审核、付款进度" },
  { id: "u3", role: "供应商", org: "上海棉织供应链有限公司", summary: "报价响应、交付配合、资料补齐" },
  { id: "u11", role: "供应商管理员", org: "上海棉织供应链有限公司", summary: "报价响应、商品维护、订单履约" },
  { id: "u12", role: "供应商报价员", org: "上海棉织供应链有限公司", summary: "报名资料、报价文件、结果通知" },
  { id: "u7", role: "专家", org: "集团评审专家库", summary: "查看评审资料、提交专家评分" },
  { id: "u5", role: "审计监督", org: "集团纪检审计部", summary: "项目档案、日志监督、异常核查" },
  { id: "u6", role: "系统管理员", org: "集团信息中心", summary: "权限与基础配置" }
];
