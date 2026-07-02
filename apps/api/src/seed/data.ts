import type {
  ArchiveItem,
  ArchiveSupplementRequest,
  ArchiveTemplate,
  AcceptancePaymentRecord,
  ApprovalRule,
  AwardApproval,
  ComparisonReport,
  ContractLedger,
  AuditLog,
  Bid,
  BidVersion,
  BidViewApproval,
  BidViewLog,
  Expert,
  ExpertAssignment,
  ExternalTradeRecord,
  Organization,
  PricingReport,
  ProcurementAnnouncement,
  ProcurementDocument,
  ProcurementMethodRule,
  ProcurementProject,
  ProcurementProjectPackage,
  ProcurementRequest,
  ProjectSampleReceipt,
  ReviewReport,
  ResultNotification,
  Role,
  ScoringSheet,
  ScoringTemplate,
  ScoringVersion,
  SupplierInvitation,
  SupplierRegistration,
  Supplier,
  InternalPublicityRecord,
  InquirySheet,
  MallCartItem,
  MallFundAccount,
  MallOrder,
  MallPrice,
  MallProduct,
  MallQuestionnaire,
  MallReturnRequest,
  MallScenarioTemplate,
  MallSettlementInvoice,
  MallShipment,
  PerformanceNode,
  PurchaseOrder,
  ReceiptRecord,
  SettlementMaterial,
  SupplierEvaluation,
  User
} from "../types.js";

export const organizations: Organization[] = [
  {
    "id": "org-group",
    "name": "华礼酒店集团总部",
    "level": "集团总部",
    "parentId": null,
    "status": "active"
  },
  {
    "id": "org-east",
    "name": "华东区域公司",
    "level": "区域公司",
    "parentId": "org-group",
    "status": "active"
  },
  {
    "id": "org-hotel",
    "name": "上海滨江华礼酒店",
    "level": "单体酒店",
    "parentId": "org-east",
    "status": "active"
  }
];

export const roles: Role[] = [
  {
    "id": "group_manager",
    "name": "集团采购管理人员",
    "hint": "授权范围内查看项目、审批、风险和审计；截止前不默认查看报价明细。"
  },
  {
    "id": "buyer",
    "name": "采购经办人",
    "hint": "维护经办项目；截止前只能看报名名单、提交状态和统计。"
  },
  {
    "id": "hotel_buyer",
    "name": "酒店采购",
    "hint": "维护本酒店申请、商城下单、收货、退货和评价路径。"
  },
  {
    "id": "hotel_finance",
    "name": "酒店财务",
    "hint": "查看本酒店余额、充值、授信、支付占用、结算和发票。"
  },
  {
    "id": "platform_operator",
    "name": "平台运营",
    "hint": "维护商品、标签、样板间、开业包、问卷和运营模板。"
  },
  {
    "id": "supplier",
    "name": "供应商",
    "hint": "只查看本企业项目、报价、合同、履约和评价。"
  },
  {
    "id": "supplier_admin",
    "name": "供应商管理员",
    "hint": "维护本企业资料、资质、订单、退货和发票。"
  },
  {
    "id": "supplier_quotation",
    "name": "供应商报价人员",
    "hint": "负责报名、报价、应标、上传文件和答疑。"
  },
  {
    "id": "expert",
    "name": "评审专家",
    "hint": "只查看本人分配项目和本人评分，提交后锁定。"
  },
  {
    "id": "finance_reviewer",
    "name": "财务审核",
    "hint": "审核结算、发票和模拟付款台账。"
  },
  {
    "id": "auditor",
    "name": "纪检 / 审计人员",
    "hint": "只读监督；截止前不默认查看报价明细。"
  },
  {
    "id": "admin",
    "name": "系统管理员",
    "hint": "只维护组织、账号、角色、菜单、字典和权限配置。"
  }
];

export const users: User[] = [
  {
    "id": "u1",
    "name": "陈静",
    "roleId": "group_manager",
    "orgId": "org-group",
    "orgScope": [
      "org-group",
      "org-east",
      "org-hotel"
    ]
  },
  {
    "id": "u2",
    "name": "刘明",
    "roleId": "buyer",
    "orgId": "org-east",
    "orgScope": [
      "org-east",
      "org-hotel"
    ],
    "managedProjectIds": [
      "p-pre",
      "p-award",
      "p-food",
      "p-ext"
    ]
  },
  {
    "id": "u3",
    "name": "王岚",
    "roleId": "supplier",
    "supplierId": "sup-1",
    "orgId": "org-hotel"
  },
  {
    "id": "u4",
    "name": "赵教授",
    "roleId": "expert",
    "expertId": "exp-1",
    "orgId": "org-group"
  },
  {
    "id": "u5",
    "name": "周审计",
    "roleId": "auditor",
    "orgId": "org-group",
    "orgScope": [
      "org-group",
      "org-east",
      "org-hotel"
    ]
  },
  {
    "id": "u6",
    "name": "孙管理员",
    "roleId": "admin",
    "orgId": "org-group"
  },
  {
    "id": "u7",
    "name": "李顾问",
    "roleId": "expert",
    "expertId": "exp-4",
    "orgId": "org-group"
  },
  {
    "id": "u8",
    "name": "酒店采购",
    "roleId": "hotel_buyer",
    "orgId": "org-hotel",
    "orgScope": [
      "org-hotel"
    ],
    "managedProjectIds": [
      "p-pre",
      "p-award",
      "p-food"
    ]
  },
  {
    "id": "u9",
    "name": "酒店财务",
    "roleId": "hotel_finance",
    "orgId": "org-hotel",
    "orgScope": [
      "org-hotel"
    ]
  },
  {
    "id": "u10",
    "name": "平台运营",
    "roleId": "platform_operator",
    "orgId": "org-group",
    "orgScope": [
      "org-group",
      "org-east",
      "org-hotel"
    ],
    "managedProjectIds": [
      "p-pre",
      "p-award",
      "p-food",
      "p-ext"
    ]
  },
  {
    "id": "u11",
    "name": "供应商管理员",
    "roleId": "supplier_admin",
    "supplierId": "sup-1",
    "orgId": "org-hotel"
  },
  {
    "id": "u12",
    "name": "供应商报价人员",
    "roleId": "supplier_quotation",
    "supplierId": "sup-1",
    "orgId": "org-hotel"
  },
  {
    "id": "u13",
    "name": "财务审核",
    "roleId": "finance_reviewer",
    "orgId": "org-group",
    "orgScope": [
      "org-group",
      "org-east",
      "org-hotel"
    ]
  },
  {
    "id": "u14",
    "name": "苏州洁雅供应商管理员",
    "roleId": "supplier_admin",
    "supplierId": "sup-2",
    "orgId": "org-hotel"
  },
  {
    "id": "u15",
    "name": "苏州洁雅供应商报价人员",
    "roleId": "supplier_quotation",
    "supplierId": "sup-2",
    "orgId": "org-hotel"
  },
  {
    "id": "u16",
    "name": "杭州鲜达供应商管理员",
    "roleId": "supplier_admin",
    "supplierId": "sup-3",
    "orgId": "org-hotel"
  },
  {
    "id": "u17",
    "name": "杭州鲜达供应商报价人员",
    "roleId": "supplier_quotation",
    "supplierId": "sup-3",
    "orgId": "org-hotel"
  },
  {
    "id": "system",
    "name": "系统",
    "roleId": "system",
    "orgId": "org-group"
  }
];

export const rolePermissions: Array<{ roleId: string; menus: string[]; actions: string[] }> = [
  {
    "roleId": "group_manager",
    "menus": [
      "dashboard",
      "myTasks",
      "projects",
      "suppliers",
      "procurementDocuments",
      "announcements",
      "registrations",
      "bidSecrecy",
      "expertReview",
      "award",
      "externalTrade",
      "contracts",
      "archives",
      "audit"
    ],
    "actions": [
      "project:read",
      "approval:review",
      "audit:read",
      "bid:view-authorized",
      "award:approve"
    ]
  },
  {
    "roleId": "buyer",
    "menus": [
      "dashboard",
      "myTasks",
      "needs",
      "projects",
      "suppliers",
      "procurementDocuments",
      "announcements",
      "registrations",
      "bidSecrecy",
      "expertReview",
      "award",
      "contracts",
      "archives",
      "audit"
    ],
    "actions": [
      "project:maintain",
      "request:accept",
      "request:method-decision",
      "document:maintain",
      "announcement:publish",
      "registration:qualify",
      "bid:manage",
      "award:submit",
      "contract:record",
      "archive:collect"
    ]
  },
  {
    "roleId": "supplier",
    "menus": [
      "dashboard",
      "myTasks",
      "projects",
      "suppliers",
      "supplierRegistration",
      "bidding",
      "contracts"
    ],
    "actions": [
      "supplier:self-read",
      "registration:self-submit",
      "bid:self-maintain",
      "contract:self-read"
    ]
  },
  {
    "roleId": "hotel_buyer",
    "menus": [
      "dashboard",
      "myTasks",
      "needs",
      "projects",
      "suppliers",
      "contracts",
      "archives",
      "audit"
    ],
    "actions": [
      "request:maintain",
      "mall:order",
      "mall:receive",
      "mall:return",
      "supplier:evaluate",
      "audit:read"
    ]
  },
  {
    "roleId": "hotel_finance",
    "menus": [
      "dashboard",
      "myTasks",
      "contracts",
      "audit"
    ],
    "actions": [
      "finance:read",
      "fund:read",
      "settlement:read",
      "invoice:read"
    ]
  },
  {
    "roleId": "platform_operator",
    "menus": [
      "dashboard",
      "myTasks",
      "suppliers",
      "projects",
      "contracts",
      "archives",
      "audit"
    ],
    "actions": [
      "bpmn:manage",
      "mall:operate",
      "questionnaire:maintain",
      "scenario-template:maintain",
      "project:maintain"
    ]
  },
  {
    "roleId": "supplier_admin",
    "menus": [
      "dashboard",
      "myTasks",
      "projects",
      "suppliers",
      "supplierRegistration",
      "bidding",
      "contracts"
    ],
    "actions": [
      "supplier:self-maintain",
      "registration:self-submit",
      "order:self-maintain",
      "invoice:self-maintain",
      "contract:self-read"
    ]
  },
  {
    "roleId": "supplier_quotation",
    "menus": [
      "dashboard",
      "myTasks",
      "projects",
      "supplierRegistration",
      "bidding",
      "contracts"
    ],
    "actions": [
      "registration:self-submit",
      "bid:self-maintain",
      "clarification:self-maintain",
      "file:self-upload"
    ]
  },
  {
    "roleId": "finance_reviewer",
    "menus": [
      "dashboard",
      "myTasks",
      "contracts",
      "audit"
    ],
    "actions": [
      "settlement:review",
      "invoice:review",
      "fund:review",
      "audit:read"
    ]
  },
  {
    "roleId": "expert",
    "menus": [
      "dashboard",
      "myTasks",
      "projects",
      "expertReview",
      "expertScoring"
    ],
    "actions": [
      "expert:self-read",
      "scoring:self-maintain"
    ]
  },
  {
    "roleId": "auditor",
    "menus": [
      "dashboard",
      "myTasks",
      "needs",
      "projects",
      "suppliers",
      "procurementDocuments",
      "announcements",
      "registrations",
      "bidSecrecy",
      "expertReview",
      "award",
      "externalTrade",
      "contracts",
      "archives",
      "audit"
    ],
    "actions": [
      "audit:read",
      "audit:export"
    ]
  },
  {
    "roleId": "admin",
    "menus": [
      "dashboard",
      "admin"
    ],
    "actions": [
      "bpmn:manage",
      "config:manage"
    ]
  }
];

export const systemDictionaries: Array<{ dictType: string; dictCode: string; dictName: string; dictValue: string }> = [
  {
    "dictType": "procurement_method",
    "dictCode": "internal_open",
    "dictName": "内部公开招采",
    "dictValue": "客户制度确认"
  },
  {
    "dictType": "procurement_method",
    "dictCode": "comparison",
    "dictName": "询价 / 比选",
    "dictValue": "客户制度确认"
  },
  {
    "dictType": "procurement_method",
    "dictCode": "external_trade",
    "dictName": "依法必须外部交易",
    "dictValue": "客户制度确认"
  },
  {
    "dictType": "approval_chain",
    "dictCode": "default_approval",
    "dictName": "默认审批链",
    "dictValue": "按集团采购制度配置"
  },
  {
    "dictType": "result_visibility",
    "dictCode": "supplier_self_only",
    "dictName": "供应商默认只看本企业结果",
    "dictValue": "待客户确认"
  }
];

