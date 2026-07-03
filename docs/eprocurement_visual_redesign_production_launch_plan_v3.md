# e-Procurement V3 视觉重设计与正式生产上线实施计划

> 适用分支：`codex/ui-de-ai-sellable-readiness` 及其后续分支  
> 目标读者：Codex Goal Mode / 项目实施人员 / 售前交付人员  
> 当前状态判断：文案级去 AI 化与 sellable readiness 门禁已经形成；视觉仍偏通用企业后台；正式生产仍是 NO_GO。  
> 本计划目标：在不推翻现有 sellable readiness、权限、流程、测试基础的前提下，完成“真正的 UI 视觉产品化重设计”和“真实客户生产上线准备”。

---

## 0. 当前状态与目标结论

### 0.1 当前已经完成的能力

当前分支已经完成上一轮计划中的大量基础工作：

- `npm run ui:copy-scan` 已经作为客户可见文案扫描入口存在，并且当前报告显示阻断项为 0。
- `docs/sellable-readiness/01_UI_DE_AI_REPORT.md` 已经生成，说明 Sprint 1 范围内的文案、角色首页、空状态、错误状态、权限提示已完成。
- `apps/web/src/permissions/role-model.ts` 已经承载角色、菜单、路由标题、路由访问、角色首页等配置，说明 `App.vue` 中的角色逻辑已经被抽离。
- 根脚本已经有 `role:menu-snapshot`、`permission:align`、`production:gate`、`readiness:strict`、`status:inventory`、`sellable:check` 等门禁入口。
- `docs/sellable-readiness/03_SELLABLE_CHECK_REPORT.md` 显示大量本地门禁已通过，但 `production:gate -- --mode=production` 处于 fail-closed，这符合生产 NO_GO 的真实判断。
- `docs/sellable-readiness/GO_NO_GO.md` 已经明确：Internal Demo / Sales Demo / Controlled Trial / Sellable Candidate 为条件通过或受控通过，Production 仍为 NO_GO。

### 0.2 当前没有完成的能力

当前没有完成的是两个更高层目标：

1. **UI 视觉重设计**  
   现在只是完成了“客户可见文案去 AI 化”和“角色入口收敛”。视觉层仍然是基础企业后台风格，token 简单、布局单一、卡片和表格缺少质感、页面模板同质化明显、登录页和工作台缺少商业产品感。

2. **真实生产上线**  
   当前生产 NO_GO 是合理结果，因为还缺真实客户 SSO/OA/ERP/WMS/Finance/file service、生产数据库、对象存储、上传安全扫描、生产备份恢复、监控告警和客户验收证据。

### 0.3 最终目标

完成本计划后，系统应达到以下状态：

| 状态 | 目标定义 | 必须达成 |
| --- | --- | --- |
| Commercial UI Ready | 视觉达到可售卖软件质感，不再像 AI 生成的后台模板 | UI 视觉验收、截图证据、角色工作台质感、核心页面重设计 |
| Sellable Trial Ready | 可给客户独立试用，但仍可以使用受控 UAT 集成 | sellable:check 绿灯，生产 gate 保持 fail-closed 或按 UAT 配置条件通过 |
| Production Candidate | 已接入真实客户身份、数据库、对象存储、至少核心外部系统 | production:gate 可在 production 配置下通过 |
| Production Go | 客户 UAT、备份恢复、回滚、监控、上线演练全部通过 | 生产上线证据包完整，可正式上线 |

---

## 1. 执行原则

### 1.1 不推翻已有成果

Codex 执行时必须遵守：

- 不删除现有 `sellable-readiness.mjs` 及其报告体系。
- 不删除本地 mock 能力；mock/local/test 能力可以存在，但生产必须 fail-closed。
- 不推翻 R8 Workflow、Process Layer、BPMN shadow 边界。
- 不重写所有业务流程，只修补生产上线所需的真实集成、部署、安全、备份、监控能力。
- 不把“生产上线”伪装成本地通过；没有真实客户环境证据时，Production 必须保持 NO_GO。

### 1.2 UI 重设计不是换几个颜色

本轮 UI 目标是**产品级视觉重设计**，不是文案扫描，也不是简单换 token。必须覆盖：

- 登录页视觉与可信度。
- 主框架 AppShell：侧边栏、顶部栏、角色信息、待办入口、环境标识。
- 角色工作台：集团、采购经办、酒店采购、供应商、专家、财务、审计、管理员。
- 列表页：筛选区、状态标签、表格密度、行操作、空状态。
- 详情页：项目摘要、流程步骤、右侧审计/风险栏、分区信息。
- 表单页：分组、保存草稿、提交确认、错误提示。
- 流程页：报价、开标、评审、定标、归档、结算等关键路径。
- 移动/窄屏基础可用性。
- 视觉回归证据。

### 1.3 生产上线不是 Codex 单独能完成的事情

Codex 可以完成：

- 生产配置门禁。
- SSO/OA/ERP/WMS/Finance/file service 的 adapter 框架与 contract test。
- PostgreSQL 或客户数据库接入能力。
- 对象存储与文件服务 adapter。
- 监控、日志、健康检查、部署脚本、上线手册。
- UAT/上线验收脚本和证据报告模板。

Codex 不能凭空完成：

- 真实客户 SSO 地址、证书、client id、client secret。
- 真实 OA/ERP/WMS/Finance 接口账号、网络连通、字段映射确认。
- 生产数据库账号、对象存储桶、备份策略和企业安全审批。
- 客户 UAT 签字和正式上线窗口。

因此本计划把生产上线分为“代码可生产化”和“客户环境证据可生产化”两部分。

---

## 2. 总体路线

本轮从上一阶段的 Sprint 1-3 之后继续编号。

| 阶段 | 主题 | 目标 | 结果 |
| --- | --- | --- | --- |
| Sprint 4 | 视觉方向与设计 Token 重建 | 从基础后台变成有品牌感的采购产品 | UI foundation ready |
| Sprint 5 | AppShell、登录页、导航重设计 | 第一眼不再丑，不再像模板 | Visual shell ready |
| Sprint 6 | 基础组件产品化 | 表格、卡片、按钮、状态、空态、弹窗统一升级 | Component kit ready |
| Sprint 7 | 核心页面模板重设计 | 工作台、列表、详情、表单、流程页完成视觉升级 | Core pages ready |
| Sprint 8 | 视觉验收、响应式、性能与可访问性 | 形成视觉证据链，避免只靠主观评价 | Commercial UI ready |
| Sprint 9 | 生产环境轮廓与配置体系 | 明确生产需要什么，补齐生产配置样例和门禁 | Production profile ready |
| Sprint 10 | 生产数据库与文件存储 | 从 SQLite/local file 转向正式持久化 | Persistence ready |
| Sprint 11 | 真实外部系统集成 | SSO/OA/ERP/WMS/Finance/file service 具备真实接入能力 | Integration ready |
| Sprint 12 | 安全、监控、备份、部署 | 满足正式上线工程要求 | Operations ready |
| Sprint 13 | UAT、上线演练、GO/NO-GO | 生成最终上线证据包 | Production Go candidate |

