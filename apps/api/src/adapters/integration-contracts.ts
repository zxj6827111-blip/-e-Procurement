export type IntegrationLiveStatus = "contract_boundary" | "configured_endpoint_unverified" | "verified_integration";

export interface IntegrationContractField {
  name: string;
  required: boolean;
  description: string;
  sensitive?: boolean;
}

export interface IntegrationRetryContract {
  maxAttemptsEnv: "INTEGRATION_MAX_ATTEMPTS";
  defaultMaxAttempts: number;
  retryableStatuses: string[];
  backoff: string;
}

export interface IntegrationCallbackAuthContract {
  required: boolean;
  methods: string[];
  boundary: string;
}

export interface IntegrationAdapterContractDefinition {
  key: string;
  name: string;
  envKey: string;
  domain: string;
  businessTypes: string[];
  operations: string[];
  requestFields: IntegrationContractField[];
  responseFields: IntegrationContractField[];
  idempotencyKey: string;
  retryStrategy: IntegrationRetryContract;
  callbackAuth: IntegrationCallbackAuthContract;
  errorCodes: string[];
  productionEvidenceRequired: string[];
  noGoWhenMissing: string[];
}

export interface IntegrationAdapterContract extends IntegrationAdapterContractDefinition {
  endpointConfigured: boolean;
  liveStatus: IntegrationLiveStatus;
  verifiedIntegration: boolean;
  m6bBoundary: string;
}

const defaultRetryStrategy: IntegrationRetryContract = {
  maxAttemptsEnv: "INTEGRATION_MAX_ATTEMPTS",
  defaultMaxAttempts: 3,
  retryableStatuses: ["timeout", "5xx", "rate_limited", "temporary_unavailable"],
  backoff: "exponential_backoff_capped_at_60s"
};

