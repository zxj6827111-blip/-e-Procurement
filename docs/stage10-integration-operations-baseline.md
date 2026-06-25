# 阶段 10 外部集成与运维基线

## 目标

阶段 10 不假定已经拿到 OA、ERP、WMS、财务、合同、SSO 的真实接口资料。当前实现提供可替换的 adapter 契约边界、持久化集成作业、幂等键、重试记录、运维查看接口和部署检查清单。真实接口资料到位后，需要补真实 HTTP/SSO/对象存储 adapter、认证签名、字段映射和回调验签；业务主流程不需要重写。

## 集成适配器

| Adapter key | 用途 | 生产 endpoint 变量 |
|---|---|---|
| `sso` | 统一身份/SSO 边界 | `IDENTITY_PROVIDER_*` / `INTEGRATION_SSO_ENDPOINT` |
| `oa` | 定标、补档等审批推送 | `INTEGRATION_OA_ENDPOINT` |
| `organizationUserSync` | 组织、部门、人员同步 | `INTEGRATION_ORG_USER_ENDPOINT` |
| `masterData` | 品类、供应商、门店等主数据 | `INTEGRATION_MASTER_DATA_ENDPOINT` |
| `erp` | 采购结果、订单、履约回传 | `INTEGRATION_ERP_ENDPOINT` |
| `wms` | 发货、物流、收货节点 | `INTEGRATION_WMS_ENDPOINT` |
| `contractSystem` | 合同台账与合同系统边界 | `INTEGRATION_CONTRACT_ENDPOINT` |
| `finance` | 结算、发票、台账、授信边界 | `INTEGRATION_FINANCE_ENDPOINT` |
| `fileService` | 外部文件服务预留 | `INTEGRATION_FILE_SERVICE_ENDPOINT` |
| `messageNotification` | 短信、邮件、站内信 | `INTEGRATION_MESSAGE_ENDPOINT` |
| `auditExport` | 审计导出或监管报送 | `INTEGRATION_AUDIT_EXPORT_ENDPOINT` |

也可以用 `INTEGRATION_ENDPOINTS` 一次性配置，例如：

```text
INTEGRATION_ENDPOINTS=oa=https://oa.example.local/api,erp=https://erp.example.local/api
```

## 作业状态

所有 adapter 调用都会进入 `integration_jobs`：

| 字段 | 含义 |
|---|---|
| `job_id` | 集成作业号 |
| `adapter_key` | 适配器标识 |
| `operation` | 业务操作名 |
| `mode` | `mock`、`test` 或 `http` |
| `business_type` | 业务类型，例如 `approval.push`、`purchase_order.sync` |
| `business_id` | 业务对象 ID |
| `request_id` | 外部调用请求号或本地生成请求号 |
| `status` | `pending`、`running`、`succeeded`、`failed`、`retrying`、`cancelled` |
| `idempotency_key` | 幂等键 |
| `attempt_count` | 尝试次数 |
| `next_retry_at` | 下次重试时间 |
| `error_message` | 失败原因 |

请求、响应和错误信息会做脱敏处理，不应记录 token、password、secret、私钥、SQL 或本机路径。

## 运维接口

| 接口 | 用途 | 权限 |
|---|---|---|
| `GET /health` | 健康检查、构建版本、文件目录、日志目录、集成配置数量 | 公开 |
| `GET /api/integration-adapters` | 查看 adapter 模式和日志 | 管理员、集团采购管理、审计 |
| `GET /api/integration-jobs` | 查看集成作业队列 | 管理员、集团采购管理、审计 |
| `POST /api/integration-adapters/:key/call` | 手动触发一次适配器调用 | 管理员、集团采购管理、审计 |
| `POST /api/integration-adapters/:key/jobs/:jobId/execute` | 执行 pending 作业 | 管理员、集团采购管理、审计 |
| `POST /api/integration-adapters/:key/jobs/:jobId/retry` | 重试失败/待处理作业 | 管理员、集团采购管理、审计 |
| `POST /api/integration-adapters/:key/jobs/:jobId/repush` | 基于脱敏后的原作业信息创建手工补推任务，不等同于真实原报文重放 | 管理员、集团采购管理、审计 |
| `POST /api/integration-adapters/:key/jobs/:jobId/cancel` | 取消未完成作业 | 管理员、集团采购管理、审计 |