export const suppliers: Supplier[] = [
  {
    "id": "sup-1",
    "name": "上海棉织供应链有限公司",
    "status": "已准入",
    "admissionStatus": "admitted",
    "contactName": "王岚",
    "contactPhone": "13800010001",
    "categoryAuth": [
      "客房布草",
      "客房一次性用品"
    ],
    "categoryAuthorizations": [
      {
        "category": "客房布草",
        "status": "active",
        "authorizedAt": "2026-05-18T09:00:00.000Z",
        "expiresAt": "2027-05-17T23:59:59.000Z"
      },
      {
        "category": "客房一次性用品",
        "status": "active",
        "authorizedAt": "2026-05-18T09:00:00.000Z",
        "expiresAt": "2027-05-17T23:59:59.000Z"
      }
    ],
    "serviceRegions": [
      {
        "id": "sr-sup-1-east",
        "region": "华东",
        "storeName": "上海滨江华礼酒店",
        "category": "客房布草",
        "status": "active"
      },
      {
        "id": "sr-sup-1-hotel",
        "region": "上海",
        "storeName": "上海滨江华礼酒店",
        "category": "客房一次性用品",
        "status": "active"
      }
    ],
    "admissionReviews": [
      {
        "id": "sar-sup-1-1",
        "reviewType": "qualification_initial_review",
        "status": "passed",
        "reviewer": "刘明",
        "opinion": "营业执照、授权书和检测报告齐全。",
        "reviewedAt": "2026-05-16T10:00:00.000Z"
      },
      {
        "id": "sar-sup-1-2",
        "reviewType": "admission_assessment",
        "status": "passed",
        "score": 92,
        "reviewer": "陈静",
        "opinion": "同类酒店履约记录稳定，建议准入。",
        "reviewedAt": "2026-05-18T09:00:00.000Z"
      }
    ],
    "sealSamples": [
      {
        "id": "ss-sup-1-linen",
        "sampleName": "高支纱床单封样",
        "specification": "80s 纯棉 280x280cm",
        "confirmedBy": "刘明",
        "confirmedAt": "2026-05-20T14:00:00.000Z",
        "imageFileName": "sealed-sample-linen.jpg"
      }
    ],
    "qualification": "有效",
    "qualificationAttachments": [
      {
        "id": "sqa-sup-1-license",
        "fileName": "sup-1-business-license.pdf",
        "qualificationType": "营业执照",
        "validUntil": "2028-12-31",
        "uploadedAt": "2026-05-15T09:00:00.000Z"
      },
      {
        "id": "sqa-sup-1-test",
        "fileName": "sup-1-textile-test-report.pdf",
        "qualificationType": "检测报告",
        "validUntil": "2027-05-31",
        "uploadedAt": "2026-05-15T09:20:00.000Z"
      }
    ],
    "risk": "正常",
    "evaluationScore": 91
  },
  {
    "id": "sup-2",
    "name": "苏州洁雅清洁服务有限公司",
    "status": "已准入",
    "admissionStatus": "admitted",
    "contactName": "张洁",
    "contactPhone": "13800010002",
    "categoryAuth": [
      "清洁服务",
      "客房一次性用品"
    ],
    "categoryAuthorizations": [
      {
        "category": "清洁服务",
        "status": "active",
        "authorizedAt": "2026-05-12T09:00:00.000Z",
        "expiresAt": "2027-05-11T23:59:59.000Z"
      },
      {
        "category": "客房一次性用品",
        "status": "active",
        "authorizedAt": "2026-05-12T09:00:00.000Z",
        "expiresAt": "2026-07-12T23:59:59.000Z"
      }
    ],
    "serviceRegions": [
      {
        "id": "sr-sup-2-east",
        "region": "华东",
        "storeName": "上海滨江华礼酒店",
        "category": "客房一次性用品",
        "status": "active"
      }
    ],
    "admissionReviews": [
      {
        "id": "sar-sup-2-1",
        "reviewType": "qualification_initial_review",
        "status": "passed",
        "reviewer": "刘明",
        "opinion": "主体资质有效，部分检测报告即将到期。",
        "reviewedAt": "2026-05-13T10:00:00.000Z"
      },
      {
        "id": "sar-sup-2-2",
        "reviewType": "admission_assessment",
        "status": "passed",
        "score": 86,
        "reviewer": "陈静",
        "opinion": "准入后需跟踪补交更新报告。",
        "reviewedAt": "2026-05-14T09:00:00.000Z"
      }
    ],
    "sealSamples": [
      {
        "id": "ss-sup-2-amenity",
        "sampleName": "环保牙具封样",
        "specification": "竹柄牙刷套装",
        "confirmedBy": "刘明",
        "confirmedAt": "2026-05-21T11:00:00.000Z",
        "imageFileName": "sealed-sample-amenity.jpg"
      }
    ],
    "qualification": "即将到期",
    "qualificationAttachments": [
      {
        "id": "sqa-sup-2-license",
        "fileName": "sup-2-business-license.pdf",
        "qualificationType": "营业执照",
        "validUntil": "2028-06-30",
        "uploadedAt": "2026-05-12T09:00:00.000Z"
      },
      {
        "id": "sqa-sup-2-test",
        "fileName": "sup-2-quality-report.pdf",
        "qualificationType": "检测报告",
        "validUntil": "2026-07-12",
        "uploadedAt": "2026-05-12T09:20:00.000Z"
      }
    ],
    "risk": "资质 18 天后到期",
    "evaluationScore": 86
  },
  {
    "id": "sup-3",
    "name": "杭州鲜达食材配送有限公司",
    "status": "已准入",
    "admissionStatus": "admitted",
    "contactName": "何鲜",
    "contactPhone": "13800010003",
    "categoryAuth": [
      "食材供应"
    ],
    "categoryAuthorizations": [
      {
        "category": "食材供应",
        "status": "active",
        "authorizedAt": "2026-05-10T09:00:00.000Z",
        "expiresAt": "2027-05-09T23:59:59.000Z"
      }
    ],
    "serviceRegions": [
      {
        "id": "sr-sup-3-sh",
        "region": "长三角",
        "storeName": "上海滨江华礼酒店",
        "category": "食材供应",
        "status": "active"
      }
    ],
    "admissionReviews": [
      {
        "id": "sar-sup-3-1",
        "reviewType": "qualification_initial_review",
        "status": "passed",
        "reviewer": "刘明",
        "opinion": "食品经营许可、冷链记录和保险材料齐全。",
        "reviewedAt": "2026-05-11T10:00:00.000Z"
      },
      {
        "id": "sar-sup-3-2",
        "reviewType": "admission_assessment",
        "status": "passed",
        "score": 89,
        "reviewer": "陈静",
        "opinion": "可覆盖上海酒店鲜食配送。",
        "reviewedAt": "2026-05-12T09:00:00.000Z"
      }
    ],
    "sealSamples": [
      {
        "id": "ss-sup-3-food",
        "sampleName": "早餐鲜切水果封样",
        "specification": "A级混合果盘 250g",
        "confirmedBy": "刘明",
        "confirmedAt": "2026-05-22T10:30:00.000Z",
        "imageFileName": "sealed-sample-fruit.jpg"
      }
    ],
    "qualification": "有效",
    "qualificationAttachments": [
      {
        "id": "sqa-sup-3-food-license",
        "fileName": "sup-3-food-license.pdf",
        "qualificationType": "食品经营许可证",
        "validUntil": "2027-10-31",
        "uploadedAt": "2026-05-10T09:00:00.000Z"
      }
    ],
    "risk": "正常",
    "evaluationScore": 88
  },
  {
    "id": "sup-4",
    "name": "浙江恒修工程服务有限公司",
    "status": "限制名单",
    "admissionStatus": "restricted",
    "contactName": "沈工",
    "contactPhone": "13800010004",
    "categoryAuth": [
      "工程维修"
    ],
    "categoryAuthorizations": [
      {
        "category": "工程维修",
        "status": "suspended",
        "authorizedAt": "2026-04-01T09:00:00.000Z"
      }
    ],
    "serviceRegions": [
      {
        "id": "sr-sup-4-east",
        "region": "华东",
        "storeName": "上海滨江华礼酒店",
        "category": "工程维修",
        "status": "suspended"
      }
    ],
    "admissionReviews": [
      {
        "id": "sar-sup-4-1",
        "reviewType": "admission_assessment",
        "status": "rejected",
        "score": 61,
        "reviewer": "陈静",
        "opinion": "上期履约异常未关闭，暂列限制名单。",
        "reviewedAt": "2026-05-09T09:00:00.000Z"
      }
    ],
    "sealSamples": [],
    "qualification": "有效",
    "qualificationAttachments": [
      {
        "id": "sqa-sup-4-license",
        "fileName": "sup-4-construction-license.pdf",
        "qualificationType": "施工资质",
        "validUntil": "2028-01-31",
        "uploadedAt": "2026-04-01T09:00:00.000Z"
      }
    ],
    "risk": "履约异常未解除",
    "restrictionReason": "上期客房维修延期和返工未关闭",
    "restrictedAt": "2026-05-09T09:00:00.000Z",
    "evaluationScore": 61
  }
];

export const procurementRequests: ProcurementRequest[] = [
  {
    "id": "req-pre",
    "code": "REQ-20260621-001",
    "projectId": "p-pre",
    "title": "客房一次性用品采购需求",
    "orgId": "org-hotel",
    "requestDepartment": "客房部",
    "requesterName": "林主管",
    "category": "客房一次性用品",
    "description": "暑期入住高峰前补充客房一次性用品。",
    "budgetLabel": "18.8 万元以内",
    "budgetAmount": 188000,
    "purpose": "保障暑期高峰客房基础消耗品供应。",
    "expectedArrivalAt": "2026-07-08",
    "receivingLocation": "上海滨江华礼酒店后勤仓",
    "lineItems": [
      {
        "id": "req-pre-line-1",
        "itemName": "环保牙具套装",
        "specification": "竹柄牙刷+牙膏",
        "quantity": 12000,
        "unit": "套",
        "estimatedUnitPrice": 7.2
      },
      {
        "id": "req-pre-line-2",
        "itemName": "客房拖鞋",
        "specification": "棉麻防滑款",
        "quantity": 9000,
        "unit": "双",
        "estimatedUnitPrice": 9.1
      }
    ],
    "attachments": [
      {
        "id": "req-pre-att-1",
        "fileName": "客房一次性用品库存测算表.xlsx",
        "contentType": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "sizeBytes": 20480,
        "uploadedAt": "2026-06-21T09:20:00.000Z"
      }
    ],
    "methodSuggestion": "内部公开招采",
    "externalTradeFlag": false,
    "status": "project_created",
    "approvalStatus": "approved",
    "createdBy": "u8",
    "createdAt": "2026-06-21T09:30:00.000Z",
    "updatedAt": "2026-06-21T10:20:00.000Z"
  },
  {
    "id": "req-award",
    "code": "REQ-20260610-002",
    "projectId": "p-award",
    "title": "客房布草集中采购需求",
    "orgId": "org-east",
    "requestDepartment": "华东区域运营部",
    "requesterName": "吴经理",
    "category": "客房布草",
    "description": "区域酒店统一补充高支纱床单、被套和枕套。",
    "budgetLabel": "130 万元以内",
    "budgetAmount": 1300000,
    "purpose": "提升区域客房布草标准化和替换效率。",
    "expectedArrivalAt": "2026-07-20",
    "receivingLocation": "华东区域中央仓",
    "lineItems": [
      {
        "id": "req-award-line-1",
        "itemName": "高支纱床单",
        "specification": "80s 纯棉 280x280cm",
        "quantity": 3500,
        "unit": "条",
        "estimatedUnitPrice": 185
      },
      {
        "id": "req-award-line-2",
        "itemName": "被套",
        "specification": "80s 纯棉 240x220cm",
        "quantity": 3000,
        "unit": "条",
        "estimatedUnitPrice": 218
      },
      {
        "id": "req-award-line-3",
        "itemName": "枕套",
        "specification": "80s 纯棉 60x90cm",
        "quantity": 7000,
        "unit": "只",
        "estimatedUnitPrice": 38
      }
    ],
    "attachments": [
      {
        "id": "req-award-att-1",
        "fileName": "华东区域布草更换计划.pdf",
        "contentType": "application/pdf",
        "sizeBytes": 35840,
        "uploadedAt": "2026-06-10T09:20:00.000Z"
      }
    ],
    "methodSuggestion": "内部公开招采",
    "externalTradeFlag": false,
    "status": "project_created",
    "approvalStatus": "approved",
    "createdBy": "u8",
    "createdAt": "2026-06-10T09:30:00.000Z",
    "updatedAt": "2026-06-10T10:20:00.000Z"
  },
  {
    "id": "req-food",
    "code": "REQ-20260619-003",
    "projectId": "p-food",
    "title": "上海滨江酒店食材供应商比选",
    "orgId": "org-hotel",
    "requestDepartment": "餐饮部",
    "requesterName": "周厨师长",
    "category": "食材供应",
    "description": "早餐厅鲜食和半成品配送供应商比选。",
    "budgetLabel": "38 万元以内",
    "budgetAmount": 380000,
    "purpose": "保障早餐厅和宴会备餐稳定供应。",
    "expectedArrivalAt": "2026-07-01",
    "receivingLocation": "上海滨江华礼酒店餐饮收货口",
    "lineItems": [
      {
        "id": "req-food-line-1",
        "itemName": "鲜切水果",
        "specification": "A级混合果盘 250g",
        "quantity": 16000,
        "unit": "盒",
        "estimatedUnitPrice": 12.5
      },
      {
        "id": "req-food-line-2",
        "itemName": "半成品点心",
        "specification": "冷链配送",
        "quantity": 8000,
        "unit": "份",
        "estimatedUnitPrice": 16.8
      }
    ],
    "attachments": [
      {
        "id": "req-food-att-1",
        "fileName": "餐饮部月度食材需求.xlsx",
        "contentType": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "sizeBytes": 18432,
        "uploadedAt": "2026-06-19T09:20:00.000Z"
      }
    ],
    "methodSuggestion": "询价 / 比选",
    "externalTradeFlag": false,
    "status": "project_created",
    "approvalStatus": "approved",
    "createdBy": "u8",
    "createdAt": "2026-06-19T09:30:00.000Z",
    "updatedAt": "2026-06-19T10:20:00.000Z"
  },
  {
    "id": "req-ext",
    "code": "REQ-20260620-004",
    "projectId": "p-ext",
    "title": "客房改造工程外部交易备案需求",
    "orgId": "org-hotel",
    "requestDepartment": "工程部",
    "requesterName": "沈经理",
    "category": "工程维修",
    "description": "依法必须外部交易的客房改造工程备案。",
    "budgetLabel": "客户制度确认",
    "budgetAmount": 900000,
    "purpose": "外部交易备案留痕。",
    "expectedArrivalAt": "2026-08-15",
    "receivingLocation": "上海滨江华礼酒店",
    "lineItems": [
      {
        "id": "req-ext-line-1",
        "itemName": "客房局部翻新",
        "specification": "30 间样板客房",
        "quantity": 30,
        "unit": "间",
        "estimatedUnitPrice": 30000
      }
    ],
    "attachments": [
      {
        "id": "req-ext-att-1",
        "fileName": "客房改造工程立项说明.pdf",
        "contentType": "application/pdf",
        "sizeBytes": 24576,
        "uploadedAt": "2026-06-20T09:20:00.000Z"
      }
    ],
    "methodSuggestion": "依法必须外部交易",
    "externalTradeFlag": true,
    "status": "project_created",
    "approvalStatus": "approved",
    "createdBy": "u8",
    "createdAt": "2026-06-20T09:30:00.000Z",
    "updatedAt": "2026-06-20T10:20:00.000Z"
  }
];

export const procurementMethodRules: ProcurementMethodRule[] = [
  {
    "id": "pmr-1",
    "ruleCode": "rule-internal-open",
    "ruleName": "内部公开招采规则",
    "conditionJson": {
      "threshold": "客户制度确认",
      "category": "配置化"
    },
    "resultMethod": "内部公开招采",
    "status": "enabled",
    "versionNo": 1
  },
  {
    "id": "pmr-2",
    "ruleCode": "rule-comparison",
    "ruleName": "询价 / 比选规则",
    "conditionJson": {
      "threshold": "客户制度确认",
      "category": "配置化"
    },
    "resultMethod": "询价 / 比选",
    "status": "enabled",
    "versionNo": 1
  },
  {
    "id": "pmr-3",
    "ruleCode": "rule-external",
    "ruleName": "外部交易判定规则",
    "conditionJson": {
      "legalRequired": "客户制度确认"
    },
    "resultMethod": "依法必须外部交易",
    "status": "enabled",
    "versionNo": 1
  }
];

