const data = window.PROCUREMENT_MOCK;

const state = {
  roleId: "group_manager",
  page: "dashboard",
  selectedProjectId: "p-pre",
  awardReason: "",
  expertChecks: {
    avoidance: true,
    discipline: true,
    confidentiality: true
  },
  expertSubmitted: false
};

const navGroups = [
  {
    title: "工作台",
    items: [
      { id: "dashboard", label: "集团采购驾驶舱", roles: ["group_manager", "buyer", "supplier", "expert", "auditor", "admin"] },
      { id: "myTasks", label: "我的待办", roles: ["group_manager", "buyer", "supplier", "expert", "auditor", "admin"] }
    ]
  },
  {
    title: "采购业务",
    items: [
      { id: "needs", label: "需求与方式判断", roles: ["group_manager", "buyer", "auditor"] },
      { id: "projects", label: "采购项目与流程", roles: ["group_manager", "buyer", "supplier", "expert", "auditor"] },
      { id: "suppliers", label: "供应商管理", roles: ["group_manager", "buyer", "supplier", "auditor"] },
      { id: "bidSecrecy", label: "报价保密与异常查看", roles: ["group_manager", "buyer", "supplier", "expert", "auditor"] },
      { id: "expertReview", label: "专家评审", roles: ["group_manager", "buyer", "expert", "auditor"] },
      { id: "award", label: "定标审批与结果通知", roles: ["group_manager", "buyer", "auditor"] },
      { id: "externalTrade", label: "外部交易备案", roles: ["group_manager", "buyer", "auditor"] }
    ]
  },
  {
    title: "履约与监督",
    items: [
      { id: "contracts", label: "合同台账与履约", roles: ["group_manager", "buyer", "supplier", "auditor"] },
      { id: "archives", label: "项目档案与审计日志", roles: ["group_manager", "buyer", "auditor"] }
    ]
  },
  {
    title: "系统配置",
    items: [
      { id: "admin", label: "基础配置", roles: ["admin"] }
    ]
  }
];

const pageTitles = {
  dashboard: "集团采购驾驶舱",
  myTasks: "我的待办",
  needs: "采购需求与方式判断",
  projects: "采购项目与流程",
  suppliers: "供应商管理",
  bidSecrecy: "报价保密与异常查看",
  expertReview: "专家评审",
  award: "定标审批与结果通知",
  externalTrade: "外部交易备案",
  contracts: "合同台账与履约",
  archives: "项目档案与审计日志",
  admin: "基础配置"
};

const roleSelect = document.querySelector("#roleSelect");
const roleHint = document.querySelector("#roleHint");
const navList = document.querySelector("#navList");
const pageTitle = document.querySelector("#pageTitle");
const pageContent = document.querySelector("#pageContent");
const alertStrip = document.querySelector("#alertStrip");
const modal = document.querySelector("#modal");
const modalTitle = document.querySelector("#modalTitle");
const modalBody = document.querySelector("#modalBody");

function init() {
  data.roles.forEach((role) => {
    const option = document.createElement("option");
    option.value = role.id;
    option.textContent = role.name;
    roleSelect.appendChild(option);
  });
  roleSelect.value = state.roleId;
  roleSelect.addEventListener("change", () => {
    state.roleId = roleSelect.value;
    ensureAllowedPage();
    ensureVisibleProject();
    render();
  });
  document.querySelector("#modalClose").addEventListener("click", () => modal.close());
  document.querySelector("#auditQuickBtn").addEventListener("click", () => openAuditModal());
  document.querySelector("#reviewModeBtn").addEventListener("click", () => openReviewGuide());
  document.addEventListener("click", handleClick);
  document.addEventListener("input", handleInput);
  render();
}

function currentRole() {
  return data.roles.find((role) => role.id === state.roleId);
}

function currentUser() {
  return data.users.find((user) => user.roleId === state.roleId);
}

function currentProject() {
  return visibleProjects().find((project) => project.id === state.selectedProjectId) || visibleProjects()[0] || data.projects[0];
}

function supplierName(id) {
  return data.suppliers.find((supplier) => supplier.id === id)?.name || id;
}

function expertName(id) {
  return data.experts.find((expert) => expert.id === id)?.name || id;
}

function visibleProjects() {
  const user = currentUser();
  if (state.roleId === "supplier") {
    return data.projects.filter((project) => project.participantSupplierIds.includes(user.supplierId));
  }
  if (state.roleId === "expert") {
    const assignedProjectIds = data.expertAssignments
      .filter((assignment) => assignment.expertId === user.expertId)
      .map((assignment) => assignment.projectId);
    return data.projects.filter((project) => assignedProjectIds.includes(project.id));
  }
  if (state.roleId === "buyer") {
    return data.projects.filter((project) => user.managedProjectIds.includes(project.id));
  }
  if (state.roleId === "group_manager" || state.roleId === "auditor") {
    return data.projects.filter((project) => user.orgScope.includes(project.orgId));
  }
  return data.projects;
}

function visibleSuppliers() {
  const user = currentUser();
  if (state.roleId === "supplier") return data.suppliers.filter((supplier) => supplier.id === user.supplierId);
  return data.suppliers;
}

function visibleContracts() {
  const user = currentUser();
  if (state.roleId === "supplier") return data.contracts.filter((contract) => contract.supplierId === user.supplierId);
  return data.contracts;
}

function visibleEvaluations() {
  const user = currentUser();
  if (state.roleId === "supplier") return data.supplierEvaluations.filter((item) => item.supplierId === user.supplierId);
  return data.supplierEvaluations;
}

function ensureAllowedPage() {
  const allItems = navGroups.flatMap((group) => group.items);
  const active = allItems.find((item) => item.id === state.page);
  if (!active || !active.roles.includes(state.roleId)) {
    state.page = allItems.find((item) => item.roles.includes(state.roleId))?.id || "dashboard";
  }
}

function ensureVisibleProject() {
  if (!visibleProjects().some((project) => project.id === state.selectedProjectId)) {
    state.selectedProjectId = visibleProjects()[0]?.id || "p-pre";
  }
}

function render() {
  roleHint.textContent = currentRole().hint;
  renderNav();
  renderAlerts();
  pageTitle.textContent = pageTitles[state.page] || "MVP Demo";
  const renderers = {
    dashboard: renderDashboard,
    myTasks: renderMyTasks,
    needs: renderNeeds,
    projects: renderProjects,
    suppliers: renderSuppliers,
    bidSecrecy: renderBidSecrecy,
    expertReview: renderExpertReview,
    award: renderAward,
    externalTrade: renderExternalTrade,
    contracts: renderContracts,
    archives: renderArchives,
    admin: renderAdmin
  };
  pageContent.innerHTML = renderers[state.page]();
}

function renderNav() {
  navList.innerHTML = navGroups
    .map((group) => {
      const items = group.items.filter((item) => item.roles.includes(state.roleId));
      if (!items.length) return "";
      return `
        <div class="nav-group-title">${group.title}</div>
        ${items
          .map((item) => `<button class="nav-button ${state.page === item.id ? "active" : ""}" type="button" data-page="${item.id}">${item.label}</button>`)
          .join("")}
      `;
    })
    .join("");
}