---

# Part A：UI 视觉产品化重设计

---

## Sprint 4：视觉方向与 Design Token 重建

### 4.1 目标

把当前“默认企业后台”视觉改成“国企酒店集团采购平台”的可信商业产品视觉。重点不是花哨，而是专业、克制、清晰、有层次。

### 4.2 推荐视觉方向

默认采用以下方向，Codex 不需要再询问：

- **产品气质**：稳重、可信、清晰、审计友好、采购业务专业。
- **行业气质**：酒店集团供应链、食材/物资采购、集团集中管控。
- **视觉关键词**：深蓝、米白、暖金点缀、轻阴影、清晰分区、少边框、高信息密度。
- **避免**：通用 SaaS 蓝白模板、过度渐变、荧光色、大面积空白、所有页面都长一样。

### 4.3 建议色彩 token

在 `apps/web/src/design-system/tokens.json`、`tokens.css`、`tokens.ts` 中重构 token。建议默认值：

```css
:root {
  --ep-color-primary: #123B5D;
  --ep-color-primary-hover: #0F4C75;
  --ep-color-primary-active: #0B2E47;
  --ep-color-accent: #B7791F;
  --ep-color-accent-soft: #FFF4D6;
  --ep-color-success: #16794C;
  --ep-color-warning: #B7791F;
  --ep-color-error: #B42318;
  --ep-color-info: #2563EB;

  --ep-color-bg: #F4F6F8;
  --ep-color-bg-subtle: #F8FAFC;
  --ep-color-surface: #FFFFFF;
  --ep-color-surface-elevated: #FFFFFF;
  --ep-color-panel: #FAFBFC;
  --ep-color-border: #D8DEE8;
  --ep-color-border-subtle: #E8EDF3;

  --ep-color-text: #111827;
  --ep-color-text-secondary: #475569;
  --ep-color-text-muted: #64748B;
  --ep-color-text-inverse: #FFFFFF;

  --ep-shadow-sm: 0 1px 2px rgba(15, 23, 42, 0.06);
  --ep-shadow-md: 0 8px 24px rgba(15, 23, 42, 0.08);
  --ep-shadow-lg: 0 18px 48px rgba(15, 23, 42, 0.10);

  --ep-radius-xs: 4px;
  --ep-radius-sm: 6px;
  --ep-radius-md: 10px;
  --ep-radius-lg: 14px;
  --ep-radius-xl: 18px;

  --ep-space-2: 2px;
  --ep-space-4: 4px;
  --ep-space-6: 6px;
  --ep-space-8: 8px;
  --ep-space-12: 12px;
  --ep-space-16: 16px;
  --ep-space-20: 20px;
  --ep-space-24: 24px;
  --ep-space-32: 32px;
  --ep-space-40: 40px;

  --ep-font-family: "Inter", "Microsoft YaHei", "PingFang SC", "Segoe UI", Arial, sans-serif;
  --ep-font-page-title: 24px;
  --ep-font-section-title: 16px;
  --ep-font-body: 14px;
  --ep-font-meta: 12px;
  --ep-line-height-body: 1.6;
}
```

### 4.4 必须产物

新增或更新：

- `docs/ui-redesign/00_VISUAL_DIRECTION.md`
- `docs/ui-redesign/01_DESIGN_TOKENS.md`
- `docs/ui-redesign/02_PAGE_TEMPLATES.md`
- `docs/ui-redesign/03_COMPONENT_INVENTORY.md`
- `docs/ui-redesign/04_VISUAL_ACCEPTANCE_CHECKLIST.md`

更新：

- `apps/web/src/design-system/tokens.json`
- `apps/web/src/design-system/tokens.css`
- `apps/web/src/design-system/tokens.ts`
- `apps/web/src/design-system/enterprise.css`
- `apps/web/src/design-system/governance.json`

### 4.5 Codex 执行任务

- [ ] 读取现有 `tokens.json`、`tokens.css`、`enterprise.css`，列出现有 token 与新 token 的映射。
- [ ] 重建 token，不删除已有变量名；旧变量可以映射到新变量，避免大面积破坏页面。
- [ ] 增加 shadow、radius、surface、layout、status、focus、density 等 token。
- [ ] 更新 `ui:tokens` 相关生成逻辑，保证 `npm run ui:tokens` 可通过。
- [ ] 更新 governance 规则，禁止页面里直接写硬编码颜色、阴影、字体大小。
- [ ] 增加 `docs/ui-redesign/01_DESIGN_TOKENS.md`，记录 token 用途和示例。

### 4.6 验收命令

```bash
npm run ui:tokens
npm run ui:governance
npm run ui:scan:test
npm run ui:scan
npm run typecheck
npm run build
```

### 4.7 Sprint 4 验收标准

- [ ] 页面可以正常构建。
- [ ] token 不再只有基础颜色和间距。
- [ ] 视觉系统有明确品牌色、辅助色、状态色、阴影、圆角、密度、焦点态。
- [ ] 旧组件不因 token 改造而崩溃。
- [ ] 硬编码颜色新增数量为 0 或全部有合理豁免。

---

## Sprint 5：AppShell、登录页、导航重设计

### 5.1 目标

客户进入系统的第一眼必须明显变好。登录页、主框架、导航、顶部栏是本轮视觉改造的第一优先级。

### 5.2 重点页面和文件

优先处理：

- `apps/web/src/pages/LoginPage.vue`
- `apps/web/src/pages/RoleSwitchPage.vue`
- `apps/web/src/layouts/AppShell.vue`
- `apps/web/src/App.vue`
- `apps/web/src/permissions/role-model.ts`
- `apps/web/src/design-system/enterprise.css`
- `apps/web/src/styles.css`

### 5.3 登录页重设计要求

登录页需要体现商业可信度，不要像开发测试入口。

必须包含：

- 左侧或顶部品牌区：系统名称、适用对象、价值说明。
- 右侧登录卡片：账号/密码、SSO 登录入口、环境提示。
- 生产环境只显示真实登录方式，不显示本地验证、测试账号、角色切换。
- 非生产环境可以显示本地验证入口，但必须标记为“非生产环境”。
- 页面下方显示：版本号、部署环境、技术支持入口，生产环境不展示 mock/test 文案。

