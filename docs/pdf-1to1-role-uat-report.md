# PDF 1:1 十类角色浏览器 UAT 报告

日期：2026-06-25  
证据目录：`output/pdf-1to1-browser-evidence/`  
验收结果：10 类角色全部通过；页面失败 0；API 旁证失败 0；浏览器控制台 error/warning 0。

## 角色路径

| 角色 | 用户 | 已跑通路径 | 证据截图 |
|---|---|---|---|
| 采购管理员 | `u1` | 首页、采购申请、采购文件、公告邀请、报价控制、定标结果、我的任务 | `procurement-admin-*.png` |
| 酒店采购 | `u8` | 项目工作台、商城下单/订单入口、履约说明、我的任务、审计查看 | `hotel-buyer-*.png` |
| 酒店财务 | `u9` | 商城资金/结算入口、履约说明、审计查看、我的任务 | `hotel-finance-*.png` |
| 供应商管理员 | `u11` | 供应商档案、报名资料、商城订单/发票入口、履约说明、我的任务 | `supplier-admin-*.png` |
| 供应商报价人员 | `u12` | 报名、报价响应、文件中心、消息、我的任务 | `supplier-quotation-*.png` |
| 专家 | `u7` | 专家评分、我的任务、消息中心 | `expert-*.png` |
| 平台运营 | `u10` | 首页、供应商档案、商城商品、采购文件、公告邀请 | `platform-ops-*.png` |
| 财务审核 | `u13` | 商城结算/发票/资金入口、履约说明、审计查看、我的任务 | `finance-reviewer-*.png` |
| 审计只读 | `u5` | 首页、审计日志、项目档案、报价控制、商城只读查看 | `auditor-*.png` |
| 系统管理员 | `u6` | 首页、审批规则维护、权限与基础配置；不处理业务数据 | `system-admin-*.png` |

## API 旁证

| 角色 | API 旁证 |
|---|---|
| 采购管理员 | `/api/projects`、`/api/procurement-requests`、`/api/workflow/tasks`、`/api/workflow/notifications`、`/api/inquiry-sheets` 均 200 |
| 酒店采购 | `/api/project-workbench/projects/p-pre`、`/api/mall/products`、`/api/mall/orders`、`/api/workflow/tasks` 均 200 |
| 酒店财务 | `/api/mall/fund-accounts`、`/api/settlement-finance/overview`、`/api/workflow/tasks` 均 200 |
| 供应商管理员 | `/api/suppliers`、`/api/registrations`、`/api/mall/orders`、`/api/workflow/tasks` 均 200 |
| 供应商报价人员 | `/api/supplier-invitations`、`/api/registrations`、`/api/projects/p-pre/bids/summary`、`/api/workflow/notifications` 均 200 |
| 专家 | `/api/expert-review/my-scoring-sheets`、`/api/workflow/tasks`、`/api/workflow/notifications` 均 200 |
| 平台运营 | `/api/suppliers`、`/api/mall/products`、`/api/projects`、`/api/procurement-documents` 均 200 |
| 财务审核 | `/api/settlement-finance/overview`、`/api/mall/fund-accounts`、`/api/workflow/tasks` 均 200 |
| 审计只读 | `/api/audit-logs`、`/api/archive-audit-logs`、`/api/projects`、`/api/sensitive-action-logs` 均 200 |
| 系统管理员 | `/api/me`、`/api/workflow/approval-rules`、`/api/me/menus` 均 200 |

## 结论

十类角色均可独立进入对应业务路径。系统管理员仅能维护用户、角色、组织、字典、流程规则等配置，不进入业务办理链路。浏览器证据已保存到 `output/pdf-1to1-browser-evidence/`。