function renderAlerts() {
  const alerts = [
    { type: "info", title: `当前角色：${currentRole().name}`, text: currentRole().hint },
    { type: "warn", title: "客户评审版边界", text: "本轮只修正 Demo、Mock 和文档，不接真实后端、不落正式数据库、不做正式接口联调。" }
  ];
  if (["buyer", "group_manager", "auditor"].includes(state.roleId)) {
    alerts.push({ type: "danger", title: "报价截止前保密", text: "报价截止前，采购方和监督方默认不可查看报价明细、响应文件和附件下载入口。" });
  }
  if (state.roleId === "supplier") {
    alerts.push({ type: "good", title: "供应商数据隔离", text: "当前视角基于 currentUser.supplierId 过滤，仅展示本企业相关数据。" });
  }
  if (state.roleId === "expert") {
    alerts.push({ type: "good", title: "专家独立评审", text: "当前视角基于 currentUser.expertId 过滤，不展示其他专家评分和意见。" });
  }
  alertStrip.innerHTML = alerts.map((alert) => `<div class="notice ${alert.type}"><strong>${alert.title}</strong><span>${alert.text}</span></div>`).join("");
}

function metric(label, value, note) {
  return `<div class="metric"><span>${label}</span><strong>${value}</strong><em>${note}</em></div>`;
}

function statusClass(text) {
  if (/外部|限制|拦截|不可|过期/.test(text)) return "red";
  if (/待|审批|截止前|进行中|缺失/.test(text)) return "amber";
  if (/已|通过|锁定|正常/.test(text)) return "green";
  return "blue";
}

function renderDashboard() {
  if (state.roleId === "admin") return renderAdminDashboard();
  const projects = visibleProjects();
  return `
    <section class="grid cols-4">
      ${metric("可见项目", projects.length, "按当前角色和数据范围过滤")}
      ${metric("报价截止前项目", projects.filter((project) => project.beforeDeadline).length, "不展示报价明细")}
      ${metric("定标审批中项目", projects.filter((project) => project.id === "p-award").length, "截止后演示后续闭环")}
      ${metric("外部交易备案", projects.filter((project) => project.externalTrade).length, "内部交易闭环强阻断")}
    </section>
    <section class="grid cols-2">
      <div class="panel">
        <div class="panel-head"><div><h2>客户评审风险提醒</h2><p class="muted">本轮已拆分截止前和截止后项目，避免流程状态矛盾。</p></div></div>
        <div class="timeline">
          <div class="timeline-item"><time>截止前</time><div>客房一次性用品采购项目仅演示报名、报价提交状态、异常查看审批，不出现专家评分或定标数据。</div></div>
          <div class="timeline-item"><time>截止后</time><div>客房布草集中采购项目用于演示报价汇总、专家评审、定标审批、合同履约和档案审计。</div></div>
          <div class="timeline-item"><time>外部交易</time><div>客房改造工程只支持备案和资料归集，内部公告、报名、报价、评审和定标误操作会被拦截。</div></div>
        </div>
      </div>
      <div class="panel">
        <div class="panel-head"><div><h2>演示脚本入口</h2><p class="muted">客户评审建议按以下顺序讲解。</p></div><button class="secondary-button" type="button" data-action="open-review-guide">查看完整脚本</button></div>
        <div class="review-checklist">
          ${["驾驶舱", "需求与方式判断", "截止前报价保密", "异常查看审批", "截止后专家评审", "定标审批", "外部交易阻断", "档案与审计日志"]
            .map((item) => `<label><input type="checkbox" /> ${item}</label>`)
            .join("")}
        </div>
      </div>
    </section>
    ${renderProjectTable("项目状态总览", projects)}
  `;
}

function renderAdminDashboard() {
  return `
    <section class="grid cols-4">
      ${metric("组织层级", data.organizations.length, "集团 / 区域 / 酒店配置")}
      ${metric("账号数量", data.users.length, "仅账号状态与角色分配")}
      ${metric("角色数量", data.roles.length, "菜单与按钮权限")}
      ${metric("权限边界", "配置", "不进入采购实质内容")}
    </section>
    <section class="panel">
      <div class="panel-head"><div><h2>管理员工作台</h2><p class="muted">本页只展示基础配置，不展示项目数量、报价金额、专家评分、定标结果等业务指标。</p></div></div>
      ${table("管理员配置范围", ["配置域", "当前样机展示", "边界"], [
        ["组织机构", `${data.organizations.length} 个组织节点`, "仅维护组织树和数据范围"],
        ["账号与角色", `${data.users.length} 个账号 / ${data.roles.length} 类角色`, "仅启停账号、分配角色和菜单"],
        ["菜单配置", "工作台、我的待办、基础配置", "管理员菜单不包含供应商管理和采购业务"],
        ["Mock 规则 / 数据字典", "采购方式、状态、权限提示", "不得查看或修改报价、评分、定标和履约实质内容"]
      ])}
    </section>
  `;
}

function renderMyTasks() {
  const tasks = {
    group_manager: [["异常查看审批", "客房一次性用品采购项目", "已通过并限范围"], ["定标审批", "客房布草集中采购项目", "审批中"], ["外部交易备案复核", "客房改造工程", "待复核"]],
    buyer: [["催办报价提交", "客房一次性用品采购项目", "截止前"], ["提交定标审批", "客房布草集中采购项目", "进行中"], ["补充外部结果备案", "客房改造工程", "待资料"]],
    supplier: [["提交 / 重提报价", "客房一次性用品采购项目", "本企业可操作"], ["查看中选通知", "客房布草集中采购项目", "本企业相关"], ["确认履约节点", "首批布草到货", "待确认"]],
    expert: [["回避确认", "客房布草集中采购项目", "本人已确认"], ["纪律确认", "客房布草集中采购项目", "本人已确认"], ["评分表", "客房布草集中采购项目", state.expertSubmitted ? "已提交锁定" : "可暂存"]],
    auditor: [["查询异常查看审批", "客房一次性用品采购项目", "只读"], ["核查报价截止前查看风险", "客房一次性用品采购项目", "只读"], ["检查外部交易阻断", "客房改造工程", "只读"]],
    admin: [["维护角色菜单", "基础配置", "配置项"], ["维护组织范围", "华东区域", "配置项"], ["检查账号状态", "供应商账号", "配置项"]]
  };
  return tablePanel(`${currentRole().name}待办`, "待办按当前角色生成，仅用于客户评审演示。", ["事项", "关联对象", "状态", "操作"], (tasks[state.roleId] || []).map(([a, b, c]) => [a, b, `<span class="status ${statusClass(c)}">${c}</span>`, `<button class="secondary-button" type="button" data-action="task-open">查看</button>`]));
}

function renderProjectTable(title, projects) {
  return tablePanel(
    title,
    "清楚区分报价响应中、已截止、专家评审中、定标审批中和外部交易备案中。",
    ["项目编号", "项目名称", "采购方式", "项目状态", "状态类别", "归属组织", "操作"],
    projects.map((project) => [
      project.code,
      project.name,
      `<span class="tag ${project.externalTrade ? "red" : "blue"}">${project.type}</span>`,
      project.status,
      `<span class="status ${statusClass(project.stageOrder)}">${project.stageOrder}</span>`,
      project.orgName,
      `<button class="secondary-button" type="button" data-action="select-project" data-id="${project.id}">进入</button>`
    ])
  );
}

