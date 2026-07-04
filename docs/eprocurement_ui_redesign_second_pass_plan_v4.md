# 酒店供应链采购平台 UI 二次重设计实施计划 V4

> 适用分支：`codex/ui-visual-redesign-production-readiness` 之后的新工作分支  
> 建议新分支：`codex/ui-commercial-redesign-second-pass`  
> 本计划目标：解决当前页面“仍像 AI 生成、视觉丑、登录页过长、角色选择不可用/不清晰”的问题。  
> 本计划不处理生产 SSO/OA/ERP/WMS/Finance 接入，不改变后端业务流程，不推翻已有 sellable readiness、copy scan、production gate、role navigation、route access、Process Layer 和 API 测试。

---

## 0. 当前问题判断

上一轮修改已经完成了文案扫描、角色入口收敛、岗位化工作台、商业 UI 检查脚本和视觉证据脚本，但当前 UI 仍然没有达到商业产品质感。主要原因不是“没改颜色”，而是设计策略仍然是 AI 常见做法：

1. **只增加了组件和 token，没有形成真实视觉秩序**  
   `ui:commercial-check` 目前更多检查 token、组件、报告、脚本是否存在，不能判断页面是否真的好看、是否像成熟 SaaS。

2. **侧边栏仍然像模板后台**  
   大面积深蓝、方形图标、单字图标、菜单卡片化都显得生硬，像自动生成的企业后台。

3. **工作台信息重复且层级弱**  
   页面出现“今日事项 / 今日业务台账 / 岗位工作台 / 今日重点 / 风险提醒 / 可发起动作 / 权限边界”等堆叠模块，像把需求文档拆成卡片，而不是产品经理设计的操作界面。

4. **字体和排版不适合中文 B2B 系统**  
   字号、字重、标题层级、卡片间距、数字样式都偏机械，缺少真实政企系统/采购系统的克制感。

5. **登录页失败**  
   登录页不能长到需要滚动。1366×768、1440×900 下必须完整展示品牌、登录表单、环境提示和本地角色入口。Local/UAT 环境必须可以清楚选择角色；Production 环境隐藏角色选择。

6. **截图 PASS 不是视觉验收**  
   截图生成只证明页面能打开，不证明页面有商业审美。接下来必须增加人工可审的截图清单和视觉规则。

---

## 1. 新一轮目标

本轮不再让 Codex 泛泛“优化 UI”。目标必须收窄为：

> 把当前系统从“AI 生成后台模板”改成“可信的酒店集团采购 SaaS”。

验收时重点看第一眼：

- 是否像真实客户会购买的 B2B 系统；
- 是否有清晰信息层级；
- 是否减少模板感、堆叠感、口号感；
- 是否登录页一屏完成；
- 是否本地/UAT 可以选择角色；
- 是否核心页面风格统一；
- 是否不靠大面积渐变、阴影、卡片堆叠来制造“设计感”。

---

## 2. 设计方向

### 2.1 产品气质

采用“克制、清爽、可信、业务密度适中”的政企 SaaS 风格。

不要做：

- 大面积深色侧边栏压迫感；
- 大量渐变背景；
- 大量投影卡片；
- 每个卡片都带标题+说明+图标；
- 单字方块图标；
- AI 常见的“炫酷驾驶舱”；
- 页面上到处是 KPI 卡片。

要做：

- 浅色主界面；
- 低饱和品牌色；
- 左侧导航更像企业系统，不像运营后台模板；
- 信息模块少而清楚；
- 表格、详情、流程状态是主角；
- 按钮少而明确；
- 工作台突出“待处理”和“风险”，不是功能合集。

### 2.2 推荐视觉基准

不是照抄某个产品，但气质参考：

- 企业 OA / ERP 的清晰、稳重；
- 飞书/钉钉管理后台的轻量秩序；
- 政企采购平台的低调可信；
- 酒店集团供应链系统的业务感。

---

## 3. 设计系统二次重建

### 3.1 字体

当前字体不应把 `Inter` 放在中文前面。中文业务系统应优先系统中文字体。

建议：

```css
--ep-font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", Arial, sans-serif;
--ep-font-family-number: "DIN Alternate", "Segoe UI", Arial, sans-serif;
```

标题不要过黑，不要全局 700。建议：

```css
--ep-font-weight-regular: 400;
--ep-font-weight-medium: 500;
--ep-font-weight-semibold: 600;
--ep-font-weight-bold: 600;
```

字号建议：

```css
--ep-font-page-title: 22px;
--ep-font-section-title: 16px;
--ep-font-card-title: 15px;
--ep-font-body: 14px;
--ep-font-meta: 12px;
```

