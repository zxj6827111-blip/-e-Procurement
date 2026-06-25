# 阶段 5 部署与运行基线

## 1. 适用范围

本文档用于本地或内网试运行部署，不代表正式企业级生产部署方案。

当前版本保留 `Vue + Express + TypeScript + SQLite` 工程骨架，SQLite 仅作为本地、试运行和小规模 UAT 的过渡持久化方案，不应包装成正式企业级数据库能力。

## 2. 运行模式

| 模式 | 用途 | Mock 登录 | `x-mock-user-id` | Seed 默认 | 说明 |
|---|---|---|---|---|---|
| `local` | 本地开发、自测 | 默认允许 | 仅开发态可用 | 默认开启 | 允许本地调试，但不应用作客户 UAT 结论依据 |
| `test` | 自动化测试 | 可按测试显式开启 | 可按测试显式开启 | 默认开启 | 用于 API 测试和构建验证 |
| `production` | 内网试运行 / UAT | 默认禁用 | 禁用 | 可按环境控制 | 用于客户 UAT 或试运行演示 |

生产模式必须满足：

- `APP_ENV=production`
- `DISABLE_MOCK_AUTH=true`
- 设置独立 `APP_DATA_DIR`
- 设置明确的 `SESSION_SECRET`
- 设置 `CORS_ALLOWED_ORIGINS`

## 3. 关键环境变量

参考根目录 [.env.example](E:\Software Development\‌e-Procurement\.env.example)。

重点变量如下：

| 变量 | 作用 | 建议 |
|---|---|---|
| `APP_ENV` | 运行模式 | `production` 用于 UAT |
| `PORT` / `HOST` | API 监听地址 | 内网部署建议固定端口 |
| `VITE_API_BASE_URL` | Web 访问 API 地址 | 与反向代理或 API 地址保持一致 |
| `APP_DATA_DIR` | 数据根目录 | 指向独立持久化目录 |
| `SESSION_SECRET` | 会话密钥 | UAT 环境使用独立随机值 |
| `SESSION_COOKIE_SECURE` | Cookie Secure | HTTPS 下设为 `true` |
| `SESSION_COOKIE_SAMESITE` | Cookie SameSite | 建议 `lax` |
| `CORS_ALLOWED_ORIGINS` | CORS 白名单 | 显式列出 Web 地址 |
| `FILE_UPLOAD_MAX_BYTES` | 上传大小限制 | 默认 25 MB，可按 UAT 调整 |

## 4. 启动方式

### 4.1 API 开发启动

```powershell
$env:APP_ENV="production"
$env:DISABLE_MOCK_AUTH="true"
$env:APP_DATA_DIR="output\\uat-data"
$env:SESSION_SECRET="replace-with-random-secret"
$env:CORS_ALLOWED_ORIGINS="http://127.0.0.1:5174"
npm.cmd --workspace @eprocurement/api run dev
```

### 4.2 API 构建后启动

```powershell
npm.cmd --workspace @eprocurement/api run build
$env:APP_ENV="production"
$env:DISABLE_MOCK_AUTH="true"
$env:APP_DATA_DIR="output\\uat-data"
$env:SESSION_SECRET="replace-with-random-secret"
$env:CORS_ALLOWED_ORIGINS="http://127.0.0.1:5174"
npm.cmd --workspace @eprocurement/api run start
```

### 4.3 Web 开发启动

```powershell
$env:VITE_API_BASE_URL="http://127.0.0.1:3000"
npm.cmd --workspace @eprocurement/web run dev -- --host 127.0.0.1 --port 5174
```

### 4.4 Web 构建产物

```powershell
npm.cmd --workspace @eprocurement/web run build
```

构建产物目录：

- API: `apps/api/dist`
- Web: `apps/web/dist`

## 5. 端口规划与反向代理建议

建议基线：

| 组件 | 端口 | 说明 |
|---|---|---|
| Web | `5174` 或反向代理 80/443 | 用户访问入口 |
| API | `3000` | 内部 API 监听 |

反向代理建议：

- Web 由 Nginx、IIS 或内网统一入口代理静态文件。
- `/api/*` 反代到 API 服务。
- `/health` 反代到 API 健康检查。
- 如使用 HTTPS，`SESSION_COOKIE_SECURE=true`。

## 6. 健康检查

健康检查路径：

- `GET /health`

返回内容包含：

- 当前运行模式
- mock 是否启用
- SQLite 持久化可用性
- 文件目录可用性

不会返回：

- 真实数据库文件路径
- 会话密钥
- CORS 白名单内容

## 7. 数据与文件目录

建议目录结构：

```text
APP_DATA_DIR/
  runtime.sqlite
  files/
  logs/
```

说明：

- `runtime.sqlite` 保存业务状态与会话、文件元数据、审计日志。
- `files/` 保存真实上传文件。
- `logs/` 作为运行日志目录预留。

## 8. 备份与恢复

### 8.1 备份

最小备份范围：

- `APP_DATA_DIR/runtime.sqlite`
- `APP_DATA_DIR/files/`

建议备份步骤：

1. 暂停 API 进程或确保无人写入。
2. 复制整个 `APP_DATA_DIR`。
3. 记录备份时间和版本号。

### 8.2 恢复

1. 停止 API 进程。
2. 用备份目录覆盖当前 `APP_DATA_DIR`。
3. 重新启动 API。
4. 执行登录、项目读取、文件下载与审计查看验证。

## 9. 进程守护建议

本地或内网试运行建议至少具备：

- API 进程守护
- 开机自启或手工重启脚本
- 健康检查失败后的重启机制

Windows 可选：

- NSSM
- 任务计划程序
- 企业统一运维代理

## 10. 重启恢复验证

每次 UAT 发版后至少验证：

1. 登录成功。
2. 读取已有项目工作台数据。
3. 上传一个测试附件。
4. 重启 API。
5. 再次登录。
6. 验证刚刚上传的文件仍可下载。
7. 验证新增或修改的数据仍保留。

## 11. Go/No-Go 基线

可进入 UAT 的最低条件：

- `APP_ENV=production`
- mock 登录关闭
- 健康检查正常
- SQLite 与文件目录可读写
- 全量 `typecheck`、`test:api`、`build` 通过
- 完成至少一轮登录、文件、权限、重启留存冒烟

不可视为正式投产的原因：

- 仍使用 SQLite 过渡方案
- 未接真实 SSO、ERP、WMS、OA、财务系统
- 未形成正式运维监控、告警和数据库高可用方案