function renderNeeds() {
  const requests = data.procurementRequests.filter((request) => visibleProjects().some((project) => project.id === request.projectId));
  return `
    <section class="grid cols-2">
      ${requests.map(renderNeedCard).join("")}
    </section>
  `;
}

function renderNeedCard(request) {
  return `
    <div class="panel">
      <div class="panel-head">
        <div><h2>${request.title}</h2><p class="muted">${request.department} · ${request.applicant}</p></div>
        <span class="status ${statusClass(request.approvalStatus)}">${request.approvalStatus}</span>
      </div>
      <dl class="detail-list">
        <div class="detail-row"><dt>预算金额</dt><dd>${request.budgetLabel}</dd></div>
        <div class="detail-row"><dt>采购品类</dt><dd>${request.category}</dd></div>
        <div class="detail-row"><dt>所属组织</dt><dd>${request.orgName}</dd></div>
        <div class="detail-row"><dt>是否外部交易</dt><dd>${request.externalRequired ? "是，仅备案和资料归集" : "否，进入内部采购流程"}</dd></div>
        <div class="detail-row"><dt>系统建议方式</dt><dd>${request.methodSuggestion}</dd></div>
        <div class="detail-row"><dt>判断依据</dt><dd>${request.basis}</dd></div>
        <div class="detail-row"><dt>方式变更理由</dt><dd>${request.changeReason}</dd></div>
        <div class="detail-row"><dt>附件</dt><dd>${request.attachments.join("、")}</dd></div>
      </dl>
      <div class="notice info"><strong>判断结果可追溯</strong><span>${request.logs.join("；")}</span></div>
    </div>
  `;
}

function renderProjects() {
  const project = currentProject();
  return `
    <section class="project-layout">
      <aside class="panel">
        <div class="panel-head"><div><h2>采购项目列表</h2><p class="muted">按当前角色过滤可见项目。</p></div></div>
        <div class="project-list">
          ${visibleProjects()
            .map((item) => `<button class="project-card ${project.id === item.id ? "active" : ""}" type="button" data-action="select-project" data-id="${item.id}"><strong>${item.name}</strong><span>${item.code}</span><span>${item.status}</span></button>`)
            .join("")}
        </div>
      </aside>
      <section class="grid">
        ${project.externalTrade ? renderExternalBlockNotice(project) : ""}
        <div class="panel">
          <div class="panel-head"><div><h2>${project.name}</h2><p class="muted">${project.code} · ${project.orgName} · ${project.category}</p></div><span class="status ${statusClass(project.status)}">${project.status}</span></div>
          ${renderProjectDetail(project)}
        </div>
        <div class="panel"><div class="panel-head"><div><h2>流程节点</h2><p class="muted">${project.externalTrade ? "外部交易项目只展示备案链路，不进入内部公告、报名、报价、专家评审和定标闭环。" : project.beforeDeadline ? "截止前项目只展示前序节点，不展示评审、定标、合同等后续数据。" : "截止后项目可展示后续闭环。"}</p></div></div>${renderFlow(project)}</div>
        ${project.externalTrade ? renderExternalTradeInline(project) : renderInternalProjectSections(project)}
      </section>
    </section>
  `;
}

function renderProjectDetail(project) {
  if (project.externalTrade) {
    return `
      <dl class="detail-list">
        <div class="detail-row"><dt>采购方式</dt><dd>${project.type}</dd></div>
        <div class="detail-row"><dt>当前节点</dt><dd>${project.stage}</dd></div>
        <div class="detail-row"><dt>经办人</dt><dd>${project.buyer}</dd></div>
        <div class="detail-row"><dt>内部报价截止</dt><dd>无。依法必须外部交易项目不设置内部报价截止。</dd></div>
        <div class="detail-row"><dt>内部报价锁定</dt><dd>无。该项目不进入内部公告、报名、报价、专家评审、定标闭环。</dd></div>
        <div class="detail-row"><dt>正确链路</dt><dd>内部立项、审批留痕、外部编号登记、外部公告资料、外部中标结果上传、外部结果备案、合同台账、履约评价、档案归集、审计查询。</dd></div>
      </dl>
    `;
  }
  return `
    <dl class="detail-list">
      <div class="detail-row"><dt>采购方式</dt><dd>${project.type}</dd></div>
      <div class="detail-row"><dt>当前节点</dt><dd>${project.stage}</dd></div>
      <div class="detail-row"><dt>经办人</dt><dd>${project.buyer}</dd></div>
      <div class="detail-row"><dt>报价截止</dt><dd>${project.quoteDeadline || "外部交易备案项目不设置内部报价截止"}</dd></div>
      <div class="detail-row"><dt>金额阈值</dt><dd>客户制度确认，Demo 不写死具体金额阈值。</dd></div>
      <div class="detail-row"><dt>可见性说明</dt><dd>${project.beforeDeadline ? "报价截止前只展示提交状态和统计，不展示报价内容。" : "内部采购报价截止后，可按权限展示后续数据。"}</dd></div>
    </dl>
  `;
}

function renderFlow(project) {
  return `<div class="flow">${project.flow.map((node) => `<div class="flow-node ${node === project.stage ? "current" : ""}"><strong>${node}</strong><small>${project.externalTrade ? "备案链路" : project.beforeDeadline ? "截止前链路" : "截止后链路"}</small></div>`).join("")}</div>`;
}

function renderInternalProjectSections(project) {
  const request = data.procurementRequests.find((item) => item.projectId === project.id);
  const doc = data.procurementDocuments.find((item) => item.projectId === project.id);
  const announcement = data.announcements.find((item) => item.projectId === project.id);
  const registrations = data.registrations.filter((item) => item.projectId === project.id);
  return `
    <section class="grid cols-2">
      ${request ? renderNeedCard(request) : ""}
      ${doc ? renderProcurementDocumentCard(doc) : ""}
      ${announcement ? renderAnnouncementCard(announcement) : ""}
      ${renderRegistrationCard(registrations)}
    </section>
  `;
}

function renderProcurementDocumentCard(doc) {
  return `
    <div class="panel">
      <div class="panel-head"><div><h2>采购文件</h2><p class="muted">发布后锁定，版本可追溯。</p></div><span class="status ${doc.locked ? "green" : "amber"}">${doc.locked ? "已锁定" : "未锁定"}</span></div>
      <dl class="detail-list">
        <div class="detail-row"><dt>文件名称</dt><dd>${doc.fileName}</dd></div>
        <div class="detail-row"><dt>文件版本</dt><dd>${doc.version}</dd></div>
        <div class="detail-row"><dt>编制人</dt><dd>${doc.editor}</dd></div>
        <div class="detail-row"><dt>审核状态</dt><dd>${doc.reviewStatus}</dd></div>
        <div class="detail-row"><dt>发布时间</dt><dd>${doc.publishedAt}</dd></div>
        <div class="detail-row"><dt>修改记录</dt><dd>${doc.changeLogs.join("；")}</dd></div>
        <div class="detail-row"><dt>附件</dt><dd>${doc.attachments.join("、")}</dd></div>
      </dl>
    </div>
  `;
}

