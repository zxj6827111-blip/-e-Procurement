# Login Role Smoke Report

- Generated at: 2026-07-04T18:50:04.148Z
- Result: PASS

| Check | Status | Evidence |
| --- | --- | --- |
| local-role-select-visible | PASS | 集团采购管理 / 集团采购管理部 / 采购经办 / 华东区域公司 / 酒店采购 / 上海滨江华礼酒店 / 供应商管理员 / 上海棉织供应链有限公司 / 供应商报价员 / 上海棉织供应链有限公司 / 专家 / 集团评审专家库 / 财务审核 / 集团财务共享中心 / 酒店财务 / 上海滨江华礼酒店 / 审计监督 / 集团纪检审计部 / 系统管理员 / 集团信息中心 |
| local-login-no-scroll-1366x768 | PASS | scrollHeight=768, viewport=768 |
| role-entry-u1 | PASS | 集团采购管理人: finalPath=/, expected=/, shell=1 |
| role-entry-u2 | PASS | 采购经办人: finalPath=/, expected=/, shell=1 |
| role-entry-u8 | PASS | 酒店采购: finalPath=/procurement-requests, expected=/procurement-requests, shell=1 |
| role-entry-u11 | PASS | 供应商管理员: finalPath=/, expected=/, shell=1 |
| role-entry-u12 | PASS | 供应商报价员: finalPath=/bidding, expected=/bidding, shell=1 |
| role-entry-u7 | PASS | 专家: finalPath=/expert-scoring, expected=/expert-scoring, shell=1 |
| role-entry-u13 | PASS | 财务审核: finalPath=/, expected=/, shell=1 |
| role-entry-u5 | PASS | 审计: finalPath=/, expected=/, shell=1 |
| role-entry-u6 | PASS | 管理员: finalPath=/permissions, expected=/permissions, shell=1 |
| production-hides-local-role-select | PASS | mode=production; roleSelectors=0; bodyHasProduction=true |
| production-blocks-role-switch-route | PASS | finalPath=/login; selectors=0 |

## Boundary

This smoke covers Local/UAT role selection and verifies runtime production mode hides and blocks local role entry. It does not enable mock login in production.