### 3.2 色彩

当前深蓝侧边栏和琥珀色标签让页面显得厚重。建议改成浅色主界面 + 低饱和深蓝作为品牌强调。

建议 token：

```css
--ep-color-brand: #1F4E79;
--ep-color-brand-hover: #173E63;
--ep-color-brand-soft: #EAF2F8;

--ep-color-bg: #F6F8FB;
--ep-color-surface: #FFFFFF;
--ep-color-surface-muted: #F9FAFB;
--ep-color-border: #E5EAF0;
--ep-color-border-strong: #CCD6E0;

--ep-color-text: #1F2937;
--ep-color-text-secondary: #4B5563;
--ep-color-text-muted: #6B7280;

--ep-color-sidebar-bg: #FFFFFF;
--ep-color-sidebar-active: #EEF5FB;
--ep-color-sidebar-active-border: #1F4E79;
--ep-color-sidebar-text: #344054;
--ep-color-sidebar-muted: #667085;
```

状态色要低饱和：

```css
--ep-color-success: #16845B;
--ep-color-success-bg: #EAF7F1;
--ep-color-warning: #A15C07;
--ep-color-warning-bg: #FFF6E5;
--ep-color-error: #B42318;
--ep-color-error-bg: #FDECEC;
--ep-color-info: #2563EB;
--ep-color-info-bg: #EEF4FF;
```

### 3.3 间距和圆角

减少卡片感，增加业务密度。

```css
--ep-radius-sm: 6px;
--ep-radius-md: 8px;
--ep-radius-lg: 10px;
--ep-radius-xl: 12px;

--ep-density-page-gap: 16px;
--ep-density-surface-padding: 18px;
--ep-density-table-row-height: 44px;
```

投影要极少用：

```css
--ep-shadow-card: 0 1px 2px rgba(16, 24, 40, 0.05);
--ep-shadow-popover: 0 12px 32px rgba(16, 24, 40, 0.12);
```

---

## 4. 登录页重做要求

### 4.1 登录页必须一屏完成

硬性验收：

- 1366×768 下不滚动；
- 1440×900 下不滚动；
- 390×844 移动端允许纵向滚动，但核心登录入口必须首屏可见；
- 本地/UAT 环境角色选择必须可见且可用；
- Production 环境隐藏角色选择，只显示正式认证入口。

### 4.2 登录页布局

推荐两栏布局：

左侧 52%：品牌区  
右侧 48%：登录卡片

左侧内容控制在 4 块以内：

- 平台名称；
- 一句话定位：`酒店集团采购、评审、履约与结算协同系统`；
- 3 个业务能力短句：`采购申请`、`供应商报价`、`专家评审`；
- 环境标识：本地验证 / UAT / 生产。

不要放长篇说明，不要放大段流程卡片。

右侧登录卡片：

- 标题：`登录采购平台`；
- 正式登录按钮：`使用统一身份登录`；
- 本地/UAT 辅助入口：`选择验证角色`；
- 角色选择用紧凑下拉或 2 行以内的 segmented control；
- 角色数量多时不要铺满卡片，用下拉搜索。

### 4.3 角色选择修复

Local/UAT 模式必须满足：

- 可以选择集团采购管理人；
- 可以选择采购经办人；
- 可以选择酒店采购；
- 可以选择供应商管理员；
- 可以选择供应商报价员；
- 可以选择专家；
- 可以选择财务审核；
- 可以选择审计；
- 可以选择管理员；
- 选择后能进入对应首页；
- 角色选择入口不得被生产模式逻辑误隐藏。

建议新增 E2E：

```bash
npm run ui:login-role-smoke
```

覆盖：

- local 模式角色选择可见；
- production 模式角色选择隐藏；
- 每个角色点击后进入正确工作台；
- 登录页 1366×768 不出现 body 纵向滚动。

---

## 5. 主框架重做要求

### 5.1 侧边栏

当前深色大侧栏 + 方块单字图标很像 AI 后台模板。建议改为浅色侧边栏。

要求：

- 侧边栏宽度 248px 左右；
- 背景白色；
- 左侧加 1px 分隔线或右侧边框；
- 选中项用浅蓝底 + 左侧 3px 品牌色竖线；
- 取消单字方块图标；
- 使用简洁线性图标，或者无图标，仅靠分组和文字；
- 菜单分组标题弱化，不要像文档目录；
- 本地验证环境标识放到底部小条，不要抢视觉。

### 5.2 顶部栏

顶部栏要轻，不要按钮堆叠。

