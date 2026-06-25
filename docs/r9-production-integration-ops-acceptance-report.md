# R9 外部系统适配、对象存储、生产运维和安全基线验收报告

生成日期：2026-06-25

适用工程：`E:\Software Development\‌e-Procurement`

## 1. R9 现状盘点结论

R0-R8 已把酒店采购、供应商、商品、寻源、评审、定标、商城、履约、结算、审批、任务和消息推进到可客户 UAT 的业务闭环。R9 本次不继续扩业务功能，而是补齐生产接入条件的工程基线。

已有基础：

- `apps/api/src/runtime/config.ts` 已有 `APP_ENV`、mock auth、Cookie、CORS、上传限制、集成 endpoint 等集中配置。
- `/health` 已能返回运行模式、mock 状态、SQLite、本地文件目录、日志目录和集成配置数量。
- `integration_jobs` 已存在，集成 adapter 已有 OA、ERP、WMS、财务、合同、消息等 key。
- 文件中心已支持本地文件持久化、SQLite 元数据、SHA256、版本、替换、作废、下载审计和权限校验。
- R8 已完成审批、任务、消息主源化和前端入口。

R9 前缺口：

- SSO/OIDC/SAML 只有配置项，没有可验证 adapter 映射。
- 外部系统 adapter 只记录简单 job，缺业务类型、requestId、完整状态、手工重推和脱敏边界。
- 文件存储只有本地文件系统，没有对象存储模式和生产配置校验。
- `/health` 只能探活，不能清楚给出生产配置失败/警告。
- 备份恢复、数据校验和正式数据库迁移建议不够明确。

本次 R9 处理结论：补齐 adapter 契约、对象存储配置边界、生产配置校验、健康检查、最小备份巡检脚本、测试和文档；真实客户系统联调、真实 SSO 验签、真实对象存储写入、完整备份恢复演练仍保留到 R10。

## 2. 外部系统 Adapter 设计与实现范围

本次保留 `ctx.adapters` 兼容入口，内部升级为统一集成任务模型：

- Adapter key：`sso`、`oa`、`organizationUserSync`、`masterData`、`erp`、`wms`、`contractSystem`、`finance`、`fileService`、`messageNotification`、`auditExport`、`eSignature`、`ca`、`eInvoice`。
- 模式：`mock`、`test`、`http`。
- 状态：`pending`、`running`、`succeeded`、`failed`、`retrying`、`cancelled`。
- 字段：`job_id`、`adapter_key`、`operation`、`business_type`、`business_id`、`request_id`、`idempotency_key`、`attempt_count`、`next_retry_at`、`error_message`。
- 操作：创建任务、执行任务、失败记录、重试、手工重推、取消、查询。
- 安全：请求、响应和错误信息脱敏，避免记录 token、password、secret、私钥、SQL、路径等敏感内容。

已实现运维接口：

- `GET /api/integration-adapters`
- `GET /api/integration-jobs`
- `POST /api/integration-adapters/:adapterKey/call`
- `POST /api/integration-adapters/:adapterKey/jobs/:jobId/execute`
- `POST /api/integration-adapters/:adapterKey/jobs/:jobId/retry`
- `POST /api/integration-adapters/:adapterKey/jobs/:jobId/repush`，用于创建基于脱敏 payload 的手工补推任务，不等同于真实原报文重放。
- `POST /api/integration-adapters/:adapterKey/jobs/:jobId/cancel`

## 3. 真实接入、Mock/Test Adapter 与客户依赖

本阶段真实接入情况：

- 已真实落地：本地集成任务表、幂等、状态、重试、手工重推、脱敏、运维查询接口。
- 已落地 mock/test adapter：SSO 映射、OA/ERP/WMS/财务/合同/消息/文件服务/审计导出/电子签章/CA/电子发票 adapter key。
- 未伪造真实联调：没有客户 OA、ERP、WMS、财务、合同、SSO、企业 IM、对象存储账号和接口文档时，不声明真实联调完成。

R10/客户联调依赖：

- SSO/OIDC/SAML issuer、client、回调、用户/角色/组织 claim 说明。
- OA 审批推送与回写接口、幂等策略、失败码。
- ERP 组织/部门/酒店、供应商、商品、采购订单同步字段。
- WMS 发货、物流单、收货回写字段。
- 财务结算单、发票、付款申请、付款状态回写字段。
- 合同系统定标结果、合同台账、附件和签署状态字段。
- 邮件、短信、企业微信/钉钉通道账号与模板。
- MinIO/S3/内网对象存储 endpoint、bucket、凭据和网络策略。
- 杀毒扫描、电子签章、CA、电子发票平台接口资料。

