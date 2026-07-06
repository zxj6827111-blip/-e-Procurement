<script setup lang="ts">
import { FormSection } from "../../components/base";
import type { MallReceiptForm, MallShipmentForm, ProcurementReceiptForm } from "./types";

const procurementReceiptForm = defineModel<ProcurementReceiptForm>("procurementReceiptForm", { required: true });
const mallReceiptForm = defineModel<MallReceiptForm>("mallReceiptForm", { required: true });
const mallShipmentForm = defineModel<MallShipmentForm>("mallShipmentForm", { required: true });
</script>

<template>
  <FormSection title="履约操作参数" description="先设置本次收货、异常或发货参数，再到下方订单表格执行对应动作。">
    <label>
      招采收货类型
      <select v-model="procurementReceiptForm.receiptType">
        <option value="full">全部收货</option>
        <option value="partial">部分收货</option>
        <option value="exception">异常收货</option>
      </select>
    </label>
    <label>
      招采异常类型
      <select v-model="procurementReceiptForm.exceptionType">
        <option value="quantity_mismatch">数量差异</option>
        <option value="quality_issue">质量问题</option>
        <option value="delivery_delay">交付延期</option>
        <option value="missing_documents">资料缺失</option>
        <option value="other">其他</option>
      </select>
    </label>
    <label>
      招采收货时间
      <input v-model="procurementReceiptForm.receiptAt" type="datetime-local" />
    </label>
    <label>
      招采收货摘要
      <input v-model="procurementReceiptForm.summary" />
    </label>
    <label>
      招采收货明细
      <textarea v-model="procurementReceiptForm.receivedItems" rows="3" placeholder="物资名称|数量|单位|是"></textarea>
    </label>
    <label>
      商城收货类型
      <select v-model="mallReceiptForm.receiptType">
        <option value="full">全部收货</option>
        <option value="partial">部分收货</option>
        <option value="exception">异常收货</option>
      </select>
    </label>
    <label>
      商城异常类型
      <select v-model="mallReceiptForm.exceptionType">
        <option value="quantity_mismatch">数量差异</option>
        <option value="quality_issue">质量问题</option>
        <option value="delivery_delay">交付延期</option>
        <option value="missing_documents">资料缺失</option>
        <option value="other">其他</option>
      </select>
    </label>
    <label>
      商城收货摘要
      <input v-model="mallReceiptForm.summary" />
    </label>
    <label>
      商城收货明细
      <textarea v-model="mallReceiptForm.receivedItems" rows="3" placeholder="商品名称|数量|单位|是"></textarea>
    </label>
    <label>
      承运商
      <input v-model="mallShipmentForm.carrier" />
    </label>
    <label>
      物流单号
      <input v-model="mallShipmentForm.trackingNo" placeholder="留空时系统自动生成" />
    </label>
    <label>
      联系人
      <input v-model="mallShipmentForm.contactName" />
    </label>
    <label>
      联系电话
      <input v-model="mallShipmentForm.contactPhone" />
    </label>
    <label>
      预计到达
      <input v-model="mallShipmentForm.estimatedArrivalAt" type="datetime-local" />
    </label>
    <label>
      发货数量
      <input v-model.number="mallShipmentForm.shippedQuantity" type="number" min="1" />
    </label>
  </FormSection>
</template>
