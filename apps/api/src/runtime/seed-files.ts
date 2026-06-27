import crypto from "node:crypto";
import fs from "node:fs";
import type { AppContext } from "../app-context.js";
import type { StoredFileRecord } from "./file-store.js";
import { encodeSeedPhoto, type SeedImageKind } from "./generated-seed-images.js";

const PHOTO_IMAGE_CONTENT_TYPE = "image/png";

function encodeText(name: string) {
  return Buffer.from(`业务附件：${name}\n本文件用于供应链采购平台的业务流转、归档和审计留痕。`, "utf8");
}

export function seedRuntimeFiles(ctx: AppContext) {
  const knownIds = new Set<string>();

  for (const bid of ctx.state.bids) {
    const existing = ctx.fileStore.get(bid.fileId);
    if (existing) {
      knownIds.add(existing.fileId);
      continue;
    }
    const stored = ctx.fileStore.save({
      fileId: bid.fileId,
      originalName: bid.fileName,
      contentType: bid.responseFileMetadata?.[0]?.contentType ?? "application/pdf",
      body: encodeText(bid.fileName),
      attachmentKind: "bid_response_file",
      objectType: "bid",
      objectId: bid.id,
      projectId: bid.projectId,
      supplierId: bid.supplierId,
      uploadedBy: bid.supplierId
    });
    knownIds.add(stored.fileId);
  }

  const seedFiles = [
    ...supplierQualificationFiles(ctx),
    ...supplierSealSampleFiles(ctx),
    ...projectSampleFiles(ctx),
    ...mallProductFiles(ctx),
    ...mallScenarioFiles(ctx),
    ...procurementDocumentFiles(ctx),
    ...registrationFiles(ctx),
    ...externalTradeFiles(ctx),
    ...contractAndReceiptFiles(ctx),
    ...settlementFiles(ctx)
  ];

  for (const file of seedFiles) {
    if (knownIds.has(file.fileId)) {
      knownIds.add(file.fileId);
      continue;
    }
    const stored = ensureSeedFile(ctx, file);
    knownIds.add(stored.fileId);
  }
}

interface SeedFile {
  fileId: string;
  originalName: string;
  contentType: string;
  body: Buffer;
  attachmentKind: string;
  objectType: string;
  objectId: string;
  projectId?: string;
  supplierId?: string;
  uploadedBy: string;
}

function ensureSeedFile(ctx: AppContext, file: SeedFile): StoredFileRecord {
  const existing = ctx.fileStore.get(file.fileId);
  if (!existing) {
    return ctx.fileStore.save({
      fileId: file.fileId,
      originalName: file.originalName,
      contentType: file.contentType,
      body: file.body,
      attachmentKind: file.attachmentKind,
      objectType: file.objectType,
      objectId: file.objectId,
      projectId: file.projectId,
      supplierId: file.supplierId,
      uploadedBy: file.uploadedBy
    });
  }

  if (shouldRefreshSeedFile(existing, file)) {
    const sha256 = crypto.createHash("sha256").update(file.body).digest("hex");
    fs.writeFileSync(existing.absolutePath, file.body);
    ctx.runtimeDb.db
      .prepare("update stored_files set original_name = ?, content_type = ?, size_bytes = ?, sha256 = ? where file_id = ?")
      .run(file.originalName, file.contentType, file.body.byteLength, sha256, file.fileId);
    return {
      ...existing,
      originalName: file.originalName,
      contentType: file.contentType,
      sizeBytes: file.body.byteLength,
      sha256
    };
  }

  return existing;
}

function shouldRefreshSeedFile(existing: StoredFileRecord, file: SeedFile) {
  if (!file.contentType.startsWith("image/")) return false;
  if (!isGeneratedSeedImageId(file.fileId)) return false;
  return existing.contentType === "image/svg+xml" || existing.contentType !== file.contentType || existing.originalName !== file.originalName;
}

function isGeneratedSeedImageId(fileId: string) {
  return /^(file-(seal|mall|scenario|project-sample)-|rrc-food-att-)/.test(fileId);
}

function imageKindFor(value: string): SeedImageKind {
  if (/牙|洗漱|梳|护理|一次性|amenity/i.test(value)) return "amenity";
  if (/床|布草|棉|巾|被|枕|linen/i.test(value)) return "linen";
  if (/水果|鲜切|早餐|食材|冷链|fruit/i.test(value)) return "fruit";
  if (/样板间|客房|大床房|sample_room/i.test(value)) return "scenario-room";
  if (/开业|基础包|opening/i.test(value)) return "opening-package";
  if (/到货|验收|差异|receipt/i.test(value)) return "receipt";
  return "generic";
}

function asPngName(fileName: string) {
  return fileName.replace(/\.(svg|jpe?g|webp)$/i, ".png");
}

