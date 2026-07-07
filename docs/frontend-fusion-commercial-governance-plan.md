# 前端商业化融合改造计划：从混合架构收敛为可治理系统

## 1. Summary

目标是把当前 Vue Shell + React Gemini UI + React prototype 的混合系统，升级为可商业交付、可灰度、可观测、可持续治理的前端架构。

最终架构裁决：

- Vue = 唯一 runtime shell，只负责 auth、router guard、session、layout container、React mount point。
- React = 唯一 business UI，所有业务页面、交互、展示状态由 React 承载。
- Vue 不允许渲染业务 UI。
- React 未启用或崩溃时，只能回到 Vue Shell 的统一错误/不可用状态，不能 fallback 到旧 Vue 业务页面。
- 所有迁移、删除、权限、菜单、数据解释都必须由系统化治理资产驱动，不能靠人工判断。

## 2. Core Governance Systems

### 2.1 System Registry：最终权威注册中心

新增：

`apps/web/src/meta/system-registry.ts`

System Registry 作为前端运行决策唯一入口。

Registry 不重复保存业务规则，而是统一编排：

- `role-model.ts`：角色、权限、菜单原始权威。
- `route-matrix.ts`：route owner、迁移状态、Vue 删除资格权威。
- `feature-flags.ts`：React 灰度与回滚权威。
- `contracts/`：API 数据解释权威。
- `menu-adapter.ts`：菜单结构转换层。

Registry 对外只暴露决策函数：

```ts
resolveRuntimeRoute(route, roleId)
resolveMenu(roleId)
canAccessRoute(route, roleId)
canRenderReact(route, roleId)
canRemoveVue(route)
getModuleOwner(route)
```

规则：

- Vue/React 不直接各自组合权限、菜单、route matrix、feature flag。
- 所有 UI runtime 决策必须通过 System Registry。
- 如果 Registry 与局部实现冲突，以 Registry 为准。

### 2.2 Route Matrix：路由迁移真相源

新增：

`apps/web/src/meta/route-matrix.ts`

```ts
export type RouteMigrationStatus = "vue" | "react" | "hybrid" | "deprecated";

export interface RouteMatrixItem {
  route: string;
  vueOwner: boolean;
  reactOwner: boolean;
  status: RouteMigrationStatus;
  migrationStage: 1 | 2 | 3;
  roleAccess: string[];
  apiReady: boolean;
  canRemoveVue: boolean;
}
```

规则：

- 所有 Vue Router route 必须登记。
- `hybrid` 只允许作为过渡状态。
- Vue 删除必须由 `canRemoveVue === true` 驱动。
- 禁止凭文件引用或人工感觉判断 route 归属。

### 2.3 Feature Flag System：双轨控制器

新增：

`apps/web/src/meta/feature-flags.ts`

```ts
export interface FrontendFeatureFlags {
  USE_REACT_UI: boolean;
  MODULE_REACT_ENABLE_MAP: Record<string, boolean>;
  ROLE_REACT_ENABLE_MAP: Record<string, boolean>;
  ROUTE_REACT_ENABLE_MAP: Record<string, boolean>;
  FALLBACK_TO_VUE_SHELL: boolean;
}
```

规则：

- React UI 启用必须同时满足全局、角色、模块、路由开关。
- fallback 只能回 Vue Shell 状态页。
- 支持客户试点按角色、模块、路由灰度。
- 禁止一次性全量切换无回滚路径。

### 2.4 Frontend State Contract：状态统一层

新增：

`apps/web/src/meta/frontend-state-contract.ts`

```ts
export interface FrontendRuntimeState {
  session: SessionSnapshot;
  roleId: string;
  permissions: PermissionSnapshot;
  navigation: NavigationSnapshot;
  uiContext: UiContextSnapshot;
  featureFlags: FrontendFeatureFlags;
}
```

规则：

- Vue 在 Bridge 边界生成只读 runtime snapshot。
- React 只消费 snapshot，不读取 Vue store。
- React 状态变化只能通过事件输出：`navigate(path)`、`logout()`、`reportError(error)`。
- session、role、permission、navigation state 不允许 Vue/React 各自解释。

### 2.5 API Contract Layer：数据契约层

新增：

`apps/web/src/contracts/`

至少包含：

- `ProcurementContract`
- `SupplierContract`
- `OrderContract`
- `AuditContract`
- `FinanceContract`

规则：

- UI 不允许直接使用 API response 类型。
- 禁止 `any` 作为业务 UI 主路径数据。
- API response 必须经过 contract 转换为 UI view model。
- 合同层统一金额、日期、状态、风险等级、付款状态、档案状态等展示口径。

### 2.6 Migration Controller：迁移执行控制器

新增：

`apps/web/src/meta/migration-controller.ts`

Migration Controller 消费 System Registry、Route Matrix、Feature Flags、验证报告。

对外回答：

```ts
canRemoveVueRoute(route)
getRouteMigrationReadiness(route)
getModuleMigrationReadiness(moduleId)
getRoleCoverage(roleId)
assertVueRemovalAllowed(route)
```