export const integrationAdapterContractDefinitions = [
  {
    key: "sso",
    name: "SSO 统一身份适配器",
    envKey: "SSO",
    domain: "identity",
    businessTypes: ["identity.user_mapping", "identity.role_mapping", "identity.org_mapping"],
    operations: ["identity.authenticate", "identity.user_mapping", "identity.role_mapping", "identity.org_mapping"],
    requestFields: [
      { name: "providerSubject", required: true, description: "Stable subject from OIDC/SAML/LDAP/CAS or customer SSO." },
      { name: "displayName", required: true, description: "Display name used for local session and audit." },
      { name: "roleCode", required: true, description: "External role code mapped to local role id." },
      { name: "orgCode", required: true, description: "External organization code mapped to local organization scope." },
      { name: "hotelCodes", required: false, description: "Optional hotel or department scope list." },
      { name: "supplierId", required: false, description: "Supplier principal id when the external identity is a supplier account." },
      { name: "signedToken", required: true, description: "Signed token or assertion verified by the real SSO provider.", sensitive: true }
    ],
    responseFields: [
      { name: "localUserId", required: true, description: "Mapped local user id or provisioning target." },
      { name: "roleId", required: true, description: "Mapped local role id." },
      { name: "orgScope", required: true, description: "Allowed organization scope after mapping." },
      { name: "supplierId", required: false, description: "Supplier data boundary when applicable." },
      { name: "sessionSubject", required: true, description: "Subject stored in auth audit logs." }
    ],
    idempotencyKey: "provider + providerSubject + authSessionNonce",
    retryStrategy: defaultRetryStrategy,
    callbackAuth: {
      required: true,
      methods: ["OIDC signature", "SAML signature", "LDAP bind over TLS", "customer gateway mTLS"],
      boundary: "Local mock/test SSO is disabled in production; real provider signature and claim mapping evidence is required."
    },
    errorCodes: ["SSO_TOKEN_INVALID", "SSO_ROLE_UNMAPPED", "SSO_ORG_UNMAPPED", "SSO_ADAPTER_UNAVAILABLE"],
    productionEvidenceRequired: ["real provider metadata", "signature verification proof", "role/org mapping sample", "disabled user login rejection"],
    noGoWhenMissing: ["No real SSO provider or signed token verification evidence."]
  },
  {
    key: "oa",
    name: "OA 审批适配器",
    envKey: "OA",
    domain: "approval",
    businessTypes: ["approval.push", "approval.callback", "workflow.status"],
    operations: ["approval.push.submit", "approval.callback.apply", "workflow.status.sync"],
    requestFields: [
      { name: "approvalId", required: true, description: "Local R8 approval instance id." },
      { name: "businessType", required: true, description: "Approval business type." },
      { name: "businessId", required: true, description: "Business object id." },
      { name: "title", required: true, description: "Approval title displayed in OA." },
      { name: "applicantUserId", required: true, description: "Mapped applicant identity." },
      { name: "approverRoleOrUser", required: true, description: "Target approver rule or user mapping." },
      { name: "callbackUrl", required: true, description: "Signed callback endpoint registered with OA.", sensitive: true }
    ],
    responseFields: [
      { name: "externalApprovalId", required: true, description: "OA approval id." },
      { name: "status", required: true, description: "accepted/rejected/pending/error." },
      { name: "requestId", required: true, description: "External request id used for traceability." },
      { name: "errorCode", required: false, description: "OA error code when the call fails." }
    ],
    idempotencyKey: "oa + approvalId + businessType + businessId",
    retryStrategy: defaultRetryStrategy,
    callbackAuth: {
      required: true,
      methods: ["HMAC signature", "mTLS", "OA gateway token"],
      boundary: "Callbacks must be signed and mapped back to the original idempotency key before mutating local workflow state."
    },
    errorCodes: ["OA_TIMEOUT", "OA_REJECTED", "OA_SIGNATURE_INVALID", "OA_CALLBACK_REPLAYED", "OA_USER_UNMAPPED"],
    productionEvidenceRequired: ["OA push response sample", "callback signature sample", "reject/return callback sample", "replay rejection proof"],
    noGoWhenMissing: ["No OA endpoint, callback signature rule or mapped approval users."]
  },
  {
    key: "erp",
    name: "ERP 采购结果适配器",
    envKey: "ERP",
    domain: "erp",
    businessTypes: ["purchase_order.sync", "supplier.sync", "product.sync"],
    operations: ["purchase_order.sync", "supplier.sync", "product.sync", "settlement.status.sync"],
    requestFields: [
      { name: "businessId", required: true, description: "Local project/order/supplier/product id." },
      { name: "supplierId", required: true, description: "Supplier principal id." },
      { name: "orgId", required: true, description: "Purchasing organization id." },
      { name: "items", required: true, description: "Line items with sku, quantity, tax and price." },
      { name: "amount", required: true, description: "Tax-inclusive amount when applicable." }
    ],
    responseFields: [
      { name: "externalDocumentNo", required: true, description: "ERP document number." },
      { name: "status", required: true, description: "accepted/synchronized/rejected." },
      { name: "errorCode", required: false, description: "ERP error code when rejected." }
    ],
    idempotencyKey: "erp + operation + businessType + businessId + contentHash",
    retryStrategy: defaultRetryStrategy,
    callbackAuth: {
      required: true,
      methods: ["API key", "OAuth client credentials", "mTLS", "signed callback"],
      boundary: "ERP callbacks must not create duplicate orders or settlement records; local idempotency key remains authoritative."
    },
    errorCodes: ["ERP_TIMEOUT", "ERP_DUPLICATE_DOCUMENT", "ERP_VALIDATION_FAILED", "ERP_SUPPLIER_UNMAPPED"],
    productionEvidenceRequired: ["ERP field mapping", "order sync sample", "duplicate idempotency sample", "failed validation sample"],
    noGoWhenMissing: ["No ERP field mapping or test endpoint for supplier/product/order synchronization."]
  },
  {
    key: "wms",
    name: "WMS 发货收货适配器",
    envKey: "WMS",
    domain: "logistics",
    businessTypes: ["shipment.sync", "receipt.callback", "logistics.sync"],
    operations: ["shipment.sync", "receipt.callback.apply", "logistics.status.sync"],
    requestFields: [
      { name: "orderId", required: true, description: "Local purchase order id." },
      { name: "shipmentId", required: true, description: "Local shipment id." },
      { name: "supplierId", required: true, description: "Supplier principal id." },
      { name: "trackingNo", required: false, description: "Carrier tracking number." },
      { name: "items", required: true, description: "Shipped or received line items." }
    ],
    responseFields: [
      { name: "externalShipmentNo", required: true, description: "WMS shipment or receipt number." },
      { name: "status", required: true, description: "accepted/shipped/received/exception." },
      { name: "exceptionReason", required: false, description: "Reason for abnormal receipt or failed sync." }
    ],
    idempotencyKey: "wms + orderId + shipmentId + eventType",
    retryStrategy: defaultRetryStrategy,
    callbackAuth: {
      required: true,
      methods: ["HMAC signature", "gateway token", "mTLS"],
      boundary: "Receipt callbacks must be signed and constrained to the original order and supplier scope."
    },
    errorCodes: ["WMS_TIMEOUT", "WMS_RECEIPT_MISMATCH", "WMS_ORDER_NOT_FOUND", "WMS_SIGNATURE_INVALID"],
    productionEvidenceRequired: ["shipment sync sample", "receipt callback sample", "partial receipt sample", "signature verification proof"],
    noGoWhenMissing: ["No WMS or logistics callback contract for shipment and receipt status."]
  },
  {
    key: "contractSystem",
    name: "合同系统适配器",
    envKey: "CONTRACT",
    domain: "contract",
    businessTypes: ["award_result.push", "contract_ledger.sync", "contract_attachment.sync"],
    operations: ["award_result.push", "contract_ledger.sync", "contract_attachment.sync"],
    requestFields: [
      { name: "awardDecisionId", required: true, description: "Local award decision id." },
      { name: "projectId", required: true, description: "Procurement project id." },
      { name: "supplierId", required: true, description: "Awarded supplier id." },
      { name: "attachmentFileIds", required: false, description: "Related contract attachment ids." }
    ],
    responseFields: [
      { name: "externalContractId", required: true, description: "Contract system id." },
      { name: "status", required: true, description: "draft/approved/signed/archived/error." }
    ],
    idempotencyKey: "contract + projectId + awardDecisionId",
    retryStrategy: defaultRetryStrategy,
    callbackAuth: {
      required: true,
      methods: ["signed callback", "mTLS", "contract gateway token"],
      boundary: "Signed contract status callbacks remain external evidence and do not replace local R8 approval history."
    },
    errorCodes: ["CONTRACT_TIMEOUT", "CONTRACT_TEMPLATE_MISSING", "CONTRACT_SIGNATURE_INVALID", "CONTRACT_ATTACHMENT_MISSING"],
    productionEvidenceRequired: ["contract draft sample", "signed status callback sample", "attachment access proof"],
    noGoWhenMissing: ["No contract system field mapping or signed status callback evidence."]
  },
  {
    key: "finance",
    name: "财务与结算适配器",
    envKey: "FINANCE",
    domain: "finance",
    businessTypes: ["settlement.push", "invoice.sync", "payment_request.push", "payment_status.callback"],
    operations: ["settlement.push", "invoice.sync", "payment_request.push", "payment_status.callback.apply"],
    requestFields: [
      { name: "settlementBillId", required: true, description: "Local settlement bill id." },
      { name: "invoiceId", required: false, description: "Local invoice id when syncing invoice verification." },
      { name: "paymentRequestId", required: false, description: "Local payment request or fund ledger id." },
      { name: "supplierId", required: true, description: "Supplier principal id." },
      { name: "amount", required: true, description: "Settlement, invoice or payment amount." },
      { name: "bankAccountToken", required: false, description: "Tokenized bank account reference, never raw bank secrets.", sensitive: true }
    ],
    responseFields: [
      { name: "externalVoucherNo", required: true, description: "Finance voucher, invoice verification or payment request number." },
      { name: "status", required: true, description: "accepted/verified/payment_requested/paid/rejected/error." },
      { name: "errorCode", required: false, description: "Finance error code when rejected." }
    ],
    idempotencyKey: "finance + operation + settlementBillId/invoiceId/paymentRequestId",
    retryStrategy: defaultRetryStrategy,
    callbackAuth: {
      required: true,
      methods: ["HMAC signature", "mTLS", "finance gateway token"],
      boundary: "Payment callbacks must be signed and reconciled by amount, supplier and original payment request id."
    },
    errorCodes: ["FINANCE_TIMEOUT", "FINANCE_AMOUNT_MISMATCH", "PAYMENT_REJECTED", "PAYMENT_CALLBACK_REPLAYED", "INVOICE_UNVERIFIED"],
    productionEvidenceRequired: ["settlement push sample", "invoice verification sample", "payment callback sample", "amount reconciliation proof"],
    noGoWhenMissing: ["No finance/payment callback contract or amount reconciliation evidence."]
  },
  {
    key: "fileService",
    name: "文件服务适配器",
    envKey: "FILE_SERVICE",
    domain: "file",
    businessTypes: ["file.scan", "file.archive", "file.lifecycle"],
    operations: ["file.scan", "file.archive", "file.lifecycle.sync"],
    requestFields: [
      { name: "fileId", required: true, description: "Local stored file id." },
      { name: "sha256", required: true, description: "File checksum." },
      { name: "contentType", required: true, description: "Allowed content type." },
      { name: "objectType", required: true, description: "Business object type." },
      { name: "objectId", required: true, description: "Business object id." }
    ],
    responseFields: [
      { name: "scanStatus", required: true, description: "clean/quarantined/rejected/pending." },
      { name: "externalObjectKey", required: false, description: "Object storage key after real adapter upload." },
      { name: "retentionPolicy", required: false, description: "Lifecycle or retention policy id." }
    ],
    idempotencyKey: "fileService + fileId + sha256 + operation",
    retryStrategy: defaultRetryStrategy,
    callbackAuth: {
      required: true,
      methods: ["signed callback", "object storage event signature", "mTLS"],
      boundary: "Antivirus and lifecycle callbacks must be signed before changing file availability."
    },
    errorCodes: ["FILE_SCAN_TIMEOUT", "FILE_QUARANTINED", "OBJECT_STORAGE_UNAVAILABLE", "FILE_SIGNATURE_INVALID"],
    productionEvidenceRequired: ["object storage write/read proof", "antivirus clean/reject samples", "download audit sample"],
    noGoWhenMissing: ["No real object storage or antivirus scan evidence."]
  },
  {
    key: "messageNotification",
    name: "消息通知适配器",
    envKey: "MESSAGE",
    domain: "message",
    businessTypes: ["email.send", "sms.send", "enterprise_im.send"],
    operations: ["email.send", "sms.send", "enterprise_im.send", "message.status.callback.apply"],
    requestFields: [
      { name: "recipientExternalId", required: true, description: "Mapped recipient in the customer channel." },
      { name: "templateCode", required: true, description: "Approved message template code." },
      { name: "businessId", required: true, description: "Related local business object id." },
      { name: "variables", required: false, description: "Template variables after sensitive-field filtering." }
    ],
    responseFields: [
      { name: "externalMessageId", required: true, description: "Message provider id." },
      { name: "status", required: true, description: "accepted/sent/failed." }
    ],
    idempotencyKey: "message + channel + templateCode + businessId + recipientExternalId",
    retryStrategy: defaultRetryStrategy,
    callbackAuth: {
      required: true,
      methods: ["provider signature", "gateway token"],
      boundary: "Delivery callbacks update notification evidence only; they do not approve procurement actions."
    },
    errorCodes: ["MESSAGE_TEMPLATE_MISSING", "MESSAGE_RECIPIENT_UNMAPPED", "MESSAGE_PROVIDER_TIMEOUT"],
    productionEvidenceRequired: ["template approval", "send sample", "delivery callback sample"],
    noGoWhenMissing: ["No customer message provider or approved templates."]
  },
  {
    key: "auditExport",
    name: "审计导出适配器",
    envKey: "AUDIT_EXPORT",
    domain: "audit",
    businessTypes: ["audit.export", "audit.archive"],
    operations: ["audit.export", "audit.archive"],
    requestFields: [
      { name: "exportJobId", required: true, description: "Local audit export job id." },
      { name: "scope", required: true, description: "Approved export scope." },
      { name: "requestedBy", required: true, description: "Auditor or authorized operator." }
    ],
    responseFields: [
      { name: "externalArchiveId", required: true, description: "External archive id." },
      { name: "status", required: true, description: "accepted/archived/rejected." }
    ],
    idempotencyKey: "auditExport + exportJobId + scopeHash",
    retryStrategy: defaultRetryStrategy,
    callbackAuth: {
      required: true,
      methods: ["signed callback", "mTLS"],
      boundary: "Audit export requires explicit scope and must never expose raw internal payloadJson/sourceJson."
    },
    errorCodes: ["AUDIT_EXPORT_DENIED", "AUDIT_ARCHIVE_FAILED", "AUDIT_SIGNATURE_INVALID"],
    productionEvidenceRequired: ["export scope approval", "archive callback sample", "redaction proof"],
    noGoWhenMissing: ["No approved audit export target or redaction policy."]
  },
  {
    key: "eSignature",
    name: "电子签章适配器",
    envKey: "E_SIGNATURE",
    domain: "signature",
    businessTypes: ["signature.request", "signature.status"],
    operations: ["signature.request", "signature.status.callback.apply"],
    requestFields: [
      { name: "documentId", required: true, description: "Local document or contract file id." },
      { name: "signerExternalId", required: true, description: "Mapped signer identity." },
      { name: "businessId", required: true, description: "Related project/contract id." }
    ],
    responseFields: [
      { name: "externalSignatureId", required: true, description: "External signature workflow id." },
      { name: "status", required: true, description: "started/signed/rejected/expired." }
    ],
    idempotencyKey: "eSignature + documentId + signerExternalId + businessId",
    retryStrategy: defaultRetryStrategy,
    callbackAuth: {
      required: true,
      methods: ["signature platform callback signature", "mTLS"],
      boundary: "Electronic signature remains an external contract boundary until customer signature platform evidence is provided."
    },
    errorCodes: ["SIGNATURE_USER_UNMAPPED", "SIGNATURE_DOCUMENT_REJECTED", "SIGNATURE_CALLBACK_INVALID"],
    productionEvidenceRequired: ["signature request sample", "signed document callback sample", "certificate chain proof"],
    noGoWhenMissing: ["No electronic signature platform evidence."]
  },
  {
    key: "ca",
    name: "CA 证书适配器",
    envKey: "CA",
    domain: "certificate",
    businessTypes: ["ca.verify", "ca.timestamp"],
    operations: ["ca.verify", "ca.timestamp"],
    requestFields: [
      { name: "certificateSerialNo", required: true, description: "Certificate serial number." },
      { name: "documentHash", required: true, description: "Hash to verify or timestamp." },
      { name: "signatureValue", required: true, description: "Signature value to verify.", sensitive: true }
    ],
    responseFields: [
      { name: "verificationStatus", required: true, description: "valid/invalid/expired/revoked." },
      { name: "timestampToken", required: false, description: "Trusted timestamp token." }
    ],
    idempotencyKey: "ca + certificateSerialNo + documentHash + operation",
    retryStrategy: defaultRetryStrategy,
    callbackAuth: {
      required: true,
      methods: ["CA platform signature", "trusted timestamp authority certificate"],
      boundary: "CA verification evidence is external and must not be simulated for production."
    },
    errorCodes: ["CA_CERT_EXPIRED", "CA_CERT_REVOKED", "CA_SIGNATURE_INVALID", "CA_TIMESTAMP_FAILED"],
    productionEvidenceRequired: ["certificate validation sample", "timestamp token sample", "revocation check proof"],
    noGoWhenMissing: ["No CA platform or trusted timestamp evidence."]
  },
  {
    key: "eInvoice",
    name: "电子发票平台适配器",
    envKey: "E_INVOICE",
    domain: "invoice",
    businessTypes: ["invoice.issue", "invoice.status"],
    operations: ["invoice.issue", "invoice.status.callback.apply", "invoice.verify"],
    requestFields: [
      { name: "invoiceId", required: true, description: "Local invoice id." },
      { name: "invoiceNo", required: true, description: "Invoice number." },
      { name: "taxpayerNo", required: true, description: "Supplier or buyer tax number.", sensitive: true },
      { name: "amount", required: true, description: "Invoice amount." },
      { name: "taxAmount", required: true, description: "Tax amount." }
    ],
    responseFields: [
      { name: "externalInvoiceId", required: true, description: "Invoice platform id." },
      { name: "verificationStatus", required: true, description: "verified/rejected/pending." },
      { name: "errorCode", required: false, description: "Platform error code when rejected." }
    ],
    idempotencyKey: "eInvoice + invoiceNo + amount + taxAmount",
    retryStrategy: defaultRetryStrategy,
    callbackAuth: {
      required: true,
      methods: ["platform signature", "tax gateway token", "mTLS"],
      boundary: "Invoice verification must come from the real tax/invoice platform before production payment decisions."
    },
    errorCodes: ["E_INVOICE_NOT_FOUND", "E_INVOICE_AMOUNT_MISMATCH", "E_INVOICE_DUPLICATE", "E_INVOICE_SIGNATURE_INVALID"],
    productionEvidenceRequired: ["invoice verification sample", "duplicate invoice rejection sample", "tax amount mismatch sample"],
    noGoWhenMissing: ["No electronic invoice platform or tax verification evidence."]
  }
] as const satisfies readonly IntegrationAdapterContractDefinition[];

