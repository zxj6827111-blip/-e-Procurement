<script setup lang="ts">
import { FormSection } from "../../components/base";
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
</script>

<template>
  <FormSection title="结算操作参数" description="设置审核意见和补充材料类型，下方表格中的操作会复用这些参数。">
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
  </FormSection>
</template>
