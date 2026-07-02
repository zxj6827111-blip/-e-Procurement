export interface SwitchableUser {
  id: string;
  name: string;
  roleId: string;
  roleLabel: string;
  supplierId?: string;
  supplierName?: string;
}