## 4. 生产身份与 SSO 边界

已实现：

- `production` 下 mock 登录、mock 角色切换、`x-mock-user-id` 身份回退继续禁用。
- `ALLOW_LOCAL_PASSWORD_LOGIN=false` 时本地弱口令账号不能登录。
- 新增 `MockSsoAdapter` / `TestSsoAdapter` 边界，覆盖 token/session 校验入口、用户映射、角色映射、组织/酒店范围映射和失败处理。
- 生产 readiness 对 `IDENTITY_PROVIDER_MODE=adapter` 保持 warning，即使配置了 SSO endpoint，也只代表契约边界已存在，不代表真实 SSO 验签完成。
- `GET /api/auth/providers` 返回 SSO adapter contract，说明 required claims、optional claims、role mapping 和 failure codes。
- `POST /api/auth/sso/mock-callback` 仅 local/test 可用，production 明确拒绝。
- Cookie 继续支持 `HttpOnly`、`SameSite`、`Secure`、过期时间和退出登录清理。

未完成真实接入：

- 未接客户真实 SSO/OIDC/SAML provider。
- 未配置真实 client secret、证书、签名验证、公钥轮换。

## 5. 对象存储和文件安全方案

已实现：

- 新增 `FileStorageBackend` 抽象。
- 支持 `FILE_STORAGE_MODE=local|mock|object`。
- `local` 保持现有本地文件系统落盘。
- `mock` 使用本地落盘模拟对象存储边界，便于自动化测试。
- `object` 校验 `OBJECT_STORAGE_ENDPOINT` 和 `OBJECT_STORAGE_BUCKET`，作为 MinIO/S3/内网对象存储接入契约。
- 当前 object 模式仍为本地写盘透传的 contract stub，`finalStorage=false`；`/health` 会明确提示仍需 R10 接真实对象存储 adapter。
- `/health` 返回 file storage mode、ready、finalStorage 和说明。

文件安全保持并增强：

- 文件大小限制。
- MIME/type 白名单。
- 扩展名校验。
- 文件名路径穿越清洗。
- 下载权限校验。
- 下载审计。
- 替换/版本/作废。
- `ANTIVIRUS_SCAN_MODE` 预留 `disabled|mock|adapter`。

未完成真实接入：

- 未接真实 S3/MinIO SDK 上传、签名 URL、生命周期、跨 AZ 冗余。
- 未接真实杀毒扫描服务。

## 6. 正式数据库迁移建议和 SQLite 过渡说明

当前仍使用 SQLite，定位为本地/UAT/小范围内网试运行过渡方案，不应包装为正式企业级数据库。

生产数据库建议：

- 推荐优先 PostgreSQL，其次 MySQL。
- `runtime_state` 可作为迁移兼容层，但 R2-R8 的 `r2_*` 表、`stored_files`、`audit_logs`、`integration_jobs` 应作为正式迁移重点。
- 类型映射：SQLite `text/integer` 迁移到 PostgreSQL `text/varchar/timestamp with time zone/bigint/jsonb`；JSON 字符串字段建议转 `jsonb`。
- 索引：保留业务 ID、状态、组织、供应商、项目、时间字段索引；`integration_jobs.idempotency_key` 必须唯一。
- 外键：正式库应补充用户、组织、项目、供应商、文件、任务、审批实例之间的外键或受控软外键策略。
- 事务：审批动作、任务状态、消息生成、业务状态回写应纳入单事务。
- 迁移顺序：基础字典/组织/用户 -> 供应商/商品 -> 项目/采购/报价/评审 -> 订单/履约 -> 结算/发票 -> 审批/任务/消息 -> 文件元数据 -> 审计/集成任务。
- 回滚策略：迁移前冻结写入并备份 SQLite 与文件目录；正式库导入后做数量、关键对象、文件引用和权限抽查；失败时回退到原 `APP_DATA_DIR`。

本次新增 `scripts/r9-production-readiness-check.mjs`：

- 可复制当前 SQLite 作为备份。
- 可运行 `PRAGMA integrity_check`。
- 可提示 WAL/SHM 伴随文件存在时需要一致性备份。
- 可统计 `r2_*`、`stored_files`、`integration_jobs`、`audit_logs` 表数量。
- 可检查本地文件元数据是否存在孤儿引用。

## 7. 集成任务、日志、重试、幂等、手工重推实现

已实现：