function renderAnnouncementCard(announcement) {
  const user = currentUser();
  const isSupplier = state.roleId === "supplier";
  const invitedText = isSupplier
    ? `${announcement.invitedSupplierIds.includes(user.supplierId) ? "本企业已被邀请" : "本企业未在邀请范围"}；其他供应商名称和状态已隐藏；邀请供应商数量：${announcement.invitedSupplierIds.length} 家`
    : announcement.invitedSupplierIds.map(supplierName).join("、");
  return `
    <div class="panel">
      <h2>公告 / 邀请</h2>
      <dl class="detail-list">
        <div class="detail-row"><dt>发布范围</dt><dd>${announcement.publishScope}</dd></div>
        <div class="detail-row"><dt>邀请供应商</dt><dd>${invitedText}</dd></div>
        <div class="detail-row"><dt>发布时间</dt><dd>${announcement.publishedAt}</dd></div>
        <div class="detail-row"><dt>报名截止</dt><dd>${announcement.registerDeadline}</dd></div>
        <div class="detail-row"><dt>报价截止</dt><dd>${announcement.quoteDeadline}</dd></div>
        <div class="detail-row"><dt>通知记录</dt><dd>${announcement.notices.join("；")}</dd></div>
      </dl>
    </div>
  `;
}

function renderRegistrationCard(registrations) {
  const user = currentUser();
  const isSupplier = state.roleId === "supplier";
  const rows = isSupplier ? registrations.filter((item) => item.supplierId === user.supplierId) : registrations;
  const subtitle = isSupplier
    ? `供应商视角仅展示本企业报名记录；其他供应商名称、资质、附件和状态隐藏；报名供应商数量：${registrations.length} 家。`
    : "采购管理和监督视角展示报名记录，用于准入、品类授权和限制名单校验。";
  return tablePanel("报名记录", subtitle, ["供应商", "准入", "品类授权", "限制名单校验", "资质附件", "报名时间", "状态"], rows.map((item) => [supplierName(item.supplierId), item.admissionStatus, item.categoryAuthStatus, item.restrictedCheck, item.qualificationFile, item.registeredAt, item.status]));
}

function renderSuppliers() {
  const suppliers = visibleSuppliers();
  return `
    <section class="grid cols-3">
      ${metric("当前可见供应商", suppliers.length, state.roleId === "supplier" ? "仅本企业" : "按当前角色范围过滤")}
      ${metric("限制名单", suppliers.filter((supplier) => supplier.status === "限制名单").length, "报名与内部流程拦截")}
      ${metric("资质即将到期", suppliers.filter((supplier) => supplier.qualification === "即将到期").length, "风险提醒")}
    </section>
    ${tablePanel("供应商档案", state.roleId === "supplier" ? "本页面基于 currentUser.supplierId 过滤，不展示其他供应商名称、状态、资质和风险统计。" : "展示准入、授权、资质、限制和履约评价。", ["供应商", "准入状态", "品类授权", "资质状态", "履约评分", "风险"], suppliers.map((supplier) => [supplier.name, supplier.status, supplier.categoryAuth.join("、"), supplier.qualification, supplier.evaluationScore || "暂无", supplier.risk]))}
  `;
}

function renderBidSecrecy() {
  const pre = data.projects.find((project) => project.id === "p-pre");
  const award = data.projects.find((project) => project.id === "p-award");
  const canSeeAbnormalPanel = !["supplier", "expert"].includes(state.roleId);
  return `
    <section class="grid">
      <div class="notice danger"><strong>报价截止前，采购方不可查看报价明细和响应文件</strong><span>当前仅展示提交状态，不展示报价内容；如需异常查看，请发起异常查看审批；所有查看、下载、导出操作将写入审计日志。</span></div>
      ${renderBidPanel(pre)}
      ${canSeeAbnormalPanel ? renderAbnormalApprovalPanel() : renderRestrictedAbnormalPanel()}
      ${renderBidPanel(award)}
    </section>
  `;
}

function renderBidPanel(project) {
  const rows = visibleBidRows(project);
  const title = project.beforeDeadline ? "报价截止前演示项目" : "报价截止后汇总项目";
  const supplierResultNote =
    state.roleId === "supplier" && !project.beforeDeadline
      ? `<div class="notice info"><strong>供应商结果可见范围</strong><span>供应商截止后仍只查看本企业报价和本企业结果，不展示其他供应商报价、文件、排名明细和专家意见。结果公开范围待客户制度确认。</span></div>`
      : "";
  return `
    <section class="panel">
      <div class="panel-head"><div><h2>${title}：${project.name}</h2><p class="muted">${project.status} · ${project.quoteDeadline || "无内部报价截止"}</p></div><span class="status ${statusClass(project.status)}">${project.beforeDeadline ? "保密期" : "已锁定"}</span></div>
      ${project.beforeDeadline ? renderPreDeadlineRules() : `<div class="notice good"><strong>报价已截止并锁定</strong><span>采购经办人可按权限查看报价汇总；专家只查看被分配项目的评审材料；监督角色只读查看全过程记录。</span></div>`}
      ${supplierResultNote}
      ${table("报价记录", ["供应商 / 对象", "报价版本", "提交状态", "提交时间", "报价金额", "响应文件", "撤回 / 重提", "审计提示"], rows)}
    </section>
  `;
}

function visibleBidRows(project) {
  const user = currentUser();
  const bids = data.bids.filter((bid) => bid.projectId === project.id);
  if (project.beforeDeadline) {
    if (state.roleId === "supplier") {
      return bids
        .filter((bid) => bid.supplierId === user.supplierId)
        .map((bid) => [supplierName(bid.supplierId), bid.version, bid.status, bid.submittedAt, formatMoney(bid.amount), bid.file, bid.canWithdraw ? "可撤回 / 可重提" : "仅可重提", "本企业操作留痕"]);
    }
    if (state.roleId === "expert") {
      return [["不可见", "-", "报价截止前不产生评审任务", "-", "***", "金额 / 文件均隐藏", "-", "不展示供应商报价状态"]];
    }
    if (["buyer", "group_manager", "auditor"].includes(state.roleId)) {
      return bids.map((bid, index) => [
        state.roleId === "group_manager" ? `供应商 ${String.fromCharCode(65 + index)}` : state.roleId === "auditor" ? `提交记录 ${index + 1}` : supplierName(bid.supplierId),
        bid.version,
        bid.status,
        bid.submittedAt,
        "***",
        "报价截止前不可见，下载隐藏",
        state.roleId === "buyer" ? "催办入口" : "-",
        state.roleId === "auditor" ? "只看流程、统计、日志和审批，不看金额 / 文件" : "仅展示提交状态，不展示报价内容"
      ]);
    }
  }
  if (state.roleId === "supplier") {
    return bids
      .filter((bid) => bid.supplierId === user.supplierId)
      .map((bid) => [supplierName(bid.supplierId), bid.version, bid.status, bid.submittedAt, formatMoney(bid.amount), bid.file, "截止后不可修改", "查看本企业结果留痕"]);
  }
  if (state.roleId === "expert") {
    return [["授权评审材料", "锁定版本", "可查看被分配项目材料", "-", "价格因子作为评审材料", "响应材料快照，不展示完整报价汇总", "-", "专家查看留痕"]];
  }
  return bids.map((bid) => [supplierName(bid.supplierId), bid.version, bid.status, bid.submittedAt, formatMoney(bid.amount), bid.file, "截止后不可修改", "查看 / 下载 / 导出留痕"]);
}

