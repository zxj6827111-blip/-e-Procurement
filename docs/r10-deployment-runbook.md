# R10 部署运行手册

版本：R10.0  
日期：2026-06-25  
适用范围：UAT、小范围内部试运行、预生产部署准备。正式生产部署必须在客户完成集成输入和生产架构确认后执行。

## 1. 前置条件

| 项目 | UAT | 正式生产 |
|---|---|---|
| Node.js | 20+ | 20+ 或客户标准运行时 |
| 数据库 | 可使用 SQLite 过渡 | 必须使用客户批准的正式数据库 |
| 文件存储 | 可使用本地文件目录 | 必须使用对象存储或批准的共享文件服务 |
| 身份认证 | 可使用本地账号 | 必须接入真实 SSO |
| HTTPS | 本地可 HTTP | 必须 HTTPS 和 Secure Cookie |

## 2. 构建命令

```powershell
npm.cmd run typecheck
npm.cmd run test:api
npm.cmd run build
npm.cmd run r9:readiness
node scripts/r10-backup-restore-drill.mjs
```

通过标准：

| 命令 | 通过标准 |
|---|---|
| `typecheck` | API 和 Web 类型检查均无错误 |
| `test:api` | 全量 API 测试通过 |
| `build` | API 和 Web 均可构建 |
| `r9:readiness` | SQLite integrity `ok`，警告已记录 |
| `r10-backup-restore-drill` | 恢复库完整性 `ok`，文件计数匹配 |

## 3. UAT 启动示例

API：

```powershell
$env:PORT = "3100"
$env:HOST = "127.0.0.1"
$env:APP_ENV = "test"
$env:APP_DATA_DIR = "output/r10-browser-data"
npm.cmd --workspace @eprocurement/api run dev
```

Web：

```powershell
$env:VITE_API_BASE_URL = "http://127.0.0.1:3100"
npm.cmd --workspace @eprocurement/web run dev -- --host 127.0.0.1 --port 5179
```

健康检查：

```powershell
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:3100/health
```

## 4. 关键环境变量

| 变量 | UAT 示例 | 生产要求 |
|---|---|---|
| `APP_ENV` | `test` 或 `uat` | `production` |
| `PORT` | `3100` | 客户运行端口 |
| `HOST` | `127.0.0.1` | 内网监听地址或容器监听地址 |
| `APP_DATA_DIR` | `output/r10-browser-data` | 不建议生产使用本地目录作为唯一数据根 |
| `SESSION_SECRET` | UAT 可使用强随机值 | 必须为强随机密钥，禁止默认值 |
| `CORS_ORIGINS` | UAT 前端地址 | 必须白名单化 |
| `COOKIE_SECURE` | 本地可 false | 生产必须 true |
| `MOCK_AUTH_ENABLED` | UAT 可 true | 生产必须 false |
| `LOCAL_PASSWORD_LOGIN_ENABLED` | UAT 可 true | 生产建议 false，改用 SSO |

## 5. 部署步骤

1. 确认代码版本和交付包。
2. 运行完整构建与测试命令。
3. 准备数据库和文件存储。
4. 设置环境变量。
5. 启动 API 服务。
6. 启动 Web 静态服务或部署前端产物。
7. 访问 `/health`，确认 readiness。
8. 使用采购、供应商、专家、审计、系统管理员角色各登录一次。
9. 跑关键业务冒烟：供应商、采购申请、报价、专家、商城下单、发货、收货、结算、发票、审计。
10. 保存 health、浏览器文本证据、测试结果和备份恢复结果。

## 6. 回滚策略

UAT 回滚：

1. 停止 API 和 Web 服务。
2. 恢复部署前备份的 SQLite 文件和文件目录。
3. 如果存在 WAL/SHM，按同一备份批次恢复。
4. 重启服务并访问 `/health`。
5. 抽查文件下载和关键页面。

正式生产回滚必须由客户数据库和对象存储方案定义，不应直接套用 SQLite 文件复制方式。

## 7. 发布检查清单

| 检查项 | UAT 必须 | 生产必须 |
|---|---|---|
| 构建和测试通过 | 是 | 是 |
| health 可访问 | 是 | 是 |
| Mock 登录关闭 | 建议 | 必须 |
| 真实 SSO | 否 | 必须 |
| 正式数据库 | 否 | 必须 |
| 对象存储 | 否 | 必须 |
| 防病毒扫描 | 否 | 必须或书面豁免 |
| HTTPS/Secure Cookie | 建议 | 必须 |
| 备份恢复演练 | 是 | 必须，同构环境 |
| 客户签字 | UAT 签字 | 业务/安全/运维/审计联合签字 |

## 8. M6-C 最终交付检查

日期：2026-06-28

M6-C 后交付包进入客户 UAT 或二开评审前，除第 2 节命令外，还应执行：

```powershell
npm.cmd --workspace @eprocurement/api run test -- m6c-final-security-ops.test.ts
npm.cmd run m6c:browser-smoke
```

新增检查标准：

| 检查项 | 通过标准 |
|---|---|
| M6-C 安全/运维测试 | 供应商隔离、组织隔离、文件安全、流程脱敏、BPMN pilot 权限、生产 mock auth 禁用通过 |
| 九角色浏览器验收 | 集团采购管理、采购经办、酒店采购、供应商管理员、供应商报价人员、专家、财务审核、审计监督、系统管理员均通过 |
| 生产 Go/No-Go | `docs/m6c-final-security-ops-go-no-go-report.md` 结论已纳入客户评审 |

注意：`m6c:browser-smoke` 为本地/UAT浏览器验收脚本，会启动临时 API/Web 服务并使用本地 mock 登录状态；正式生产部署不得启用 mock auth 或把该验证视为真实 SSO 证明。