export const approvalRules: ApprovalRule[] = [
  {
    "id": "apr-procurement-request-1",
    "ruleCode": "approval-procurement-request-standard",
    "ruleName": "采购需求标准审批规则",
    "businessType": "procurement_request",
    "amountMin": 0,
    "amountMax": 500000,
    "methodTypes": [
      "内部公开采购",
      "询价 / 比选"
    ],
    "nodeRoleIds": [
      "group_manager"
    ],
    "actions": [
      "submit",
      "approve",
      "reject",
      "return"
    ],
    "status": "enabled",
    "versionNo": 1,
    "updatedAt": "2026-06-24T00:00:00.000Z"
  },
  {
    "id": "apr-procurement-request-high-value",
    "ruleCode": "approval-procurement-request-high-value",
    "ruleName": "大额采购需求审批规则",
    "businessType": "procurement_request",
    "amountMin": 500000.01,
    "methodTypes": [
      "all"
    ],
    "nodeRoleIds": [
      "group_manager"
    ],
    "actions": [
      "submit",
      "approve",
      "reject",
      "return"
    ],
    "status": "enabled",
    "versionNo": 1,
    "updatedAt": "2026-07-01T00:00:00.000Z"
  },
  {
    "id": "apr-procurement-document-1",
    "ruleCode": "approval-procurement-document-standard",
    "ruleName": "采购文件标准审核规则",
    "businessType": "procurement_document",
    "amountMin": 0,
    "methodTypes": [
      "procurement_document",
      "all"
    ],
    "nodeRoleIds": [
      "group_manager"
    ],
    "actions": [
      "submit",
      "approve",
      "reject",
      "return"
    ],
    "status": "disabled",
    "versionNo": 1,
    "updatedAt": "2026-06-29T00:00:00.000Z"
  },
  {
    "id": "apr-award-1",
    "ruleCode": "approval-award-non-lowest",
    "ruleName": "非最低价定标复核规则",
    "businessType": "award_approval",
    "amountMin": 0,
    "methodTypes": [
      "内部公开采购",
      "询价 / 比选",
      "依法必须外部交易"
    ],
    "nodeRoleIds": [
      "group_manager",
      "auditor"
    ],
    "actions": [
      "submit",
      "approve",
      "reject",
      "audit_read"
    ],
    "status": "enabled",
    "versionNo": 1,
    "updatedAt": "2026-06-24T00:00:00.000Z"
  },
  {
    "id": "apr-settlement-bill-1",
    "ruleCode": "approval-settlement-bill-standard",
    "ruleName": "settlement bill approval",
    "businessType": "settlement_bill",
    "amountMin": 0,
    "methodTypes": [
      "all"
    ],
    "nodeRoleIds": [
      "group_manager"
    ],
    "actions": [
      "submit",
      "approve",
      "reject",
      "return"
    ],
    "defaultStrategy": "manual_review_required",
    "status": "enabled",
    "versionNo": 1,
    "updatedAt": "2026-06-25T00:00:00.000Z"
  },
  {
    "id": "apr-invoice-1",
    "ruleCode": "approval-invoice-standard",
    "ruleName": "invoice approval",
    "businessType": "invoice",
    "amountMin": 0,
    "methodTypes": [
      "all"
    ],
    "nodeRoleIds": [
      "group_manager"
    ],
    "actions": [
      "submit",
      "approve",
      "reject"
    ],
    "defaultStrategy": "manual_review_required",
    "status": "enabled",
    "versionNo": 1,
    "updatedAt": "2026-06-25T00:00:00.000Z"
  },
  {
    "id": "apr-payment-request-1",
    "ruleCode": "approval-payment-request-standard",
    "ruleName": "payment request approval",
    "businessType": "payment_request",
    "amountMin": 0,
    "methodTypes": [
      "payment_request",
      "simulated_payment",
      "all"
    ],
    "nodeRoleIds": [
      "group_manager"
    ],
    "actions": [
      "submit",
      "approve",
      "reject"
    ],
    "defaultStrategy": "manual_review_required",
    "status": "enabled",
    "versionNo": 1,
    "updatedAt": "2026-06-25T00:00:00.000Z"
  },
  {
    "id": "apr-archive-supplement-1",
    "ruleCode": "approval-archive-supplement-after-seal",
    "ruleName": "档案封存后补档审批规则",
    "businessType": "archive_supplement",
    "methodTypes": [
      "全部采购方式"
    ],
    "nodeRoleIds": [
      "auditor"
    ],
    "actions": [
      "request",
      "approve",
      "reject",
      "apply"
    ],
    "status": "enabled",
    "versionNo": 1,
    "updatedAt": "2026-06-24T00:00:00.000Z"
  }
];

export const projects: ProcurementProject[] = [
  {
    "id": "p-pre",
    "code": "CG-2026-0621-001",
    "sourceRequestId": "req-pre",
    "name": "客房一次性用品采购项目",
    "orgId": "org-hotel",
    "orgName": "上海滨江华礼酒店",
    "type": "内部公开招采",
    "status": "bidding_open",
    "displayStatus": "报价响应中 / 报价截止前",
    "category": "客房一次性用品",
    "buyer": "刘明",
    "quoteDeadlineAt": "2099-06-26T17:00:00.000Z",
    "beforeDeadline": true,
    "qualificationRequirements": [
      "已准入供应商",
      "客房一次性用品授权有效",
      "封样记录已确认"
    ],
    "quoteRequirements": [
      "按明细分别报价",
      "含税含配送",
      "响应文件需包含检测报告"
    ],
    "deliveryRequirements": [
      "2026-07-08 前送达酒店后勤仓",
      "支持分批交付"
    ],
    "clarificationRecords": [
      {
        "id": "qc-pre-1",
        "question": "拖鞋是否必须独立包装？",
        "answer": "必须独立包装并标注酒店品牌。",
        "supplierId": "sup-2",
        "visibility": "public_to_invited",
        "answeredBy": "刘明",
        "answeredAt": "2026-06-22T11:00:00.000Z"
      }
    ],
    "externalTradeFlag": false,
    "participantSupplierIds": [
      "sup-1",
      "sup-2"
    ],
    "assignedExpertIds": []
  },
  {
    "id": "p-award",
    "code": "CG-2026-0610-002",
    "sourceRequestId": "req-award",
    "name": "客房布草集中采购项目",
    "orgId": "org-east",
    "orgName": "华东区域公司",
    "type": "内部公开招采",
    "status": "awarded_pending_order",
    "displayStatus": "定标审批通过 / 待生成订单",
    "category": "客房布草",
    "buyer": "刘明",
    "quoteDeadlineAt": "2026-06-18T17:00:00.000Z",
    "beforeDeadline": false,
    "qualificationRequirements": [
      "已准入供应商",
      "布草品类授权有效",
      "近三年酒店履约案例"
    ],
    "quoteRequirements": [
      "提供分项单价、税率、总价和服务承诺",
      "响应文件需包含封样确认"
    ],
    "deliveryRequirements": [
      "2026-07-20 前首批到货",
      "按区域仓分批配送"
    ],
    "clarificationRecords": [
      {
        "id": "qc-award-1",
        "question": "是否接受分批开票？",
        "answer": "本模块仅登记结算资料状态，不处理付款。",
        "supplierId": "sup-1",
        "visibility": "public_to_invited",
        "answeredBy": "刘明",
        "answeredAt": "2026-06-15T11:00:00.000Z"
      }
    ],
    "externalTradeFlag": false,
    "participantSupplierIds": [
      "sup-1",
      "sup-2"
    ],
    "assignedExpertIds": [
      "exp-1",
      "exp-3"
    ]
  },
  {
    "id": "p-food",
    "code": "CG-2026-0619-003",
    "sourceRequestId": "req-food",
    "name": "上海滨江酒店食材供应商比选",
    "orgId": "org-hotel",
    "orgName": "上海滨江华礼酒店",
    "type": "询价 / 比选",
    "status": "performing",
    "displayStatus": "订单履约异常处理中",
    "category": "食材供应",
    "buyer": "刘明",
    "quoteDeadlineAt": "2026-06-20T12:00:00.000Z",
    "beforeDeadline": false,
    "qualificationRequirements": [
      "食品经营许可有效",
      "冷链配送能力",
      "覆盖上海酒店"
    ],
    "quoteRequirements": [
      "按早餐鲜切水果和半成品点心报价",
      "说明交付频次和异常响应时限"
    ],
    "deliveryRequirements": [
      "每日 06:00 前配送",
      "冷链温控记录随货提供"
    ],
    "clarificationRecords": [
      {
        "id": "qc-food-1",
        "question": "水果切配是否可由酒店后厨完成？",
        "answer": "本次要求供应商完成标准化切配并冷链配送。",
        "supplierId": "sup-3",
        "visibility": "supplier_self",
        "answeredBy": "刘明",
        "answeredAt": "2026-06-19T16:00:00.000Z"
      }
    ],
    "externalTradeFlag": false,
    "participantSupplierIds": [
      "sup-3"
    ],
    "assignedExpertIds": []
  },
  {
    "id": "p-ext",
    "code": "EXT-2026-0620-004",
    "sourceRequestId": "req-ext",
    "name": "客房改造工程外部交易备案项目",
    "orgId": "org-hotel",
    "orgName": "上海滨江华礼酒店",
    "type": "依法必须外部交易",
    "status": "external_result_recorded",
    "displayStatus": "外部交易备案中",
    "category": "工程维修",
    "buyer": "刘明",
    "quoteDeadlineAt": null,
    "beforeDeadline": false,
    "qualificationRequirements": [
      "依法进入外部交易平台"
    ],
    "quoteRequirements": [
      "内部系统仅留痕外部结果材料"
    ],
    "deliveryRequirements": [
      "以外部交易合同为准"
    ],
    "clarificationRecords": [],
    "externalTradeFlag": true,
    "participantSupplierIds": [
      "sup-4"
    ],
    "assignedExpertIds": []
  }
];

export const projectPackages: ProcurementProjectPackage[] = [
  {
    "id": "pkg-pre-1",
    "projectId": "p-pre",
    "packageCode": "PKG-001",
    "packageName": "默认包件",
    "status": "active"
  },
  {
    "id": "pkg-award-1",
    "projectId": "p-award",
    "packageCode": "PKG-001",
    "packageName": "默认包件",
    "status": "active"
  },
  {
    "id": "pkg-food-1",
    "projectId": "p-food",
    "packageCode": "PKG-001",
    "packageName": "默认包件",
    "status": "active"
  },
  {
    "id": "pkg-ext-1",
    "projectId": "p-ext",
    "packageCode": "PKG-EXT",
    "packageName": "外部交易备案包件",
    "status": "recorded"
  }
];

export const procurementDocuments: ProcurementDocument[] = [
  {
    "id": "pd-pre-1",
    "projectId": "p-pre",
    "title": "客房一次性用品采购文件 V1",
    "versionNo": 1,
    "status": "locked",
    "reviewStatus": "approved",
    "contentSummary": "资格要求、报价模板、交付要求和封样规则。",
    "attachmentMetadata": [
      {
        "id": "pd-pre-att-1",
        "fileName": "客房一次性用品采购文件.pdf",
        "contentType": "application/pdf",
        "sizeBytes": 51200,
        "uploadedAt": "2026-06-21T13:00:00.000Z"
      }
    ],
    "createdBy": "u2",
    "createdAt": "2026-06-21T12:30:00.000Z",
    "updatedAt": "2026-06-21T13:00:00.000Z",
    "publishedAt": "2026-06-21T13:00:00.000Z",
    "lockedAt": "2026-06-21T13:00:00.000Z"
  },
  {
    "id": "pd-award-1",
    "projectId": "p-award",
    "title": "客房布草集中采购文件 V1",
    "versionNo": 1,
    "status": "locked",
    "reviewStatus": "approved",
    "contentSummary": "布草技术参数、报价清单、评审方法和定标规则。",
    "attachmentMetadata": [
      {
        "id": "pd-award-att-1",
        "fileName": "客房布草集中采购文件.pdf",
        "contentType": "application/pdf",
        "sizeBytes": 61440,
        "uploadedAt": "2026-06-12T13:00:00.000Z"
      }
    ],
    "createdBy": "u2",
    "createdAt": "2026-06-12T12:30:00.000Z",
    "updatedAt": "2026-06-12T13:00:00.000Z",
    "publishedAt": "2026-06-12T13:00:00.000Z",
    "lockedAt": "2026-06-12T13:00:00.000Z"
  },
  {
    "id": "pd-food-1",
    "projectId": "p-food",
    "title": "食材供应商比选文件 V1",
    "versionNo": 1,
    "status": "locked",
    "reviewStatus": "approved",
    "contentSummary": "冷链配送、食安资质、价格和服务响应要求。",
    "attachmentMetadata": [
      {
        "id": "pd-food-att-1",
        "fileName": "食材供应商比选文件.pdf",
        "contentType": "application/pdf",
        "sizeBytes": 45056,
        "uploadedAt": "2026-06-19T13:00:00.000Z"
      }
    ],
    "createdBy": "u2",
    "createdAt": "2026-06-19T12:30:00.000Z",
    "updatedAt": "2026-06-19T13:00:00.000Z",
    "publishedAt": "2026-06-19T13:00:00.000Z",
    "lockedAt": "2026-06-19T13:00:00.000Z"
  }
];

export const procurementAnnouncements: ProcurementAnnouncement[] = [
  {
    "id": "ann-pre-1",
    "projectId": "p-pre",
    "documentId": "pd-pre-1",
    "procurementMethod": "internal_open",
    "methodFields": {
      "priceRounds": 1,
      "deliveryWindow": "7 days"
    },
    "title": "客房一次性用品采购邀请",
    "contentSummary": "邀请已准入客房用品供应商提交报价。",
    "scope": "invited_suppliers",
    "status": "published",
    "registrationDeadlineAt": "2099-06-25T17:00:00.000Z",
    "quoteDeadlineAt": "2099-06-26T17:00:00.000Z",
    "createdBy": "u2",
    "createdAt": "2026-06-21T13:10:00.000Z",
    "updatedAt": "2026-06-21T13:20:00.000Z",
    "publishedAt": "2026-06-21T13:20:00.000Z"
  },
  {
    "id": "ann-award-1",
    "projectId": "p-award",
    "documentId": "pd-award-1",
    "procurementMethod": "internal_open",
    "methodFields": {
      "bidBondRequired": false,
      "openingLocation": "regional center"
    },
    "title": "客房布草集中采购公告",
    "contentSummary": "区域布草集中采购，报价已截止。",
    "scope": "invited_suppliers",
    "status": "closed",
    "registrationDeadlineAt": "2026-06-16T17:00:00.000Z",
    "quoteDeadlineAt": "2026-06-18T17:00:00.000Z",
    "createdBy": "u2",
    "createdAt": "2026-06-12T13:10:00.000Z",
    "updatedAt": "2026-06-18T17:10:00.000Z",
    "publishedAt": "2026-06-12T13:20:00.000Z"
  },
  {
    "id": "ann-food-1",
    "projectId": "p-food",
    "documentId": "pd-food-1",
    "procurementMethod": "comparison",
    "methodFields": {
      "priceRounds": 1,
      "deliveryWindow": "daily before 05:30"
    },
    "title": "食材供应商比选邀请",
    "contentSummary": "早餐鲜食和半成品点心配送供应商比选。",
    "scope": "invited_suppliers",
    "status": "closed",
    "registrationDeadlineAt": "2026-06-19T18:00:00.000Z",
    "quoteDeadlineAt": "2026-06-20T12:00:00.000Z",
    "createdBy": "u2",
    "createdAt": "2026-06-19T13:10:00.000Z",
    "updatedAt": "2026-06-20T12:10:00.000Z",
    "publishedAt": "2026-06-19T13:20:00.000Z"
  }
];