function renderPreDeadlineRules() {
  return `
    <div class="grid cols-3">
      <div class="notice info"><strong>供应商</strong><span>仅看本企业报价草稿、提交状态、响应附件和撤回 / 重提入口。</span></div>
      <div class="notice info"><strong>采购方 / 集团 / 审计</strong><span>采购经办人可看供应商名称、状态和时间；集团可匿名查看统计；审计只看流程、状态、统计、日志和审批，均不看金额和文件。</span></div>
      <div class="notice info"><strong>专家</strong><span>报价截止前没有评审任务，不展示供应商报价状态、金额和响应文件。</span></div>
    </div>
  `;
}

function renderAbnormalApprovalPanel() {
  return `
    <section class="panel">
      <div class="panel-head"><div><h2>异常查看审批结构化演示</h2><p class="muted">限对象、限内容、限时间，查看和下载均留痕。</p></div><button class="primary-button" type="button" data-action="apply-bid-view">发起异常查看申请</button></div>
      <div class="notice warn"><strong>未授权供应商 / 未授权内容 / 授权过期均会被拦截</strong><span>本页提供三个误操作演示按钮，并在下方 Mock 审计日志中展示拦截结果。</span></div>
      <h3>异常查看审批单</h3>
      ${table("异常查看审批单", ["审批单号", "项目", "申请人", "申请原因", "查看供应商", "查看内容", "允许下载", "有效期", "审批人", "状态", "实际查看 / 下载", "审计日志"], data.bidViewApprovals.map((item) => [item.id, item.projectName, item.applicant, item.reason, item.targetSupplierName, item.viewContent, item.allowDownload ? "是" : "否", `${item.validFrom} 至 ${item.validUntil}`, item.approver, item.status, `${item.actualViewCount} / ${item.actualDownloadCount}`, item.auditLogId]))}
      <div class="button-row">
        <button class="secondary-button" type="button" data-action="authorized-view">查看授权范围内内容</button>
        <button class="secondary-button" type="button" data-action="unauthorized-supplier">尝试查看未授权供应商</button>
        <button class="secondary-button" type="button" data-action="unauthorized-content">尝试查看未授权内容</button>
        <button class="secondary-button" type="button" data-action="expired-view">授权过期后查看</button>
      </div>
      ${table("异常查看审计日志", ["日志号", "操作人", "时间", "项目", "供应商", "查看内容", "下载", "审批单", "终端", "结果", "是否超范围"], data.abnormalViewLogs.map((log) => [log.id, log.actor, log.time, log.projectId, supplierName(log.supplierId), log.content, log.download, log.approvalId, log.terminal, log.result, log.outOfScope]))}
    </section>
  `;
}

function renderRestrictedAbnormalPanel() {
  return `
    <section class="panel">
      <div class="panel-head"><div><h2>异常查看审批</h2><p class="muted">该审批属于采购管理和监督内部控制信息。</p></div></div>
      <div class="notice info"><strong>${state.roleId === "supplier" ? "供应商视角不可见审批明细" : "专家视角不可见报价查看审批"}</strong><span>当前角色不展示其他供应商名称、审批对象、查看范围、报价查看日志和内部审批意见。</span></div>
    </section>
  `;
}

function renderExpertReview() {
  return state.roleId === "expert" ? renderExpertSelfView() : renderExpertManagementView();
}

function renderExpertSelfView() {
  const user = currentUser();
  const assignment = data.expertAssignments.find((item) => item.expertId === user.expertId);
  const project = data.projects.find((item) => item.id === assignment?.projectId);
  const ownScores = data.scoringSheets.filter((sheet) => sheet.expertId === user.expertId);
  const canViewMaterials = state.expertChecks.avoidance && state.expertChecks.discipline && state.expertChecks.confidentiality;
  return `
    <section class="panel">
      <div class="panel-head"><div><h2>专家本人视角：${project?.name || "暂无分配项目"}</h2><p class="muted">不展示其他专家姓名、评分、意见和完整汇总。</p></div><span class="status green">本人数据</span></div>
      <div class="grid cols-3">
        ${renderExpertCheck("avoidance", "回避确认", "未完成回避确认，不得进入评审")}
        ${renderExpertCheck("discipline", "纪律确认", "未完成纪律确认，不得评分")}
        ${renderExpertCheck("confidentiality", "保密承诺确认", "未完成保密承诺，不得查看响应材料")}
      </div>
      <div class="notice ${canViewMaterials ? "good" : "warn"}"><strong>评审材料权限</strong><span>${canViewMaterials ? "三个确认动作均已完成，可查看本人被分配项目评审材料。" : "确认未完成，评审材料和评分表保持禁用。"}</span></div>
      <div class="notice info"><strong>非盲评样机说明</strong><span>当前 Demo 按非盲评展示供应商名称；如客户确认需要盲评，可将供应商名称切换为供应商编号，并同步调整页面字段和权限，不作为一期默认必选。</span></div>
      <div class="panel">
        <div class="panel-head"><div><h2>本人供应商评分表</h2><p class="muted">按供应商逐行评分；仅展示本人评分和本人意见，不展示其他专家评分。</p></div></div>
        ${table("本人供应商评分表", ["供应商", "技术", "服务", "价格", "总分", "意见", "版本", "提交时间", "锁定时间", "状态"], ownScores.map((sheet) => [supplierName(sheet.supplierId), sheet.technical, sheet.service, sheet.price, sheet.total, sheet.opinion, sheet.versionNo, sheet.submittedAt, sheet.lockedAt, sheet.status]))}
        <div class="button-row">
          <button class="secondary-button" type="button" ${canViewMaterials && !state.expertSubmitted ? "" : "disabled"} data-action="save-score">暂存评分</button>
          <button class="primary-button" type="button" ${canViewMaterials && !state.expertSubmitted ? "" : "disabled"} data-action="submit-score">提交并锁定</button>
          <button class="secondary-button" type="button" data-action="show-score-versions">查看本人重评版本</button>
        </div>
      </div>
      ${state.expertSubmitted ? `<div class="notice good"><strong>评分已提交锁定</strong><span>提交后不能直接修改；如需重评，必须发起重评审批并生成新版本。</span></div>` : ""}
    </section>
  `;
}

function renderExpertCheck(key, title, rule) {
  return `<div class="panel"><h3>${title}</h3><p class="muted">${rule}</p><label><input type="checkbox" ${state.expertChecks[key] ? "checked" : ""} data-action="toggle-expert-check" data-key="${key}" /> 已确认并写入审计日志</label></div>`;
}

