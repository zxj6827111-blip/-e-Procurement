export type WorkbenchRole =
  | "group_manager"
  | "buyer"
  | "hotel_buyer"
  | "hotel_finance"
  | "platform_operator"
  | "supplier"
  | "supplier_admin"
  | "supplier_quotation"
  | "expert"
  | "finance_reviewer"
  | "auditor"
  | "admin";

export interface WorkbenchAction {
  label: string;
  to: string;
}

export interface RoleWorkbench {
  heading: string;
  description: string;
  todayFocus: string[];
  riskSignals: string[];
  primaryActions: WorkbenchAction[];
  deniedActions: string[];
  emptyTodoText: string;
  emptyActivityText: string;
}

const procurementWorkbench: RoleWorkbench = {
  heading: "采购经办今日工作",
  description: "围绕需求立项、采购文件、公告邀请、评审组织和定标材料推进项目。",
  todayFocus: ["待立项需求", "待发布采购文件", "待邀请供应商项目", "即将报价截止项目", "待组织评审项目"],
  riskSignals: ["采购文件未锁定", "公告范围未确认", "报名供应商不足", "报价截止前异常查看申请"],
  primaryActions: [
    { label: "处理采购项目", to: "/project-workbench" },
    { label: "维护采购文件", to: "/procurement-documents" },
    { label: "发布公告邀请", to: "/announcements-invitations" },
    { label: "提交定标材料", to: "/award-result" }
  ],
  deniedActions: ["不替供应商提交报价", "不查看报价截止前的报价金额", "不修改专家个人评分"],
  emptyTodoText: "当前没有待推进的采购项目。新的采购申请立项后，会出现在这里。",
  emptyActivityText: "当前没有新的采购动态。发布公告、报名、报价或归档动作完成后会出现在这里。"
};

