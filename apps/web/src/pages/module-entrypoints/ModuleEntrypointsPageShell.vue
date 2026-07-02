<script setup lang="ts">
import { DataTable, EnterpriseSurface, FilterBar, PageHeader, PaginationBar, StatusTag, type DataTableColumn } from "../../components/base";

const columns: DataTableColumn[] = [
  { key: "module", label: "模块" },
  { key: "domain", label: "业务域" },
  { key: "pageType", label: "办理方式" },
  { key: "status", label: "状态" }
];

const modules = [
  { module: "供应商管理", domain: "供应商主档 / 准入 / 评价", pageType: "台账、详情、资料维护", status: "已纳入" },
  { module: "采购需求", domain: "需求申请 / 审批 / 立项", pageType: "申请、审批、流转记录", status: "已纳入" },
  { module: "项目执行", domain: "寻源 / 定标 / 履约", pageType: "项目台账、执行详情", status: "已纳入" },
  { module: "采购文件", domain: "文件编制 / 发布 / 附件", pageType: "文件台账", status: "已纳入" },
  { module: "公告邀请", domain: "公告 / 邀请 / 供应商响应", pageType: "公告台账", status: "已纳入" },
  { module: "报价与评审", domain: "报价 / 控标 / 专家评分", pageType: "报价处理、评分录入", status: "已纳入" },
  { module: "定标结果", domain: "推荐 / 审批 / 通知 / 公示", pageType: "结果台账、结果详情", status: "已纳入" },
  { module: "供应商城", domain: "目录 / 订单 / 定价 / 上架", pageType: "目录浏览、订单处理", status: "已纳入" },
  { module: "履约结算", domain: "订单 / 结算资料 / 付款", pageType: "订单与结算台账", status: "已纳入" },
  { module: "审计与集成", domain: "档案 / 审计 / 集成边界", pageType: "审计台账", status: "已纳入" },
  { module: "权限配置", domain: "账号 / 权限 / 审批规则", pageType: "配置台账、规则维护", status: "已纳入" }
];
</script>

<template>
  <PageHeader title="模块总览" eyebrow="业务导航" description="采购、供应商、履约、结算和审计入口按业务职责归口展示。" />

  <FilterBar>
    <label>
      模块范围
      <select value="all" disabled>
        <option value="all">全部模块</option>
      </select>
    </label>
  </FilterBar>

  <EnterpriseSurface title="业务模块清单">
    <DataTable :columns="columns" :rows="modules" row-key="module">
      <template #status="{ value }">
        <StatusTag tone="success">{{ value }}</StatusTag>
      </template>
    </DataTable>
    <PaginationBar :total="modules.length" />
  </EnterpriseSurface>
</template>