- `integration_jobs` 扩展 `business_type`、`business_id`、`request_id`。
- 创建任务时生成或接受 `idempotency_key`。
- 相同幂等键重复提交返回原 job。
- `execute` 可执行 pending 任务。
- `retry` 可重试失败或待处理任务。
- `repush` 可基于脱敏后的原任务信息创建新的手工补推任务。
- `cancel` 可取消未完成任务。
- 已成功、已取消等终态作业不会被 `execute/retry/cancel` 改写，避免破坏运维审计状态。
- 错误和 payload 脱敏。
- 管理员、集团采购管理、审计可查；供应商等业务角色被拒绝。

说明：当前 `http` 模式仍是 endpoint 配置后的待执行边界，不代表真实 HTTP 已联通；真实出网、签名、超时、响应码映射和回调验签进入 R10。

## 8. 生产配置和安全基线

新增/增强配置：

- `DATABASE_DRIVER`
- `DATABASE_URL`
- `REQUIRED_INTEGRATION_PROVIDERS`
- `FILE_STORAGE_MODE`
- `OBJECT_STORAGE_ENDPOINT`
- `OBJECT_STORAGE_BUCKET`
- `OBJECT_STORAGE_REGION`
- `OBJECT_STORAGE_ACCESS_KEY_ID`
- `OBJECT_STORAGE_SECRET_ACCESS_KEY`
- `ANTIVIRUS_SCAN_MODE`
- `CSRF_STRATEGY`
- `BACKUP_DIR`
- `INTEGRATION_E_SIGNATURE_ENDPOINT`
- `INTEGRATION_CA_ENDPOINT`
- `INTEGRATION_E_INVOICE_ENDPOINT`

生产配置校验覆盖：

- `APP_ENV=production`
- 禁止 mock auth。
- 禁止本地弱口令登录。
- SSO/OIDC/SAML/adapter 身份边界。
- `SESSION_COOKIE_SECURE=true`。
- CORS 白名单必填。
- `SESSION_SECRET` 不能使用默认占位。
- SQLite 只给出过渡警告。
- 对象存储配置缺失给出失败或警告。
- 必填外部系统 provider 未配置给出失败或警告。

安全基线：

- `helmet` 安全响应头继续启用。
- CORS 生产显式白名单。
- Cookie `HttpOnly`、`SameSite`、`Secure`。
- 生产 500 错误不暴露内部异常。
- SSO adapter 和 object storage contract 在 production readiness 中保持 warning，防止被误判为真实依赖已联通。
- 上传大小、MIME、扩展名、路径穿越防护。
- 文件下载权限和审计。
- 供应商隔离、酒店隔离、审计只读、管理员不越权业务处理沿用并回归测试。

## 9. 健康检查、监控、备份恢复、运维文档

`GET /health` 已增强：

- 服务状态。
- `APP_ENV`。
- mock auth 状态。
- DB driver 与 ready。
- 文件存储 mode、ready、finalStorage。
- 日志目录 ready。
- 构建版本。
- Cookie Secure。
- CORS 是否配置。
- 集成 provider 数量和 key。
- CSRF 策略。
- 杀毒扫描模式。
- readiness checks、failureCount、warningCount、productionReady。

监控建议：

- 监控 `/health.readiness.failureCount` 和 `warningCount`。
- 监控 `integration_jobs` 中 `failed/retrying/pending` 积压。
- 监控文件上传失败、下载拒绝、审批/结算异常、登录失败。
- 日志目录由 `APP_DATA_DIR/logs` 或企业日志代理采集。

备份恢复：

- `npm.cmd run r9:readiness` 可生成 SQLite 备份和数据校验输出。
- 该脚本是最小备份巡检，不等于生产恢复演练完成。
- 正式库应由 DBA 配置全量、增量和 PITR。
- 文件存储应启用 bucket 版本、生命周期和跨盘/跨机备份。
- 恢复演练应覆盖登录、项目读取、任务读取、文件下载、集成作业读取。

运维文档：

- 更新 `docs/stage10-integration-operations-baseline.md`。
- 新增本报告作为 R9 验收和后续 R10 联调边界说明。

## 10. 修改文件清单

- `apps/api/src/runtime/config.ts`
- `apps/api/src/runtime/health.ts`
- `apps/api/src/runtime/file-store.ts`
- `apps/api/src/runtime/runtime-db.ts`
- `apps/api/src/app.ts`
- `apps/api/src/app-context.ts`
- `apps/api/src/routes/auth-routes.ts`
- `apps/api/src/routes/integration-routes.ts`
- `apps/api/src/adapters/types.ts`
- `apps/api/src/adapters/mock-adapters.ts`
- `apps/api/src/adapters/identity-adapter.ts`
- `apps/api/tests/r9-production-integration-ops.test.ts`
- `apps/api/tests/stage10-integration-operations.test.ts`
- `scripts/r9-production-readiness-check.mjs`
- `package.json`
- `.env.example`
- `docs/stage10-integration-operations-baseline.md`
- `docs/r9-production-integration-ops-acceptance-report.md`