建议：

左侧：面包屑 + 当前页标题  
右侧：消息、当前角色、账号、退出

角色切换在本地/UAT 可以有，但不要像业务按钮。建议放入账号下拉菜单：

`切换验证角色`。

### 5.3 内容区

要求：

- 内容最大宽度 1280–1360px；
- 页面左右留白统一；
- 首页不要出现太多大卡片；
- 首屏必须能看到主要待办；
- 卡片边框比阴影更重要；
- 数据表格和流程详情要成为核心视觉。

---

## 6. 工作台重做要求

### 6.1 工作台不要像功能矩阵

采购经办人工作台建议结构：

1. 顶部业务摘要条，一行展示：待处理采购、报价截止提醒、待发公告、异常订单。
2. 左侧主区域：`待我处理` 表格/列表。
3. 右侧窄栏：`风险提醒` + `常用操作`。
4. 下方：`进行中的项目`。

不要再使用四个平均大卡片承载“今日重点 / 风险提醒 / 可发起动作 / 权限边界”。这看起来像 AI 按需求点生成。

### 6.2 示例结构

```text
页面标题：采购经办工作台
副标题：处理采购项目、报价截止、公告邀请和定标材料

[摘要条]
待处理采购 20 | 今日截止报价 2 | 待发布公告 0 | 异常订单 0

[主内容 70%]
待我处理
- 项目名称 / 当前节点 / 截止时间 / 风险 / 操作

[右侧 30%]
风险提醒
- 报价截止前 2 小时
- 文件未锁定
- 供应商报名不足

常用操作
- 新建采购项目
- 发布公告邀请
- 维护采购文件
```

---

## 7. 核心页面重做范围

本轮至少重做这些页面模板：

1. 登录页；
2. AppShell；
3. 工作台；
4. 采购申请列表；
5. 采购项目详情；
6. 供应商门户；
7. 报价响应页；
8. 专家评分页；
9. 结算材料页；
10. 审计日志页；
11. 无权限页；
12. 错误页；
13. 空状态。

重点不是每页加组件，而是让这些页面统一成一套产品语言。

---

## 8. 组件改造要求

### 8.1 BaseButton

- 主按钮只用于核心动作；
- 次按钮用边框按钮；
- 危险按钮低频出现；
- 按钮高度 32/36；
- 避免大圆角、大阴影。

### 8.2 DataTable

- 表头背景淡灰；
- 行高 44；
- 操作列固定靠右；
- 状态标签统一；
- 空表格展示真实业务空状态；
- 不要让表格像 Markdown 表。

### 8.3 StatusTag

状态标签不要太鲜艳。建议：

- 待处理：蓝灰；
- 进行中：蓝；
- 风险：橙；
- 完成：绿；
- 拒绝/异常：红；
- 归档/只读：灰。

### 8.4 Card / Surface

减少大卡片堆叠。新增两类容器：

- `EpPanel`：页面区域容器；
- `EpSection`：内容小节；

卡片只用于 KPI 或动作入口，不要所有内容都是卡片。

---

## 9. 新增视觉验收规则

### 9.1 新增脚本

建议新增或增强：

```bash
npm run ui:layout-check
npm run ui:login-role-smoke
npm run ui:visual-review-pack
```

### 9.2 检查项

`ui:layout-check`：

- 登录页 1366×768 不滚动；
- AppShell 内容区宽度合理；
- 桌面端侧边栏不超过 260px；
- 页面首屏主操作可见；
- 首页模块数量不超过规则；
- 不允许单字方块图标类名继续存在；
- 不允许深色侧边栏作为默认商业主题；
- 不允许过多渐变/阴影类。

`ui:login-role-smoke`：

- local/UAT 显示角色选择；
- production 隐藏角色选择；
- 各角色可进入正确工作台；
- 切换角色入口在本地/UAT 可用。

`ui:visual-review-pack`：

生成截图：

- login desktop；
- login mobile；
- buyer dashboard；
- group dashboard；
- supplier portal；
- bid response；
- expert scoring；
- settlement；
- audit；
- permission denied；
- error state；
- empty state。

输出到：

```text
docs/sellable-readiness/visual-review-pack/
```

并更新：

```text
docs/sellable-readiness/04_VISUAL_REDESIGN_REPORT.md
docs/sellable-readiness/05_UI_COMMERCIAL_CHECK_REPORT.md
```

---

## 10. Codex 执行边界

### 10.1 允许修改