## 生产环境变量

生产试运行至少应设置：

```text
APP_ENV=production
DISABLE_MOCK_AUTH=true
ALLOW_LOCAL_PASSWORD_LOGIN=false
SESSION_SECRET=<strong-secret>
SESSION_COOKIE_SECURE=true
SESSION_COOKIE_SAMESITE=lax
CORS_ALLOWED_ORIGINS=https://procurement.example.local
APP_DATA_DIR=D:\eprocurement-data
FILE_UPLOAD_MAX_BYTES=26214400
BUILD_VERSION=<release-id>
INTEGRATION_MAX_ATTEMPTS=3
REQUIRED_INTEGRATION_PROVIDERS=oa,erp,wms,finance,contractSystem,messageNotification
FILE_STORAGE_MODE=object
OBJECT_STORAGE_ENDPOINT=https://minio.example.local
OBJECT_STORAGE_BUCKET=eprocurement
ANTIVIRUS_SCAN_MODE=adapter
CSRF_STRATEGY=same-site-cookie
```

## 反向代理与 HTTPS

- 由 Nginx、IIS ARR 或网关终止 HTTPS。
- API 只暴露给内网域名和前端站点。
- `/health` 可用于负载均衡健康检查。
- 生产必须显式配置 `CORS_ALLOWED_ORIGINS`。
- 生产必须启用 `SESSION_COOKIE_SECURE=true`。

## 备份与恢复

试运行环境至少每日备份：

- `runtime.sqlite`
- `runtime.sqlite-wal`
- `runtime.sqlite-shm`
- `files/`
- `logs/`
- 当前 `.env` 或等价配置快照

恢复步骤：

1. 停止 API 服务。
2. 复制数据库与文件目录到新的 `APP_DATA_DIR`。
3. 启动 API。
4. 检查 `GET /health`。
5. 检查 `GET /api/integration-jobs` 是否能读取历史作业。
6. 抽查文件下载、采购申请列表、审计日志。

## 故障处理

| 场景 | 处理 |
|---|---|
| adapter endpoint 未配置 | 作业保留在本地 `mock/test` 模式或 `pending` 状态，先补 endpoint，再手工补推 |
| 外部系统不可达 | 保留作业和幂等键，不重复生成业务记录；恢复后用 retry 接口重推 |
| CORS 被拦截 | 检查 `CORS_ALLOWED_ORIGINS` 是否包含前端正式域名 |
| Cookie 丢失 | 检查 HTTPS、`SESSION_COOKIE_SECURE`、反代头和同站策略 |
| 文件下载失败 | 检查 `files/` 目录权限、文件是否作废、当前角色是否有业务范围 |
| 数据库不可写 | 检查 `APP_DATA_DIR`、磁盘空间、服务账号权限 |

## Go / No-Go

| 项目 | 试运行 | 正式投产 |
|---|---|---|
| 内部采购主链 | 可进入试运行 | 需业务 UAT 签字 |
| SSO | 可用 adapter 契约边界 | 必须接真实身份源并验签 |
| OA/ERP/WMS/财务/合同 | 可用本地队列和 HTTP endpoint 配置 | 必须完成字段映射、联调和回归 |
| 文件中心 | 本地/模拟存储可试运行 | 正式投产必须接真实对象存储和杀毒/生命周期策略 |
| SQLite | 可用于小规模 UAT | 正式生产建议迁移 PostgreSQL/MySQL |
| 高可用 | 单机试运行 | 正式生产需 HA、监控、告警、备份演练 |