function supplierQualificationFiles(ctx: AppContext): SeedFile[] {
  return ctx.state.suppliers.flatMap((supplier) =>
    (supplier.qualificationAttachments ?? []).map((attachment) => ({
      fileId: attachment.id,
      originalName: attachment.fileName,
      contentType: "application/pdf",
      body: encodeText(`${supplier.name} / ${attachment.qualificationType}`),
      attachmentKind: "supplier_qualification",
      objectType: "supplier",
      objectId: supplier.id,
      supplierId: supplier.id,
      uploadedBy: supplier.id
    }))
  );
}

function supplierSealSampleFiles(ctx: AppContext): SeedFile[] {
  return ctx.state.suppliers.flatMap((supplier) =>
    (supplier.sealSamples ?? [])
      .filter((sample) => sample.fileId && isGeneratedSeedImageId(sample.fileId))
      .map((sample) => {
        const subject = `${sample.sampleName} ${sample.specification}`;
        return {
          fileId: sample.fileId!,
          originalName: asPngName(sample.fileName ?? sample.imageFileName ?? `${sample.sampleName}.png`),
          contentType: PHOTO_IMAGE_CONTENT_TYPE,
          body: encodeSeedPhoto(imageKindFor(subject), subject),
          attachmentKind: "supplier_seal_sample",
          objectType: "supplier",
          objectId: supplier.id,
          supplierId: supplier.id,
          uploadedBy: "u2"
        };
      })
  );
}

function projectSampleFiles(ctx: AppContext): SeedFile[] {
  return ctx.state.projectSampleReceipts.flatMap((sample) =>
    (sample.attachmentMetadata ?? []).flatMap((attachment) => {
      const isImage = attachment.contentType.startsWith("image/");
      if (isImage && !isGeneratedSeedImageId(attachment.id)) return [];
      const subject = `${sample.sampleName} ${sample.handlingNote ?? ""}`;
      return [{
        fileId: attachment.id,
        originalName: isImage ? asPngName(attachment.fileName) : attachment.fileName,
        contentType: isImage ? PHOTO_IMAGE_CONTENT_TYPE : attachment.contentType,
        body: isImage
          ? encodeSeedPhoto(imageKindFor(subject), subject)
          : encodeText(`${sample.sampleName} / 项目样品附件`),
        attachmentKind: "project_sample_receipt",
        objectType: "project_sample",
        objectId: sample.id,
        projectId: sample.projectId,
        supplierId: sample.supplierId,
        uploadedBy: sample.receivedBy
      }];
    })
  );
}

function mallProductFiles(ctx: AppContext): SeedFile[] {
  return ctx.state.mallProducts.flatMap((product) => {
    const subject = `${product.name} ${product.category} ${product.brand} ${product.specification}`;
    const imageFiles = product.imageFileIds
      .filter((fileId) => isGeneratedSeedImageId(fileId))
      .map((fileId, index) => ({
        fileId,
        originalName: `${product.name}${index === 0 ? "" : `-${index + 1}`}.png`,
        contentType: PHOTO_IMAGE_CONTENT_TYPE,
        body: encodeSeedPhoto(imageKindFor(subject), subject),
        attachmentKind: "mall_product_image",
        objectType: "mall_product",
        objectId: product.id,
        supplierId: product.supplierId,
        uploadedBy: product.createdBy
      }));
    const attachments = product.attachmentFileIds.map((fileId) => ({
      fileId,
      originalName: `${product.name}规格说明.pdf`,
      contentType: "application/pdf",
      body: encodeText(`${product.name}规格说明 / ${product.acceptanceGuide ?? "验收说明"}`),
      attachmentKind: "mall_product_attachment",
      objectType: "mall_product",
      objectId: product.id,
      supplierId: product.supplierId,
      uploadedBy: product.createdBy
    }));
    return [...imageFiles, ...attachments];
  });
}

function mallScenarioFiles(ctx: AppContext): SeedFile[] {
  return ctx.state.mallScenarioTemplates.flatMap((template) =>
    template.attachmentFileIds
      .filter((fileId) => isGeneratedSeedImageId(fileId))
      .map((fileId) => {
        const subject = `${template.name} ${template.description ?? ""} ${template.templateType}`;
        return {
          fileId,
          originalName: `${template.name}.png`,
          contentType: PHOTO_IMAGE_CONTENT_TYPE,
          body: encodeSeedPhoto(imageKindFor(subject), subject),
          attachmentKind: "mall_scenario_template_image",
          objectType: "mall_scenario_template",
          objectId: template.id,
          uploadedBy: template.createdBy
        };
      })
  );
}