function renderExpertManagementView() {
  const assignments = data.expertAssignments.filter((item) => item.projectId === "p-award");
  const summaries = data.supplierScoreSummaries.filter((item) => item.projectId === "p-award");
  return `
    <section class="grid cols-3">
      ${metric("专家组成员", assignments.length, "含抽取、指定、替换")}
      ${metric("评分版本", data.scoringVersions.length, "重评不覆盖旧版本")}
      ${metric("报告状态", data.scoringSummaries[0].reportStatus, "冻结后不得改实质结论")}
    </section>
    ${tablePanel("采购管理 / 纪检审计视角：专家产生与确认状态", "采购经办人不得修改专家评分、意见和已冻结报告结论。", ["专家", "产生方式", "指定 / 替换理由", "回避", "纪律", "保密", "评分状态"], assignments.map((item) => [expertName(item.expertId), item.method, item.reason || "抽取产生", yesNo(item.avoidanceConfirmed), yesNo(item.disciplineConfirmed), yesNo(item.confidentialityConfirmed), item.scoreStatus]))}
    ${tablePanel("供应商评分汇总与排序", "管理 / 审计视角可查看汇总、排名、异常和非最低价推荐；采购经办人不得修改专家评分和意见。", ["排名", "供应商", "专家数", "技术均分", "服务均分", "价格均分", "总分", "最低价", "推荐", "异常提示", "报告状态"], summaries.map((item) => [item.rank, supplierName(item.supplierId), item.expertCount, item.avgTechnical, item.avgService, item.avgPrice, item.total, item.lowestPrice, yesNo(item.recommended), item.anomaly, item.reportStatus]))}
    ${tablePanel("专家评分明细只读", "用于管理 / 审计核对专家提交状态；按钮层面不提供修改入口。", ["供应商", "专家", "技术", "服务", "价格", "总分", "版本", "提交时间", "锁定时间", "状态"], data.scoringSheets.map((sheet) => [supplierName(sheet.supplierId), expertName(sheet.expertId), sheet.technical, sheet.service, sheet.price, sheet.total, sheet.versionNo, sheet.submittedAt, sheet.lockedAt, sheet.status]))}
    ${tablePanel("重评版本留痕", "重评生成新版本，旧版本保留可追溯。", ["版本", "专家", "状态", "原因"], data.scoringVersions.map((item) => [item.version, expertName(item.expertId), item.status, item.reason]))}
    <section class="notice warn"><strong>管理边界</strong><span>管理和审计可以查看提交状态、供应商汇总、排名、异常、非最低价推荐和报告冻结状态；不得改写专家评分、意见、版本和报告实质结论。</span></section>
  `;
}

function renderAward() {
  const approval = data.awardApprovals[0];
  const summary = data.scoringSummaries[0];
  const canSubmit = state.awardReason.trim().length > 0;
  return `
    <section class="split">
      <div class="panel">
        <div class="panel-head"><div><h2>定标审批：${data.projects.find((project) => project.id === approval.projectId).name}</h2><p class="muted">用于截止后项目，不用于截止前报价保密项目。</p></div><span class="status amber">${approval.status}</span></div>
        <dl class="detail-list">
          <div class="detail-row"><dt>推荐供应商</dt><dd>${summary.recommendedSupplier}</dd></div>
          <div class="detail-row"><dt>最低报价供应商</dt><dd>${summary.lowestSupplier}</dd></div>
          <div class="detail-row"><dt>评审报告</dt><dd>${summary.reportStatus}</dd></div>
          <div class="detail-row"><dt>审批人</dt><dd>${approval.approver}</dd></div>
        </dl>
        <div class="field"><label>非最低价中选理由</label><textarea id="awardReason" ${state.roleId === "auditor" ? "disabled" : ""} placeholder="必须填写后才能提交审批">${state.awardReason}</textarea></div>
        <div class="button-row"><button class="primary-button" type="button" ${canSubmit ? "" : "disabled title='请先填写非最低价中选理由'"} data-action="submit-award">提交定标审批</button><button class="secondary-button" type="button" data-action="notify-result">结果通知留痕</button></div>
      </div>
      <div class="panel"><h2>控制点</h2><div class="timeline"><div class="timeline-item"><time>理由必填</time><div>非最低价中选必须填写理由并进入审批。</div></div><div class="timeline-item"><time>禁止绕过</time><div>定标结果不得绕过审批直接发布。</div></div><div class="timeline-item"><time>通知留痕</time><div>结果通知、内部公示和导出动作写入审计日志。</div></div></div></div>
    </section>
  `;
}

function renderExternalTrade() {
  const project = data.projects.find((item) => item.id === "p-ext");
  return `${renderExternalBlockNotice(project)}${renderExternalTradeInline(project)}`;
}

function renderExternalBlockNotice(project) {
  return `<div class="notice danger"><strong>外部交易强阻断</strong><span>${project.name} 为依法必须外部交易项目，本平台仅支持内部立项、审批留痕、外部编号登记、外部公告资料、外部中标结果上传、外部结果备案、合同台账、履约评价、档案归集和审计查询；不设置内部报价截止，不做内部报价锁定。</span></div>`;
}

function renderExternalTradeInline(project) {
  const blockReason = "该项目为依法必须外部交易项目，本平台仅支持备案和资料归集，不支持内部公告、报名、报价、专家评审和定标闭环。";
  return `
    <section class="panel">
      <div class="panel-head"><div><h2>内部交易入口误操作拦截</h2><p class="muted">${blockReason}</p></div></div>
      <div class="block-grid">
        ${[
          ["发布内部公告", "内部公告"],
          ["供应商报名", "内部报名"],
          ["提交内部报价", "内部报价"],
          ["发起专家评审", "内部专家评审"],
          ["发起内部定标", "内部定标"]
        ]
          .map(([label, action]) => `<button class="block-item" type="button" title="${blockReason}" data-action="external-block" data-label="${label}">${action}<small>${blockReason}</small></button>`)
          .join("")}
      </div>
      <div class="notice warn"><strong>拦截留痕说明</strong><span>Demo 中体现系统已拦截、拦截原因、可记录为风险日志或审计日志；正确路径是内部立项、审批留痕、外部编号登记、外部公告资料上传、外部中标结果上传、外部结果备案、合同台账、履约评价、档案归集和审计查询。</span></div>
    </section>
    ${renderExternalTradeRecord(project)}
  `;
}

function renderExternalTradeRecord(project) {
  const record = data.externalTradeRecords.find((item) => item.projectId === project.id);
  return `
    <section class="panel">
      <div class="panel-head"><div><h2>外部交易备案资料</h2><p class="muted">只登记外部资料，不进入内部交易闭环。</p></div></div>
      <dl class="detail-list">
        <div class="detail-row"><dt>内部立项</dt><dd>${record.internalInitiation}</dd></div>
        <div class="detail-row"><dt>审批留痕</dt><dd>${record.approvalTrace}</dd></div>
        <div class="detail-row"><dt>外部平台</dt><dd>${record.platformName}</dd></div>
        <div class="detail-row"><dt>外部项目编号</dt><dd>${record.externalCode}</dd></div>
        <div class="detail-row"><dt>外部公告资料</dt><dd>${record.announcementFile}；${record.externalNoticeMaterials}</dd></div>
        <div class="detail-row"><dt>外部中标结果上传</dt><dd>${record.resultFile}；${record.externalWinningResultUpload}</dd></div>
        <div class="detail-row"><dt>外部结果记录</dt><dd>${record.externalResultRecord}</dd></div>
        <div class="detail-row"><dt>合同台账</dt><dd>${record.contractLedger}</dd></div>
        <div class="detail-row"><dt>履约评价</dt><dd>${record.performanceEvaluation}</dd></div>
        <div class="detail-row"><dt>档案归集</dt><dd>${record.archiveStatus}</dd></div>
        <div class="detail-row"><dt>审计查询</dt><dd>${record.auditQueryStatus}</dd></div>
        <div class="detail-row"><dt>备案状态</dt><dd>${record.recordStatus}</dd></div>
      </dl>
      <div class="button-row"><button class="primary-button" type="button" data-action="record-external">保存备案</button><button class="secondary-button" type="button" data-page="contracts">进入合同台账</button><button class="secondary-button" type="button" data-page="archives">审计查询</button></div>
    </section>
  `;
}

