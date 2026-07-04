# 酒店供应链采购平台 UI 第四轮产品化实施计划 V1

> 适用分支：`codex/ui-commercial-redesign-second-pass`  
> 本轮目标：在第二、三轮基础上继续去除“通用 AI 后台模板感”，把关键业务页面改成更像酒店集团采购 SaaS 的真实工作界面。  
> 本轮边界：不重写后端业务流程，不删除既有测试，不弱化 production gate，不把 `production NO_GO` 改成 `GO`，不伪造客户外部系统接入。

## 1. 当前判断

第二轮和第三轮已经解决了深色侧边栏、单字图标、登录页过长、工作台功能矩阵等明显问题，但关键业务页面仍有模板化痕迹：

- 页面大量沿用 `PageHeader + EnterpriseSurface + SummaryCards` 的通用后台拼法；
- 采购项目、供应商响应、专家评分、履约结算等关键路径缺少真实业务结构；
- 表格、摘要和提示仍像需求点拆成卡片，而不是采购人员每天处理的业务台账；
- 视觉检查脚本能证明页面可打开，但还不能充分证明页面不像 AI 模板。

## 2. 第四轮目标

把关键路径从“后台卡片拼装”推进到“业务工作界面”：

1. 登录页继续企业门户化，降低本地验证入口的测试工具感；
2. 工作台继续保持“待处理 + 风险 + 常用操作 + 进行中项目”的业务结构；
3. 招采执行详情突出项目节点、供应商响应、报价、评审和定标链路；
4. 供应商门户突出准入状态、资料完整度、待补材料和可执行动作；
5. 专家评分页突出当前评分单、供应商、评分构成、提交状态和材料入口；
6. 履约结算页突出订单、收货验收、结算、评价、归档的证据链；
7. 强化视觉验收脚本，增加关键业务页截图和反模板检查。

## 3. 页面改造范围

本轮优先改造：

- `apps/web/src/pages/login/*`
- `apps/web/src/pages/dashboard/*`
- `apps/web/src/pages/project-sourcing/*`
- `apps/web/src/pages/supplier-portal/*`
- `apps/web/src/pages/expert-scoring/*`
- `apps/web/src/pages/project-fulfillment/*`
- `apps/web/src/design-system/enterprise.css`
- `scripts/ui-second-pass-checks.mjs`
- `scripts/ui-commercial-check.mjs`
- `docs/sellable-readiness/*`

## 4. 验收方式

必须继续通过：

```bash
npm run typecheck
npm run ui:copy-scan
npm run ui:commercial-check
npm run ui:visual-evidence
npm run ui:login-role-smoke
npm run ui:layout-check
npm run sellable:check
```

新增人工验收重点：

- 关键业务页第一眼是否像真实采购系统；
- 页面是否有清楚的当前节点、责任链、风险和下一步动作；
- 是否减少模板式大卡片堆叠、按钮矩阵和泛化摘要；
- 本地/UAT 入口是否可用但不过度暴露测试感；
- `production NO_GO` 是否继续保留真实原因。