建议布局：

```text
┌─────────────────────────────────────────────────────────────┐
│  深色品牌背景 / 酒店供应链采购场景                           │
│                                                             │
│  集团阳光采购与供应链协同平台         ┌──────────────────┐   │
│  需求、采购、评审、履约、结算全流程     │ 登录卡片           │   │
│  采购公开透明，流程可追溯              │ SSO / 账号密码     │   │
│                                       └──────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### 5.4 AppShell 重设计要求

必须改造：

- 侧边栏从“纯白普通列表”升级为深色或浅深结合导航。
- 品牌区增加更清晰的 logo mark、系统名称、客户名称占位。
- 导航项增加图标区域或视觉识别，不要求引入图标库，可以用内联 SVG 或 CSS 标记。
- 顶部栏增加：面包屑、当前角色、待办入口、消息入口、账号菜单。
- 生产环境隐藏角色切换；非生产环境角色切换必须明确显示“本地验证”。
- 内容区增加最大宽度策略，避免大屏下内容散。
- 页面之间使用统一间距和层级。

### 5.5 导航体验要求

导航不是简单列表，要按业务分组。建议分组：

- 工作
- 采购
- 供应商
- 履约结算
- 审计与配置

每个角色只显示自己相关分组。不要让某个角色看到一长串平铺菜单。

### 5.6 Codex 执行任务

- [ ] 重写登录页视觉结构，保留现有登录逻辑。
- [ ] 重写 AppShell 视觉结构，保留现有路由和权限逻辑。
- [ ] 为 `role-model.ts` 的导航项增加可选字段：`group`、`icon`、`description`、`priority`。
- [ ] 侧边栏按 group 渲染，低频入口可放到底部或更多菜单。
- [ ] 增加环境标识组件：生产环境不显示 mock/test，非生产环境显示 `本地验证` / `UAT` / `试用环境`。
- [ ] 增加全局面包屑或当前模块说明。
- [ ] 更新 `ui:role-flow` 如有必要，但不能降低权限检查标准。
- [ ] 生成截图证据：登录页、集团采购工作台、采购经办工作台、供应商报价页、专家评分页。

### 5.7 验收命令

```bash
npm run typecheck
npm run ui:copy-scan
npm run ui:scan
npm run ui:smoke
npm run ui:role-flow
npm run build
```

### 5.8 Sprint 5 验收标准

- [ ] 登录页不再像开发测试页。
- [ ] 主框架第一眼具备商业系统质感。
- [ ] 导航有分组、有层级，不再是平铺清单。
- [ ] 生产环境不暴露测试/本地/角色切换入口。
- [ ] 现有角色流和权限跳转全部通过。
- [ ] `docs/ui-redesign/05_SHELL_LOGIN_REDESIGN_REPORT.md` 已生成。

---

## Sprint 6：基础组件产品化升级

### 6.1 目标

把当前基础组件从“能用”升级为“可售卖产品级”。所有页面后续都基于这些组件升级，避免逐页写散乱 CSS。

### 6.2 优先组件

优先升级 `apps/web/src/components/base`：

- `PageHeader.vue`
- `EnterpriseSurface.vue`
- `EnterpriseButton.vue`
- `DataTable.vue`
- `FilterBar.vue`
- `FormSection.vue`
- `StatusTag.vue`
- `SummaryCards.vue`
- `FeedbackMessage.vue`
- `PaginationBar.vue`
- `EnterpriseDialog.vue`
- `EnterpriseTabs.vue`
- `SubmitPanel.vue`

可新增组件：

- `KpiCard.vue`
- `ActionCard.vue`
- `ProcessStepBar.vue`
- `RiskAlertPanel.vue`
- `PageSection.vue`
- `EmptyState.vue`
- `PermissionState.vue`
- `ErrorState.vue`
- `AuditRail.vue`
- `BusinessTimeline.vue`
- `EnvironmentBadge.vue`
- `RoleBadge.vue`
- `SplitDetailLayout.vue`

### 6.3 组件视觉标准

#### Button

- 主按钮清晰，次按钮克制。
- 危险操作必须用二次确认。
- 禁用态要说明原因或可配 tooltip/提示文本。

#### DataTable

- 表头更稳重，行 hover 更清晰。
- 状态列必须使用 StatusTag，不允许裸文本状态。
- 行操作不超过 3 个，更多操作进菜单或二级入口。
- 空表格要显示业务解释和下一步操作。
- 表格必须支持横向滚动，不能撑破页面。

#### PageHeader

- 必须支持：标题、副标题、状态、主操作、次操作、元信息。
- 详情页 header 应显示业务编号、状态、责任人、更新时间。

#### StatusTag

统一状态色，不同业务的状态映射到统一语义：

| 语义 | 颜色 | 示例 |
| --- | --- | --- |
| draft | 灰 | 草稿、待补充 |
| pending | 蓝 | 待审批、待评分 |
| warning | 金 | 即将截止、材料异常 |
| success | 绿 | 已通过、已完成 |
| error | 红 | 已驳回、已失效 |
| locked | 深色 | 已锁定、已归档 |

#### Empty/Error/Permission

- EmptyState：说明为什么没有数据、用户下一步可以做什么。
- ErrorState：说明业务失败原因，不暴露堆栈和技术词。
- PermissionState：说明当前角色边界，不暗示系统异常。

### 6.4 Codex 执行任务

- [ ] 为基础组件定义 props 文档。
- [ ] 更新组件样式，统一使用 token。
- [ ] 页面内重复结构逐步替换为组件。
- [ ] 建立 `docs/ui-redesign/06_COMPONENT_USAGE.md`。
- [ ] 增加组件 smoke 或至少在页面 smoke 中覆盖这些组件。
- [ ] 不引入大型 UI 框架，除非必须；优先使用现有 Vue + CSS token。

### 6.5 验收命令

```bash
npm run typecheck
npm run ui:scan:test
npm run ui:scan
npm run ui:smoke
npm run ui:role-flow
npm run build
```

### 6.6 Sprint 6 验收标准

- [ ] 基础组件视觉明显升级。
- [ ] 核心页面不再大量重复写裸表格、裸卡片、裸按钮。
- [ ] 状态标签统一，业务状态不再裸文本展示。
- [ ] Empty/Error/Permission 三类状态有独立组件。
- [ ] 组件文档存在，Codex 后续改页面有统一参考。

---

## Sprint 7：核心页面模板重设计

### 7.1 目标

完成客户最常看的页面视觉升级。不是所有页面平均用力，而是优先把售前演示和真实使用的关键路径做好。

### 7.2 优先级 P0 页面

必须优先完成：

| 页面 | 文件 | 改造目标 |
| --- | --- | --- |
| 登录页 | `LoginPage.vue` | 商业可信入口 |
| 工作台 | `DashboardPage.vue` | 每个角色的岗位化首页有质感 |
| 我的待办 | `MyTasksPage.vue` | 展示当天工作，不像任务清单模板 |
| 采购申请列表 | `ProcurementRequestsPage.vue` | 酒店采购和集团审批都能清晰使用 |
| 采购申请详情 | `ProcurementRequestDetailPage.vue` | 摘要、流程、审批记录、附件清晰 |
| 新建采购申请 | `ProcurementRequestCreatePage.vue` | 表单分组、保存草稿、提交审批 |
| 采购项目列表 | `ProjectWorkbenchListPage.vue` | 进度、风险、截止时间清楚 |
| 采购项目详情 | `ProjectWorkbenchPage.vue` | 一屏看清项目状态和下一步 |
| 招采执行 | `ProjectSourcingPage.vue` | 发布、报名、报价、开标、评审步骤清楚 |
| 供应商报名 | `SupplierRegistrationPage.vue` | 供应商只看到自己的待处理事项 |
| 报价响应 | `BiddingPage.vue` | 报价截止、提交状态、附件材料清楚 |
| 专家评分 | `ExpertScoringPage.vue` | 专家承诺、评分项、提交锁定清楚 |
| 定标结果 | `AwardResultPage.vue` / `AwardResultListPage.vue` | 审批依据、结果、通知状态清楚 |
| 订单履约 | `OrderFulfillmentPage.vue` | 发货、收货、验收、异常清楚 |
| 结算付款 | `SettlementMaterialsPage.vue` / `PaymentStatusPage.vue` | 材料、发票、付款进度清楚 |
| 档案审计 | `ArchiveAuditPage.vue` / `AuditPage.vue` | 审计追溯和只读边界清楚 |

### 7.3 页面模板要求

#### 工作台模板

每个角色工作台必须包含：

- 今日重点：3-5 个关键待办。
- 风险提醒：超期、即将截止、材料异常、权限边界。
- 常用操作：最多 4 个。
- 流程进度：与当前角色相关的项目/申请状态。
- 数据卡片：数量要少但有意义，不堆 KPI。

禁止：

- 把所有模块入口堆成卡片矩阵。
- 使用空泛词，如“全链路”“智能协同”“平台能力”。
- 同一模板简单套给所有角色。

#### 列表页模板

必须包含：

- 标题 + 说明 + 主操作。
- 业务状态 tabs 或状态筛选。
- 筛选区折叠/紧凑展示。
- 表格字段按业务优先级排序。
- 状态 Tag + 截止时间 + 责任人 + 下一步。
- 空状态解释。

#### 详情页模板

必须包含：

- 顶部摘要卡：编号、状态、申请部门、预算、责任人、更新时间。
- 流程步骤条：当前节点、已完成、下一步。
- 主内容区：业务信息。
- 右侧栏：风险、附件、审计日志、权限边界。
- 危险操作必须二次确认。

#### 表单页模板

必须包含：

- 分组标题。
- 必填/选填清晰。
- 字段说明贴近业务。
- 保存草稿和提交审批明确分开。
- 提交前确认摘要。
- 错误定位到具体字段或业务规则。

### 7.4 Codex 执行任务

- [ ] 为 `DashboardPage.vue` 做角色视觉差异化，不只是文案差异。
- [ ] 为 P0 页面套用新 PageHeader、Surface、DataTable、StatusTag、EmptyState、ProcessStepBar。
- [ ] 每个关键业务页面增加一个“下一步动作”区域。
- [ ] 详情页统一加入业务摘要和流程步骤。
- [ ] 审计/财务/专家页面保持专业克制，避免过多装饰。
- [ ] 保留现有 API 调用和业务逻辑，不为了视觉改造破坏流程。
- [ ] 更新或生成 `docs/ui-redesign/07_CORE_PAGE_REDESIGN_REPORT.md`。

### 7.5 验收命令

```bash
npm run typecheck
npm run ui:copy-scan
npm run ui:scan
npm run ui:smoke
npm run ui:role-flow
npm run sellable:check
```

### 7.6 Sprint 7 验收标准

- [ ] P0 页面视觉完成升级。
- [ ] 不同类型页面有不同模板，不再全是同一种表格/卡片。
- [ ] 工作台能体现真实岗位的一天。
- [ ] 流程类页面能看清当前状态、下一步、责任人、截止时间。
- [ ] 客户可见文案扫描仍通过。
- [ ] 角色流仍通过。

---

## Sprint 8：视觉验收、响应式、性能与可访问性

### 8.1 目标

把“看起来好看”转成可验收证据，避免 Codex 自称完成但实际页面仍丑。

### 8.2 新增视觉验收脚本

建议新增脚本：

```json
{
  "ui:visual-baseline": "node scripts/ui-visual-evidence.mjs baseline",
  "ui:visual-check": "node scripts/ui-visual-evidence.mjs check",
  "ui:commercial-check": "node scripts/ui-commercial-check.mjs"
}
```

如果已有 `ui:visual`，则增强现有脚本，不重复造轮子。

### 8.3 必须生成的截图证据

在 `output/ui-redesign/` 或 `docs/ui-redesign/screenshots/` 中生成：

- 登录页 1440px。
- 集团采购管理人工作台 1440px。
- 采购经办人工作台 1440px。
- 酒店采购工作台 1440px。
- 供应商报价人员工作台 1440px。
- 专家评分页 1440px。
- 财务审核工作台 1440px。
- 审计工作台 1440px。
- 系统管理员页面 1440px。
- 采购申请详情 1440px。
- 采购项目详情 1440px。
- 报价响应页 1440px。
- 移动窄屏登录页 390px。
- 移动窄屏工作台 390px。

### 8.4 商业视觉检查规则

新增 `ui:commercial-check`，用自动化规则检查：

- 页面是否有超过 3 个连续裸白卡片堆叠。
- 页面是否存在大面积空白但无业务说明。
- 详情页是否缺少状态、责任人、下一步。
- 列表页是否缺少状态 Tag。
- 工作台是否只是模块入口矩阵。
- 是否仍出现高风险客户可见词。
- 移动端是否出现明显横向溢出。
- 主 chunk 是否持续超过阈值且没有拆分计划。

注意：自动化不能替代人工审美，但可以减少明显问题。

### 8.5 性能优化要求

当前构建存在大 chunk 警告时，必须处理或写入明确豁免。优先做：

- 路由级动态 import，拆分页面 chunk。
- 供应商、专家、审计、系统管理等低频页面单独 chunk。
- 避免一次性加载所有页面组件。
- 表格大数据后续必须服务端分页，不在本轮伪造大量前端数据。

### 8.6 可访问性要求

- 所有按钮有可见 focus 状态。
- 表单字段 label 与控件关联。
- 状态颜色不能作为唯一信息来源，必须有文字。
- 弹窗可以 ESC 或关闭按钮关闭。
- 对比度满足企业系统基本可读性。

### 8.7 验收命令

```bash
npm run typecheck
npm run build
npm run ui:copy-scan
npm run ui:scan
npm run ui:smoke
npm run ui:role-flow
npm run ui:visual-check
npm run ui:commercial-check
npm run sellable:check
```

### 8.8 Sprint 8 验收标准

- [ ] 视觉截图证据完整。
- [ ] 登录页、工作台、关键流程页达到可售卖视觉水平。
- [ ] 移动窄屏基本可用。
- [ ] 大 chunk 警告已处理或有明确计划，不影响上线候选判断。
- [ ] 输出 `docs/ui-redesign/08_COMMERCIAL_UI_GO_NO_GO.md`。
- [ ] Commercial UI Ready 可以判定为 GO。

---

# Part B：正式生产上线准备

---

## Sprint 9：生产环境轮廓与配置体系

### 9.1 目标

把“生产 NO_GO 的原因”转成明确的客户环境清单和配置落地项。没有这一步，Codex 很容易在本地伪造 production pass。

### 9.2 必须新增文档

新增：

- `docs/production/00_PRODUCTION_TARGET_PROFILE.md`
- `docs/production/01_ENVIRONMENT_VARIABLES.md`
- `docs/production/02_CUSTOMER_INTEGRATION_REQUIREMENTS.md`
- `docs/production/03_SECURITY_BASELINE.md`
- `docs/production/04_DEPLOYMENT_TOPOLOGY.md`
- `docs/production/05_GO_LIVE_RUNBOOK.md`
- `docs/production/06_ROLLBACK_RUNBOOK.md`

### 9.3 生产环境必须定义

`00_PRODUCTION_TARGET_PROFILE.md` 必须明确：

- 部署方式：单机 / Docker Compose / Kubernetes / 客户私有云。
- 域名与 HTTPS 证书。
- 生产数据库类型：推荐 PostgreSQL；如客户指定 MySQL，则按 MySQL 适配。
- 对象存储：S3 兼容、MinIO、客户文件服务或云对象存储。
- SSO 方式：OIDC / SAML / CAS / 客户自定义 adapter。
- OA 审批系统接口。
- ERP 主数据/采购结果接口。
- WMS 或仓储履约接口。
- 财务系统/付款进度/发票接口。
- 消息通知：短信、邮件、企业微信、钉钉或客户消息中心。
- 备份恢复策略。
- 日志保留策略。
- 审计导出要求。

### 9.4 生产 env 文件

新增：

- `.env.uat.example`
- `.env.production.example`
- `.env.production.required.md`

`.env.production.example` 不能使用真实密钥，只能使用占位符，并且必须保证如果复制后未填真实值，`production:gate` 会失败。

### 9.5 Codex 执行任务

- [ ] 把 `.env.example` 保留为 local/UAT 参考，不把它当生产样例。
- [ ] 新增 `.env.uat.example` 与 `.env.production.example`。
- [ ] 增强 `production:gate`：支持读取指定 env 文件，例如 `--env-file=.env.production.example`。
- [ ] 增强报告：区分 `CONFIG_MISSING`、`PLACEHOLDER_VALUE`、`CONTRACT_ONLY`、`EVIDENCE_MISSING`。
- [ ] 新增 `production:profile-check`，检查生产目标档案是否完整。
- [ ] 更新 `GO_NO_GO.md` 生成逻辑，把生产上线拆成 code ready / environment ready / evidence ready。

### 9.6 验收命令

```bash
npm run production:gate -- --mode=production --env-file=.env.production.example
npm run readiness:strict
npm run sellable:check
npm run typecheck
```

### 9.7 Sprint 9 验收标准

- [ ] 生产配置不再依赖 `.env.example`。
- [ ] production gate 能解释每个失败项是什么类型。
- [ ] 没有真实客户证据时，Production 仍必须 NO_GO。
- [ ] 生产目标档案模板完整。

---

## Sprint 10：生产数据库与文件存储

### 10.1 目标

从本地 SQLite + local file 的 UAT 姿态，升级到正式生产可接受的数据库和文件存储能力。

### 10.2 数据库策略

推荐默认支持 PostgreSQL。如果客户明确要求 MySQL，则按客户数据库改造。

不能只改配置名，必须完成：

- 数据访问层抽象。
- 连接池。
- 事务。
- migration。
- 健康检查。
- 初始化脚本。
- 生产备份恢复演练。
- 测试数据和生产数据严格分离。

### 10.3 文件存储策略

必须从 `FILE_STORAGE_MODE=local` 升级到：

- `FILE_STORAGE_MODE=object`，支持 S3-compatible / MinIO / 云对象存储。
- 或 `FILE_STORAGE_MODE=fileService`，接客户文件服务。

必须支持：

- 文件上传。
- 文件下载。
- 文件权限校验。
- 对象 key 不暴露业务敏感信息。
- 文件类型和大小限制。
- 上传安全扫描。
- 删除/归档策略。
- 备份恢复验证。

### 10.4 Codex 执行任务

数据库：

- [ ] 盘点 `apps/api/src/runtime/runtime-db.ts`、`state-store.ts`、`business-table-store.ts`、repositories 下的 SQLite 依赖。
- [ ] 新增数据库 adapter 接口，例如 `DatabaseAdapter`。
- [ ] 保留 SQLite 作为 local/test adapter。
- [ ] 新增 PostgreSQL adapter 或客户指定 DB adapter。
- [ ] 新增 migration 目录和 migration runner。
- [ ] 新增 `npm run db:migrate`、`npm run db:check`、`npm run db:seed:uat`。
- [ ] API 测试至少跑 SQLite；生产 adapter 需要 contract test 或集成测试。
- [ ] `production:gate` 要求 production 使用非 SQLite 且有 `DATABASE_URL`。

文件：

- [ ] 盘点 `apps/api/src/runtime/file-store.ts` 和所有附件访问点。
- [ ] 新增 `FileStorageAdapter` 接口。
- [ ] 保留 local file adapter 用于 local/test。
- [ ] 新增 object storage adapter。
- [ ] 文件下载必须经过授权接口，不允许裸对象公开访问。
- [ ] 新增 `npm run storage:check`。
- [ ] `production:gate` 要求 production 使用 object/fileService，并且 antivirus adapter 不为 disabled。

### 10.5 验收命令

```bash
npm run typecheck
npm run test
npm run db:check
npm run storage:check
npm run production:gate -- --mode=production --env-file=.env.production.example
npm run sellable:check
```

### 10.6 Sprint 10 验收标准

- [ ] local/test 仍可用 SQLite 和 local file。
- [ ] production 配置不允许 SQLite/local file 通过。
- [ ] 生产 DB adapter 已有 contract test 或集成测试入口。
- [ ] 对象存储 adapter 已有 contract test 或集成测试入口。
- [ ] 文件权限不因对象存储改造而放松。
- [ ] 备份恢复文档区分 local/UAT 与 production。

---

## Sprint 11：真实外部系统集成

### 11.1 目标

把当前 adapter contract 边界推进到可真实接入客户系统的状态。没有真实客户接口证据时，仍允许 contract ready，但不能宣称 production ready。

### 11.2 必须接入或明确豁免的系统

Production 默认至少要求：

| 系统 | 生产必要性 | 说明 |
| --- | --- | --- |
| SSO | 必须 | 登录身份源，禁用本地密码和 mock 登录 |
| 组织/用户同步 | 必须 | 部门、人员、角色、岗位来源 |
| OA | 通常必须 | 审批流或审批结果回写 |
| ERP | 通常必须 | 采购结果、订单、供应商、结算数据对接 |
| WMS/履约系统 | 按客户范围 | 收货、入库、验收状态 |
| Finance | 通常必须 | 付款状态、发票、结算审核 |
| File Service/Object Storage | 必须 | 附件正式存储 |
| Message Notification | 建议必须 | 待办、审批、报价截止通知 |
| Audit Export | 建议必须 | 审计导出、纪检追溯 |
| eSignature/CA/eInvoice | 按客户范围 | 电子签章、CA、电子发票 |

### 11.3 集成开发规则

每个外部系统必须包含：

- adapter interface。
- mock/local adapter。
- real/customer adapter。
- request/response DTO。
- mapper。
- retry 策略。
- timeout 策略。
- idempotency key。
- integration job log。
- error mapping。
- contract test。
- customer sample evidence。

### 11.4 SSO 接入要求

- 支持 OIDC 优先；如客户要求 SAML/CAS，再实现对应 adapter。
- 生产环境必须禁用本地密码登录和 mock 登录。
- `/me` 返回角色、组织、菜单、操作权限。
- 角色映射必须可配置，不写死某个客户姓名。
- 未映射角色的用户不能默认获得高权限。
- SSO 回调错误要可读，不暴露 token。

### 11.5 OA/ERP/WMS/Finance 接入要求

- 所有外发请求必须有请求 ID。
- 所有回调必须验签或使用客户认可认证方式。
- 所有外部系统失败不能导致业务数据半提交。
- 需要支持重试、人工补偿、重放。
- 外部系统状态必须在页面中可见，例如“已同步 ERP / 同步失败 / 待重试”。
- 审计日志必须记录关键外部同步行为。

### 11.6 Codex 执行任务

- [ ] 读取 `apps/api/src/adapters/integration-contracts.ts`、`mock-adapters.ts`、`identity-adapter.ts`。
- [ ] 为每个 REQUIRED provider 增加 real adapter skeleton。
- [ ] 新增 `integration:contract-check`。
- [ ] 新增 `integration:evidence-check`，检查是否有客户样例请求/响应证据。
- [ ] 新增 `docs/production/integrations/*.md`，每个系统一份。
- [ ] 更新 production gate：如果 REQUIRED provider 没有 endpoint + evidence，则 production fail。
- [ ] UI 增加集成状态展示，但不要把“联调”作为客户主文案，可用“集成状态”“同步状态”“外部系统状态”。

### 11.7 验收命令

```bash
npm run typecheck
npm run test
npm run integration:contract-check
npm run integration:evidence-check
npm run production:gate -- --mode=production --env-file=.env.production.example
npm run sellable:check
```

### 11.8 Sprint 11 验收标准

- [ ] SSO/OA/ERP/WMS/Finance/file service 至少具备 real adapter skeleton 和 contract test。
- [ ] 没有客户样例证据时，production gate 仍失败。
- [ ] 有客户样例证据时，对应 provider 可从 `EVIDENCE_MISSING` 变为 PASS。
- [ ] 外部系统错误可追溯、可重试、可人工补偿。

---

## Sprint 12：安全、监控、备份、部署

### 12.1 目标

补齐正式上线必需的非功能能力：安全、日志、监控、备份恢复、部署与回滚。

### 12.2 安全基线

必须完成：

- HTTPS-only 部署说明。
- Secure Cookie。
- SameSite 策略。
- CSRF 策略。
- CORS 白名单。
- Helmet/CSP 规则。
- 登录/上传/敏感 API rate limit。
- 附件访问授权。
- 审计日志不可普通用户修改。
- 供应商隔离自动化测试。
- 报价截止前保密测试。
- 专家评分隔离测试。
- 管理员不默认拥有业务查看权限。

### 12.3 监控与日志

必须新增或完善：

- request id。
- structured logs。
- `/health/live`。
- `/health/ready`。
- `/health/readiness` 生产判断。
- 关键业务指标。
- 集成失败指标。
- 文件上传失败指标。
- 登录失败指标。
- 慢请求记录。
- 前端错误捕获或至少 console error smoke。

建议新增：

```bash
npm run ops:health-check
npm run ops:log-check
npm run ops:monitoring-check
```

### 12.4 备份与恢复

必须区分：

- local/UAT SQLite drill。
- production DB native backup。
- production object storage restore。
- external system reconciliation。

生产备份恢复报告必须包含：

- 备份时间。
- 恢复时间。
- RPO/RTO。
- 数据表数量校验。
- 附件数量校验。
- 核心业务流程抽样校验。
- 外部系统同步状态校验。
- 恢复后登录和业务可用性检查。

### 12.5 部署与回滚

必须新增：

- `Dockerfile` 或客户部署方式说明。
- `docker-compose.uat.yml`。
- `docker-compose.production.example.yml` 或 Kubernetes manifests。
- migration 前置检查。
- 灰度/停机窗口说明。
- 回滚脚本和回滚手册。
- release tag 规则。
- build version 注入。

### 12.6 Codex 执行任务

- [ ] 增强安全 headers 与 production config。
- [ ] 新增 rate limit 或明确实现位置。
- [ ] 增强 health/readiness，输出 production blockers。
- [ ] 新增 ops 检查脚本。
- [ ] 完成 production backup/restore runbook。
- [ ] 完成 deployment/rollback runbook。
- [ ] 把 `sellable:check` 扩展为包含 ops/security/storage/integration checks。

### 12.7 验收命令

```bash
npm run typecheck
npm run test
npm run openapi:validate
npm run sellable:check
npm run ops:health-check
npm run ops:monitoring-check
npm run production:gate -- --mode=production --env-file=.env.production.example
```

### 12.8 Sprint 12 验收标准

- [ ] 安全配置不靠人工提醒，而是有门禁。
- [ ] 监控和 health 能区分 demo ready / UAT ready / production ready。
- [ ] 生产备份恢复不再引用 SQLite local drill 作为正式证据。
- [ ] 部署和回滚手册可执行。

---

## Sprint 13：UAT、上线演练与最终 GO/NO-GO

### 13.1 目标

把系统从 Production Candidate 推到真实 Production Go。这个阶段需要客户配合，Codex 负责生成脚本、报告和缺口追踪。

### 13.2 UAT 场景

必须覆盖以下端到端场景：

1. 酒店采购发起采购申请。
2. 集团采购管理人审批需求。
3. 采购经办人生成项目并编制采购文件。
4. 发布公告/邀请供应商。
5. 供应商报名。
6. 报名资格审核。
7. 供应商报价。
8. 报价截止并锁定。
9. 专家确认回避与评分。
10. 采购经办生成评审报告。
11. 定标审批。
12. 中标结果通知。
13. 订单履约。
14. 验收。
15. 供应商提交结算材料。
16. 财务审核并更新付款进度。
17. 归档。
18. 审计追溯。
19. 外部系统同步成功与失败补偿。
20. 备份恢复后流程继续可用。

### 13.3 上线演练

上线前至少完成两次演练：

- UAT 环境全量演练。
- 生产影子环境演练。

每次演练必须生成：

- `docs/production/uat/UAT_EXECUTION_REPORT.md`
- `docs/production/uat/ISSUE_REGISTER.md`
- `docs/production/uat/CUSTOMER_SIGNOFF_TEMPLATE.md`
- `docs/production/go-live/GO_LIVE_REHEARSAL_REPORT.md`
- `docs/production/go-live/ROLLBACK_REHEARSAL_REPORT.md`

### 13.4 最终 GO/NO-GO 条件

Production Go 必须同时满足：

- [ ] `npm run sellable:check` PASS。
- [ ] `npm run production:gate -- --mode=production --env-file=<real-production-env>` PASS。
- [ ] 真实 SSO 登录成功。
- [ ] 本地密码登录和 mock 登录在 production 中不可用。
- [ ] 真实生产数据库连接成功。
- [ ] 对象存储或客户文件服务连接成功。
- [ ] 上传安全扫描可用。
- [ ] 至少客户定义的 REQUIRED_INTEGRATION_PROVIDERS 全部有真实接口证据。
- [ ] 供应商隔离测试通过。
- [ ] 报价保密测试通过。
- [ ] 专家评分隔离测试通过。
- [ ] 归档不可改测试通过。
- [ ] 审计只读测试通过。
- [ ] 备份恢复演练通过。
- [ ] 回滚演练通过。
- [ ] 监控告警可用。
- [ ] 客户 UAT 问题无 P0/P1 未关闭项。
- [ ] 客户签字或书面确认。

### 13.5 验收命令

```bash
npm run typecheck
npm run test
npm run openapi:validate
npm run ui:copy-scan
npm run ui:scan
npm run ui:smoke
npm run ui:role-flow
npm run ui:visual-check
npm run ui:commercial-check
npm run integration:contract-check
npm run integration:evidence-check
npm run db:check
npm run storage:check
npm run ops:health-check
npm run ops:monitoring-check
npm run production:gate -- --mode=production --env-file=<real-production-env>
npm run sellable:check
```

### 13.6 Sprint 13 验收标准

- [ ] `GO_NO_GO.md` 中 Production 从 NO_GO 变成 GO 或 PRODUCTION_CANDIDATE_GO。
- [ ] 所有 production blockers 有关闭证据。
- [ ] 客户 UAT 证据完整。
- [ ] 上线和回滚手册经过演练。
- [ ] 视觉验收报告完整。
- [ ] 生产上线证据包完整。

---

# Part C：改造后的 sellable:check 目标结构

最终 `npm run sellable:check` 应该聚合以下检查：

```text
基础质量：
- typecheck
- test
- openapi:validate
- build

UI 商业化：
- ui:tokens
- ui:governance
- ui:copy-scan
- ui:scan
- ui:smoke
- ui:role-flow
- ui:visual-check
- ui:commercial-check

权限与流程：
- role:menu-snapshot
- permission:align
- status:inventory
- critical-flow tests
- supplier isolation tests
- bid secrecy tests
- expert scoring isolation tests
- archive immutability tests

生产配置：
- production:profile-check
- production:gate
- readiness:strict

生产基础设施：
- db:check
- storage:check
- antivirus/check
- backup restore check

外部系统：
- integration:contract-check
- integration:evidence-check

运维上线：
- ops:health-check
- ops:monitoring-check
- deployment check
- rollback check
```

最终报告应输出：

- `docs/sellable-readiness/GO_NO_GO.md`
- `docs/ui-redesign/08_COMMERCIAL_UI_GO_NO_GO.md`
- `docs/production/PRODUCTION_GATE_REPORT.md`
- `docs/production/INTEGRATION_EVIDENCE_REPORT.md`
- `docs/production/SECURITY_BASELINE_REPORT.md`
- `docs/production/BACKUP_RESTORE_REPORT.md`
- `docs/production/GO_LIVE_READINESS_REPORT.md`

---

# Part D：Codex Goal Mode 直接执行指令

把下面整段作为 Codex Goal Mode 的主任务说明：

```md
# Goal: Visual Productization and Production Launch Readiness for e-Procurement

当前分支 codex/ui-de-ai-sellable-readiness 已经完成文案级去 AI 化、角色入口收敛、sellable readiness 门禁、production fail-closed gate 和 GO/NO-GO 报告。不要推翻这些成果。

本轮目标有两个：
1. 做真正的 UI 视觉重设计，让系统达到可售卖软件的视觉质感，而不是只通过文案扫描。
2. 推进真实生产上线准备，补齐生产数据库、对象存储、SSO、OA、ERP、WMS、Finance、file service、上传安全扫描、备份恢复、监控告警、部署回滚和客户 UAT 证据。

执行顺序：

## Sprint 4: Visual Direction and Design Tokens
- 重建 design tokens，形成专业、稳重、酒店集团采购平台风格。
- 更新 tokens.json / tokens.css / tokens.ts / enterprise.css / governance.json。
- 新增 docs/ui-redesign/00-04 系列文档。
- 验收：ui:tokens、ui:governance、ui:scan、typecheck、build 通过。

## Sprint 5: Login, AppShell and Navigation Redesign
- 重设计 LoginPage、RoleSwitchPage、AppShell。
- 侧边导航分组，顶部栏增加面包屑、角色、消息、待办、账号入口。
- 生产环境隐藏本地验证、测试账号、角色切换。
- 验收：typecheck、ui:copy-scan、ui:smoke、ui:role-flow、build 通过。

## Sprint 6: Product-grade Base Components
- 升级 PageHeader、EnterpriseSurface、EnterpriseButton、DataTable、FilterBar、FormSection、StatusTag、SummaryCards、FeedbackMessage、PaginationBar、Dialog、Tabs、SubmitPanel。
- 新增 KpiCard、ActionCard、ProcessStepBar、RiskAlertPanel、EmptyState、PermissionState、ErrorState、AuditRail、SplitDetailLayout 等必要组件。
- 验收：ui:scan、ui:smoke、ui:role-flow、build 通过。

## Sprint 7: Core Page Redesign
- 优先重设计 Dashboard、MyTasks、ProcurementRequests、ProcurementRequestDetail、ProcurementRequestCreate、ProjectWorkbench、ProjectSourcing、SupplierRegistration、Bidding、ExpertScoring、AwardResult、OrderFulfillment、SettlementMaterials、PaymentStatus、ArchiveAudit、Audit。
- 每类页面必须有明确模板：工作台、列表、详情、表单、流程页。
- 验收：sellable:check 通过，视觉报告生成。

## Sprint 8: Visual Evidence, Responsive, Performance, Accessibility
- 增加 ui:visual-check 和 ui:commercial-check。
- 生成登录页、各角色工作台、关键流程页、移动窄屏截图证据。
- 处理或记录 bundle chunk 警告。
- 输出 Commercial UI GO/NO-GO。

## Sprint 9: Production Environment Profile
- 新增 docs/production/ 系列文档。
- 新增 .env.uat.example、.env.production.example、.env.production.required.md。
- 增强 production:gate 支持 env-file 和证据分类。
- 没有真实客户证据时，Production 必须仍是 NO_GO。

## Sprint 10: Production Database and File Storage
- 保留 SQLite/local file 作为 local/test。
- 新增 production DB adapter，推荐 PostgreSQL；如客户指定 MySQL，则按客户要求。
- 新增 object storage 或 customer file service adapter。
- 文件下载必须经过权限校验。
- production 不允许 SQLite/local file 通过。

## Sprint 11: Real Customer Integrations
- 为 SSO、组织用户同步、OA、ERP、WMS、Finance、file service、message notification、audit export 等建立 real adapter skeleton、contract test 和 evidence check。
- 没有真实 endpoint 和样例证据时，production gate 必须失败。

## Sprint 12: Security, Observability, Backup, Deployment
- 完成 HTTPS/cookie/CORS/CSRF/rate limit/security baseline。
- 增强 health/readiness、structured logs、request id、ops checks。
- 完成生产备份恢复、部署、回滚手册和演练脚本。

## Sprint 13: UAT and Go-live Evidence
- 覆盖完整采购闭环 UAT。
- 生成 UAT 报告、问题清单、客户签字模板、上线演练报告、回滚演练报告。
- 满足所有 production gate 后才允许 Production GO。

禁止事项：
- 不要把本地 mock 删除；只要保证 production fail-closed。
- 不要把 contract ready 冒充 production ready。
- 不要只改颜色就声称 UI 重设计完成。
- 不要重写全部业务流程。
- 不要降低现有测试和权限门禁。
- 不要让 production gate 在缺真实客户证据时通过。
```

---

# Part E：最终验收清单

## E.1 UI 商业化验收

- [ ] 登录页视觉有品牌感和信任感。
- [ ] 主框架不再像通用后台模板。
- [ ] 导航有分组、有层次、有角色差异。
- [ ] 工作台体现岗位的一天，而不是功能矩阵。
- [ ] 列表页有状态、下一步、责任人和截止时间。
- [ ] 详情页有摘要、流程、右侧风险/审计栏。
- [ ] 表单页分组清晰，提交动作可信。
- [ ] Empty/Error/Permission 状态专业可读。
- [ ] 关键页面截图证据完整。
- [ ] `ui:visual-check` 和 `ui:commercial-check` 通过。

## E.2 可售卖试用验收

- [ ] `sellable:check` 通过。
- [ ] 客户可见文案扫描通过。
- [ ] 角色菜单快照通过。
- [ ] 权限对齐通过。
- [ ] 供应商隔离测试通过。
- [ ] 报价保密测试通过。
- [ ] 专家评分隔离测试通过。
- [ ] 归档不可改测试通过。
- [ ] 审计只读测试通过。

## E.3 生产上线验收

- [ ] 真实 SSO 接入完成。
- [ ] 真实生产数据库接入完成。
- [ ] 对象存储或客户文件服务接入完成。
- [ ] 上传安全扫描启用。
- [ ] REQUIRED 外部系统集成有真实证据。
- [ ] production gate 真实生产配置通过。
- [ ] 备份恢复演练通过。
- [ ] 回滚演练通过。
- [ ] 监控告警上线。
- [ ] UAT 无 P0/P1 未关闭问题。
- [ ] 客户签字确认。

---

## 最终判断口径

在 Sprint 8 完成前，不要对外宣称“UI 已经彻底去 AI 化”。当前只能说：**文案级和角色入口级去 AI 化已完成**。

在 Sprint 13 完成前，不要对外宣称“可以正式生产上线”。当前最多可以说：**具备受控试用和售前演示基础，生产上线需要客户真实环境接入和上线证据**。

最终目标口径：

```text
Commercial UI Ready: GO
Sellable Trial Ready: GO
Production Candidate: GO after real integrations and infrastructure evidence
Production Go: GO only after customer UAT, backup/restore, rollback and monitoring evidence
```