export const supplierInvitations: SupplierInvitation[] = [
  {
    "id": "inv-pre-sup-1",
    "projectId": "p-pre",
    "announcementId": "ann-pre-1",
    "supplierId": "sup-1",
    "status": "registered",
    "notificationStatus": "sent",
    "notifiedAt": "2026-06-21T13:21:00.000Z",
    "createdAt": "2026-06-21T13:21:00.000Z"
  },
  {
    "id": "inv-pre-sup-2",
    "projectId": "p-pre",
    "announcementId": "ann-pre-1",
    "supplierId": "sup-2",
    "status": "viewed",
    "notificationStatus": "sent",
    "notifiedAt": "2026-06-21T13:21:00.000Z",
    "createdAt": "2026-06-21T13:21:00.000Z"
  },
  {
    "id": "inv-award-sup-1",
    "projectId": "p-award",
    "announcementId": "ann-award-1",
    "supplierId": "sup-1",
    "status": "registered",
    "notificationStatus": "sent",
    "notifiedAt": "2026-06-12T13:21:00.000Z",
    "createdAt": "2026-06-12T13:21:00.000Z"
  },
  {
    "id": "inv-award-sup-2",
    "projectId": "p-award",
    "announcementId": "ann-award-1",
    "supplierId": "sup-2",
    "status": "registered",
    "notificationStatus": "sent",
    "notifiedAt": "2026-06-12T13:21:00.000Z",
    "createdAt": "2026-06-12T13:21:00.000Z"
  },
  {
    "id": "inv-food-sup-3",
    "projectId": "p-food",
    "announcementId": "ann-food-1",
    "supplierId": "sup-3",
    "status": "registered",
    "notificationStatus": "sent",
    "notifiedAt": "2026-06-19T13:21:00.000Z",
    "createdAt": "2026-06-19T13:21:00.000Z"
  }
];

export const supplierRegistrations: SupplierRegistration[] = [
  {
    "id": "reg-pre-sup-1",
    "projectId": "p-pre",
    "announcementId": "ann-pre-1",
    "supplierId": "sup-1",
    "status": "qualified",
    "materialMetadata": [
      {
        "id": "reg-pre-sup-1-att",
        "fileName": "sup-1-amenity-qualification.pdf",
        "contentType": "application/pdf",
        "sizeBytes": 12000,
        "uploadedAt": "2026-06-21T15:00:00.000Z"
      }
    ],
    "submittedAt": "2026-06-21T15:00:00.000Z",
    "qualifiedAt": "2026-06-21T16:00:00.000Z",
    "qualificationReason": "授权品类和封样均有效"
  },
  {
    "id": "reg-pre-sup-2",
    "projectId": "p-pre",
    "announcementId": "ann-pre-1",
    "supplierId": "sup-2",
    "status": "qualified",
    "materialMetadata": [
      {
        "id": "reg-pre-sup-2-att",
        "fileName": "sup-2-amenity-qualification.pdf",
        "contentType": "application/pdf",
        "sizeBytes": 11800,
        "uploadedAt": "2026-06-21T15:10:00.000Z"
      }
    ],
    "submittedAt": "2026-06-21T15:10:00.000Z",
    "qualifiedAt": "2026-06-21T16:10:00.000Z",
    "qualificationReason": "检测报告临期，允许参与但需中选前补充"
  },
  {
    "id": "reg-award-sup-1",
    "projectId": "p-award",
    "announcementId": "ann-award-1",
    "supplierId": "sup-1",
    "status": "qualified",
    "materialMetadata": [
      {
        "id": "reg-award-sup-1-att",
        "fileName": "sup-1-linen-registration.pdf",
        "contentType": "application/pdf",
        "sizeBytes": 13200,
        "uploadedAt": "2026-06-13T10:00:00.000Z"
      }
    ],
    "submittedAt": "2026-06-13T10:00:00.000Z",
    "qualifiedAt": "2026-06-13T12:00:00.000Z",
    "qualificationReason": "布草品类授权有效"
  },
  {
    "id": "reg-award-sup-2",
    "projectId": "p-award",
    "announcementId": "ann-award-1",
    "supplierId": "sup-2",
    "status": "qualified",
    "materialMetadata": [
      {
        "id": "reg-award-sup-2-att",
        "fileName": "sup-2-linen-partner-registration.pdf",
        "contentType": "application/pdf",
        "sizeBytes": 11000,
        "uploadedAt": "2026-06-13T10:10:00.000Z"
      }
    ],
    "submittedAt": "2026-06-13T10:10:00.000Z",
    "qualifiedAt": "2026-06-13T12:10:00.000Z",
    "qualificationReason": "联供方案资料完整"
  },
  {
    "id": "reg-food-sup-3",
    "projectId": "p-food",
    "announcementId": "ann-food-1",
    "supplierId": "sup-3",
    "status": "qualified",
    "materialMetadata": [
      {
        "id": "reg-food-sup-3-att",
        "fileName": "sup-3-food-safety-registration.pdf",
        "contentType": "application/pdf",
        "sizeBytes": 16000,
        "uploadedAt": "2026-06-19T14:00:00.000Z"
      }
    ],
    "submittedAt": "2026-06-19T14:00:00.000Z",
    "qualifiedAt": "2026-06-19T15:00:00.000Z",
    "qualificationReason": "食品经营许可和冷链证明齐全"
  }
];

export const bids: Bid[] = [
  {
    "id": "bid-pre-1",
    "projectId": "p-pre",
    "supplierId": "sup-1",
    "amount": 186000,
    "lineItems": [
      {
        "id": "bid-pre-1-line-1",
        "itemName": "环保牙具套装",
        "quantity": 12000,
        "unit": "套",
        "unitPrice": 7.4,
        "taxRate": 0.13,
        "totalPrice": 88800,
        "deliveryDays": 10
      },
      {
        "id": "bid-pre-1-line-2",
        "itemName": "客房拖鞋",
        "quantity": 9000,
        "unit": "双",
        "unitPrice": 10.8,
        "taxRate": 0.13,
        "totalPrice": 97200,
        "deliveryDays": 10
      }
    ],
    "deliveryDays": 10,
    "serviceCommitment": "48 小时内响应补货，支持分批配送。",
    "status": "submitted",
    "submittedAt": "2026-06-22T15:18:00.000Z",
    "quoteDeadlineAt": "2099-06-26T17:00:00.000Z",
    "lockedAt": null,
    "fileId": "file-pre-1",
    "fileName": "响应文件-一次性用品.pdf",
    "responseFileMetadata": [
      {
        "id": "rfm-pre-1",
        "fileName": "响应文件-一次性用品.pdf",
        "contentType": "application/pdf",
        "sizeBytes": 23040,
        "uploadedAt": "2026-06-22T15:18:00.000Z"
      }
    ]
  },
  {
    "id": "bid-pre-2",
    "projectId": "p-pre",
    "supplierId": "sup-2",
    "amount": 179000,
    "lineItems": [
      {
        "id": "bid-pre-2-line-1",
        "itemName": "环保牙具套装",
        "quantity": 12000,
        "unit": "套",
        "unitPrice": 7.1,
        "taxRate": 0.13,
        "totalPrice": 85200,
        "deliveryDays": 12
      },
      {
        "id": "bid-pre-2-line-2",
        "itemName": "客房拖鞋",
        "quantity": 9000,
        "unit": "双",
        "unitPrice": 10.42,
        "taxRate": 0.13,
        "totalPrice": 93800,
        "deliveryDays": 12
      }
    ],
    "deliveryDays": 12,
    "serviceCommitment": "到货前 2 天提供批次检测报告。",
    "status": "draft",
    "submittedAt": null,
    "quoteDeadlineAt": "2099-06-26T17:00:00.000Z",
    "lockedAt": null,
    "fileId": "file-pre-2",
    "fileName": "响应文件-洁雅草稿.pdf",
    "responseFileMetadata": [
      {
        "id": "rfm-pre-2",
        "fileName": "响应文件-洁雅草稿.pdf",
        "contentType": "application/pdf",
        "sizeBytes": 12000,
        "uploadedAt": "2026-06-22T15:20:00.000Z"
      }
    ]
  },
  {
    "id": "bid-award-1",
    "projectId": "p-award",
    "supplierId": "sup-1",
    "amount": 1286000,
    "lineItems": [
      {
        "id": "bid-award-1-line-1",
        "itemName": "高支纱床单",
        "quantity": 3500,
        "unit": "条",
        "unitPrice": 184,
        "taxRate": 0.13,
        "totalPrice": 644000,
        "deliveryDays": 25
      },
      {
        "id": "bid-award-1-line-2",
        "itemName": "被套",
        "quantity": 3000,
        "unit": "条",
        "unitPrice": 178,
        "taxRate": 0.13,
        "totalPrice": 534000,
        "deliveryDays": 25
      },
      {
        "id": "bid-award-1-line-3",
        "itemName": "枕套",
        "quantity": 7000,
        "unit": "只",
        "unitPrice": 15.43,
        "taxRate": 0.13,
        "totalPrice": 108000,
        "deliveryDays": 20
      }
    ],
    "deliveryDays": 25,
    "serviceCommitment": "区域仓 7 天内补货响应，质量问题无条件换货。",
    "status": "locked",
    "submittedAt": "2026-06-17T15:18:00.000Z",
    "quoteDeadlineAt": "2026-06-18T17:00:00.000Z",
    "lockedAt": "2026-06-18T17:00:00.000Z",
    "fileId": "file-award-1",
    "fileName": "响应文件-布草.pdf",
    "responseFileMetadata": [
      {
        "id": "rfm-award-1",
        "fileName": "响应文件-布草.pdf",
        "contentType": "application/pdf",
        "sizeBytes": 40960,
        "uploadedAt": "2026-06-17T15:18:00.000Z"
      }
    ]
  },
  {
    "id": "bid-award-2",
    "projectId": "p-award",
    "supplierId": "sup-2",
    "amount": 1199000,
    "lineItems": [
      {
        "id": "bid-award-2-line-1",
        "itemName": "高支纱床单",
        "quantity": 3500,
        "unit": "条",
        "unitPrice": 178,
        "taxRate": 0.13,
        "totalPrice": 623000,
        "deliveryDays": 32
      },
      {
        "id": "bid-award-2-line-2",
        "itemName": "被套",
        "quantity": 3000,
        "unit": "条",
        "unitPrice": 164,
        "taxRate": 0.13,
        "totalPrice": 492000,
        "deliveryDays": 32
      },
      {
        "id": "bid-award-2-line-3",
        "itemName": "枕套",
        "quantity": 7000,
        "unit": "只",
        "unitPrice": 12,
        "taxRate": 0.13,
        "totalPrice": 84000,
        "deliveryDays": 30
      }
    ],
    "deliveryDays": 32,
    "serviceCommitment": "价格低但检测报告需中选后补充更新。",
    "status": "locked",
    "submittedAt": "2026-06-17T16:02:00.000Z",
    "quoteDeadlineAt": "2026-06-18T17:00:00.000Z",
    "lockedAt": "2026-06-18T17:00:00.000Z",
    "fileId": "file-award-2",
    "fileName": "响应文件-清洁联供.pdf",
    "responseFileMetadata": [
      {
        "id": "rfm-award-2",
        "fileName": "响应文件-清洁联供.pdf",
        "contentType": "application/pdf",
        "sizeBytes": 38600,
        "uploadedAt": "2026-06-17T16:02:00.000Z"
      }
    ]
  },
  {
    "id": "bid-food-1",
    "projectId": "p-food",
    "supplierId": "sup-3",
    "amount": 368000,
    "lineItems": [
      {
        "id": "bid-food-1-line-1",
        "itemName": "鲜切水果",
        "quantity": 16000,
        "unit": "盒",
        "unitPrice": 12.2,
        "taxRate": 0.09,
        "totalPrice": 195200,
        "deliveryDays": 1
      },
      {
        "id": "bid-food-1-line-2",
        "itemName": "半成品点心",
        "quantity": 8000,
        "unit": "份",
        "unitPrice": 21.6,
        "taxRate": 0.09,
        "totalPrice": 172800,
        "deliveryDays": 1
      }
    ],
    "deliveryDays": 1,
    "serviceCommitment": "每日 05:30 前冷链送达，异常 2 小时内补货。",
    "status": "locked",
    "submittedAt": "2026-06-19T17:00:00.000Z",
    "quoteDeadlineAt": "2026-06-20T12:00:00.000Z",
    "lockedAt": "2026-06-20T12:00:00.000Z",
    "fileId": "file-food-1",
    "fileName": "响应文件-鲜达食材.pdf",
    "responseFileMetadata": [
      {
        "id": "rfm-food-1",
        "fileName": "响应文件-鲜达食材.pdf",
        "contentType": "application/pdf",
        "sizeBytes": 29600,
        "uploadedAt": "2026-06-19T17:00:00.000Z"
      }
    ]
  }
];

export const bidVersions: BidVersion[] = [];

export const bidViewApprovals: BidViewApproval[] = [
  {
    "id": "bva-file-meta-active",
    "projectId": "p-pre",
    "applicantId": "u2",
    "targetSupplierId": "sup-1",
    "viewContent": "response_file_metadata",
    "allowDownload": false,
    "validFrom": "2026-01-01T00:00:00.000Z",
    "validUntil": "2099-12-31T23:59:59.000Z",
    "approvalStatus": "active"
  },
  {
    "id": "bva-expired",
    "projectId": "p-pre",
    "applicantId": "u2",
    "targetSupplierId": "sup-1",
    "viewContent": "response_file_metadata",
    "allowDownload": false,
    "validFrom": "2020-01-01T00:00:00.000Z",
    "validUntil": "2020-01-02T00:00:00.000Z",
    "approvalStatus": "expired"
  }
];

export const bidViewLogs: BidViewLog[] = [];