export const roleWorkbench: Record<WorkbenchRole, RoleWorkbench> = {
  group_manager: {
    heading: "集团采购管理人今日工作",
    description: "关注采购需求审批、定标审批、供应商准入风险和项目归档完整性。",
    todayFocus: ["待审批需求", "待定标项目", "报价即将截止项目", "供应商资质风险", "超期未归档项目"],
    riskSignals: ["供应商资质即将到期", "报价查看审批异常", "项目超过归档时限", "定标材料不完整"],
    primaryActions: [
      { label: "审批采购需求", to: "/procurement-requests" },
      { label: "查看采购项目", to: "/project-workbench" },
      { label: "复核供应商", to: "/suppliers" },
      { label: "检查项目档案", to: "/archive-audit" }
    ],
    deniedActions: ["不替供应商提交报价", "不修改专家个人评分", "不在报价截止前查看报价金额"],
    emptyTodoText: "当前没有待审批需求。酒店提交新的采购申请后，会出现在这里。",
    emptyActivityText: "当前没有新的项目或供应商风险动态。审批、报价、定标、归档动作完成后会出现在这里。"
  },
  buyer: procurementWorkbench,
  platform_operator: {
    ...procurementWorkbench,
    heading: "运营维护今日工作",
    description: "维护采购执行配置和商品目录，协助采购经办推进项目，但不替代业务审批。",
    deniedActions: ["不替集团审批定标", "不替专家评分", "不越权查看供应商报价明细"]
  },
  hotel_buyer: {
    heading: "酒店采购今日工作",
    description: "关注本酒店采购申请、收货验收、订单履约和付款进度。",
    todayFocus: ["我的采购申请", "待补充申请", "审批中申请", "待收货订单", "待验收事项"],
    riskSignals: ["申请资料不完整", "订单未按期收货", "验收未完成", "付款进度异常"],
    primaryActions: [
      { label: "发起采购申请", to: "/procurement-requests/new" },
      { label: "查看采购申请", to: "/procurement-requests" },
      { label: "处理订单履约", to: "/order-fulfillment" },
      { label: "查看付款进度", to: "/payment-status" }
    ],
    deniedActions: ["不审批集团采购规则", "不查看其他酒店的业务数据", "不处理供应商资质准入"],
    emptyTodoText: "当前没有待处理采购申请。新的申请提交或订单进入收货验收后，会出现在这里。",
    emptyActivityText: "当前没有新的申请、订单或付款动态。业务有进展后会自动更新。"
  },
  hotel_finance: {
    heading: "酒店财务今日工作",
    description: "关注待审核结算材料、发票异常、付款进度和验收前置条件。",
    todayFocus: ["待审核结算材料", "待确认付款进度", "发票异常", "验收未完成的结算申请"],
    riskSignals: ["结算金额不一致", "发票资料缺失", "验收记录未完成", "付款超期"],
    primaryActions: [
      { label: "审核结算材料", to: "/settlement-materials" },
      { label: "查看付款进度", to: "/payment-status" },
      { label: "查看订单履约", to: "/order-fulfillment" }
    ],
    deniedActions: ["不修改采购项目定标结果", "不替供应商提交结算材料", "不维护采购审批规则"],
    emptyTodoText: "当前没有待审核结算材料。供应商提交结算或发票后，会出现在这里。",
    emptyActivityText: "当前没有新的结算或付款动态。审核、退回、付款登记后会出现在这里。"
  },
  supplier: {
    heading: "供应商今日工作",
    description: "关注企业资料、报名报价、订单履约和结算材料。",
    todayFocus: ["待报名项目", "待报价项目", "已提交报价", "待确认订单", "待提交结算材料"],
    riskSignals: ["资质即将到期", "报价临近截止", "订单未确认", "结算材料被退回"],
    primaryActions: [
      { label: "维护供应商档案", to: "/supplier-portal" },
      { label: "提交报名资料", to: "/supplier-registration" },
      { label: "处理报价响应", to: "/bidding" },
      { label: "提交结算材料", to: "/settlement-materials" }
    ],
    deniedActions: ["不查看其他供应商报名和报价", "不维护采购方审批规则", "不查看专家评分明细"],
    emptyTodoText: "当前没有待处理报名、报价或订单。采购方发布公告或邀请后，会出现在这里。",
    emptyActivityText: "当前没有新的报名、报价、订单或结算动态。提交资料或采购方处理后会更新。"
  },
  supplier_admin: {
    heading: "供应商管理员今日工作",
    description: "维护企业档案、资质、报价人员授权、订单履约和结算材料。",
    todayFocus: ["企业资料完整度", "即将到期资质", "待处理邀请", "报名/报价进度", "账号授权"],
    riskSignals: ["资质附件缺失", "联系人信息不完整", "报价员授权范围不足", "结算材料退回"],
    primaryActions: [
      { label: "维护企业资料", to: "/supplier-portal" },
      { label: "查看报名资料", to: "/supplier-registration" },
      { label: "分配报价响应", to: "/bidding" },
      { label: "查看订单履约", to: "/order-fulfillment" }
    ],
    deniedActions: ["不查看其他供应商信息", "不越权查看采购方内部审批", "不修改已封存档案"],
    emptyTodoText: "当前没有待处理供应商事项。采购邀请、资质到期或订单更新后，会出现在这里。",
    emptyActivityText: "当前没有新的供应商档案、报名、报价或履约动态。"
  },
  supplier_quotation: {
    heading: "供应商报价员今日工作",
    description: "专注报名资料、报价响应、补充材料和截止时间。",
    todayFocus: ["待报名项目", "待报价项目", "已提交报价", "即将截止报价", "被退回补充材料"],
    riskSignals: ["报价临近截止", "必传文件缺失", "报价被退回需补充", "授权品类不匹配"],
    primaryActions: [
      { label: "查看报名资料", to: "/supplier-registration" },
      { label: "提交报价响应", to: "/bidding" },
      { label: "查看中标结果", to: "/award-result" }
    ],
    deniedActions: ["不维护企业核心资质", "不查看其他供应商报价", "不处理供应商账号授权"],
    emptyTodoText: "当前没有可报名或可报价项目。采购方发布公告并匹配授权范围后，会出现在这里。",
    emptyActivityText: "当前没有新的报价或结果通知。提交报价、退回补充或中标通知后会更新。"
  },
  expert: {
    heading: "专家评审今日工作",
    description: "关注评审确认、回避确认、待评分项目和已提交评分记录。",
    todayFocus: ["待确认评审", "待回避确认", "待评分项目", "即将截止评分", "已提交评分"],
    riskSignals: ["评分未提交", "回避关系未确认", "评分项未完整填写", "评审材料未查看"],
    primaryActions: [
      { label: "处理专家评分", to: "/expert-scoring" },
      { label: "查看待办", to: "/my-tasks" },
      { label: "查看消息", to: "/messages" }
    ],
    deniedActions: ["不查看其他专家评分", "不修改已提交评分", "不参与定标审批"],
    emptyTodoText: "当前专家暂无确认或评分任务。被抽取进入评审后，任务会出现在这里。",
    emptyActivityText: "当前没有新的评审消息。评审邀请、回避确认或评分提交后会更新。"
  },
  finance_reviewer: {
    heading: "财务审核今日工作",
    description: "复核结算材料、发票、付款进度和异常金额。",
    todayFocus: ["待审核结算材料", "待确认付款进度", "发票异常", "验收未完成的结算申请"],
    riskSignals: ["金额差异", "发票缺失", "验收未完成", "付款超期"],
    primaryActions: [
      { label: "审核结算付款", to: "/settlement-materials" },
      { label: "查看付款进度", to: "/payment-status" },
      { label: "查看操作日志", to: "/audit" }
    ],
    deniedActions: ["不修改定标结果", "不替供应商上传发票", "不处理专家评分"],
    emptyTodoText: "当前没有待审核结算或发票。供应商提交材料后，会出现在这里。",
    emptyActivityText: "当前没有新的财务审核动态。审核、退回或付款登记后会更新。"
  },
  auditor: {
    heading: "纪检审计今日工作",
    description: "只读核查敏感操作、报价查看、专家评分、定标审批和归档完整性。",
    todayFocus: ["敏感操作追踪", "越权尝试", "报价查看记录", "专家评分提交记录", "归档完整性"],
    riskSignals: ["报价查看被拒绝", "业务数据越权尝试", "归档材料缺失", "封存后补档申请"],
    primaryActions: [
      { label: "查看操作日志", to: "/audit" },
      { label: "检查档案审计", to: "/archive-audit" },
      { label: "监督定标结果", to: "/award-result" },
      { label: "查看集成配置", to: "/integration-boundary" }
    ],
    deniedActions: ["不审批采购申请", "不修改业务数据", "不替供应商操作", "不修改专家评分"],
    emptyTodoText: "当前没有待核查事项。出现敏感操作、归档缺口或越权尝试后，会出现在这里。",
    emptyActivityText: "当前没有新的审计动态。业务操作、拒绝访问或归档动作发生后会更新。"
  },
  admin: {
    heading: "系统管理员今日工作",
    description: "维护账号、组织、角色权限、集成配置和系统健康，不直接处理采购业务。",
    todayFocus: ["账号状态", "组织结构", "权限配置", "集成配置", "系统健康"],
    riskSignals: ["生产配置风险", "默认密钥未替换", "本地登录能力未隔离", "外部集成证据缺失"],
    primaryActions: [
      { label: "维护权限配置", to: "/permissions" },
      { label: "查看系统管理", to: "/modules" },
      { label: "检查集成配置", to: "/integration-boundary" }
    ],
    deniedActions: ["不参与采购审批", "不查看报价金额", "不修改专家评分", "不替业务角色提交材料"],
    emptyTodoText: "当前没有需要管理员处理的业务待办。系统配置和账号权限请在系统设置中维护。",
    emptyActivityText: "当前没有新的系统配置动态。权限、账号或集成配置变更后会出现在这里。"
  }
};

export function getRoleWorkbench(roleId: string): RoleWorkbench {
  return roleWorkbench[roleId as WorkbenchRole] ?? roleWorkbench.buyer;
}
