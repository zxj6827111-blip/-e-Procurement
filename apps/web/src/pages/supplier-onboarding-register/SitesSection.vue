<script setup lang="ts">
import type { UploadPayload } from "../../api/http";
import { EnterpriseButton, EnterpriseSurface, SubmitPanel } from "../../components/base";
import { attachmentText, SITE_TYPE_OPTIONS } from "./display";
import type { SiteDraft } from "./types";

const sites = defineModel<SiteDraft[]>("sites", { required: true });

defineEmits<{
  addSite: [];
  attachFiles: [event: Event, target: UploadPayload[]];
  removeSite: [index: number];
}>();

defineProps<{
  stepSummary: string;
}>();
</script>

<template>
  <section class="eds-section">
    <header class="eds-page-header">
      <div>
        <h3>办公室、工厂及展厅</h3>
        <p>第 {{ stepSummary }} 步。登记办公、生产、仓储或展示场所，作为现场能力和配送能力审查依据。</p>
      </div>
    </header>
    <div v-for="(site, index) in sites" :key="index" class="eds-surface">
      <header class="eds-page-header">
        <div>
          <h3>场所 {{ index + 1 }}</h3>
          <p>可补充照片或场地证明。</p>
        </div>
        <EnterpriseButton :disabled="sites.length === 1" @click="$emit('removeSite', index)">删除</EnterpriseButton>
      </header>
      <div class="eds-form-section">
        <label>
          场所类型
          <select v-model="site.siteType">
            <option v-for="item in SITE_TYPE_OPTIONS" :key="item.value" :value="item.value">{{ item.label }}</option>
          </select>
        </label>
        <label>名称<input v-model="site.name" /></label>
        <label>地址<input v-model="site.address" /></label>
        <label>附加说明<textarea v-model="site.description" rows="3" /></label>
        <label>场所照片 / 资料<input type="file" multiple @change="$emit('attachFiles', $event, site.attachments)" /></label>
        <p class="eds-meta">{{ attachmentText(site.attachments.length, "可上传办公室、工厂或展厅照片") }}</p>
      </div>
    </div>
    <SubmitPanel>
      <EnterpriseButton @click="$emit('addSite')">新增场所</EnterpriseButton>
    </SubmitPanel>
  </section>
</template>
