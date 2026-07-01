# M6-A 生产配置与运行底座收口报告

## 范围

本阶段只执行 M6-A：生产模式配置、健康检查、运行环境边界和 readiness gate。  
M6-B 的外部集成 contract/备份恢复深化，以及 M6-C 的最终安全、运维、交付验收，需要后续明确确认后再进入。

## 运行边界

- R8 Workflow 仍是主执行源：`WORKFLOW_EXECUTION_SOURCE=r8_workflow`。
- Process Layer 仍是展示、镜像、事件追踪和逐步流程化底座：`PROCESS_LAYER_MODE=shadow`。
- BPMN 仍是受控影子试点：`BPMN_PILOT_MODE=shadow`。
- M6-A 不批准 Process Layer 或 BPMN 作为正式生产执行源。

## Readiness Gate

`GET /health` 会输出：

- `readiness.productionReady`
- `readiness.failureCount`
- `readiness.errorCount`
- `readiness.warningCount`
- `readiness.infoCount`
- `readiness.checks[].level`
- `readiness.checks[].severity`
- `workflow.executionSource`
- `workflow.processLayerMode`
- `workflow.bpmnPilotMode`

生产模式下，以下情况会导致正式生产 No-Go 或 Conditional No-Go：

- mock auth 启用。
- 本地密码登录启用。
- `APP_SEED_ON_BOOT=true`，即演示数据和测试账号被当作正常生产启动路径。
- 未配置正式 SSO/OIDC/SAML/adapter 边界。
- SQLite 仍作为数据库。
- 本地文件仍作为文件存储。
- 对象存储仅有 contract stub，未完成真实 adapter cutover。
- 必需 OA / ERP / WMS / 财务 / 发票 / 支付 / 文件服务等端点缺失。
- CORS 未配置明确白名单。
- Cookie 未启用 Secure。
- `SESSION_SECRET` 仍为占位值。
- 防病毒扫描未接入。
- 工作流主执行源不是 R8。
- Process Layer 不是 shadow。
- BPMN 被配置为 production。

## 配置样例

已更新 `.env.example`，补充：

- `WORKFLOW_EXECUTION_SOURCE`
- `PROCESS_LAYER_MODE`
- `BPMN_PILOT_MODE`
- 生产必填/禁用项说明
- 导致 `productionReady=false` 的典型条件

## M6-A Go/No-Go

| 维度 | 结论 | 说明 |
| --- | --- | --- |
| 演示 / UAT | Conditional Go | 本地/UAT 可继续用于角色和流程验收，但不能等同生产。 |
| 客户二开底座 | Conditional Go | 配置边界、readiness gate 和执行源边界已明确，可作为二开底座继续推进。 |
| 受控试运行 | Conditional Go | 仅限客户明确接受的非生产或准生产环境，并需补齐真实 SSO、数据库、文件服务和外部集成证据。 |
| 正式生产上线 | No-Go | 缺少真实客户 SSO、正式数据库、对象存储、外部系统联调、运维监控和完整备份恢复证据时，不允许声明生产 Go。 |

## 后续

下一步应在明确确认后进入 M6-B，补外部集成 contract boundary、文件存储边界、数据库一致性和备份恢复演练证据。