export const experts: Expert[] = [
  {
    "id": "exp-1",
    "name": "赵教授",
    "category": "酒店运营",
    "status": "可抽取",
    "accountUserIds": [
      "u4"
    ],
    "ownerOrgId": "org-group",
    "branchOrgId": "org-group",
    "reviewScopes": [
      "技术评审",
      "商务评审"
    ],
    "supplierAssessmentScopes": [
      "技术评审",
      "商务评审",
      "供应链评审",
      "业务部门评审"
    ],
    "sharedAccount": false,
    "active": true
  },
  {
    "id": "exp-3",
    "name": "孙会计",
    "category": "财务成本",
    "status": "可抽取",
    "ownerOrgId": "org-group",
    "branchOrgId": "org-group",
    "reviewScopes": [
      "商务评审",
      "财务评审"
    ],
    "supplierAssessmentScopes": [
      "商务评审",
      "财务评审",
      "供应链评审"
    ],
    "sharedAccount": false,
    "active": true
  },
  {
    "id": "exp-4",
    "name": "李顾问",
    "category": "信息化服务",
    "status": "回避",
    "accountUserIds": [
      "u7"
    ],
    "ownerOrgId": "org-group",
    "branchOrgId": "org-group",
    "reviewScopes": [
      "技术评审"
    ],
    "supplierAssessmentScopes": [
      "技术评审",
      "供应链评审"
    ],
    "sharedAccount": false,
    "active": true,
    "avoidanceTags": [
      "需回避布草项目"
    ]
  }
];

export const expertAssignments: ExpertAssignment[] = [
  {
    "id": "ea-1",
    "projectId": "p-award",
    "expertId": "exp-1",
    "method": "抽取",
    "status": "submitted_locked",
    "avoidanceConfirmed": true,
    "disciplineConfirmed": true,
    "confidentialityConfirmed": true
  },
  {
    "id": "ea-2",
    "projectId": "p-award",
    "expertId": "exp-3",
    "method": "指定",
    "status": "submitted_locked",
    "avoidanceConfirmed": true,
    "disciplineConfirmed": true,
    "confidentialityConfirmed": true
  },
  {
    "id": "ea-3",
    "projectId": "p-award",
    "expertId": "exp-4",
    "method": "替换",
    "status": "assigned",
    "avoidanceConfirmed": false,
    "disciplineConfirmed": false,
    "confidentialityConfirmed": false
  }
];

export const scoringTemplates: ScoringTemplate[] = [
  {
    "id": "st-1",
    "templateCode": "hotel-linen-standard",
    "templateName": "客房布草评分模板",
    "versionNo": 1,
    "status": "enabled",
    "configJson": {
      "weights": "待客户确认"
    }
  }
];

export const scoringSheets: ScoringSheet[] = [
  {
    "id": "score-1",
    "projectId": "p-award",
    "expertId": "exp-1",
    "supplierId": "sup-1",
    "templateId": "st-1",
    "technical": 43,
    "service": 28,
    "price": 18,
    "total": 89,
    "status": "submitted_locked",
    "opinion": "综合服务能力较强。",
    "versionNo": 2,
    "submittedAt": "2026-06-19T11:20:00.000Z",
    "lockedAt": "2026-06-19T11:22:00.000Z"
  },
  {
    "id": "score-2",
    "projectId": "p-award",
    "expertId": "exp-1",
    "supplierId": "sup-2",
    "templateId": "st-1",
    "technical": 38,
    "service": 24,
    "price": 25,
    "total": 87,
    "status": "submitted_locked",
    "opinion": "价格分较高，资质有效期需关注。",
    "versionNo": 2,
    "submittedAt": "2026-06-19T11:20:00.000Z",
    "lockedAt": "2026-06-19T11:22:00.000Z"
  },
  {
    "id": "score-3",
    "projectId": "p-award",
    "expertId": "exp-3",
    "supplierId": "sup-1",
    "templateId": "st-1",
    "technical": 42,
    "service": 27,
    "price": 17,
    "total": 86,
    "status": "submitted_locked",
    "opinion": "质量控制和交付响应较稳定。",
    "versionNo": 1,
    "submittedAt": "2026-06-19T14:05:00.000Z",
    "lockedAt": "2026-06-19T14:07:00.000Z"
  },
  {
    "id": "score-open",
    "projectId": "p-award",
    "expertId": "exp-4",
    "supplierId": "sup-1",
    "templateId": "st-1",
    "technical": 0,
    "service": 0,
    "price": 0,
    "total": 0,
    "status": "scoring",
    "opinion": "",
    "versionNo": 1,
    "submittedAt": null,
    "lockedAt": null
  }
];

export const scoringVersions: ScoringVersion[] = [
  {
    "id": "sv-1",
    "sheetId": "score-1",
    "versionNo": 1,
    "reason": "首次提交",
    "approvalStatus": "approved",
    "snapshotJson": {
      "total": 87
    },
    "createdAt": "2026-06-19T11:20:00.000Z"
  },
  {
    "id": "sv-2",
    "sheetId": "score-1",
    "versionNo": 2,
    "reason": "经审批修正服务响应评分",
    "approvalStatus": "approved",
    "snapshotJson": {
      "total": 89
    },
    "createdAt": "2026-06-19T11:22:00.000Z"
  },
  {
    "id": "sv-3",
    "sheetId": "score-3",
    "versionNo": 1,
    "reason": "首次提交",
    "approvalStatus": "approved",
    "snapshotJson": {
      "total": 86
    },
    "createdAt": "2026-06-19T14:05:00.000Z"
  }
];

export const reviewReports: ReviewReport[] = [];

export const comparisonReports: ComparisonReport[] = [
  {
    "id": "cr-award-1",
    "projectId": "p-award",
    "reportNo": "CR-2026-0618-001",
    "status": "frozen",
    "comparisonRows": [
      {
        "supplierId": "sup-1",
        "supplierName": "上海棉织供应链有限公司",
        "amount": 1286000,
        "deliveryDays": 25,
        "serviceCommitment": "区域仓 7 天内补货响应，质量问题无条件换货。",
        "rank": 1,
        "isLowestPrice": false
      },
      {
        "supplierId": "sup-2",
        "supplierName": "苏州洁雅清洁服务有限公司",
        "amount": 1199000,
        "deliveryDays": 32,
        "serviceCommitment": "价格低但检测报告需中选后补充更新。",
        "rank": 2,
        "isLowestPrice": true
      }
    ],
    "recommendedSupplierId": "sup-1",
    "awardReason": "综合质量和交付保障优先。",
    "nonLowestPriceReason": "最低价供应商检测报告临期且交付周期较长。",
    "generatedBy": "u2",
    "generatedAt": "2026-06-19T15:30:00.000Z",
    "frozenAt": "2026-06-19T16:30:00.000Z"
  },
  {
    "id": "cr-food-1",
    "projectId": "p-food",
    "reportNo": "CR-2026-0620-003",
    "status": "frozen",
    "comparisonRows": [
      {
        "supplierId": "sup-3",
        "supplierName": "杭州鲜达食材配送有限公司",
        "amount": 368000,
        "deliveryDays": 1,
        "serviceCommitment": "每日 05:30 前冷链送达，异常 2 小时内补货。",
        "rank": 1,
        "isLowestPrice": true
      }
    ],
    "recommendedSupplierId": "sup-3",
    "awardReason": "唯一合格且冷链能力满足酒店早餐场景。",
    "generatedBy": "u2",
    "generatedAt": "2026-06-20T15:10:00.000Z",
    "frozenAt": "2026-06-20T15:40:00.000Z"
  }
];

export const awardApprovals: AwardApproval[] = [
  {
    "id": "aa-award-1",
    "projectId": "p-award",
    "recommendedSupplierId": "sup-1",
    "selectedSupplierId": "sup-1",
    "isLowestPrice": false,
    "nonLowestPriceReason": "最低价供应商检测报告临期且交付周期较长，综合履约风险较高。",
    "approvalStatus": "approved",
    "approvalOpinion": "同意按综合评分第一名定标。",
    "createdBy": "u2",
    "createdAt": "2026-06-20T09:00:00.000Z",
    "submittedAt": "2026-06-20T09:20:00.000Z",
    "approvedAt": "2026-06-20T11:00:00.000Z"
  },
  {
    "id": "aa-food-1",
    "projectId": "p-food",
    "recommendedSupplierId": "sup-3",
    "selectedSupplierId": "sup-3",
    "isLowestPrice": true,
    "approvalStatus": "approved",
    "approvalOpinion": "食安和冷链资料齐全，同意定标。",
    "createdBy": "u2",
    "createdAt": "2026-06-20T16:00:00.000Z",
    "submittedAt": "2026-06-20T16:20:00.000Z",
    "approvedAt": "2026-06-20T17:00:00.000Z"
  }
];

export const pricingReports: PricingReport[] = [
  {
    "id": "pr-seed-amenity-kit",
    "projectId": "agreement:AG-MALL-AMENITY-2026",
    "awardApprovalId": "agreement:AG-MALL-AMENITY-2026",
    "sourceReportId": "AG-MALL-AMENITY-2026",
    "selectedSupplierId": "sup-2",
    "reportNo": "PR-MALL-AMENITY-2026",
    "status": "approved",
    "items": [
      {
        "id": "pr-seed-amenity-kit-item-1",
        "productId": "mp-amenity-kit",
        "itemName": "客房环保洗漱套装",
        "specification": "竹柄牙刷+牙膏+梳子+护理包",
        "quantity": 1,
        "unit": "套",
        "purchasePrice": 7.9,
        "salePrice": 8.6,
        "serviceFeeRate": 0.0886,
        "grossMarginRate": 0.0814,
        "taxRate": 0.13,
        "deliveryDays": 5,
        "effectiveFrom": "2026-06-20T00:00:00.000Z",
        "effectiveTo": "2099-12-31T23:59:59.000Z"
      }
    ],
    "basisJson": {
      "source": "agreement",
      "sourceAgreementNo": "AG-MALL-AMENITY-2026",
      "productId": "mp-amenity-kit"
    },
    "createdBy": "u10",
    "createdAt": "2026-06-20T10:00:00.000Z",
    "updatedAt": "2026-06-20T10:00:00.000Z",
    "approvedAt": "2026-06-20T10:00:00.000Z"
  },
  {
    "id": "pr-seed-linen-sheet",
    "projectId": "p-award",
    "awardApprovalId": "aa-award-1",
    "sourceReportId": "p-award",
    "selectedSupplierId": "sup-1",
    "reportNo": "PR-MALL-LINEN-2026",
    "status": "approved",
    "items": [
      {
        "id": "pr-seed-linen-sheet-item-1",
        "productId": "mp-linen-sheet",
        "itemName": "高支纱酒店床单",
        "specification": "80s 纯棉 280x280cm",
        "quantity": 1,
        "unit": "条",
        "purchasePrice": 118,
        "salePrice": 128,
        "serviceFeeRate": 0.0847,
        "grossMarginRate": 0.0781,
        "taxRate": 0.13,
        "deliveryDays": 12,
        "effectiveFrom": "2026-06-18T00:00:00.000Z",
        "effectiveTo": "2099-12-31T23:59:59.000Z"
      }
    ],
    "basisJson": {
      "source": "award_project",
      "sourceProjectId": "p-award",
      "productId": "mp-linen-sheet"
    },
    "createdBy": "u10",
    "createdAt": "2026-06-18T10:00:00.000Z",
    "updatedAt": "2026-06-18T10:00:00.000Z",
    "approvedAt": "2026-06-18T10:00:00.000Z"
  },
  {
    "id": "pr-seed-breakfast-fruit",
    "projectId": "p-food",
    "awardApprovalId": "aa-food-1",
    "sourceReportId": "p-food",
    "selectedSupplierId": "sup-3",
    "reportNo": "PR-MALL-FOOD-2026",
    "status": "approved",
    "items": [
      {
        "id": "pr-seed-breakfast-fruit-item-1",
        "productId": "mp-breakfast-fruit",
        "itemName": "早餐鲜切水果盒",
        "specification": "A级混合果盘 250g 冷链配送",
        "quantity": 1,
        "unit": "盒",
        "purchasePrice": 11.6,
        "salePrice": 12.8,
        "serviceFeeRate": 0.1034,
        "grossMarginRate": 0.0938,
        "taxRate": 0.09,
        "deliveryDays": 1,
        "effectiveFrom": "2026-06-19T00:00:00.000Z",
        "effectiveTo": "2099-12-31T23:59:59.000Z"
      }
    ],
    "basisJson": {
      "source": "award_project",
      "sourceProjectId": "p-food",
      "productId": "mp-breakfast-fruit"
    },
    "createdBy": "u10",
    "createdAt": "2026-06-19T10:00:00.000Z",
    "updatedAt": "2026-06-19T10:00:00.000Z",
    "approvedAt": "2026-06-19T10:00:00.000Z"
  }
];

export const resultNotifications: ResultNotification[] = [
  {
    "id": "rn-award-sup-1",
    "projectId": "p-award",
    "awardApprovalId": "aa-award-1",
    "supplierId": "sup-1",
    "scope": "supplier_self",
    "status": "sent",
    "visibilityConfig": "supplier_self_only",
    "contentSummary": "贵司已被确定为客房布草集中采购项目成交供应商，请按订单履约。",
    "sentAt": "2026-06-20T11:30:00.000Z",
    "createdBy": "u2",
    "createdAt": "2026-06-20T11:20:00.000Z"
  },
  {
    "id": "rn-award-sup-2",
    "projectId": "p-award",
    "awardApprovalId": "aa-award-1",
    "supplierId": "sup-2",
    "scope": "supplier_self",
    "status": "sent",
    "visibilityConfig": "supplier_self_only",
    "contentSummary": "感谢参与客房布草集中采购项目，本次未中选。",
    "sentAt": "2026-06-20T11:32:00.000Z",
    "createdBy": "u2",
    "createdAt": "2026-06-20T11:20:00.000Z"
  },
  {
    "id": "rn-food-sup-3",
    "projectId": "p-food",
    "awardApprovalId": "aa-food-1",
    "supplierId": "sup-3",
    "scope": "supplier_self",
    "status": "sent",
    "visibilityConfig": "supplier_self_only",
    "contentSummary": "贵司已被确定为食材供应商比选项目成交供应商。",
    "sentAt": "2026-06-20T17:20:00.000Z",
    "createdBy": "u2",
    "createdAt": "2026-06-20T17:10:00.000Z"
  }
];

export const internalPublicityRecords: InternalPublicityRecord[] = [
  {
    "id": "ipr-award-1",
    "projectId": "p-award",
    "awardApprovalId": "aa-award-1",
    "status": "published",
    "visibilityConfig": "internal_only",
    "contentSummary": "客房布草集中采购定标结果已完成内部公示。",
    "publishedAt": "2026-06-20T12:00:00.000Z",
    "createdBy": "u2",
    "createdAt": "2026-06-20T11:55:00.000Z"
  },
  {
    "id": "ipr-food-1",
    "projectId": "p-food",
    "awardApprovalId": "aa-food-1",
    "status": "published",
    "visibilityConfig": "internal_only",
    "contentSummary": "上海滨江酒店食材供应商比选结果已完成内部公示。",
    "publishedAt": "2026-06-20T17:30:00.000Z",
    "createdBy": "u2",
    "createdAt": "2026-06-20T17:25:00.000Z"
  }
];