规则：

- 删除 Vue 页面前必须调用 controller 判断。
- Controller 输出机器可读报告。
- Codex/工程师不得绕过 controller 手动删除业务 Vue 页面。

### 2.7 Observability Layer：运行可视化层

新增：

`apps/web/src/observability/frontend-observability.ts`

必须记录：

- route usage
- actual rendered owner: Vue Shell / React module / fallback
- feature flag evaluation
- role usage map
- React module error
- API error
- migration progress

规则：

- 商业演示和试点环境必须能证明实际访问路径是否已由 React 接管。
- 模块错误不能影响 Vue Shell。
- 观测数据先本地输出到报告/console，后续可接入真实日志平台。

## 3. Implementation Phases

### Phase 1：建立治理底座

- 新增 System Registry、Route Matrix、Feature Flags、Frontend State Contract、Contracts、Migration Controller、Observability。
- 建立 `role-model.ts → menu-adapter.ts → System Registry → React Shell` 链路。
- 把现有所有 route 登记进 route matrix。
- 生成 migration dashboard 数据：
  - route progress
  - role coverage
  - Vue dependency count
  - React readiness %

### Phase 2：React 接管业务 UI

固定迁移顺序：

1. Dashboard / 工作台
2. Procurement / 采购申请
3. Workbench / 项目工作台
4. Supplier / 供应商
5. Order / 订单履约
6. Finance / 结算付款
7. Audit / 档案审计
8. System / 权限配置

每个模块必须补齐旧 Vue 决策字段：

- 采购方式
- 预算金额
- 审批意见
- 供应商风险等级
- 报价版本
- 结算差异
- 付款状态
- 收货进度
- 档案状态

### Phase 3：Bridge 单向化

Vue → React 注入：

- `FrontendRuntimeState`
- `menuConfig`
- `routeContext`

React → Vue 输出：

- `navigate(path)`
- `logout()`
- `reportError(error)`

禁止：

- React 调 Vue store
- React 使用 Vue router
- 双向 state binding
- React 内部维护第二套权限判断

### Phase 4：React 产品化目录

将：

`gemini-react/prototype/`

收敛为：

```txt
gemini-react/
  core/
  features/
  shared/
  legacy/
```

规则：

- `core/` 放 Shell、Bridge adapter、route rendering、error boundary。
- `features/` 放业务模块。
- `shared/` 放标准 UI、状态组件、格式化工具。
- `legacy/` 只放未迁移临时代码，必须由 route matrix 跟踪。
- 生产路径禁止继续使用 `prototype` 命名。

### Phase 5：Vue 降级与删除

Vue 最终只保留：

- Auth
- Router guard
- Session
- Permission gate
- Layout container
- React mount point
- 公共状态页

Vue 页面删除必须同时满足：

1. `route-matrix.canRemoveVue === true`
2. React 页面已接管 UI
3. API contract 完成
4. role smoke test 通过
5. typecheck + build 通过
6. Migration Controller 判定允许删除

## 4. Definition of Done

一个模块完成迁移必须满足：

- Route Matrix 状态为 `react`
- System Registry 可解析 runtime owner
- Feature Flag 支持 role/module/route 灰度
- Contract 层完成并被 React 页面使用
- React 页面无 mock/demo/prototype 主路径
- ErrorBoundary 覆盖模块
- Observability 记录 route owner、error、flag evaluation
- 角色验证通过
- build + typecheck 通过
- 如需删除 Vue，Migration Controller 返回 allowed

## 5. Test Plan

必须执行：

```powershell
npm.cmd --workspace @eprocurement/web run typecheck
npm.cmd run build
```

专项验证：

- Registry 校验：route、menu、permission、flag 决策唯一出口。
- Route Matrix 校验：Vue Router 所有 route 必须存在于 matrix。
- Feature Flag 校验：global + role + module + route 开关组合正确。
- State Contract 校验：React 不读取 Vue store，不直接使用 Vue router。
- Contract 校验：React features 不直接消费 raw API response。
- Role smoke：12 类角色菜单、首页、可访问路由、无权限跳转一致。
- Critical flow：采购申请 → 审批 → 报价 → 定标 → 订单 → 结算 → 档案审计。
- Runtime stability：人为触发模块错误，验证 Shell 不崩溃。
- Observability 校验：记录实际 route owner、flag、error、role usage。
- Deletion gate：删除 Vue 前后均由 Migration Controller 和验证链确认。

## 6. Assumptions

- 从当前 `codex/gemini-frontend-integration` 派生治理分支，例如 `codex/gemini-frontend-architecture-cleanup`。
- Phase 1 优先建立治理资产，不大规模删除 Vue 页面。
- React 是目标业务 UI 层，Vue 在 Phase 1/2/3 仍作为 runtime shell。
- 旧 Vue 的权限、API、字段和业务流程是迁移基准；Gemini React 的视觉和交互是商业 UI 基准。
- 不新增第二套权限系统。
- 不允许 mock/static/prototype data 成为商业界面主路径。