function procurementDocumentFiles(ctx: AppContext): SeedFile[] {
  return ctx.state.procurementDocuments.flatMap((document) =>
    document.attachmentMetadata.map((attachment) => ({
      fileId: attachment.id,
      originalName: attachment.fileName,
      contentType: attachment.contentType,
      body: encodeText(`${document.title} / ${document.contentSummary}`),
      attachmentKind: "procurement_document",
      objectType: "procurement_document",
      objectId: document.id,
      projectId: document.projectId,
      uploadedBy: document.createdBy
    }))
  );
}

function registrationFiles(ctx: AppContext): SeedFile[] {
  return ctx.state.supplierRegistrations.flatMap((registration) => {
    const attachments = [...(registration.materialMetadata ?? []), ...(registration.supplementMaterialMetadata ?? [])];
    return attachments.map((attachment) => ({
      fileId: attachment.id,
      originalName: attachment.fileName,
      contentType: attachment.contentType,
      body: encodeText(`报名资料 / ${registration.supplierId} / ${attachment.fileName}`),
      attachmentKind: "supplier_registration_material",
      objectType: "supplier_registration",
      objectId: registration.id,
      projectId: registration.projectId,
      supplierId: registration.supplierId,
      uploadedBy: registration.supplierId
    }));
  });
}

function externalTradeFiles(ctx: AppContext): SeedFile[] {
  return ctx.state.externalTradeRecords.flatMap((record) => {
    const attachments = [...record.announcementMaterialMetadata, ...record.resultMaterialMetadata];
    return attachments.map((attachment) => ({
      fileId: attachment.id,
      originalName: attachment.fileName,
      contentType: attachment.contentType,
      body: encodeText(`${record.externalPlatformName} / ${attachment.fileName}`),
      attachmentKind: "external_trade_material",
      objectType: "external_trade_record",
      objectId: record.id,
      projectId: record.projectId,
      uploadedBy: record.createdBy
    }));
  });
}

function contractAndReceiptFiles(ctx: AppContext): SeedFile[] {
  const contractFiles = ctx.state.contractLedgers.flatMap((contract) =>
    contract.attachmentMetadata.map((attachment) => ({
      fileId: attachment.id,
      originalName: attachment.fileName,
      contentType: attachment.contentType,
      body: encodeText(`${contract.contractNo} / 合同附件`),
      attachmentKind: "contract_attachment",
      objectType: "contract",
      objectId: contract.id,
      projectId: contract.projectId,
      supplierId: contract.supplierId,
      uploadedBy: contract.supplierId
    }))
  );
  const receiptFiles = ctx.state.receiptRecords.flatMap((receipt) =>
    receipt.attachmentMetadata.flatMap((attachment) => {
      const isImage = attachment.contentType.startsWith("image/");
      if (isImage && !isGeneratedSeedImageId(attachment.id)) return [];
      const subject = `${receipt.summary} ${attachment.fileName}`;
      return [{
        fileId: attachment.id,
        originalName: isImage ? asPngName(attachment.fileName) : attachment.fileName,
        contentType: isImage ? PHOTO_IMAGE_CONTENT_TYPE : attachment.contentType,
        body: isImage
          ? encodeSeedPhoto(imageKindFor(subject), subject)
          : encodeText(`${receipt.summary} / 验收附件`),
        attachmentKind: "receipt_attachment",
        objectType: "receipt",
        objectId: receipt.id,
        projectId: receipt.projectId,
        supplierId: receipt.supplierId,
        uploadedBy: receipt.createdBy
      }];
    })
  );
  return [...contractFiles, ...receiptFiles];
}

function settlementFiles(ctx: AppContext): SeedFile[] {
  return [
    ...ctx.state.settlementMaterials
      .filter((material) => material.fileName)
      .map((material) => ({
        fileId: material.fileId ?? material.id,
        originalName: material.fileName!,
        contentType: material.fileName!.endsWith(".jpg") ? "image/jpeg" : "application/pdf",
        body: encodeText(`结算资料 / ${material.fileName}`),
        attachmentKind: "settlement_material",
        objectType: "settlement_material",
        objectId: material.id,
        projectId: material.projectId,
        supplierId: material.supplierId,
        uploadedBy: material.uploadedBy ?? material.supplierId
      })),
    ...ctx.state.mallSettlementInvoices
      .filter((invoice) => invoice.fileId && invoice.fileName)
      .map((invoice) => ({
        fileId: invoice.fileId!,
        originalName: invoice.fileName!,
        contentType: "application/pdf",
        body: encodeText(`商城发票 / ${invoice.fileName} / 金额 ${invoice.amount}`),
        attachmentKind: "mall_invoice",
        objectType: "mall_invoice",
        objectId: invoice.id,
        supplierId: invoice.supplierId,
        uploadedBy: invoice.uploadedBy
      }))
  ];
}
