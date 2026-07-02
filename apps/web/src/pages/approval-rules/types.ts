import type { R8ApprovalBusinessType, R8ApprovalRuleDto } from "../../api/workflow";

export type StatusTone = "default" | "primary" | "success" | "warning" | "error";

export interface RuleFormState {
  ruleCode: string;
  ruleName: string;
  businessType: R8ApprovalBusinessType;
  amountMin: number | undefined;
  amountMax: number | undefined;
  methodTypes: string;
  nodeRoleIds: string;
  actions: string;
  orgScope: string;
  hotelScope: string;
  approvalOrder: string;
  defaultStrategy: NonNullable<R8ApprovalRuleDto["defaultStrategy"]>;
  status: R8ApprovalRuleDto["status"];
}

export interface BusinessTypeOption {
  value: R8ApprovalBusinessType;
  label: string;
}