- `apps/web/src/design-system/*`
- `apps/web/src/layouts/AppShell.vue`
- `apps/web/src/pages/login/*`
- `apps/web/src/components/base/*`
- 核心页面 shell/template
- UI 检查脚本
- 视觉证据脚本
- sellable-readiness UI 报告

### 10.2 不允许修改

- 不要重写后端业务流程；
- 不要删除已有测试；
- 不要弱化 production gate；
- 不要关闭 copy scan；
- 不要把 production NO_GO 改成 GO；
- 不要伪造客户外部系统接入；
- 不要为了截图 PASS 隐藏真实问题。

---

## 11. 本轮验收标准

### 11.1 功能验收

必须通过：

```bash
npm run typecheck
npm run ui:copy-scan
npm run ui:commercial-check
npm run ui:visual-evidence
npm run ui:login-role-smoke
npm run ui:layout-check
npm run sellable:check
```

如果 `sellable:check` 因生产外部条件 NO_GO 可以保留，但不得因 UI、登录页、角色选择、视觉规则失败。

### 11.2 人工验收

人工打开本地页面检查：

- 登录页一屏展示，不需要滚动；
- 本地模式可选择角色；
- 角色进入正确首页；
- 首页不像功能矩阵；
- 侧边栏不再是厚重深色模板；
- 无单字方块图标；
- 表格、卡片、状态标签风格统一；
- 页面视觉克制、真实、可信；
- 第一眼像可售卖软件，不像 AI Demo。

---

## 12. 给 Codex 的直接提示词

```md
# Goal: UI Redesign Second Pass - Remove AI Template Look

基于当前分支 `codex/ui-visual-redesign-production-readiness` 新开工作分支：

`codex/ui-commercial-redesign-second-pass`

上一轮虽然 `ui:commercial-check` 和 `ui:visual-evidence` 已经 PASS，但人工验收发现 UI 仍然很像 AI 生成的后台模板：配色厚重、侧边栏像模板、单字图标生硬、工作台像功能矩阵、字体和排版不适合中文 B2B 系统。登录页也存在严重问题：页面过长需要滚动，本地/UAT 角色选择不清晰或不可用。

本轮目标不是继续做文案去 AI 化，而是真正重做视觉产品体验，让系统第一眼像可售卖的酒店集团采购 SaaS。

请严格执行：

`docs/eprocurement_ui_redesign_second_pass_plan_v4.md`

如果文件位置不同，请在仓库中查找：

`eprocurement_ui_redesign_second_pass_plan_v4.md`

重点任务：

1. 重建中文 B2B 设计 token：字体、字号、色彩、间距、圆角、阴影。
2. 把默认商业主题改为浅色政企 SaaS 风格，取消厚重深色侧边栏。
3. 取消单字方块图标，不再让菜单像 AI 生成后台。
4. 重做登录页，1366×768 和 1440×900 下不滚动。
5. 修复 Local/UAT 角色选择，必须能选择并进入各角色工作台。
6. 重做 AppShell、顶部栏、侧边栏、工作台信息架构。
7. 工作台从功能矩阵改成“待我处理 + 风险提醒 + 常用操作 + 进行中项目”。
8. 统一表格、卡片、状态标签、按钮、空状态、错误状态、无权限页。
9. 新增 `ui:layout-check`、`ui:login-role-smoke`、`ui:visual-review-pack`。
10. 更新 visual redesign 和 commercial check 报告。

不要做：

- 不要重写后端业务流程；
- 不要删除已有测试；
- 不要弱化 production gate；
- 不要把 production NO_GO 改成 GO；
- 不要伪造客户外部系统接入；
- 不要只靠改颜色和加阴影糊弄视觉重设计。

验收命令：

```bash
npm run typecheck
npm run ui:copy-scan
npm run ui:commercial-check
npm run ui:visual-evidence
npm run ui:login-role-smoke
npm run ui:layout-check
npm run sellable:check
```

最终人工验收标准：

- 登录页一屏完成，不滚动；
- 本地/UAT 可选择角色；
- 默认主题不再是厚重深色模板；
- 菜单不再使用单字方块图标；
- 工作台不再像功能矩阵；
- 页面视觉像成熟 B2B SaaS；
- Production 可以继续 NO_GO，但原因不能是 UI 商业质感不足。
```

---

## 13. 最终判断

如果本轮完成后人工仍然觉得“像 AI 生成”，说明不能继续让 Codex 自己判断美观。下一步应该引入固定参考稿：

- 先画 1 张登录页；
- 1 张工作台；
- 1 张项目详情；
- 1 张供应商门户；

让 Codex 严格按这 4 张设计稿实现，而不是让它自由发挥。