## 11. 新增/修改测试清单

新增：

- `apps/api/tests/r9-production-integration-ops.test.ts`

覆盖：

- production 模式 readiness 失败/警告。
- production 禁用 mock 登录、mock 角色切换、`x-mock-user-id`。
- SSO mock/test 用户、角色、组织映射。
- 集成任务创建、幂等、执行、失败、重试、手工重推、脱敏。
- 文件存储 mock 模式、路径穿越文件名清洗、下载审计。
- R9 备份和数据校验脚本运行。

修改：

- `apps/api/tests/stage10-integration-operations.test.ts` 适配 R9 状态 `pending`。

保留回归：

- Stage 5 生产 readiness 测试。
- Stage 9 文件中心测试。
- Stage 10 集成运维测试。
- P0 权限隔离测试。
- R1-R8 全量 API 测试。

## 12. 验证命令结果

已执行并通过：

- `npm.cmd --workspace @eprocurement/api run typecheck`
- `npm.cmd --workspace @eprocurement/api run test -- r9-production-integration-ops.test.ts stage10-integration-operations.test.ts stage5-production-readiness.test.ts`
- `npm.cmd run typecheck`
- `npm.cmd run build`
- `npm.cmd run test:api`

结果：

- `typecheck`：API 与 Web 类型检查通过。
- 窄测试：3 个测试文件通过，13 个测试通过。
- `test:api`：30 个测试文件通过，184 个测试通过。
- `build`：API TypeScript 构建通过，Web `vue-tsc` 与 Vite 生产构建通过。

## 13. 新增脚本验证结果

新增脚本：

- `scripts/r9-production-readiness-check.mjs`

测试中已验证：

- 能读取当前 `APP_DATA_DIR/runtime.sqlite`。
- 能生成 SQLite 备份文件。
- 能运行 SQLite `integrity_check`。
- 能输出 `integration_jobs`、`stored_files` 等表数量。

最终命令：

- `npm.cmd run r9:readiness`

结果：

- SQLite 备份成功生成：`output/r9-backups/runtime-2026-06-25T10-37-22-086Z.sqlite`。
- `sqliteIntegrity=ok`。
- `integration_jobs=0`，当前本地根数据目录没有积压集成任务。
- `stored_files=6`，`orphanStoredFiles=0`。
- 脚本提示 WAL/SHM 伴随文件存在，生产备份应复制一致性文件或使用数据库备份 API；这是预期的生产备份风险提示。

## 14. 对 R0-R8 的兼容性影响

预期兼容：

- 业务路由未重写。
- 旧 `ctx.adapters.xxx.call()` 继续可用。
- 文件中心 API 响应保持兼容。
- 本地/test mock 登录仍可用于自动化测试。
- production mock 禁用行为继续保留。

已用窄测试验证：

- Stage 5 production readiness 通过。
- Stage 10 integration operations 通过。
- R9 新测试通过。

全量回归确认：

- R1-R8 既有 API 测试已包含在 `npm.cmd run test:api` 中，30 个测试文件、184 个测试通过。
- Web 类型检查和构建已通过。

## 15. 当前判断

- 是否仍可客户 UAT：可以。R9 增强不破坏 R0-R8 业务闭环，并补齐更清晰的生产接入边界。
- 是否更适合小范围内网试运行：是。系统更适合进入受控内网试运行或生产联调准备环境。
- 是否可进入生产联调：可以进入生产联调准备和测试环境联调，但前提是客户提供 SSO/OA/ERP/WMS/财务/合同/对象存储测试环境和接口资料。
- 是否仍不可正式投产：仍不可正式投产。原因是未完成真实 SSO、正式数据库迁移演练、真实对象存储、真实外部系统联调、监控告警、安全测试和恢复演练。

## 16. 下一阶段建议

建议 R10 进入“最终 UAT、真实联调、生产演练、投产包和 Go/No-Go”阶段，而不是继续扩业务功能。

R10 最小工作：

- 用客户测试环境完成 SSO/OA/ERP/WMS/财务/合同/消息通道联调。
- 接 MinIO/S3/内网对象存储和杀毒扫描。
- 完成 PostgreSQL/MySQL 迁移演练、回滚演练和数据核对。
- 建立监控告警、日志归档、备份恢复和灰度/回滚预案。
- 执行全角色 UAT、生产安全测试和投产 Go/No-Go 评审。

如果客户接口资料暂未到位，应先关闭 R9 遗留配置项：明确必填 provider、对象存储账号、SSO claim 映射和正式库选型，再进入 R10。
