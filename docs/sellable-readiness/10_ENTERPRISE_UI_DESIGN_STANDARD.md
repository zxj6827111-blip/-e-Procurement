# Enterprise UI Design Standard

本文件记录本轮采购中台视觉重构的设计准则，作为后续页面重构、截图审阅和自动检查的共同依据。

## Design Intent

- 产品气质：可信、克制、高信息密度，服务采购、审批、报价、评审、审计等严肃工作流。
- 审美底盘：参考 `ui-ux-pro-max-skill` 的 Trust & Authority、Data-Dense Dashboard、Minimalism 方向，避免大面积高饱和色块和廉价渐变。
- 信息原则：先业务判断，再操作入口；避免为了“丰富”堆叠无意义卡片。
- 动效原则：只保留进入、悬停、焦点和进度变化四类轻动效，不做营销型炫技。

## Color Rules

- Brand / Sidebar: Cloud Spruce `#173F3D`，承担系统身份和导航秩序。
- Primary Action: Operational Teal `#245F5B`，用于主要按钮、可点击主链路和表格轻交互。
- Micro Accent: Sand Gold `#B8872F`，只用于选中竖线、当前进度节点和少量提示，不作为大面积按钮底色。
- Background: Neutral Mist `#F4F6F5`，页面主体保持轻灰留白，不使用纯白大平面铺满。
- Surface: `#FFFFFF`，只允许克制微阴影，禁止死黑投影。
- Status Tag: 极淡背景 + 同色深文字，不使用大红大绿实心色块。

## Typography Rules

- 字体优先级：`PingFang SC`, `Helvetica Neue`, `Microsoft YaHei`, `Segoe UI`, `Arial`, `sans-serif`。
- 页面标题控制在 18px 左右，使用中等字重，避免黑粗大标题带来的模板感。
- KPI 数字不得孤立放大，必须同时提供 label、说明和业务口径。
- 表格和表单以 13-14px 为主，保持 B 端信息密度。

## Layout Rules

- Top Bar 固定 56px，左 Logo，右侧为角色切换、消息、头像。
- Sidebar 固定 220px，动态渲染角色菜单，不显示无权限空菜单。
- Main Content 使用 16-20px 节奏，卡片不超过必要层级，减少空洞留白。
- 版式 A 首屏固定为 KPI、70/30 待办和快捷操作、底部项目甘特图；留白服务分组，不制造空洞卡片高度。
- 版式 B 聚焦列表、筛选、批量处理或分屏详情。
- 版式 C 聚焦任务表单、关键操作、暂存/提交锁定。
- 版式 D 聚焦权限矩阵、审计流水、溯源密度。

## Current Round Acceptance

- 登录页、Shell、A 工作台必须先通过人工截图审阅。
- 自动检查只证明结构、Token 和路由一致，不代表审美已经最终通过。
- 本轮不改 RBAC 权限模型、不改 API 数据结构、不新增业务流程。
