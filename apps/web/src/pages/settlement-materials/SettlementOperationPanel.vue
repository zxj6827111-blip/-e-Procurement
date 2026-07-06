<script setup lang="ts">
import { EnterpriseSurface } from "../../components/base";
import type { SettlementOperationForm } from "./types";

const props = defineProps<{
  modelValue: SettlementOperationForm;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: SettlementOperationForm];
}>();

function inputValue(event: Event) {
  return (event.target as HTMLInputElement | HTMLSelectElement).value;
}

function setField<Key extends keyof SettlementOperationForm>(key: Key, value: SettlementOperationForm[Key]) {
  emit("update:modelValue", { ...props.modelValue, [key]: value });
}

function materialTypeLabel(value: SettlementOperationForm["materialType"]) {
  return (
    {
      invoice: "发票",
      delivery_note: "送货单",
      acceptance_record: "验收单",
      other: "其他资料"
    }[value] ?? value
  );
}
</script>

<template>
  <EnterpriseSurface class="eds-drawer-panel g-hotel-compliance-card" title="结算审核操作区" eyebrow="审核参数" description="设置审核意见和补充材料类型，下方各表格中的处理动作会复用这些参数。">
    <div class="eds-process-reference">
      <article class="eds-process-reference-item">
        <span>补充材料类型</span>
        <strong>{{ materialTypeLabel(modelValue.materialType) }}</strong>
      </article>
      <article class="eds-process-reference-item">
        <span>补充材料文件名</span>
        <strong>{{ modelValue.materialFileName || "按结算单自动生成" }}</strong>
      </article>
      <article class="eds-process-reference-item">
        <span>结算通过意见</span>
        <strong>{{ modelValue.billApproveOpinion || "待填写" }}</strong>
      </article>
      <article class="eds-process-reference-item">
        <span>发票通过意见</span>
        <strong>{{ modelValue.invoiceApproveOpinion || "待填写" }}</strong>
      </article>
    </div>

    <div class="eds-form-section">
      <label>
        结算通过意见
        <input :value="modelValue.billApproveOpinion" @input="setField('billApproveOpinion', inputValue($event))" />
      </label>
      <label>
        结算驳回意见
        <input :value="modelValue.billRejectOpinion" @input="setField('billRejectOpinion', inputValue($event))" />
      </label>
      <label>
        补充材料类型
        <select :value="modelValue.materialType" @change="setField('materialType', inputValue($event))">
          <option value="invoice">发票</option>
          <option value="delivery_note">送货单</option>
          <option value="acceptance_record">验收单</option>
          <option value="other">其他资料</option>
        </select>
      </label>
      <label>
        补充材料文件名
        <input :value="modelValue.materialFileName" placeholder="留空时按结算单自动生成" @input="setField('materialFileName', inputValue($event))" />
      </label>
      <label>
        材料通过意见
        <input :value="modelValue.materialApproveOpinion" @input="setField('materialApproveOpinion', inputValue($event))" />
      </label>
      <label>
        材料驳回意见
        <input :value="modelValue.materialRejectOpinion" @input="setField('materialRejectOpinion', inputValue($event))" />
      </label>
      <label>
        发票通过意见
        <input :value="modelValue.invoiceApproveOpinion" @input="setField('invoiceApproveOpinion', inputValue($event))" />
      </label>
      <label>
        发票驳回意见
        <input :value="modelValue.invoiceRejectOpinion" @input="setField('invoiceRejectOpinion', inputValue($event))" />
      </label>
    </div>
  </EnterpriseSurface>
</template>
