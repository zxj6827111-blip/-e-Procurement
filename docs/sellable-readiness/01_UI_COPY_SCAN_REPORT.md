# Sprint 1 UI Copy Scan

- Generated at: 2026-07-04T18:49:10.445Z
- Scope: apps/web/src visible Vue copy and apps/api/src user-facing string literals.
- Result: PASS
- Blockers: 0
- Warnings: 7
- Informational findings: 41

| Severity | Term | Location | Text |
| --- | --- | --- | --- |
| INFO | Mock customer message | apps/api/src/adapters/identity-adapter.ts:69 | Mock SSO adapter cannot authenticate production users. |
| INFO | Mock customer message | apps/api/src/adapters/integration-contracts.ts:83 | Local mock/test SSO is disabled in production; real provider signature and claim mapping evidence is required. |
| INFO | R8/Process/BPMN display | apps/api/src/adapters/integration-contracts.ts:204 | Signed contract status callbacks remain external evidence and do not replace local R8 approval history. |
| INFO | R8/Process/BPMN display | apps/api/src/repositories/bpmn-definition-repository.ts:310 | BPMN definition repository is unavailable: ${this.initializationError ?? "initialization failed"} |
| INFO | R8/Process/BPMN display | apps/api/src/repositories/bpmn-pilot-repository.ts:498 | BPMN pilot repository is unavailable: ${this.initializationError ?? "initialization failed"} |
| INFO | R8/Process/BPMN display | apps/api/src/repositories/process-repository.ts:520 | Process Layer is unavailable: ${this.initializationError ?? "initialization failed"} |
| INFO | R8/Process/BPMN display | apps/api/src/repositories/process-repository.ts:712 | 采购文件审核影子流程 |
| INFO | R8/Process/BPMN display | apps/api/src/repositories/process-repository.ts:734 | 定标审批影子流程 |
| INFO | 本地模拟 | apps/api/src/repositories/r7-settlement-finance-repository.ts:975 | 已审核通过发票金额不足，不能全额模拟付款。 |
| INFO | 本地模拟 | apps/api/src/repositories/r7-settlement-finance-repository.ts:977 | 模拟付款金额不能超过结算可付金额。 |
| INFO | 本地模拟 | apps/api/src/repositories/r7-settlement-finance-repository.ts:994 | R7 模拟付款台账，仅作本系统台账留痕，不代表真实资金清算。 |
| INFO | 本地模拟 | apps/api/src/routes/bid-routes.ts:926 | 本地以截止时间、锁标、权限和审计模拟加解密/CA 等价边界；未接入真实 CA、电子签章或加密机。 |
| INFO | R8/Process/BPMN display | apps/api/src/routes/bpmn-definition-routes.ts:217 | BPMN_DEFINITION_MAINTAIN_DENIED |
| INFO | R8/Process/BPMN display | apps/api/src/routes/bpmn-definition-routes.ts:217 | Only system configuration roles can maintain BPMN definitions. |
| INFO | 本地模拟 | apps/api/src/routes/mall-routes.ts:21 | 本地模拟资金账户台账：完成余额、充值、授信、支付占用、退款/冲正留痕；未连接真实支付、银行、授信或财务系统。 |
| INFO | 本地模拟 | apps/api/src/routes/mall-routes.ts:22 | 本地模拟发票验真 adapter：完成发票号、金额、税额规则、驳回重传和电子发票文件边界；未连接真实税控/电子发票平台。 |
| INFO | 本地模拟 | apps/api/src/routes/mall-routes.ts:431 | 商城订单提交后占用本地模拟额度，真实支付待客户支付/财务系统资料。 |
| INFO | 本地模拟 | apps/api/src/routes/mall-routes.ts:881 | 本地模拟充值台账，真实充值待客户支付接口资料。 |
| INFO | 本地模拟 | apps/api/src/routes/mall-routes.ts:905 | 本地模拟退款/冲正台账，真实资金退回待客户支付/财务系统资料。 |
| INFO | 本地模拟 | apps/api/src/routes/mall-routes.ts:920 | 本地模拟支付扣款台账，真实支付待客户支付/财务系统资料。 |
| INFO | 本地模拟 | apps/api/src/routes/mall-routes.ts:1131 | 退货审核通过后写入本地模拟退款/冲正台账；真实支付退款待客户支付/财务接口资料。 |
| INFO | 本地模拟 | apps/api/src/routes/supplier-routes.ts:35 | 本地模拟验证码和实名校验：验证码固定接受 123456，实名校验仅校验统一社会信用代码/法人/企业名称格式；未连接真实短信、工商实名或统一身份平台。 |
| INFO | Mock customer message | apps/api/src/routes/supplier-routes.ts:812 | local mock captcha and real-name boundary passed |
| INFO | R8/Process/BPMN display | apps/api/src/runtime/config.ts:230 | R8 Workflow remains the primary execution source. |
| INFO | R8/Process/BPMN display | apps/api/src/runtime/config.ts:232 | R8 Workflow must remain the primary execution source until a separate production cutover is explicitly approved. |
| INFO | Mock customer message | apps/api/src/runtime/config.ts:250 | Mock authentication must be disabled in production. |
| INFO | Mock customer message | apps/api/src/runtime/config.ts:252 | Mock authentication is disabled for production or only enabled outside production. |
| INFO | DEMO | apps/api/src/runtime/config.ts:262 | APP_SEED_ON_BOOT must be disabled in production so demo data and test accounts are not treated as a normal production baseline. |
| INFO | DEMO | apps/api/src/runtime/config.ts:264 | Demo seed data is disabled for production or only enabled outside production. |
| INFO | R8/Process/BPMN display | apps/api/src/runtime/health.ts:127 | R8 Workflow remains the primary execution source; Process Layer and BPMN are not production execution engines in M6-A. |
| INFO | 本地模拟 | apps/api/src/seed/data.ts:129 | 审核结算、发票和模拟付款台账。 |
| INFO | 本地模拟 | apps/api/src/seed/data.ts:3364 | 商城订单提交后占用本地模拟额度。 |
| INFO | 本地模拟 | apps/api/src/seed/data.ts:3367 | 本地模拟资金账户台账：完成余额、充值、授信、支付占用、退款/冲正留痕；未连接真实支付、银行、授信或财务系统。 |
| INFO | 本地模拟 | apps/api/src/seed/data.ts:3391 | 本地模拟资金账户台账：完成余额、充值、授信、支付占用、退款/冲正留痕；未连接真实支付、银行、授信或财务系统。 |
| INFO | R8/Process/BPMN display | apps/api/src/services/bpmn-pilot-service.ts:261 | BPMN_PILOT_VALIDATION_FAILED |
| INFO | R8/Process/BPMN display | apps/api/src/services/bpmn-pilot-service.ts:297 | BPMN_PILOT_SIMULATION_FAILED |
| WARN | 治理 | apps/web/src/pages/approval-rules/ApprovalRulesPageShell.vue:18 | 系统治理 |
| WARN | 治理 | apps/web/src/pages/file-center/FileCenterPageShell.vue:12 | 附件治理 |
| WARN | 治理 | apps/web/src/pages/permissions/BpmnDefinitionsTable.vue:13 | 规则版本以版本号、校验状态和签名摘要作为治理字段。 |
| WARN | 治理 | apps/web/src/pages/permissions/BpmnPilotGovernanceLogsTable.vue:13 | 展示最近的规则变更、执行角色和治理说明。 |
| WARN | 治理 | apps/web/src/pages/permissions/BpmnPilotGovernanceLogsTable.vue:14 | 暂无治理日志 |
| WARN | 治理 | apps/web/src/pages/permissions/PermissionsPageShell.vue:20 | 集中查看菜单权限、动作授权、审批规则、规则版本治理与组织账号。 |
| INFO | 治理 | apps/web/src/pages/permissions/display.ts:16 | 规则版本治理 |
| INFO | 治理 | apps/web/src/pages/permissions/display.ts:93 | 版本治理 |
| WARN | 治理 | apps/web/src/pages/supplier-management/SupplierActionPanel.vue:66 | 这里保存的基础信息、资质附件会同步到集团供应商治理页，用于资质初审和准入评审。 |
| INFO | Mock customer message | apps/web/src/router/page-classification.ts:30 | Mock role switch is a controlled system form. |
| INFO | R8/Process/BPMN display | apps/web/src/utils/status-labels.ts:72 | 影子试点 |
| INFO | 本地模拟 | apps/web/src/utils/status-labels.ts:73 | 模拟异常 |

## Notes

- Code identifiers, local storage keys, route names, and mock-only test hooks are treated as INFO unless they are rendered to the user or returned as customer-facing API messages.
- Local/test mock capabilities remain available; production isolation is enforced by the backend production gate.
