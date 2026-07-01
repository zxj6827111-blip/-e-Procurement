# M6-C 最终安全、运维与交付 Go/No-Go 报告

日期：2026-06-28  
范围：M1-M6 既有成果、M6-A 生产运行门禁、M6-B 集成契约与备份恢复、M6-C 安全/运维/浏览器验收收口。  
执行边界：R8 Workflow 仍是主执行源；Process Layer 仍是展示、镜像、事件追踪和逐步流程化底座；BPMN 仍是受控影子试点，不作为生产执行引擎。

## 1. 最终结论

| 场景 | 结论 | 说明 |
|---|---|---|
| 本地演示 / 内部走查 | Go | API、页面、流程轨迹、权限边界、备份恢复和 readiness 可验证。 |
| 客户 UAT | Go | 可用于客户业务验收、二开评估、流程展示和接口契约评审。 |
| 客户二次开发基础 | Go | 现有 adapter 契约、Process 影子层、BPMN 试点和文档可作为二开边界。 |
| 受控小范围试运行 | Conditional Go | 需限定数据范围、保留回滚、明确 SQLite/本地文件/mock adapter/未真实联调边界。 |
| 正式生产上线 | Conditional No-Go | 真实 SSO、正式数据库、对象存储、杀毒、监控告警、OA/ERP/财务/发票/支付等真实系统尚未完成端到端联调和客户签字。 |

## 2. M6-C 已补齐项

| 类别 | 结果 | 证据 |
|---|---|---|
| 安全边界 | 供应商隔离、组织隔离、管理员业务隔离、审计只读、专家/财务边界回归通过 | `apps/api/tests/m6c-final-security-ops.test.ts` |
| 文件安全 | 类型白名单、大小限制、路径名清洗、下载审计、越权下载拒绝通过 | `apps/api/tests/m6c-final-security-ops.test.ts` |
| 流程脱敏 | Process timeline / task DTO 不暴露 `payloadJson`、`sourceJson`、`opinion`、`actorId`、`assigneeUserId` | `apps/api/tests/m6c-final-security-ops.test.ts` |
| BPMN 试点 | pilot health 权限、审计只读、业务角色拒绝、业务 ID 脱敏、R8/Process 执行路径保持 | `apps/api/tests/m6c-final-security-ops.test.ts` |
| 生产门禁 | mock auth 生产禁用；配置 endpoint 不等于真实联调；`productionReady=false` | `apps/api/tests/m6c-final-security-ops.test.ts` |
| 浏览器验收 | 九角色页面加载、入口权限、禁止页重定向、授权页无控制台/API 失败 | `output/m6c-browser-evidence/m6c-browser-role-smoke.json` |

## 3. 九角色浏览器验收

脚本：`npm.cmd run m6c:browser-smoke`  
证据：`output/m6c-browser-evidence/m6c-browser-role-smoke.json` 和 `output/m6c-browser-evidence/m6c-u*.png`

| 角色 | 用户 | 结果 |
|---|---|---|
| 集团采购管理 | `u1` | 通过 |
| 采购经办 | `u2` | 通过 |
| 酒店采购 | `u8` | 通过 |
| 供应商管理员 | `u11` | 通过 |
| 供应商报价人员 | `u12` | 通过 |
| 专家 | `u7` | 通过 |
| 财务审核 | `u13` | 通过 |
| 审计监督 | `u5` | 通过 |
| 系统管理员 | `u6` | 通过 |

说明：浏览器验收使用本地/UAT mock 登录状态覆盖角色页面行为；这不构成正式生产 SSO 验收证据。

## 4. 运维与生产门禁

| 项目 | 当前状态 | 生产要求 |
|---|---|---|
| `/health` readiness | 可输出 warning/failure/info/pass，并隐藏本机路径 | 接入客户监控和告警 |
| 备份恢复 | 本地 SQLite+文件恢复演练通过 | 生产同构数据库备份、对象存储恢复、RPO/RTO 演练 |
| 日志与审计 | 关键操作审计、集成作业日志、流程事件记录可用 | 接入客户日志平台、留存周期和告警规则 |
| 集成契约 | SSO/OA/ERP/WMS/财务/文件/发票/支付等契约边界可见 | 真实接口、凭据、验签、回调、错误码和端到端联调 |
| 文件中心 | 本地文件、路径清洗、权限和审计通过 | 对象存储、杀毒、预览/水印、生命周期策略 |
| 身份认证 | 生产禁用 mock auth 和本地密码边界已测试 | 真实 SSO、组织同步、离职禁用、会话安全 |

## 5. 风险和未覆盖点

1. 未接真实 SSO/OA/ERP/WMS/财务/合同/消息/支付/发票/CA，不得声明真实外部系统已上线。
2. SQLite 和本地文件只适合本地/UAT/受控试运行，不满足正式生产 HA、并发、审计和恢复要求。
3. Playwright 浏览器验收覆盖关键页面加载和入口权限，不替代客户 UAT 的长流程人工验收。
4. BPMN 仍是受控影子试点，健康和回滚可见，但不得作为生产执行引擎。
5. Process Layer 仍为镜像展示和事件追踪底座，不替换 R8 Workflow。

## 6. 建议

建议进入客户 UAT / 二开交付评审。  
建议受控小范围试运行前，由客户确认数据范围、回滚窗口、日志留存、备份负责人和未联调外部系统豁免。  
不建议直接正式生产上线；正式生产需完成真实集成、生产数据库、对象存储、监控告警、安全测试和联合签字后复评。