export type IntegrationAdapterKey = (typeof integrationAdapterContractDefinitions)[number]["key"];

export function buildIntegrationAdapterContract(definition: IntegrationAdapterContractDefinition, endpointConfigured: boolean): IntegrationAdapterContract {
  return {
    ...definition,
    endpointConfigured,
    liveStatus: endpointConfigured ? "configured_endpoint_unverified" : "contract_boundary",
    verifiedIntegration: false,
    m6bBoundary: endpointConfigured
      ? "Endpoint is configured, but M6-B treats it as an unverified contract boundary until real customer-system evidence is attached."
      : "No endpoint is configured; this is a contract boundary only and remains a production No-Go dependency."
  };
}

export function normalizeIntegrationProviderKey(value: string) {
  const trimmed = value.trim();
  const normalized = trimmed.toLowerCase();
  const matched = integrationAdapterContractDefinitions.find((definition) => {
    return definition.key.toLowerCase() === normalized || definition.envKey.toLowerCase() === normalized || definition.envKey.toLowerCase().replace(/_/g, "") === normalized.replace(/_/g, "");
  });
  return matched?.key ?? trimmed;
}

export function integrationEndpointEnvMap() {
  return Object.fromEntries(integrationAdapterContractDefinitions.map((definition) => [definition.key, definition.envKey])) as Record<IntegrationAdapterKey, string>;
}

export function integrationContractKeys() {
  return integrationAdapterContractDefinitions.map((definition) => definition.key);
}