export const externalTradeRecords: ExternalTradeRecord[] = [
  {
    "id": "etr-ext-1",
    "projectId": "p-ext",
    "externalPlatformName": "外部公共资源交易平台",
    "externalProjectCode": "EXT-PLAT-2026-004",
    "internalApprovalStatus": "recorded",
    "internalApprovalOpinion": "外部交易备案内部审批已完成。",
    "announcementMaterialMetadata": [
      {
        "id": "ext-ann-1",
        "fileName": "外部交易公告备案材料.pdf",
        "contentType": "application/pdf",
        "sizeBytes": 1024,
        "uploadedAt": "2026-06-20T10:00:00.000Z"
      }
    ],
    "resultMaterialMetadata": [
      {
        "id": "ext-result-1",
        "fileName": "外部交易结果备案材料.pdf",
        "contentType": "application/pdf",
        "sizeBytes": 2048,
        "uploadedAt": "2026-06-21T10:00:00.000Z"
      }
    ],
    "resultRecordStatus": "recorded",
    "status": "external_result_recorded",
    "createdBy": "u2",
    "createdAt": "2026-06-20T09:00:00.000Z",
    "updatedAt": "2026-06-21T11:00:00.000Z"
  }
];

export const contractLedgers: ContractLedger[] = [
  {
    "id": "cl-award-1",
    "projectId": "p-award",
    "supplierId": "sup-1",
    "contractNo": "HT-2026-0001",
    "amount": 1286000,
    "status": "registered",
    "contractSystemLink": "contract-ledger://contracts/HT-2026-0001",
    "attachmentMetadata": [
      {
        "id": "contract-att-1",
        "fileName": "contract-ledger-attachment.pdf",
        "contentType": "application/pdf",
        "sizeBytes": 4096,
        "uploadedAt": "2026-06-22T10:00:00.000Z"
      }
    ],
    "createdBy": "u2",
    "createdAt": "2026-06-22T10:00:00.000Z",
    "updatedAt": "2026-06-22T10:00:00.000Z"
  }
];

export const performanceNodes: PerformanceNode[] = [
  {
    "id": "pn-award-1",
    "contractId": "cl-award-1",
    "projectId": "p-award",
    "supplierId": "sup-1",
    "nodeName": "首批到货",
    "planDate": "2026-07-01",
    "status": "planned",
    "attachmentMetadata": [],
    "updatedBy": "u2",
    "updatedAt": "2026-06-22T10:00:00.000Z"
  }
];

export const purchaseOrders: PurchaseOrder[] = [
  {
    "id": "po-award-1",
    "projectId": "p-award",
    "supplierId": "sup-1",
    "contractId": "cl-award-1",
    "orderNo": "PO-2026-0001",
    "status": "supplier_confirmed",
    "totalAmount": 1286000,
    "lineItems": [
      {
        "id": "po-award-1-line-1",
        "itemName": "高支纱床单",
        "specification": "80s 纯棉 280x280cm",
        "quantity": 3500,
        "unit": "条",
        "unitPrice": 184,
        "taxRate": 0.13,
        "totalPrice": 644000,
        "receivedQuantity": 0
      },
      {
        "id": "po-award-1-line-2",
        "itemName": "被套",
        "specification": "80s 纯棉 240x220cm",
        "quantity": 3000,
        "unit": "条",
        "unitPrice": 178,
        "taxRate": 0.13,
        "totalPrice": 534000,
        "receivedQuantity": 0
      },
      {
        "id": "po-award-1-line-3",
        "itemName": "枕套",
        "specification": "80s 纯棉 60x90cm",
        "quantity": 7000,
        "unit": "只",
        "unitPrice": 15.43,
        "taxRate": 0.13,
        "totalPrice": 108000,
        "receivedQuantity": 0
      }
    ],
    "expectedDeliveryAt": "2026-07-20",
    "receivingLocation": "华东区域中央仓",
    "confirmedAt": "2026-06-22T16:00:00.000Z",
    "createdBy": "u2",
    "createdAt": "2026-06-22T15:00:00.000Z",
    "updatedAt": "2026-06-22T16:00:00.000Z",
    "sourceRequestId": "req-award",
    "awardApprovalId": "aa-award-1",
    "selectedBidId": "bid-award-1",
    "deliveryDays": 25,
    "statusRemark": "供应商已确认，待收货验收"
  },
  {
    "id": "po-food-1",
    "projectId": "p-food",
    "supplierId": "sup-3",
    "orderNo": "PO-2026-0003",
    "status": "exception",
    "totalAmount": 368000,
    "lineItems": [
      {
        "id": "po-food-1-line-1",
        "itemName": "鲜切水果",
        "specification": "A 级混合果盒 250g",
        "quantity": 16000,
        "unit": "盒",
        "unitPrice": 12.2,
        "taxRate": 0.09,
        "totalPrice": 195200,
        "receivedQuantity": 14800
      },
      {
        "id": "po-food-1-line-2",
        "itemName": "半成品点心",
        "specification": "冷链配送",
        "quantity": 8000,
        "unit": "份",
        "unitPrice": 21.6,
        "taxRate": 0.09,
        "totalPrice": 172800,
        "receivedQuantity": 8000
      }
    ],
    "expectedDeliveryAt": "2026-07-01",
    "receivingLocation": "上海滨江华礼酒店餐饮收货口",
    "confirmedAt": "2026-06-21T10:00:00.000Z",
    "createdBy": "u2",
    "createdAt": "2026-06-21T09:00:00.000Z",
    "updatedAt": "2026-07-01T06:40:00.000Z",
    "statusRemark": "异常待补录"
  }
];

export const receiptRecords: ReceiptRecord[] = [
  {
    "id": "rrc-food-1",
    "purchaseOrderId": "po-food-1",
    "projectId": "p-food",
    "supplierId": "sup-3",
    "receiptType": "exception",
    "exceptionType": "quantity_mismatch",
    "status": "recorded",
    "receivedItems": [
      {
        "itemName": "鲜切水果",
        "receivedQuantity": 14800,
        "unit": "盒",
        "accepted": false
      },
      {
        "itemName": "半成品点心",
        "receivedQuantity": 8000,
        "unit": "份",
        "accepted": true
      }
    ],
    "summary": "鲜切水果实收少 1200 盒，供应商承诺 2 小时内补送。",
    "attachmentMetadata": [
      {
        "id": "rrc-food-att-1",
        "fileName": "食材到货差异照片.jpg",
        "contentType": "image/jpeg",
        "sizeBytes": 102400,
        "uploadedAt": "2026-07-01T06:35:00.000Z"
      }
    ],
    "createdBy": "u2",
    "createdAt": "2026-07-01T06:40:00.000Z",
    "acceptanceResult": "accepted_with_exception",
    "handlingStatus": "pending_resolution",
    "receiptAt": "2026-07-01T06:40:00.000Z",
    "operatorId": "u2"
  }
];

export const acceptancePaymentRecords: AcceptancePaymentRecord[] = [
  {
    "id": "apr-award-1",
    "contractId": "cl-award-1",
    "projectId": "p-award",
    "supplierId": "sup-1",
    "recordType": "acceptance",
    "status": "recorded",
    "summary": "首批验收记录已登记",
    "attachmentMetadata": [],
    "createdBy": "u2",
    "createdAt": "2026-06-22T11:00:00.000Z"
  }
];

export const settlementMaterials: SettlementMaterial[] = [
  {
    "id": "sm-award-invoice",
    "purchaseOrderId": "po-award-1",
    "projectId": "p-award",
    "supplierId": "sup-1",
    "materialType": "invoice",
    "status": "pending_verification",
    "uploadedBy": "u3"
  },
  {
    "id": "sm-award-delivery",
    "purchaseOrderId": "po-award-1",
    "projectId": "p-award",
    "supplierId": "sup-1",
    "materialType": "delivery_note",
    "status": "pending_verification",
    "uploadedBy": "u3"
  },
  {
    "id": "sm-food-invoice",
    "purchaseOrderId": "po-food-1",
    "projectId": "p-food",
    "supplierId": "sup-3",
    "materialType": "invoice",
    "status": "pending_verification",
    "fileName": "鲜达食材发票.pdf",
    "uploadedBy": "u3",
    "uploadedAt": "2026-07-01T09:00:00.000Z"
  },
  {
    "id": "sm-food-delivery",
    "purchaseOrderId": "po-food-1",
    "projectId": "p-food",
    "supplierId": "sup-3",
    "materialType": "delivery_note",
    "status": "verified",
    "fileName": "鲜达食材送货单.pdf",
    "uploadedBy": "u3",
    "uploadedAt": "2026-07-01T06:30:00.000Z",
    "verifiedBy": "u2",
    "verifiedAt": "2026-07-01T06:50:00.000Z",
    "verificationOpinion": "送货单齐全"
  },
  {
    "id": "sm-food-acceptance",
    "purchaseOrderId": "po-food-1",
    "projectId": "p-food",
    "supplierId": "sup-3",
    "materialType": "acceptance_record",
    "status": "rejected",
    "fileName": "食材验收单-异常.pdf",
    "uploadedBy": "u3",
    "uploadedAt": "2026-07-01T07:00:00.000Z",
    "verifiedBy": "u2",
    "verifiedAt": "2026-07-01T07:20:00.000Z",
    "verificationOpinion": "异常验收单缺少补录说明"
  }
];

export const supplierEvaluations: SupplierEvaluation[] = [
  {
    "id": "se-award-1",
    "supplierId": "sup-1",
    "projectId": "p-award",
    "contractId": "cl-award-1",
    "dimensions": {
      "quality": 92,
      "delivery": 90,
      "service": 88,
      "cooperation": 89,
      "priceReasonableness": 91
    },
    "score": 90,
    "description": "交付稳定，资料提交及时",
    "improvementSuggestion": "继续保持送货、验收与结算资料完整",
    "createdBy": "u2",
    "createdAt": "2026-06-22T12:00:00.000Z",
    "purchaseOrderId": "po-award-1",
    "status": "submitted_locked",
    "versionNo": 1,
    "lockedAt": "2026-06-22T12:00:00.000Z"
  }
];

export const archiveTemplates: ArchiveTemplate[] = [
  {
    "id": "at-1",
    "templateCode": "hotel-procurement-closed-loop",
    "templateName": "酒店招采规范化项目档案目录",
    "versionNo": 2,
    "status": "enabled",
    "items": [
      "采购申请",
      "审批记录",
      "公告/邀请",
      "报名和资格审查",
      "响应/报价记录",
      "比价/评审报告",
      "定标审批",
      "采购订单",
      "收货验收",
      "供应商评价",
      "结算资料",
      "审计日志"
    ]
  }
];

export const archiveItems: ArchiveItem[] = [
  {
    "id": "ai-award-demand",
    "projectId": "p-award",
    "itemName": "采购申请",
    "requiredFlag": true,
    "collectedFlag": true,
    "sealed": false,
    "status": "complete",
    "snapshotJson": {
      "templateVersion": 2,
      "sourceId": "req-award"
    }
  },
  {
    "id": "ai-award-comparison",
    "projectId": "p-award",
    "itemName": "比价/评审报告",
    "requiredFlag": true,
    "collectedFlag": true,
    "sealed": false,
    "status": "complete",
    "snapshotJson": {
      "templateVersion": 2,
      "sourceId": "cr-award-1"
    }
  },
  {
    "id": "ai-award-order",
    "projectId": "p-award",
    "itemName": "采购订单",
    "requiredFlag": true,
    "collectedFlag": true,
    "sealed": false,
    "status": "complete",
    "snapshotJson": {
      "templateVersion": 2,
      "sourceId": "po-award-1"
    }
  },
  {
    "id": "ai-food-demand",
    "projectId": "p-food",
    "itemName": "采购申请",
    "requiredFlag": true,
    "collectedFlag": true,
    "sealed": false,
    "status": "complete",
    "snapshotJson": {
      "templateVersion": 2,
      "sourceId": "req-food"
    }
  },
  {
    "id": "ai-food-receipt",
    "projectId": "p-food",
    "itemName": "收货验收",
    "requiredFlag": true,
    "collectedFlag": true,
    "sealed": false,
    "status": "complete",
    "snapshotJson": {
      "templateVersion": 2,
      "sourceId": "rrc-food-1"
    }
  },
  {
    "id": "ai-food-settlement",
    "projectId": "p-food",
    "itemName": "结算资料",
    "requiredFlag": true,
    "collectedFlag": false,
    "sealed": false,
    "status": "incomplete",
    "snapshotJson": {
      "templateVersion": 2,
      "missing": "异常验收单待补正"
    }
  },
  {
    "id": "ai-ext-result",
    "projectId": "p-ext",
    "itemName": "外部中标结果",
    "requiredFlag": true,
    "collectedFlag": false,
    "sealed": true,
    "status": "sealed",
    "snapshotJson": {
      "templateVersion": 1,
      "sealedAt": "2026-06-23T15:40:00.000Z"
    }
  }
];

export const archiveSupplementRequests: ArchiveSupplementRequest[] = [
  {
    "id": "asr-1",
    "projectId": "p-ext",
    "archiveItemId": "ai-ext-result",
    "reason": "外部中标结果盖章件待补",
    "approvalStatus": "submitted",
    "submittedBy": "u2",
    "submittedAt": "2026-06-23T15:41:00.000Z"
  }
];

export const projectSampleReceipts: ProjectSampleReceipt[] = [
  {
    "id": "psr-pre-amenity-1",
    "projectId": "p-pre",
    "supplierId": "sup-2",
    "sampleName": "环保牙具套装投标样品",
    "quantity": 3,
    "status": "received",
    "receivedBy": "u2",
    "receivedAt": "2026-06-22T10:20:00.000Z",
    "returnRequired": true,
    "attachmentMetadata": [
      {
        "id": "file-project-sample-amenity",
        "fileName": "项目样品-环保牙具套装.jpg",
        "contentType": "image/jpeg",
        "sizeBytes": 102400,
        "uploadedAt": "2026-06-22T10:20:00.000Z"
      }
    ],
    "handlingNote": "样品外包装完整，已贴样品编号并入柜。"
  },
  {
    "id": "psr-award-linen-1",
    "projectId": "p-award",
    "supplierId": "sup-1",
    "sampleName": "高支纱床单封样复核样",
    "quantity": 2,
    "status": "returned",
    "receivedBy": "u2",
    "receivedAt": "2026-06-13T15:00:00.000Z",
    "returnRequired": true,
    "returnedBy": "u2",
    "returnedAt": "2026-06-21T16:30:00.000Z",
    "attachmentMetadata": [
      {
        "id": "file-project-sample-linen",
        "fileName": "项目样品-布草复核样.jpg",
        "contentType": "image/jpeg",
        "sizeBytes": 102400,
        "uploadedAt": "2026-06-13T15:00:00.000Z"
      }
    ],
    "handlingNote": "评审结束后已按封样流转单退回供应商。"
  }
];