function renderContracts() {
  const contracts = visibleContracts();
  return `
    <section class="notice info"><strong>合同系统边界</strong><span>本平台不编辑合同正文、不做合同审批、不做合同签署类能力，只维护采购侧合同台账、履约节点、验收付款记录和供应商评价。</span></section>
    ${tablePanel("合同台账", state.roleId === "supplier" ? "供应商视角仅展示本企业合同。" : "正式合同文本、审批和签署仍由合同系统主责。", ["合同编号", "项目", "供应商", "合同金额", "状态", "系统链接"], contracts.map((contract) => [contract.code, data.projects.find((project) => project.id === contract.projectId)?.name, contract.supplier, formatMoney(contract.amount), contract.status, contract.contractSystemUrl]))}
    <section class="grid cols-2">
      <div class="panel"><h2>履约节点</h2><div class="timeline">${data.performanceNodes.filter((node) => contracts.some((contract) => contract.id === node.contractId)).map((node) => `<div class="timeline-item"><time>${node.dueDate}</time><div><strong>${node.node}</strong><br />${node.status} · ${node.payment}</div></div>`).join("")}</div></div>
      ${tablePanel("供应商评价", "评价结果进入供应商档案，可用于后续准入、品类授权和限制名单风控。", ["供应商", "项目", "分数", "维度", "说明"], visibleEvaluations().map((item) => [supplierName(item.supplierId), data.projects.find((project) => project.id === item.projectId)?.name, item.score, item.dimensions, item.note]))}
    </section>
  `;
}

function renderArchives() {
  return `
    <section class="panel">
      <div class="panel-head"><div><h2>必备档案目录模板</h2><p class="muted">用于客户确认一期归档目录是否完整。</p></div></div>
      <div class="chip-row">${data.archiveTemplate.map((item) => `<span class="tag blue">${item}</span>`).join("")}</div>
    </section>
    <section class="notice warn"><strong>封存和补档规则</strong><span>档案封存后不得直接修改；确需补档时必须发起补档申请、完成审批并写入审计日志。</span></section>
    ${tablePanel("档案完整性检查", "封存后不得随意修改；补档必须申请、审批并留痕。", ["项目", "目录项", "必备", "已归集", "来源", "归集时间", "责任角色", "缺失原因", "补档审批状态"], data.archiveItems.map((item) => [data.projects.find((project) => project.id === item.projectId)?.name, item.item, yesNo(item.required), yesNo(item.collected), item.source, item.collectedAt, item.ownerRole, item.missingReason || "-", item.supplementStatus]))}
    ${tablePanel("档案封存记录", "展示完整性、封存状态、封存人和补档审批要求。", ["项目", "完整性", "已封存", "封存时间", "封存人", "允许补档", "补档需审批", "说明"], data.archiveSealRecords.map((item) => [data.projects.find((project) => project.id === item.projectId)?.name, item.completeness, yesNo(item.sealed), item.sealedAt, item.sealedBy, yesNo(item.allowSupplement), yesNo(item.supplementRequiresApproval), item.note]))}
    ${tablePanel("补档申请演示", "p-ext 缺少外部中标结果盖章件，已生成补档申请并留痕。", ["申请单号", "项目", "缺失资料", "申请人", "原因", "审批人", "状态", "已留痕", "申请时间"], data.archiveSupplementRequests.map((item) => [item.id, data.projects.find((project) => project.id === item.projectId)?.name, item.missingItem, item.applicant, item.reason, item.approver, item.status, yesNo(item.logRecorded), item.createdAt]))}
    ${tablePanel("审计日志查询", "普通用户不可修改审计日志；纪检 / 审计只读穿透查询。", ["时间", "操作人", "角色", "动作", "对象", "结果"], visibleAuditLogs().map((log) => [log.time, log.actor, log.role, log.action, log.object, log.result]))}
  `;
}

function visibleAuditLogs() {
  if (state.roleId === "admin") {
    return [
      { time: "2026-06-23 15:45", actor: currentUser().name, role: "系统管理员", action: "查看基础配置边界", object: "admin", result: "仅显示配置日志，不返回采购业务日志" },
      { time: "2026-06-23 15:46", actor: currentUser().name, role: "系统管理员", action: "维护角色菜单配置", object: "role-menu", result: "配置留痕" }
    ];
  }
  if (state.roleId === "supplier") {
    const user = currentUser();
    return data.auditLogs.filter((log) => log.actor === supplierName(user.supplierId));
  }
  if (state.roleId === "expert") {
    return data.auditLogs.filter((log) => log.actor === expertName(currentUser().expertId));
  }
  return data.auditLogs;
}

function renderAdmin() {
  return `
    <section class="grid cols-3">
      ${metric("组织层级", data.organizations.length, "集团、区域、酒店")}
      ${metric("角色类型", data.roles.length, "菜单和按钮分权")}
      ${metric("业务实质权限", "无", "管理员不处理报价、评分、定标、履约实质内容")}
    </section>
    ${tablePanel("基础配置边界", "系统管理员只维护基础配置和账号权限配置。", ["配置项", "用途", "允许操作", "不得操作"], [
      ["组织范围", "数据隔离", "维护组织树和授权范围", "不得查看或修改供应商金额、文件、合同和评价实质"],
      ["角色菜单", "权限控制", "维护菜单和按钮权限", "不得查看报价实质内容、专家评分和专家意见"],
      ["账号权限", "用户管理", "启停账号、分配角色", "不得修改定标结果、非最低价理由和评审报告"],
      ["基础字典", "样机展示", "维护 Mock 字典和权限配置", "不得改写履约实质、供应商评价实质和审计日志内容"]
    ])}
    <section class="notice danger"><strong>管理员边界</strong><span>管理员不能查看或修改供应商报价金额、响应文件、合同金额、专家评分、专家意见、定标结果、非最低价理由、履约实质、供应商评价实质，也不能篡改审计日志内容。</span></section>
  `;
}

function tablePanel(title, subtitle, headers, rows) {
  return `<section class="panel"><div class="panel-head"><div><h2>${title}</h2><p class="muted">${subtitle}</p></div></div>${table(title, headers, rows)}</section>`;
}

function table(caption, headers, rows) {
  return `
    <div class="table-wrap">
      <table aria-label="${caption}">
        <thead><tr>${headers.map((header) => `<th>${header}</th>`).join("")}</tr></thead>
        <tbody>${rows.map((row) => `<tr>${row.map((cell) => `<td>${cell ?? ""}</td>`).join("")}</tr>`).join("")}</tbody>
      </table>
    </div>
  `;
}

