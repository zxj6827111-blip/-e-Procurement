# UI Template Mapping Report

- Generated at: 2026-07-05T10:20:00+08:00
- Step: 1 / 9
- Result: PASS
- Scope: 收口剩余主干业务页的 A/B/C/D 版式映射，冻结本轮高优先级改造范围。

## Mapping Summary

| 页面 | 当前主文件 | 目标版式 | 优先级 | 结论 |
| --- | --- | --- | --- | --- |
| 项目工作台详情 | `apps/web/src/pages/project-workbench/ProjectWorkbenchDetailPageShell.vue` | D 底层配置与溯源流 | P1 | 旧 `SplitDetailLayout` 表达仍偏混搭，需要统一为高信息密度流程壳层。 |
| 采购申请新建 | `apps/web/src/pages/procurement-requests/ProcurementRequestCreatePageShell.vue` | C 外部工作流 / 发起式表单 | P1 | 现状是传统长表单，需要升级为“摘要 + 规则提示 + 表单录入 + 锁定提交”的任务导向页面。 |
| 采购申请详情 | `apps/web/src/pages/procurement-requests/ProcurementRequestDetailPageShell.vue` | B 垂直业务流 | P1 | 数据完整，但壳层语言仍偏旧，需要强化审批、方式判定、转项目的主辅分栏。 |
| 采购申请下一步 | `apps/web/src/pages/procurement-requests/ProcurementRequestNextStepPanel.vue` | B 垂直业务流 | P1 | 现状仍是孤立操作卡，需要并入统一的处理主线。 |
| 采购文件 | `apps/web/src/pages/procurement-documents/ProcurementDocumentsPageShell.vue` | B / C 组合 | P2 | 页面壳层较薄、创建与列表表达分散，进入下一步统一。 |
| 我的待办 | `apps/web/src/pages/my-tasks/MyTasksPageShell.vue` | B 垂直业务流 | P3 | 已具备列表基础，不是当前最大割裂点。 |
| 消息中心 | `apps/web/src/pages/message-center/MessageCenterPageShell.vue` | B 垂直业务流 | P3 | 与待办类似，主要是视觉语言收口，不是首要重构对象。 |
| 项目工作台列表 | `apps/web/src/pages/project-workbench/ProjectWorkbenchListPageShell.vue` | A / 列表门户 | P3 | 已基本可用，仅需后续一致性收口。 |
| 采购申请列表 | `apps/web/src/pages/procurement-requests/ProcurementRequestsShell.vue` | B 垂直业务流 | P3 | 已完成主列表语言，本轮不再作为 P1。 |

## Step 1 Acceptance

1. 已冻结本轮 P1 改造范围：
   - `项目工作台详情`
   - `采购申请新建`
   - `采购申请详情 / 下一步`
2. 已明确 P2 / P3 排序，避免无边界扩散：
   - P2: `采购文件`
   - P3: `我的待办`、`消息中心`、若干已基本对齐的列表页
3. 已确认本轮优先改“页面壳层与信息结构”，不改 RBAC 规则、不改 API 数据结构、不改业务审批判断。

## Next Step

进入第 2 步，按 P1 范围改造以下文件并单独验收：

- `apps/web/src/pages/project-workbench/ProjectWorkbenchDetailPageShell.vue`
- `apps/web/src/pages/procurement-requests/ProcurementRequestCreatePageShell.vue`
- `apps/web/src/pages/procurement-requests/ProcurementRequestDetailShell.vue`
- `apps/web/src/pages/procurement-requests/ProcurementRequestNextStepPanel.vue`
