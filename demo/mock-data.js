window.PROCUREMENT_MOCK = {
  organizations: [
    { id: "org-group", name: "华礼酒店集团总部", level: "集团总部", parentId: null },
    { id: "org-east", name: "华东区域公司", level: "区域公司", parentId: "org-group" },
    { id: "org-hotel", name: "上海滨江华礼酒店", level: "单体酒店", parentId: "org-east" }
  ],
  roles: [
    {
      id: "group_manager",
      name: "集团采购管理人员",
      hint: "查看授权范围内项目进度、提交统计、风险和审批结果；报价截止前不默认查看报价明细。"
    },
    {
      id: "buyer",
      name: "采购经办人",
      hint: "维护本人经办或授权组织内项目；报价截止前只能看报名名单、提交状态和提交数量。"
    },
    {
      id: "supplier",
      name: "供应商",
      hint: "只查看本企业可参与项目、本企业报价、合同、履约和评价，不查看其他供应商数据。"
    },
    {
      id: "expert",
      name: "评审专家",
      hint: "只查看本人被分配的评审项目和本人评分数据，提交后评分锁定。"
    },
    {
      id: "auditor",
      name: "纪检 / 审计人员",
      hint: "只读穿透监督；报价截止前不默认查看报价明细，只看流程、统计、日志和异常查看审批。"
    },
    {
      id: "admin",
      name: "系统管理员",
      hint: "维护组织、账号、角色和基础配置，不处理采购实质业务内容。"
    }
  ],
  users: [
    { id: "u1", name: "陈静", roleId: "group_manager", orgId: "org-group", orgScope: ["org-group", "org-east", "org-hotel"] },
    { id: "u2", name: "刘明", roleId: "buyer", orgId: "org-east", orgScope: ["org-east", "org-hotel"], managedProjectIds: ["p-pre", "p-award", "p-food", "p-ext"] },
    { id: "u3", name: "王岚", roleId: "supplier", supplierId: "sup-1", orgId: "org-hotel" },
    { id: "u4", name: "赵教授", roleId: "expert", expertId: "exp-1", orgId: "org-group" },
    { id: "u5", name: "周审计", roleId: "auditor", orgId: "org-group", orgScope: ["org-group", "org-east", "org-hotel"] },
    { id: "u6", name: "孙管理员", roleId: "admin", orgId: "org-group" }
  ],
  suppliers: [
    {
      id: "sup-1",
      name: "上海棉织供应链有限公司",
      status: "已准入",
      categoryAuth: ["客房布草", "客房一次性用品"],
      qualification: "有效",
      risk: "正常",
      evaluationScore: 91
    },
    {
      id: "sup-2",
      name: "苏州洁雅清洁服务有限公司",
      status: "已准入",
      categoryAuth: ["清洁服务", "客房一次性用品"],
      qualification: "即将到期",
      risk: "资质 18 天后到期",
      evaluationScore: 86
    },
    {
      id: "sup-3",
      name: "杭州鲜达食材配送有限公司",
      status: "已准入",
      categoryAuth: ["食材供应"],
      qualification: "有效",
      risk: "正常",
      evaluationScore: 88
    },
    {
      id: "sup-4",
      name: "浙江恒修工程服务有限公司",
      status: "限制名单",
      categoryAuth: ["工程维修"],
      qualification: "有效",
      risk: "履约异常未解除",
      evaluationScore: 61
    },
    {
      id: "sup-5",
      name: "南京云栈信息技术有限公司",
      status: "待准入",
      categoryAuth: ["信息化服务"],
      qualification: "待补充",
      risk: "准入资料不完整",
      evaluationScore: null
    }
  ],
  procurementRequests: [
    {
      id: "req-pre",
      projectId: "p-pre",
      title: "客房一次性用品采购需求",
      department: "上海滨江华礼酒店客房部",
      applicant: "刘明",
      budgetLabel: "客户制度确认",
      category: "客房一次性用品",
      orgName: "上海滨江华礼酒店",
      externalRequired: false,
      methodSuggestion: "内部公开招采",
      basis: "Mock 规则：品类为酒店运营常规物资，未触发依法必须外部交易标记；金额阈值待客户制度确认。",
      changeReason: "无",
      approvalStatus: "审批通过",
      attachments: ["需求说明.xlsx", "历史消耗统计.pdf"],
      logs: ["2026-06-21 09:30 刘明提交需求", "2026-06-21 10:15 陈静审批通过"]
    },
    {
      id: "req-award",
      projectId: "p-award",
      title: "客房布草集中采购需求",
      department: "华东区域公司采购管理部",
      applicant: "刘明",
      budgetLabel: "客户制度确认",
      category: "客房布草",
      orgName: "华东区域公司",
      externalRequired: false,
      methodSuggestion: "内部公开招采",
      basis: "Mock 规则：区域集中采购，适合内部公开招采；金额阈值待客户制度确认。",
      changeReason: "无",
      approvalStatus: "审批通过",
      attachments: ["布草规格清单.xlsx", "样品验收标准.pdf"],
      logs: ["2026-06-10 09:10 刘明提交需求", "2026-06-10 11:20 陈静审批通过"]
    },
    {
      id: "req-food",
      projectId: "p-food",
      title: "上海滨江酒店食材供应商比选",
      department: "餐饮部",
      applicant: "刘明",
      budgetLabel: "客户制度确认",
      category: "食材供应",
      orgName: "上海滨江华礼酒店",
      externalRequired: false,
      methodSuggestion: "询价 / 比选",
      basis: "Mock 规则：日常食材供应，适合简化比选；金额阈值待客户制度确认。",
      changeReason: "需结合客户食材采购制度确认",
      approvalStatus: "审批中",
      attachments: ["菜单消耗计划.xlsx"],
      logs: ["2026-06-18 15:40 刘明提交需求"]
    },
    {
      id: "req-ext",
      projectId: "p-ext",
      title: "客房改造工程外部交易备案需求",
      department: "工程部",
      applicant: "刘明",
      budgetLabel: "客户制度确认",
      category: "工程维修",
      orgName: "上海滨江华礼酒店",
      externalRequired: true,
      methodSuggestion: "依法必须外部交易",
      basis: "Mock 规则：工程类项目由客户制度和法规边界确认后标记为外部交易；本平台只做备案和资料归集。",
      changeReason: "外部交易项目不得进入内部交易闭环",
      approvalStatus: "审批通过",
      attachments: ["工程立项批复.pdf", "外部交易判断记录.pdf"],
      logs: ["2026-06-12 10:00 刘明提交需求", "2026-06-12 16:30 陈静审批通过"]
    }
  ],
  projects: [
    {
      id: "p-pre",
      code: "CG-2026-0621-001",
      name: "客房一次性用品采购项目",
      orgId: "org-hotel",
      orgName: "上海滨江华礼酒店",
      type: "内部公开招采",
      status: "报价响应中 / 报价截止前",
      stage: "报价响应",
      stageOrder: "报价响应中",
      category: "客房一次性用品",
      buyer: "刘明",
      quoteDeadline: "2026-06-26 17:00",
      beforeDeadline: true,
      externalTrade: false,
      nonLowestAward: false,
      archiveCompleteness: 46,
      participantSupplierIds: ["sup-1", "sup-2"],
      assignedExpertIds: [],
      flow: ["采购需求", "方式判断", "项目立项", "采购文件", "内部公告", "报名", "报价响应"]
    },
    {
      id: "p-award",
      code: "CG-2026-0610-002",
      name: "客房布草集中采购项目",
      orgId: "org-east",
      orgName: "华东区域公司",
      type: "内部公开招采",
      status: "定标审批中 / 截止后",
      stage: "定标审批",
      stageOrder: "定标审批中",
      category: "客房布草",
      buyer: "刘明",
      quoteDeadline: "2026-06-18 17:00",
      beforeDeadline: false,
      externalTrade: false,
      nonLowestAward: true,
      archiveCompleteness: 82,
      participantSupplierIds: ["sup-1", "sup-2"],
      assignedExpertIds: ["exp-1", "exp-3"],
      flow: [
        "采购需求",
        "方式判断",
        "项目立项",
        "采购文件",
        "内部公告",
        "报名",
        "报价响应",
        "报价锁定",
        "专家评审",
        "评分汇总",
        "评审报告",
        "定标审批",
        "结果通知",
        "合同台账",
        "履约评价",
        "项目档案"
      ]
    },
    {
      id: "p-food",
      code: "CG-2026-0619-003",
      name: "上海滨江酒店食材供应商比选",
      orgId: "org-hotel",
      orgName: "上海滨江华礼酒店",
      type: "询价 / 比选",
      status: "已截止 / 简化评审中",
      stage: "比价 / 简化评审",
      stageOrder: "专家评审中",
      category: "食材供应",
      buyer: "刘明",
      quoteDeadline: "2026-06-20 12:00",
      beforeDeadline: false,
      externalTrade: false,
      nonLowestAward: false,
      archiveCompleteness: 94,
      participantSupplierIds: ["sup-3"],
      assignedExpertIds: [],
      flow: ["采购需求", "方式判断", "邀请供应商", "报价", "比价 / 简化评审", "定标", "合同台账", "履约评价", "档案归集"]
    },
    {
      id: "p-ext",
      code: "EXT-2026-0620-004",
      name: "客房改造工程外部交易备案项目",
      orgId: "org-hotel",
      orgName: "上海滨江华礼酒店",
      type: "依法必须外部交易",
      status: "外部交易备案中",
      stage: "外部结果备案",
      stageOrder: "外部交易备案中",
      category: "工程维修",
      buyer: "刘明",
      quoteDeadline: null,
      beforeDeadline: false,
      externalTrade: true,
      nonLowestAward: false,
      archiveCompleteness: 68,
      participantSupplierIds: ["sup-4"],
      assignedExpertIds: [],
      flow: ["内部立项", "审批留痕", "外部编号登记", "外部公告资料", "外部中标结果", "外部结果备案", "合同台账", "履约节点", "供应商评价", "档案归集", "审计查询"]
    }
  ],
  procurementDocuments: [
    {
      projectId: "p-pre",
      fileName: "客房一次性用品采购文件",
      version: "V1.1",
      editor: "刘明",
      reviewStatus: "已审核",
      publishedAt: "2026-06-21 14:00",
      locked: true,
      changeLogs: ["V1.0 初稿", "V1.1 补充供货周期要求"],
      attachments: ["采购文件V1.1.pdf"]
    },
    {
      projectId: "p-award",
      fileName: "客房布草集中采购文件",
      version: "V2.0",
      editor: "刘明",
      reviewStatus: "已发布锁定",
      publishedAt: "2026-06-11 09:00",
      locked: true,
      changeLogs: ["V1.0 初稿", "V1.2 修改样品送检要求", "V2.0 发布锁定"],
      attachments: ["采购文件V2.0.pdf", "评分办法.pdf"]
    }
  ],
  announcements: [
    {
      projectId: "p-pre",
      publishScope: "华东区域内部供应商库",
      invitedSupplierIds: ["sup-1", "sup-2"],
      publishedAt: "2026-06-21 15:00",
      registerDeadline: "2026-06-24 17:00",
      quoteDeadline: "2026-06-26 17:00",
      notices: ["站内通知 2 家供应商", "短信提醒 2 条"]
    },
    {
      projectId: "p-award",
      publishScope: "集团内部供应商库",
      invitedSupplierIds: ["sup-1", "sup-2"],
      publishedAt: "2026-06-11 10:00",
      registerDeadline: "2026-06-14 17:00",
      quoteDeadline: "2026-06-18 17:00",
      notices: ["站内通知 2 家供应商", "报名截止提醒 1 次"]
    }
  ],
  registrations: [
    {
      id: "reg-1",
      projectId: "p-pre",
      supplierId: "sup-1",
      admissionStatus: "已准入",
      categoryAuthStatus: "已授权",
      restrictedCheck: "未命中",
      qualificationFile: "营业执照与检测报告.pdf",
      registeredAt: "2026-06-22 09:20",
      status: "已报名"
    },
    {
      id: "reg-2",
      projectId: "p-pre",
      supplierId: "sup-2",
      admissionStatus: "已准入",
      categoryAuthStatus: "已授权",
      restrictedCheck: "未命中",
      qualificationFile: "清洁用品授权证书.pdf",
      registeredAt: "2026-06-22 10:05",
      status: "已报名"
    },
    {
      id: "reg-3",
      projectId: "p-award",
      supplierId: "sup-1",
      admissionStatus: "已准入",
      categoryAuthStatus: "已授权",
      restrictedCheck: "未命中",
      qualificationFile: "布草检测报告.pdf",
      registeredAt: "2026-06-12 13:10",
      status: "已报名"
    },
    {
      id: "reg-4",
      projectId: "p-award",
      supplierId: "sup-2",
      admissionStatus: "已准入",
      categoryAuthStatus: "需复核",
      restrictedCheck: "未命中",
      qualificationFile: "清洁联供资质.pdf",
      registeredAt: "2026-06-12 15:30",
      status: "已报名"
    },
    {
      id: "reg-5",
      projectId: "p-ext",
      supplierId: "sup-4",
      admissionStatus: "限制名单",
      categoryAuthStatus: "已授权",
      restrictedCheck: "命中限制名单",
      qualificationFile: "外部交易结果文件.pdf",
      registeredAt: "外部平台产生",
      status: "外部交易结果备案"
    }
  ],
  bids: [
    {
      id: "bid-pre-1",
      projectId: "p-pre",
      supplierId: "sup-1",
      supplierName: "上海棉织供应链有限公司",
      version: "V1 草稿",
      amount: 186000,
      status: "已提交",
      submittedAt: "2026-06-22 15:18",
      deadline: "2026-06-26 17:00",
      canWithdraw: true,
      canResubmit: true,
      file: "响应文件-一次性用品.pdf"
    },
    {
      id: "bid-pre-2",
      projectId: "p-pre",
      supplierId: "sup-2",
      supplierName: "苏州洁雅清洁服务有限公司",
      version: "V1 草稿",
      amount: 179000,
      status: "暂存未提交",
      submittedAt: "-",
      deadline: "2026-06-26 17:00",
      canWithdraw: false,
      canResubmit: true,
      file: "响应文件-洁雅草稿.pdf"
    },
    {
      id: "bid-award-1",
      projectId: "p-award",
      supplierId: "sup-1",
      supplierName: "上海棉织供应链有限公司",
      version: "V2 锁定",
      amount: 1286000,
      status: "已锁定",
      submittedAt: "2026-06-17 15:18",
      deadline: "2026-06-18 17:00",
      canWithdraw: false,
      canResubmit: false,
      file: "响应文件-布草.pdf"
    },
    {
      id: "bid-award-2",
      projectId: "p-award",
      supplierId: "sup-2",
      supplierName: "苏州洁雅清洁服务有限公司",
      version: "V1 锁定",
      amount: 1199000,
      status: "已锁定",
      submittedAt: "2026-06-17 16:02",
      deadline: "2026-06-18 17:00",
      canWithdraw: false,
      canResubmit: false,
      file: "响应文件-清洁联供.pdf"
    },
    {
      id: "bid-food-1",
      projectId: "p-food",
      supplierId: "sup-3",
      supplierName: "杭州鲜达食材配送有限公司",
      version: "V1 锁定",
      amount: 486000,
      status: "已锁定",
      submittedAt: "2026-06-19 17:40",
      deadline: "2026-06-20 12:00",
      canWithdraw: false,
      canResubmit: false,
      file: "报价单-食材.xlsx"
    }
  ],
  bidViewApprovals: [
    {
      id: "BVA-20260623-001",
      projectId: "p-pre",
      projectName: "客房一次性用品采购项目",
      applicant: "刘明",
      reason: "供应商反馈报名附件上传异常，需核对响应文件元数据，不查看报价金额。",
      targetObject: "响应文件元数据",
      targetSupplierId: "sup-1",
      targetSupplierName: "上海棉织供应链有限公司",
      viewContent: "响应文件元数据",
      allowDownload: false,
      validFrom: "2026-06-23 10:00",
      validUntil: "2026-06-23 12:00",
      approver: "陈静",
      status: "已通过",
      opinion: "仅允许查看文件名、大小、上传时间；不得查看报价金额和正文内容。",
      actualViewCount: 1,
      actualDownloadCount: 0,
      auditLogId: "LOG-BVA-001"
    },
    {
      id: "BVA-20260623-002",
      projectId: "p-pre",
      projectName: "客房一次性用品采购项目",
      applicant: "刘明",
      reason: "尝试复核其他供应商报价，审批未覆盖。",
      targetObject: "报价金额",
      targetSupplierId: "sup-2",
      targetSupplierName: "苏州洁雅清洁服务有限公司",
      viewContent: "报价金额",
      allowDownload: false,
      validFrom: "2026-06-23 10:00",
      validUntil: "2026-06-23 12:00",
      approver: "陈静",
      status: "未授权演示",
      opinion: "用于展示超范围拦截。",
      actualViewCount: 0,
      actualDownloadCount: 0,
      auditLogId: "LOG-BVA-002"
    }
  ],
  abnormalViewLogs: [
    { id: "AVL-001", actor: "刘明", time: "2026-06-23 10:20", projectId: "p-pre", supplierId: "sup-1", content: "响应文件元数据", download: "否", approvalId: "BVA-20260623-001", terminal: "Mock-IP 10.0.8.21", result: "允许", outOfScope: "否" },
    { id: "AVL-002", actor: "刘明", time: "2026-06-23 10:25", projectId: "p-pre", supplierId: "sup-2", content: "响应文件元数据", download: "否", approvalId: "BVA-20260623-001", terminal: "Mock-IP 10.0.8.21", result: "拦截", outOfScope: "是，供应商不在授权范围" },
    { id: "AVL-003", actor: "刘明", time: "2026-06-23 10:28", projectId: "p-pre", supplierId: "sup-1", content: "报价金额", download: "否", approvalId: "BVA-20260623-001", terminal: "Mock-IP 10.0.8.21", result: "拦截", outOfScope: "是，内容不在授权范围" },
    { id: "AVL-004", actor: "刘明", time: "2026-06-23 12:10", projectId: "p-pre", supplierId: "sup-1", content: "响应文件元数据", download: "否", approvalId: "BVA-20260623-001", terminal: "Mock-IP 10.0.8.21", result: "拦截", outOfScope: "授权已过期" }
  ],
  experts: [
    { id: "exp-1", name: "赵教授", category: "酒店运营", status: "可抽取", conflict: "无" },
    { id: "exp-2", name: "钱工", category: "工程维修", status: "可抽取", conflict: "与 sup-4 有历史合作" },
    { id: "exp-3", name: "孙会计", category: "财务成本", status: "可抽取", conflict: "无" },
    { id: "exp-4", name: "李顾问", category: "信息化服务", status: "回避", conflict: "与项目单位近亲属任职关系" }
  ],
  expertAssignments: [
    { id: "ea-1", projectId: "p-award", expertId: "exp-1", method: "抽取", avoidanceConfirmed: true, disciplineConfirmed: true, confidentialityConfirmed: true, scoreStatus: "已提交锁定" },
    { id: "ea-2", projectId: "p-award", expertId: "exp-3", method: "指定", reason: "需补充财务成本专家", avoidanceConfirmed: true, disciplineConfirmed: true, confidentialityConfirmed: true, scoreStatus: "已提交锁定" },
    { id: "ea-3", projectId: "p-award", expertId: "exp-4", method: "替换", reason: "回避关系确认后替换", avoidanceConfirmed: false, disciplineConfirmed: false, confidentialityConfirmed: false, scoreStatus: "已替换" }
  ],
  scoringSheets: [
    {
      id: "score-1",
      projectId: "p-award",
      expertId: "exp-1",
      supplierId: "sup-1",
      technical: 43,
      service: 28,
      price: 18,
      total: 89,
      status: "已提交锁定",
      opinion: "综合服务能力较强，报价非最低但履约风险较低。",
      versionId: "sv-2",
      versionNo: "V2",
      submittedAt: "2026-06-19 11:20",
      lockedAt: "2026-06-19 11:22"
    },
    {
      id: "score-2",
      projectId: "p-award",
      expertId: "exp-1",
      supplierId: "sup-2",
      technical: 38,
      service: 24,
      price: 25,
      total: 87,
      status: "已提交锁定",
      opinion: "价格分较高，但资质有效期和持续供货稳定性需关注。",
      versionId: "sv-2",
      versionNo: "V2",
      submittedAt: "2026-06-19 11:20",
      lockedAt: "2026-06-19 11:22"
    },
    {
      id: "score-3",
      projectId: "p-award",
      expertId: "exp-3",
      supplierId: "sup-1",
      technical: 42,
      service: 27,
      price: 17,
      total: 86,
      status: "已提交锁定",
      opinion: "质量控制和交付响应较稳定，价格不占优但综合风险更低。",
      versionId: "sv-3",
      versionNo: "V1",
      submittedAt: "2026-06-19 14:05",
      lockedAt: "2026-06-19 14:07"
    },
    {
      id: "score-4",
      projectId: "p-award",
      expertId: "exp-3",
      supplierId: "sup-2",
      technical: 37,
      service: 23,
      price: 25,
      total: 85,
      status: "已提交锁定",
      opinion: "价格有优势，资质到期风险需纳入合同履约节点。",
      versionId: "sv-3",
      versionNo: "V1",
      submittedAt: "2026-06-19 14:05",
      lockedAt: "2026-06-19 14:07"
    }
  ],
  scoringVersions: [
    { id: "sv-1", projectId: "p-award", expertId: "exp-1", version: "V1", status: "冻结", reason: "首次提交" },
    { id: "sv-2", projectId: "p-award", expertId: "exp-1", version: "V2", status: "重评后冻结", reason: "经审批修正服务响应评分，保留 V1 留痕" },
    { id: "sv-3", projectId: "p-award", expertId: "exp-3", version: "V1", status: "冻结", reason: "首次提交" }
  ],
  scoringSummaries: [
    {
      id: "ss-1",
      projectId: "p-award",
      recommendedSupplierId: "sup-1",
      recommendedSupplier: "上海棉织供应链有限公司",
      lowestSupplier: "苏州洁雅清洁服务有限公司",
      nonLowestReason: "综合评分第一，资质有效期与履约能力更稳定。",
      reportStatus: "评审报告已冻结"
    }
  ],
  supplierScoreSummaries: [
    {
      id: "sss-1",
      projectId: "p-award",
      supplierId: "sup-1",
      expertCount: 2,
      avgTechnical: 42.5,
      avgService: 27.5,
      avgPrice: 17.5,
      total: 87.5,
      rank: 1,
      lowestPrice: "否",
      recommended: true,
      anomaly: "非最低价推荐，需定标审批说明",
      reportStatus: "评审报告已冻结"
    },
    {
      id: "sss-2",
      projectId: "p-award",
      supplierId: "sup-2",
      expertCount: 2,
      avgTechnical: 37.5,
      avgService: 23.5,
      avgPrice: 25,
      total: 86,
      rank: 2,
      lowestPrice: "是",
      recommended: false,
      anomaly: "资质 18 天后到期，需履约风险提示",
      reportStatus: "评审报告已冻结"
    }
  ],
  awardApprovals: [
    {
      id: "aa-1",
      projectId: "p-award",
      supplier: "上海棉织供应链有限公司",
      nonLowest: true,
      reason: "非最低价中选，需确认综合评分、履约风险与资质稳定性。",
      status: "审批中",
      approver: "陈静"
    }
  ],
  resultNotices: [
    { id: "rn-1", projectId: "p-award", supplierId: "sup-1", noticeType: "中选通知", sentAt: "待审批通过后发送", status: "待发送" }
  ],
  externalTradeRecords: [
    {
      id: "ext-1",
      projectId: "p-ext",
      platformName: "外部交易平台",
      externalCode: "EXT-2026-GC-1188",
      announcementFile: "外部公告截图与链接.pdf",
      resultFile: "外部中标结果通知.pdf",
      recordStatus: "外部结果备案中",
      internalInitiation: "内部立项已审批通过",
      approvalTrace: "2026-06-12 陈静审批通过外部交易判断",
      externalNoticeMaterials: "外部公告截图、外部链接、平台编号",
      externalWinningResultUpload: "待补外部中标结果盖章件",
      externalResultRecord: "已登记外部中标结果摘要",
      contractLedger: "合同台账待正式编号回写",
      performanceEvaluation: "履约评价待工程节点完成",
      archiveStatus: "外部资料归集中",
      auditQueryStatus: "审计可只读查询备案链路"
    }
  ],
  contracts: [
    {
      id: "c1",
      projectId: "p-award",
      code: "HT-2026-0701-001",
      supplierId: "sup-1",
      supplier: "上海棉织供应链有限公司",
      amount: 1286000,
      status: "合同系统审批中",
      contractSystemUrl: "合同系统链接占位"
    },
    {
      id: "c2",
      projectId: "p-ext",
      code: "HT-2026-0702-EXT",
      supplierId: "sup-4",
      supplier: "浙江恒修工程服务有限公司",
      amount: 6280000,
      status: "待登记正式合同编号",
      contractSystemUrl: "合同系统链接占位"
    }
  ],
  performanceNodes: [
    { id: "pn-1", contractId: "c1", node: "首批布草到货", dueDate: "2026-07-20", status: "待验收", payment: "未付款" },
    { id: "pn-2", contractId: "c1", node: "第二批补货", dueDate: "2026-08-15", status: "未开始", payment: "未付款" },
    { id: "pn-3", contractId: "c2", node: "工程进场验收", dueDate: "2026-07-30", status: "资料待补", payment: "未付款" }
  ],
  supplierEvaluations: [
    {
      id: "se-1",
      supplierId: "sup-1",
      projectId: "p-award",
      score: 92,
      dimensions: "质量、交付、服务响应、合规配合",
      note: "作为后续准入和品类授权参考。"
    }
  ],
  archiveTemplate: [
    "采购需求",
    "采购方式判断记录",
    "立项审批",
    "采购文件",
    "公告 / 邀请记录",
    "报名记录",
    "报价记录",
    "异常查看审批",
    "专家抽取记录",
    "专家指定理由",
    "专家替换记录",
    "专家回避确认",
    "专家纪律确认",
    "专家保密承诺",
    "专家评分表",
    "评分汇总",
    "评审报告",
    "定标审批",
    "结果通知",
    "合同台账",
    "履约验收",
    "供应商评价",
    "审计日志"
  ],
  archiveItems: [
    { projectId: "p-award", item: "采购需求", required: true, collected: true, source: "需求审批", collectedAt: "2026-06-10 11:20", ownerRole: "采购经办人", missingReason: "", supplementStatus: "-" },
    { projectId: "p-award", item: "采购文件", required: true, collected: true, source: "采购文件发布", collectedAt: "2026-06-11 09:00", ownerRole: "采购经办人", missingReason: "", supplementStatus: "-" },
    { projectId: "p-award", item: "异常查看审批", required: true, collected: false, source: "异常查看审批", collectedAt: "-", ownerRole: "采购经办人", missingReason: "本项目未发生异常查看", supplementStatus: "无需补档说明待确认" },
    { projectId: "p-award", item: "定标审批", required: true, collected: false, source: "定标审批", collectedAt: "-", ownerRole: "集团采购管理人员", missingReason: "审批中", supplementStatus: "待审批完成自动归集" },
    { projectId: "p-ext", item: "外部公告资料", required: true, collected: true, source: "外部交易备案", collectedAt: "2026-06-20 15:00", ownerRole: "采购经办人", missingReason: "", supplementStatus: "-" },
    { projectId: "p-ext", item: "外部中标结果", required: true, collected: false, source: "外部交易备案", collectedAt: "-", ownerRole: "采购经办人", missingReason: "待客户提供盖章件", supplementStatus: "补档申请待提交" },
    { projectId: "p-ext", item: "合同台账", required: true, collected: false, source: "合同系统", collectedAt: "-", ownerRole: "采购经办人", missingReason: "合同编号未回写", supplementStatus: "待合同系统确认" }
  ],
  archives: [
    { id: "ar-1", projectId: "p-award", completeness: 82, missing: ["定标审批最终意见", "合同系统正式编号回写"], sealed: false },
    { id: "ar-2", projectId: "p-ext", completeness: 68, missing: ["外部中标结果盖章件", "合同台账附件"], sealed: false }
  ],
  archiveSealRecords: [
    {
      id: "seal-1",
      projectId: "p-award",
      completeness: "82%",
      sealed: false,
      sealedAt: "-",
      sealedBy: "-",
      allowSupplement: true,
      supplementRequiresApproval: true,
      note: "定标审批和合同编号未完成，暂不封存"
    },
    {
      id: "seal-2",
      projectId: "p-ext",
      completeness: "68%",
      sealed: false,
      sealedAt: "-",
      sealedBy: "-",
      allowSupplement: true,
      supplementRequiresApproval: true,
      note: "外部中标结果盖章件缺失，需补档申请"
    }
  ],
  archiveSupplementRequests: [
    {
      id: "ASR-20260623-001",
      projectId: "p-ext",
      missingItem: "外部中标结果盖章件",
      applicant: "刘明",
      reason: "外部平台已出结果，客户尚未提供盖章版结果文件，需补入归档目录。",
      approver: "周审计",
      status: "待审批",
      logRecorded: true,
      createdAt: "2026-06-23 15:40"
    }
  ],
  auditLogs: [
    { time: "2026-06-21 09:30", actor: "刘明", role: "采购经办人", action: "创建采购需求", object: "p-pre", result: "成功" },
    { time: "2026-06-21 14:00", actor: "刘明", role: "采购经办人", action: "发布采购文件", object: "p-pre", result: "发布后锁定" },
    { time: "2026-06-22 09:20", actor: "上海棉织供应链有限公司", role: "供应商", action: "提交报名资料", object: "p-pre", result: "成功" },
    { time: "2026-06-22 15:18", actor: "上海棉织供应链有限公司", role: "供应商", action: "提交报价", object: "p-pre", result: "截止前加密展示为不可见" },
    { time: "2026-06-23 10:20", actor: "刘明", role: "采购经办人", action: "异常查看授权范围内内容", object: "BVA-20260623-001", result: "允许" },
    { time: "2026-06-23 10:25", actor: "刘明", role: "采购经办人", action: "尝试查看未授权供应商", object: "BVA-20260623-001", result: "拦截" },
    { time: "2026-06-17 16:02", actor: "苏州洁雅清洁服务有限公司", role: "供应商", action: "提交报价", object: "p-award", result: "成功" },
    { time: "2026-06-18 17:00", actor: "系统", role: "系统", action: "报价截止锁定", object: "p-award", result: "锁定" },
    { time: "2026-06-19 11:20", actor: "赵教授", role: "评审专家", action: "提交评分", object: "p-award", result: "锁定" },
    { time: "2026-06-19 14:32", actor: "系统", role: "系统", action: "生成评分汇总", object: "p-award", result: "成功" },
    { time: "2026-06-19 15:00", actor: "刘明", role: "采购经办人", action: "提交定标审批", object: "p-award", result: "审批中" },
    { time: "2026-06-20 16:20", actor: "刘明", role: "采购经办人", action: "登记外部平台编号", object: "p-ext", result: "成功" }
  ]
};
