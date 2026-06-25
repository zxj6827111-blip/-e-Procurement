import type { AuditService } from "../services/audit-service.js";
import type { AuthContext } from "../types.js";
import { isSupplierRole, supplierIdMatches } from "../role-groups.js";
import { deny } from "./policy-utils.js";

export class SupplierDataIsolationPolicy {
  constructor(private readonly audit: AuditService) {}

  assertSupplierAccess(context: AuthContext, supplierId: string, objectType = "supplier", objectId = supplierId) {
    if (!isSupplierRole(context.roleId)) return;
    if (supplierIdMatches(context.user, supplierId)) return;
    deny(this.audit, context, {
      code: "SUPPLIER_SCOPE_DENIED",
      message: "供应商只能访问本企业数据。",
      action: "supplier.scope.denied",
      objectType,
      objectId,
      reason: `supplier ${context.user.supplierId ?? "unknown"} tried to access ${supplierId}`
    });
  }
}
