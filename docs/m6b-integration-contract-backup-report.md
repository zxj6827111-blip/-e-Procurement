# M6-B 外部集成 Contract Boundary 与备份恢复验收报告

日期：2026-06-28  
范围：仅执行 M6-B，不进入 M6-C。R8 Workflow 仍是主执行源；Process Layer 与 BPMN 仍保持影子/受控试点边界。

## 1. 本阶段结论

M6-B 建立了可由代码和测试验证的外部系统 contract boundary，并把本地/UAT 备份恢复演练收口到可运行脚本和证据文件。

本阶段不声明真实外部系统联调完成。即使配置了 endpoint，也只代表 contract endpoint 已存在；正式生产 Go 仍需要客户提供真实 SSO、OA、ERP、WMS、财务、发票、支付、对象存储、正式数据库和恢复演练证据。

## 2. 集成 Contract Boundary

新增机器可读契约定义：`apps/api/src/adapters/integration-contracts.ts`。

覆盖 adapter：

| Adapter | 范围 | M6-B 状态 |
| --- | --- | --- |
| `sso` | 统一身份、用户/角色/组织/供应商主体映射 | contract boundary |
| `oa` | 审批推送、审批回调、流程状态同步 | contract boundary |
| `erp` | 采购订单、供应商、商品、结算状态同步 | contract boundary |
| `wms` | 发货、物流、收货回调 | contract boundary |
| `contractSystem` | 定标结果、合同台账、合同附件 | contract boundary |
| `finance` | 结算、发票、付款申请、付款状态回调 | contract boundary |
| `fileService` | 文件扫描、归档、生命周期 | contract boundary |
| `messageNotification` | 邮件、短信、企业 IM | contract boundary |
| `auditExport` | 审计导出、外部归档 | contract boundary |
| `eSignature` | 电子签章请求和状态回调 | contract boundary |
| `ca` | CA 校验、可信时间戳 | contract boundary |
| `eInvoice` | 电子发票开具、验真、状态回调 | contract boundary |

每个 contract 均包含：

- 请求字段。
- 响应字段。
- 幂等键规则。
- 错误码。
- 重试策略。
- 回调签名或认证边界。
- production evidence required。
- no-go when missing。

## 3. API 和 Readiness

新增只读接口：

- `GET /api/integration-contracts`

权限边界：

- 允许：系统管理员、集团采购管理、审计监督。
- 拒绝：供应商等普通业务角色。
- 该接口只展示契约和 endpoint 状态，不展示真实凭据。

`/health` 增强：

- `operations.integrationContractSummary.total`
- `operations.integrationContractSummary.endpointConfigured`
- `operations.integrationContractSummary.verifiedIntegration`
- `operations.integrationContractSummary.liveStatusCounts`
- `operations.integrationContractSummary.productionBoundary`

生产模式下，`REQUIRED_INTEGRATION_PROVIDERS` 已配置 endpoint 也会保留 warning：

```text
configured endpoint != verified customer integration
```

## 4. 文件存储边界

当前文件能力：

- 本地文件写入。
- mock object storage 边界。
- object storage contract mode。
- 上传大小限制。
- MIME/type 白名单。
- 文件名路径穿越清洗。
- SHA256。
- 文件版本/替换/作废。
- 下载权限校验和审计。

M6-B 结论：

- `FILE_STORAGE_MODE=local`：UAT/本地可用，正式生产 No-Go。
- `FILE_STORAGE_MODE=object`：只有 endpoint/bucket 配置时仍是 contract boundary，`finalStorage=false`。
- 真实对象存储、签名 URL、生命周期、跨机恢复、防病毒扫描仍需客户基础设施和真实联调证据。

## 5. 数据库与备份恢复

新增脚本别名：

```text
npm run m6b:backup-restore
```

该命令复用并增强 `scripts/r10-backup-restore-drill.mjs`，输出：

- SQLite 复制。
- WAL/SHM 伴随文件复制。
- `PRAGMA integrity_check`。
- 关键表计数源/恢复对比。
- `stored_files` 元数据与恢复文件一致性检查。
- `integration_jobs` 恢复计数。
- M6-B productionBoundary。
- UAT/正式生产 Go-NoGo 字段。
- 证据文件：`output/r10-backup-restore/r10-backup-restore-drill-latest.json`。

边界说明：

- 该脚本是本地/UAT 恢复演练，不是正式生产灾备证明。
- 正式生产仍需 PostgreSQL/MySQL 或客户批准数据库的原生一致性备份、恢复演练、RPO/RTO 签字。
- 对象存储恢复仍需真实 bucket、生命周期、权限和恢复抽查。
- 外部系统恢复仍需客户系统侧 reconciliation 证据。

## 6. M6-B Go / No-Go

| 场景 | 结论 | 依据 |
| --- | --- | --- |
| 演示 / UAT | Conditional Go | contract boundary、readiness、备份恢复演练可运行。 |
| 客户二开底座 | Conditional Go | adapter contract 可作为真实联调开发边界。 |
| 受控试运行 | Conditional Go | 需客户接受 SQLite/本地文件过渡，并确认外部系统仍是 contract boundary。 |
| 正式生产上线 | No-Go | 缺真实 SSO、正式数据库、对象存储、防病毒、OA/ERP/WMS/财务/发票/支付真实联调和生产恢复演练证据。 |

## 7. M6-B 验收映射

| 要求 | 结果 |
| --- | --- |
| 所有外部集成边界清晰 | 已通过 contract manifest 和 `/api/integration-contracts` 固化。 |
| 没有把 mock adapter 当成真实集成 | 已通过 `verifiedIntegration=false`、health warning 和测试约束。 |
| 备份/恢复/一致性检查有脚本或证据 | 已通过 `npm run m6b:backup-restore` 和 evidence JSON。 |
| readiness 脚本可运行 | 保留 `npm run r9:readiness`，新增 M6-B backup/restore 命令。 |
| API 测试通过 | 待本阶段验证命令确认。 |
| typecheck 通过 | 待本阶段验证命令确认。 |
| build 通过 | 待本阶段验证命令确认。 |

## 8. 后续进入 M6-C 前的提醒

M6-C 才处理安全、运维、最终交付验收、角色浏览器回归和最终 Go/No-Go。M6-B 完成后应暂停，等待明确“继续 M6-C”。