export const mallProducts: MallProduct[] = [
  {
    "id": "mp-amenity-kit",
    "name": "客房环保洗漱套装",
    "category": "客房一次性用品",
    "brand": "华礼优选",
    "unit": "套",
    "skuCode": "SKU-HL-AMENITY-001",
    "specification": "竹柄牙刷+牙膏+梳子+护理包",
    "packingQuantity": 200,
    "minOrderQty": 1000,
    "taxRate": 0.13,
    "invoiceName": "客房一次性用品",
    "taxClassificationCode": "106050902",
    "detailDescription": "适合中高端连锁酒店客房，外包装可按酒店品牌定制。",
    "acceptanceGuide": "核验外包装、批次、环保材质说明和抽检数量。",
    "tags": ["客房物资", "环保", "开业包"],
    "status": "listed",
    "supplierId": "sup-2",
    "serviceRegions": ["华东", "上海"],
    "procurementCategory": "客房一次性用品",
    "sourceType": "agreement",
    "sourceAgreementNo": "AG-MALL-AMENITY-2026",
    "sourcePricingReportId": "pr-seed-amenity-kit",
    "sourcePricingReportItemId": "pr-seed-amenity-kit-item-1",
    "listedAt": "2026-06-20T10:00:00.000Z",
    "imageFileIds": ["file-mall-amenity-main"],
    "attachmentFileIds": ["file-mall-amenity-spec"],
    "createdBy": "u10",
    "createdAt": "2026-06-20T09:00:00.000Z",
    "updatedAt": "2026-06-24T09:00:00.000Z"
  },
  {
    "id": "mp-linen-sheet",
    "name": "高支纱酒店床单",
    "category": "客房布草",
    "brand": "棉织严选",
    "unit": "条",
    "skuCode": "SKU-HL-LINEN-280",
    "specification": "80s 纯棉 280x280cm",
    "packingQuantity": 20,
    "minOrderQty": 200,
    "taxRate": 0.13,
    "invoiceName": "酒店布草",
    "taxClassificationCode": "104020101",
    "detailDescription": "适用于华礼酒店标准大床房和行政房，支持区域仓分批配送。",
    "acceptanceGuide": "检查织物克重、尺寸、色差和封样一致性。",
    "tags": ["布草", "封样一致", "区域集采"],
    "status": "listed",
    "supplierId": "sup-1",
    "serviceRegions": ["华东", "上海"],
    "procurementCategory": "客房布草",
    "sourceType": "award_project",
    "sourceProjectId": "p-award",
    "sourcePricingReportId": "pr-seed-linen-sheet",
    "sourcePricingReportItemId": "pr-seed-linen-sheet-item-1",
    "listedAt": "2026-06-18T10:00:00.000Z",
    "imageFileIds": ["file-mall-linen-main"],
    "attachmentFileIds": ["file-mall-linen-spec"],
    "createdBy": "u10",
    "createdAt": "2026-06-18T09:30:00.000Z",
    "updatedAt": "2026-06-24T09:30:00.000Z"
  },
  {
    "id": "mp-breakfast-fruit",
    "name": "早餐鲜切水果盒",
    "category": "食材供应",
    "brand": "鲜达优配",
    "unit": "盒",
    "skuCode": "SKU-HL-FOOD-250",
    "specification": "A级混合果盘 250g 冷链配送",
    "packingQuantity": 80,
    "minOrderQty": 400,
    "taxRate": 0.09,
    "invoiceName": "鲜切水果",
    "taxClassificationCode": "101011201",
    "detailDescription": "早餐厅和会议茶歇通用规格，支持每日 06:00 前送达。",
    "acceptanceGuide": "核验温控记录、生产批次、数量和外观新鲜度。",
    "tags": ["早餐", "冷链", "每日配送"],
    "status": "listed",
    "supplierId": "sup-3",
    "serviceRegions": ["长三角", "上海"],
    "procurementCategory": "食材供应",
    "sourceType": "award_project",
    "sourceProjectId": "p-food",
    "sourcePricingReportId": "pr-seed-breakfast-fruit",
    "sourcePricingReportItemId": "pr-seed-breakfast-fruit-item-1",
    "listedAt": "2026-06-19T10:00:00.000Z",
    "imageFileIds": ["file-mall-fruit-main"],
    "attachmentFileIds": ["file-mall-fruit-spec"],
    "createdBy": "u10",
    "createdAt": "2026-06-19T08:30:00.000Z",
    "updatedAt": "2026-06-24T08:30:00.000Z"
  }
];

export const mallPrices: MallPrice[] = [
  {
    "id": "mprice-amenity-kit-1",
    "productId": "mp-amenity-kit",
    "supplierId": "sup-2",
    "price": 8.6,
    "purchasePrice": 7.9,
    "salePrice": 8.6,
    "taxRate": 0.13,
    "deliveryDays": 5,
    "effectiveFrom": "2026-06-20T00:00:00.000Z",
    "effectiveTo": "2099-12-31T23:59:59.000Z",
    "approvalStatus": "approved",
    "versionNo": 1,
    "createdBy": "u10",
    "createdAt": "2026-06-20T10:00:00.000Z"
  },
  {
    "id": "mprice-linen-sheet-1",
    "productId": "mp-linen-sheet",
    "supplierId": "sup-1",
    "price": 128,
    "purchasePrice": 118,
    "salePrice": 128,
    "taxRate": 0.13,
    "deliveryDays": 12,
    "effectiveFrom": "2026-06-18T00:00:00.000Z",
    "effectiveTo": "2099-12-31T23:59:59.000Z",
    "approvalStatus": "approved",
    "versionNo": 1,
    "createdBy": "u10",
    "createdAt": "2026-06-18T10:00:00.000Z"
  },
  {
    "id": "mprice-breakfast-fruit-1",
    "productId": "mp-breakfast-fruit",
    "supplierId": "sup-3",
    "price": 12.8,
    "purchasePrice": 11.6,
    "salePrice": 12.8,
    "taxRate": 0.09,
    "deliveryDays": 1,
    "effectiveFrom": "2026-06-19T00:00:00.000Z",
    "effectiveTo": "2099-12-31T23:59:59.000Z",
    "approvalStatus": "approved",
    "versionNo": 1,
    "createdBy": "u10",
    "createdAt": "2026-06-19T10:00:00.000Z"
  }
];

export const mallOrders: MallOrder[] = [
  {
    "id": "mo-seed-amenity-1",
    "orderNo": "MO-20260624-00001",
    "buyerId": "u8",
    "orgId": "org-hotel",
    "supplierId": "sup-2",
    "status": "shipped",
    "lineItems": [
      {
        "productId": "mp-amenity-kit",
        "productName": "客房环保洗漱套装",
        "quantity": 1200,
        "unit": "套",
        "unitPrice": 8.6,
        "totalPrice": 10320
      }
    ],
    "totalAmount": 10320,
    "shippingAddress": "上海滨江华礼酒店后勤仓",
    "invoiceTitle": "上海滨江华礼酒店有限公司",
    "paymentStatus": "payment_reserved",
    "paymentReservedAmount": 10320,
    "createdAt": "2026-06-24T11:00:00.000Z",
    "updatedAt": "2026-06-24T15:20:00.000Z"
  }
];

export const mallShipments: MallShipment[] = [
  {
    "id": "ms-seed-amenity-1",
    "orderId": "mo-seed-amenity-1",
    "supplierId": "sup-2",
    "carrier": "洁雅自配送",
    "trackingNo": "JY-20260624-001",
    "status": "shipped",
    "shippedAt": "2026-06-24T15:20:00.000Z"
  }
];

export const mallSettlementInvoices: MallSettlementInvoice[] = [
  {
    "id": "mi-seed-amenity-1",
    "orderId": "mo-seed-amenity-1",
    "supplierId": "sup-2",
    "status": "pending_verification",
    "fileId": "file-mall-invoice-amenity",
    "fileName": "洁雅洗漱套装发票.pdf",
    "amount": 10320,
    "uploadedBy": "u11",
    "uploadedAt": "2026-06-24T16:10:00.000Z",
    "taxRate": 0.13,
    "taxAmount": 1187.26,
    "verificationAdapterBoundary": "本地验证发票校验：仅展示发票上传和待审核状态，未连接真实税务系统。"
  }
];

export const mallQuestionnaires: MallQuestionnaire[] = [
  {
    "id": "mq-opening-readiness-1",
    "title": "开业物资供应保障问卷",
    "scope": "样板间与新店开业包",
    "status": "published",
    "questions": [
      { "id": "mq-q1", "prompt": "是否可在 7 天内完成开业包首批交付？", "type": "single_choice", "options": ["可以", "需分批", "暂无法承诺"] },
      { "id": "mq-q2", "prompt": "可支持的日均补货能力", "type": "number" },
      { "id": "mq-q3", "prompt": "请说明异常响应机制", "type": "text" }
    ],
    "targetSupplierIds": ["sup-1", "sup-2", "sup-3"],
    "submissions": [
      {
        "id": "mqs-opening-readiness-1",
        "questionnaireId": "mq-opening-readiness-1",
        "respondentUserId": "u11",
        "supplierId": "sup-2",
        "answers": [
          { "questionId": "mq-q1", "answer": "可以" },
          { "questionId": "mq-q2", "answer": 3000 },
          { "questionId": "mq-q3", "answer": "开业前驻场 1 名物资协调员，异常 2 小时响应。" }
        ],
        "score": 16,
        "status": "scored",
        "submittedAt": "2026-06-23T10:00:00.000Z",
        "scoredBy": "system",
        "scoredAt": "2026-06-23T10:00:00.000Z"
      }
    ],
    "createdBy": "u10",
    "createdAt": "2026-06-22T09:00:00.000Z"
  }
];

export const mallScenarioTemplates: MallScenarioTemplate[] = [
  {
    "id": "mst-sample-room-1",
    "templateType": "sample_room",
    "name": "标准大床房样板间物资包",
    "status": "active",
    "productIds": ["mp-amenity-kit", "mp-linen-sheet"],
    "packageItems": [
      { "productId": "mp-amenity-kit", "quantity": 120 },
      { "productId": "mp-linen-sheet", "quantity": 24 }
    ],
    "applicableBrands": ["华礼"],
    "applicableHotelTypes": ["中高端商务酒店", "城市精选酒店"],
    "applicableHotelIds": ["org-hotel"],
    "roomCount": 20,
    "budgetAmount": 4100,
    "description": "用于样板间、试运营房和开业前小批量铺货。",
    "generatedOrderIds": ["mo-seed-amenity-1"],
    "attachmentFileIds": ["file-scenario-sample-room"],
    "createdBy": "u10",
    "createdAt": "2026-06-22T11:00:00.000Z"
  },
  {
    "id": "mst-opening-package-1",
    "templateType": "opening_package",
    "name": "新店开业客房基础包",
    "status": "active",
    "productIds": ["mp-amenity-kit", "mp-linen-sheet", "mp-breakfast-fruit"],
    "packageItems": [
      { "productId": "mp-amenity-kit", "quantity": 3000 },
      { "productId": "mp-linen-sheet", "quantity": 420 },
      { "productId": "mp-breakfast-fruit", "quantity": 600 }
    ],
    "applicableBrands": ["华礼", "华礼精选"],
    "applicableHotelTypes": ["新开业酒店", "翻牌改造酒店"],
    "applicableHotelIds": ["org-hotel"],
    "roomCount": 120,
    "budgetAmount": 86520,
    "description": "覆盖新店开业前 7 天客房物资和早餐首批供应。",
    "generatedOrderIds": [],
    "attachmentFileIds": ["file-scenario-opening-package"],
    "createdBy": "u10",
    "createdAt": "2026-06-22T12:00:00.000Z"
  }
];

export const mallFundAccounts: MallFundAccount[] = [
  {
    "id": "mfa-org-hotel",
    "orgId": "org-hotel",
    "balance": 180000,
    "creditLimit": 300000,
    "occupiedAmount": 10320,
    "status": "active",
    "ledgerEntries": [
      {
        "id": "mfl-org-hotel-opening",
        "accountId": "mfa-org-hotel",
        "orgId": "org-hotel",
        "direction": "inbound",
        "entryType": "opening_balance",
        "amount": 180000,
        "status": "simulated",
        "createdBy": "system",
        "createdAt": "2026-06-20T00:00:00.000Z",
        "note": "本地验证资金账户期初余额。"
      },
      {
        "id": "mfl-org-hotel-reserve-1",
        "accountId": "mfa-org-hotel",
        "orgId": "org-hotel",
        "orderId": "mo-seed-amenity-1",
        "direction": "occupy",
        "entryType": "payment_reserve",
        "amount": 10320,
        "status": "reserved",
        "createdBy": "u8",
        "createdAt": "2026-06-24T11:00:00.000Z",
        "note": "商城订单提交后占用本地模拟额度。"
      }
    ],
    "adapterBoundary": "本地模拟资金账户台账：完成余额、充值、授信、支付占用、退款/冲正留痕；未连接真实支付、银行、授信或财务系统。",
    "updatedAt": "2026-06-24T11:00:00.000Z"
  },
  {
    "id": "mfa-org-east",
    "orgId": "org-east",
    "balance": 420000,
    "creditLimit": 600000,
    "occupiedAmount": 0,
    "status": "active",
    "ledgerEntries": [
      {
        "id": "mfl-org-east-opening",
        "accountId": "mfa-org-east",
        "orgId": "org-east",
        "direction": "inbound",
        "entryType": "opening_balance",
        "amount": 420000,
        "status": "simulated",
        "createdBy": "system",
        "createdAt": "2026-06-20T00:00:00.000Z",
        "note": "本地验证区域公司资金账户期初余额。"
      }
    ],
    "adapterBoundary": "本地模拟资金账户台账：完成余额、充值、授信、支付占用、退款/冲正留痕；未连接真实支付、银行、授信或财务系统。",
    "updatedAt": "2026-06-20T00:00:00.000Z"
  }
];

