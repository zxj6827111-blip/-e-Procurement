# 异常路径专项回归报告

- 执行时间：2026-07-14T07:35:49.474Z
- API：http://127.0.0.1:3386
- Web：http://127.0.0.1:5346
- 结果：通过（20/20）

## 覆盖范围

- 未登录访问、错误角色、系统管理员业务隔离
- 采购申请创建、提交、审批、方式判定、转项目、撤销/删除的反向校验
- 项目状态机跳级、外部交易分支误用内部动作
- 供应商数据隔离、文件上传范围、商城订单供应商归属
- 浏览器侧直达无权限页、未知角色失败关闭、新建采购申请必填校验、未知路由错误态

## 明细

| 层级 | 用例 | 预期 | 实际 | 结果 |
| --- | --- | --- | --- | --- |
| API | 未登录访问业务列表必须被拦截 | UNAUTHENTICATED | 401 UNAUTHENTICATED | 通过 |
| API | 采购经办不能代替酒店采购发起采购申请 | PROCUREMENT_REQUEST_INITIATOR_REQUIRED | 403 PROCUREMENT_REQUEST_INITIATOR_REQUIRED | 通过 |
| API | 系统管理员不能写入业务申请数据 | PHASE1_BUSINESS_ACTION_DENIED | 403 PHASE1_BUSINESS_ACTION_DENIED | 通过 |
| API | 伪造采购申请附件引用必须拒绝 | PROCUREMENT_REQUEST_ATTACHMENT_INVALID | 400 PROCUREMENT_REQUEST_ATTACHMENT_INVALID | 通过 |
| API | 非集团审批角色不能审批采购申请 | PROCUREMENT_REQUEST_APPROVER_REQUIRED | 403 PROCUREMENT_REQUEST_APPROVER_REQUIRED | 通过 |
| API | 审批未通过前不能转采购项目 | PROCUREMENT_REQUEST_SCOPE_DENIED | 403 PROCUREMENT_REQUEST_SCOPE_DENIED | 通过 |
| API | 已提交申请不能硬删除 | PROCUREMENT_REQUEST_DELETE_DENIED | 400 PROCUREMENT_REQUEST_DELETE_DENIED | 通过 |
| API | 未判定采购方式前不能创建采购项目 | PROCUREMENT_REQUEST_NOT_READY | 400 PROCUREMENT_REQUEST_NOT_READY | 通过 |
| API | 申请已转项目后不能从申请页撤销 | PROCUREMENT_REQUEST_CANCEL_DENIED | 400 PROCUREMENT_REQUEST_CANCEL_DENIED | 通过 |
| API | 供应商不能直接推进采购项目状态 | PHASE1_BUSINESS_ACTION_DENIED | 403 PHASE1_BUSINESS_ACTION_DENIED | 通过 |
| API | 项目状态不能跳级推进 | PROJECT_STATUS_TRANSITION_DENIED | 400 PROJECT_STATUS_TRANSITION_DENIED | 通过 |
| API | 外部交易项目不能执行内部招采动作 | EXTERNAL_TRADE_INTERNAL_ACTION_BLOCKED | 403 EXTERNAL_TRADE_INTERNAL_ACTION_BLOCKED | 通过 |
| API | 供应商不能读取其他供应商档案/参与数据 | SUPPLIER_SCOPE_DENIED | 403 SUPPLIER_SCOPE_DENIED | 通过 |
| API | 无业务归属的文件上传必须拒绝 | FILE_UPLOAD_SCOPE_DENIED | 403 FILE_UPLOAD_SCOPE_DENIED | 通过 |
| API | 商城购物车数量不能为 0 | MALL_CART_QUANTITY_INVALID | 400 MALL_CART_QUANTITY_INVALID | 通过 |
| API | 非订单所属供应商不能确认商城订单 | MALL_SUPPLIER_SCOPE_DENIED | 403 MALL_SUPPLIER_SCOPE_DENIED | 通过 |
| Browser | 采购经办直达审批规则页必须进入无权限页 | /permission-denied + 当前角色不可访问 | /permission-denied; body=G-Hotel Enterprise Procurement Platform 采 集团内部采购规范化平台 招采流程 · 供应协同 · 履约审计 采购经办人 刘 | 通过 |
| Browser | 未知角色必须失败关闭到无权限页 | unknown_role -> /permission-denied | /permission-denied; body=权限边界 当前角色不可访问 当前账号没有访问该业务页面的岗位权限。请返回工作台，或切换到具备授权的验证角色。 权 当前角色不可访问 系统已阻止本次直达访问。采购 | 通过 |
| Browser | 新建采购申请空标题必须前端拦截且不调用创建接口 | required field error + no POST /api/procurement-requests | posts=0; body=集团内部采购规范化平台 酒店采购 酒店采购 工作台 我的待办 采购申请 商品目录 订单履约 退出登录 酒店采购 / 新建采购申请 酒店采购中心 酒 新建采购申请 录入酒店需求，保存为草稿或直接提交集团 | 通过 |
| Browser | 未知路由必须展示错误状态而不是空白页 | 错误状态页面 | /not-found-visual-check; body=G-Hotel Enterprise Procurement Platform 采 集团内部采购规范化平台 招采流程 · 供应协同 · 履约审计 采购经办人 刘明 工作台 我的待办 采购申请 采购项目 | 通过 |

## 证据文件

- JSON：`output/ui-abnormal-path/abnormal-path-regression.json`
- 截图目录：`output/ui-abnormal-path/screenshots`
- 日志目录：`output/ui-abnormal-path`