function yesNo(value) {
  return value ? `<span class="status green">是</span>` : `<span class="status amber">否</span>`;
}

function handleClick(event) {
  const pageButton = event.target.closest("[data-page]");
  if (pageButton) {
    state.page = pageButton.dataset.page;
    render();
    return;
  }
  const button = event.target.closest("[data-action]");
  if (!button) return;
  const action = button.dataset.action;
  if (action === "select-project") {
    state.selectedProjectId = button.dataset.id;
    state.page = "projects";
    render();
    return;
  }
  if (action === "toggle-expert-check") {
    state.expertChecks[button.dataset.key] = !state.expertChecks[button.dataset.key];
    render();
    return;
  }
  if (action === "submit-score") {
    state.expertSubmitted = true;
    showModal("评分已提交锁定", "<p>评分提交后不能直接修改；如需重评，必须发起重评审批并生成新版本，旧版本保留可追溯。</p>");
    render();
    return;
  }
  if (action === "show-score-versions") {
    const user = currentUser();
    showModal("本人重评版本", table("本人重评版本", ["版本", "状态", "原因"], data.scoringVersions.filter((item) => item.expertId === user.expertId).map((item) => [item.version, item.status, item.reason])));
    return;
  }
  if (action === "external-block") {
    showModal("外部交易误操作已拦截", `<p>${button.dataset.label} 被禁止。该项目为依法必须外部交易项目，本平台不设置内部报价截止、不做内部报价锁定，也不支持内部公告、报名、报价、专家评审和定标闭环。该拦截可记录为风险日志或审计日志。</p>`);
    return;
  }
  const modalActions = {
    "open-review-guide": ["客户评审演示脚本", reviewGuideHtml()],
    "apply-bid-view": ["发起异常查看申请", "<p>申请字段包括项目、申请人、原因、查看对象、供应商、内容、下载权限、有效期、审批人和审批意见。本 Demo 使用 Mock 审批单展示。</p>"],
    "authorized-view": ["授权范围内查看", `<dl class="detail-list">
      <div class="detail-row"><dt>供应商</dt><dd>上海棉织供应链有限公司</dd></div>
      <div class="detail-row"><dt>授权可见内容</dt><dd>响应文件元数据</dd></div>
      <div class="detail-row"><dt>文件名 / 大小</dt><dd>响应文件-一次性用品.pdf / 2.4 MB</dd></div>
      <div class="detail-row"><dt>上传时间</dt><dd>2026-06-22 15:18</dd></div>
      <div class="detail-row"><dt>Hash Mock</dt><dd>SHA256-MOCK-8A21-7F93</dd></div>
      <div class="detail-row"><dt>不可见内容</dt><dd>报价金额、响应正文、附件下载入口</dd></div>
      <div class="detail-row"><dt>有效期 / 日志号</dt><dd>2026-06-23 10:00 至 12:00 / LOG-BVA-001</dd></div>
    </dl>`],
    "unauthorized-supplier": ["未授权供应商已拦截", `<p>尝试查看苏州洁雅清洁服务有限公司，审批对象仅覆盖上海棉织供应链有限公司，系统判定供应商超范围，已拦截并写入日志 AVL-002 / LOG-BVA-001。</p>`],
    "unauthorized-content": ["未授权内容已拦截", `<p>尝试查看报价金额，审批内容仅允许“响应文件元数据”。报价金额、响应正文和下载均不在授权范围内，已拦截并写入日志 AVL-003 / LOG-BVA-001。</p>`],
    "expired-view": ["异常查看授权已过期", `<p>授权有效期已于 2026-06-23 12:00 结束，查看和下载入口均禁用。需重新申请后才能再次查看，已写入日志 AVL-004 / LOG-BVA-001。</p>`],
    "save-score": ["评分已暂存", "<p>提交前可暂存和修改，暂存动作写入审计日志。</p>"],
    "submit-award": ["定标审批已提交", "<p>非最低价中选理由已随审批提交，审批通过前不能发布结果。</p>"],
    "notify-result": ["结果通知留痕", "<p>结果通知会记录通知对象、时间、内容快照和发送结果。</p>"],
    "record-external": ["外部备案已保存", "<p>已保存外部编号、外部公告资料和外部结果备案资料，不进入内部交易闭环。</p>"],
    "task-open": ["样机待办", "<p>该操作用于客户评审版 Demo 演示，不连接真实待办系统。</p>"]
  };
  if (modalActions[action]) showModal(modalActions[action][0], modalActions[action][1]);
}

function handleInput(event) {
  if (event.target.id === "awardReason") {
    state.awardReason = event.target.value;
    render();
    const textarea = document.querySelector("#awardReason");
    if (textarea) {
      textarea.focus();
      textarea.selectionStart = textarea.selectionEnd = textarea.value.length;
    }
  }
}

function openAuditModal() {
  showModal("审计日志", table("审计日志", ["时间", "操作人", "角色", "动作", "对象", "结果"], visibleAuditLogs().map((log) => [log.time, log.actor, log.role, log.action, log.object, log.result])));
}

function openReviewGuide() {
  showModal("客户评审演示脚本", reviewGuideHtml());
}

function reviewGuideHtml() {
  return `
    <ol>
      <li>集团采购驾驶舱：确认项目分类、风险提醒和角色入口。</li>
      <li>采购需求与方式判断：确认金额阈值由客户制度确认、判断结果可追溯。</li>
      <li>内部采购项目流程：区分截止前一次性用品项目和截止后布草定标项目。</li>
      <li>供应商视角：确认公告邀请、报名、报价、结果、合同、评价只展示本企业，其他供应商隐藏或仅显示数量。</li>
      <li>报价截止前保密：确认采购方、集团、审计和专家默认不可见报价内容。</li>
      <li>异常查看审批：确认限对象、限内容、限时间和审计留痕。</li>
      <li>报价截止后汇总：确认报价锁定后再进入评审材料和汇总。</li>
      <li>专家评审：确认专家本人看到按供应商逐行评分表，但只看本人评分和意见；管理视角只读查看汇总、排名、异常和报告冻结。</li>
      <li>定标审批：确认非最低价理由必填和审批后通知。</li>
      <li>管理员配置：确认管理员只有工作台、我的待办、基础配置，不进入供应商管理和采购实质页面。</li>
      <li>外部交易强阻断：确认外部项目无内部报价截止、无内部报价锁定，内部公告、报名、报价、评审、定标误操作被拦截。</li>
      <li>合同台账与履约：确认合同系统边界。</li>
      <li>供应商评价：确认评价进入供应商档案。</li>
      <li>项目档案：确认目录模板、完整性检查、封存记录和补档申请。</li>
      <li>审计日志：确认日志字段满足监督查询。</li>
    </ol>
  `;
}

function showModal(title, body) {
  modalTitle.textContent = title;
  modalBody.innerHTML = body;
  modal.showModal();
}

function formatMoney(value) {
  return new Intl.NumberFormat("zh-CN", { style: "currency", currency: "CNY", maximumFractionDigits: 0 }).format(value);
}

init();