export const auditLogs: AuditLog[] = [
  {
    "id": "audit-seed-1",
    "actorId": "u2",
    "roleId": "buyer",
    "orgId": "org-east",
    "projectId": "p-pre",
    "action": "创建采购需求",
    "objectType": "procurement_request",
    "objectId": "req-pre",
    "result": "recorded",
    "createdAt": "2026-06-21T09:30:00.000Z"
  },
  {
    "id": "audit-seed-2",
    "actorId": "system",
    "roleId": "system",
    "orgId": "org-group",
    "projectId": "p-award",
    "action": "报价截止锁定",
    "objectType": "bid_lock",
    "objectId": "p-award",
    "result": "recorded",
    "createdAt": "2026-06-18T17:00:00.000Z"
  },
  {
    "id": "audit-seed-3",
    "actorId": "u2",
    "roleId": "buyer",
    "orgId": "org-east",
    "projectId": "p-award",
    "action": "supplier-invitation.send",
    "objectType": "supplier_invitation",
    "objectId": "inv-award-sup-1",
    "result": "recorded",
    "createdAt": "2026-06-13T09:40:00.000Z"
  },
  {
    "id": "audit-seed-4",
    "actorId": "u3",
    "roleId": "supplier",
    "orgId": "org-hotel",
    "projectId": "p-award",
    "action": "registration.submit",
    "objectType": "registration",
    "objectId": "reg-award-sup-1",
    "result": "recorded",
    "createdAt": "2026-06-13T10:00:00.000Z"
  },
  {
    "id": "audit-seed-5",
    "actorId": "u4",
    "roleId": "expert",
    "orgId": "org-group",
    "projectId": "p-award",
    "action": "scoring_sheet.save",
    "objectType": "scoring_sheet",
    "objectId": "score-award-exp1-sup1",
    "result": "recorded",
    "createdAt": "2026-06-19T11:20:00.000Z"
  },
  {
    "id": "audit-seed-6",
    "actorId": "u2",
    "roleId": "buyer",
    "orgId": "org-east",
    "projectId": "p-award",
    "action": "award_approval.submit",
    "objectType": "award_approval",
    "objectId": "aa-award-1",
    "result": "recorded",
    "createdAt": "2026-06-20T09:20:00.000Z"
  },
  {
    "id": "audit-seed-7",
    "actorId": "u3",
    "roleId": "supplier",
    "orgId": "org-hotel",
    "projectId": "p-award",
    "action": "purchase_order.confirm",
    "objectType": "purchase_order",
    "objectId": "po-award-1",
    "result": "recorded",
    "createdAt": "2026-06-22T14:00:00.000Z"
  },
  {
    "id": "audit-seed-8",
    "actorId": "u13",
    "roleId": "finance_reviewer",
    "orgId": "org-group",
    "projectId": "p-award",
    "action": "settlement_material.verify",
    "objectType": "settlement_material",
    "objectId": "sm-award-1",
    "result": "recorded",
    "createdAt": "2026-06-23T15:30:00.000Z"
  },
  {
    "id": "audit-seed-9",
    "actorId": "u9",
    "roleId": "hotel_finance",
    "orgId": "org-hotel",
    "projectId": "p-food",
    "action": "mall_fund.recharge",
    "objectType": "mall_fund_account",
    "objectId": "mfa-org-hotel",
    "result": "recorded",
    "createdAt": "2026-06-24T09:10:00.000Z"
  }
];

export function createSeedState() {
  return {
    organizations: structuredClone(organizations),
    roles: structuredClone(roles),
    users: structuredClone(users),
    rolePermissions: structuredClone(rolePermissions),
    systemDictionaries: structuredClone(systemDictionaries),
    suppliers: structuredClone(suppliers),
    procurementRequests: structuredClone(procurementRequests),
    procurementMethodRules: structuredClone(procurementMethodRules),
    approvalRules: structuredClone(approvalRules),
    projects: structuredClone(projects),
    projectPackages: structuredClone(projectPackages),
    procurementDocuments: structuredClone(procurementDocuments),
    procurementAnnouncements: structuredClone(procurementAnnouncements),
    inquirySheets: [] as InquirySheet[],
    projectSampleReceipts: structuredClone(projectSampleReceipts),
    supplierInvitations: structuredClone(supplierInvitations),
    supplierRegistrations: structuredClone(supplierRegistrations),
    bids: structuredClone(bids),
    bidVersions: structuredClone(bidVersions),
    bidViewApprovals: structuredClone(bidViewApprovals),
    bidViewLogs: structuredClone(bidViewLogs),
    experts: structuredClone(experts),
    expertAssignments: structuredClone(expertAssignments),
    scoringTemplates: structuredClone(scoringTemplates),
    scoringSheets: structuredClone(scoringSheets),
    scoringVersions: structuredClone(scoringVersions),
    reviewReports: structuredClone(reviewReports),
    comparisonReports: structuredClone(comparisonReports),
    awardApprovals: structuredClone(awardApprovals),
    pricingReports: structuredClone(pricingReports),
    resultNotifications: structuredClone(resultNotifications),
    internalPublicityRecords: structuredClone(internalPublicityRecords),
    externalTradeRecords: structuredClone(externalTradeRecords),
    contractLedgers: structuredClone(contractLedgers),
    performanceNodes: structuredClone(performanceNodes),
    purchaseOrders: structuredClone(purchaseOrders),
    receiptRecords: structuredClone(receiptRecords),
    acceptancePaymentRecords: structuredClone(acceptancePaymentRecords),
    settlementMaterials: structuredClone(settlementMaterials),
    supplierEvaluations: structuredClone(supplierEvaluations),
    archiveTemplates: structuredClone(archiveTemplates),
    archiveItems: structuredClone(archiveItems),
    archiveSupplementRequests: structuredClone(archiveSupplementRequests),
    mallProducts: structuredClone(mallProducts),
    mallPrices: structuredClone(mallPrices),
    mallCartItems: [] as MallCartItem[],
    mallOrders: structuredClone(mallOrders),
    mallShipments: structuredClone(mallShipments),
    mallReturnRequests: [] as MallReturnRequest[],
    mallSettlementInvoices: structuredClone(mallSettlementInvoices),
    mallQuestionnaires: structuredClone(mallQuestionnaires),
    mallScenarioTemplates: structuredClone(mallScenarioTemplates),
    mallFundAccounts: structuredClone(mallFundAccounts),
    auditLogs: structuredClone(auditLogs),
  };
}

export type SeedState = ReturnType<typeof createSeedState>;

export function createCleanBusinessSeedState(): SeedState {
  const state = createSeedState();
  clearScenarioBusinessData(state);
  return state;
}

export function clearScenarioBusinessData(state: SeedState) {
  state.suppliers = [];
  state.procurementRequests = [];
  state.projects = [];
  state.projectPackages = [];
  state.procurementDocuments = [];
  state.procurementAnnouncements = [];
  state.inquirySheets = [];
  state.projectSampleReceipts = [];
  state.supplierInvitations = [];
  state.supplierRegistrations = [];
  state.bids = [];
  state.bidVersions = [];
  state.bidViewApprovals = [];
  state.bidViewLogs = [];
  state.expertAssignments = [];
  state.scoringSheets = [];
  state.scoringVersions = [];
  state.reviewReports = [];
  state.comparisonReports = [];
  state.awardApprovals = [];
  state.pricingReports = [];
  state.resultNotifications = [];
  state.internalPublicityRecords = [];
  state.externalTradeRecords = [];
  state.contractLedgers = [];
  state.performanceNodes = [];
  state.purchaseOrders = [];
  state.receiptRecords = [];
  state.acceptancePaymentRecords = [];
  state.settlementMaterials = [];
  state.supplierEvaluations = [];
  state.archiveItems = [];
  state.archiveSupplementRequests = [];
  state.mallProducts = [];
  state.mallPrices = [];
  state.mallCartItems = [];
  state.mallOrders = [];
  state.mallShipments = [];
  state.mallReturnRequests = [];
  state.mallSettlementInvoices = [];
  state.mallQuestionnaires = [];
  state.mallScenarioTemplates = [];
  state.mallFundAccounts = [];
  state.auditLogs = [];
}

export function enrichSeedState(state: SeedState, options: { cleanBusinessData?: boolean } = {}) {
  upsertById(state.users, users);
  upsertById(state.organizations, organizations);
  upsertRolePermissions(state.rolePermissions, rolePermissions);
  upsertById(state.suppliers, suppliers);
  state.procurementRequests ??= [];
  state.procurementMethodRules ??= [];
  state.approvalRules ??= [];
  state.projects ??= [];
  state.projectPackages ??= [];
  state.procurementDocuments ??= [];
  state.procurementAnnouncements ??= [];
  state.inquirySheets ??= [];
  state.supplierInvitations ??= [];
  state.supplierRegistrations ??= [];
  state.bids ??= [];
  state.bidVersions ??= [];
  state.bidViewApprovals ??= [];
  state.bidViewLogs ??= [];
  state.experts ??= [];
  state.expertAssignments ??= [];
  state.scoringTemplates ??= [];
  state.scoringSheets ??= [];
  state.scoringVersions ??= [];
  state.reviewReports ??= [];
  state.comparisonReports ??= [];
  state.awardApprovals ??= [];
  state.projectSampleReceipts ??= [];
  state.resultNotifications ??= [];
  state.internalPublicityRecords ??= [];
  state.externalTradeRecords ??= [];
  state.contractLedgers ??= [];
  state.performanceNodes ??= [];
  state.purchaseOrders ??= [];
  state.receiptRecords ??= [];
  state.acceptancePaymentRecords ??= [];
  state.settlementMaterials ??= [];
  state.supplierEvaluations ??= [];
  state.archiveTemplates ??= [];
  state.archiveItems ??= [];
  state.archiveSupplementRequests ??= [];
  state.pricingReports ??= [];
  state.mallProducts ??= [];
  state.mallPrices ??= [];
  state.mallCartItems ??= [];
  state.mallOrders ??= [];
  state.mallShipments ??= [];
  state.mallReturnRequests ??= [];
  state.mallSettlementInvoices ??= [];
  state.mallQuestionnaires ??= [];
  state.mallScenarioTemplates ??= [];
  state.mallFundAccounts ??= [];
  state.auditLogs ??= [];
  if (options.cleanBusinessData) {
    clearScenarioBusinessData(state);
    upsertById(state.procurementMethodRules, procurementMethodRules);
    upsertById(state.approvalRules, approvalRules);
    upsertById(state.experts, experts);
    backfillById(state.scoringTemplates, scoringTemplates);
    upsertById(state.archiveTemplates, archiveTemplates);
    return;
  }
  backfillById(state.procurementRequests, procurementRequests);
  upsertById(state.procurementMethodRules, procurementMethodRules);
  upsertById(state.approvalRules, approvalRules);
  backfillById(state.projects, projects);
  backfillById(state.projectPackages, projectPackages);
  backfillById(state.procurementDocuments, procurementDocuments);
  backfillById(state.procurementAnnouncements, procurementAnnouncements);
  backfillById(state.supplierInvitations, supplierInvitations);
  backfillById(state.supplierRegistrations, supplierRegistrations);
  backfillById(state.bids, bids);
  backfillById(state.bidVersions, bidVersions);
  backfillById(state.bidViewApprovals, bidViewApprovals);
  backfillById(state.bidViewLogs, bidViewLogs);
  upsertById(state.experts, experts);
  backfillById(state.expertAssignments, expertAssignments);
  backfillById(state.scoringTemplates, scoringTemplates);
  backfillById(state.scoringSheets, scoringSheets);
  backfillById(state.scoringVersions, scoringVersions);
  backfillById(state.reviewReports, reviewReports);
  backfillById(state.comparisonReports, comparisonReports);
  backfillById(state.awardApprovals, awardApprovals);
  backfillById(state.projectSampleReceipts, projectSampleReceipts);
  backfillById(state.pricingReports, pricingReports);
  backfillById(state.resultNotifications, resultNotifications);
  backfillById(state.internalPublicityRecords, internalPublicityRecords);
  backfillById(state.externalTradeRecords, externalTradeRecords);
  backfillById(state.contractLedgers, contractLedgers);
  backfillById(state.performanceNodes, performanceNodes);
  backfillById(state.purchaseOrders, purchaseOrders);
  backfillById(state.receiptRecords, receiptRecords);
  backfillById(state.acceptancePaymentRecords, acceptancePaymentRecords);
  backfillById(state.settlementMaterials, settlementMaterials);
  backfillById(state.supplierEvaluations, supplierEvaluations);
  backfillById(state.archiveTemplates, archiveTemplates);
  backfillById(state.archiveItems, archiveItems);
  backfillById(state.archiveSupplementRequests, archiveSupplementRequests);
  upsertById(state.mallProducts, mallProducts);
  upsertById(state.mallPrices, mallPrices);
  upsertById(state.mallOrders, mallOrders);
  upsertById(state.mallShipments, mallShipments);
  upsertById(state.mallSettlementInvoices, mallSettlementInvoices);
  upsertById(state.mallQuestionnaires, mallQuestionnaires);
  upsertById(state.mallScenarioTemplates, mallScenarioTemplates);
  upsertById(state.mallFundAccounts, mallFundAccounts);
  backfillById(state.auditLogs, auditLogs);
  ensureSupplierSealSampleFiles(state);
}

function upsertById<T extends { id: string }>(target: T[], source: T[]) {
  for (const item of source) {
    const existing = target.find((entry) => entry.id === item.id);
    if (existing) Object.assign(existing, structuredClone(item));
    else target.push(structuredClone(item));
  }
}

function backfillById<T extends { id: string }>(target: T[], source: T[]) {
  for (const item of source) {
    const existing = target.find((entry) => entry.id === item.id);
    if (!existing) {
      target.push(structuredClone(item));
      continue;
    }
    const snapshot = structuredClone(item) as Record<string, unknown>;
    const record = existing as Record<string, unknown>;
    for (const [key, value] of Object.entries(snapshot)) {
      const current = record[key];
      if (current === undefined || current === null || (Array.isArray(current) && current.length === 0)) {
        record[key] = value;
      }
    }
  }
}

function upsertRolePermissions(target: Array<{ roleId: string; menus: string[]; actions: string[] }>, source: Array<{ roleId: string; menus: string[]; actions: string[] }>) {
  for (const item of source) {
    const existing = target.find((entry) => entry.roleId === item.roleId);
    if (existing) Object.assign(existing, structuredClone(item));
    else target.push(structuredClone(item));
  }
}

function ensureSupplierSealSampleFiles(state: SeedState) {
  const sampleFiles: Record<string, { fileId: string; fileName: string; contentType: string; uploadedAt: string }> = {
    "ss-sup-1-linen": {
      fileId: "file-seal-linen",
      fileName: "封样-高支纱床单.png",
      contentType: "image/png",
      uploadedAt: "2026-05-20T14:00:00.000Z"
    },
    "ss-sup-2-amenity": {
      fileId: "file-seal-amenity",
      fileName: "封样-环保牙具套装.png",
      contentType: "image/png",
      uploadedAt: "2026-05-21T11:00:00.000Z"
    },
    "ss-sup-3-food": {
      fileId: "file-seal-fruit",
      fileName: "封样-早餐鲜切水果.png",
      contentType: "image/png",
      uploadedAt: "2026-05-22T10:30:00.000Z"
    }
  };
  for (const supplier of state.suppliers) {
    for (const sample of supplier.sealSamples ?? []) {
      const file = sampleFiles[sample.id];
      if (!file) continue;
      sample.fileId = file.fileId;
      sample.fileName = file.fileName;
      sample.contentType = file.contentType;
      sample.uploadedAt = file.uploadedAt;
    }
  }
}
