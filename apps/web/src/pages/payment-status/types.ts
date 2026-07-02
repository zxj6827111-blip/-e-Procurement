export interface FundLedgerEntry {
  id: string;
  accountId: string;
  orgId: string;
  orderId?: string;
  direction: string;
  entryType: string;
  amount: number;
  status: string;
  createdBy: string;
  createdAt: string;
  note?: string;
}

export interface FundAccount {
  id: string;
  orgId: string;
  balance: number;
  creditLimit: number;
  occupiedAmount: number;
  status: string;
  ledgerEntries: FundLedgerEntry[];
  updatedAt: string;
}

export interface MallOrder {
  id: string;
  orderNo: string;
  orgId: string;
  supplierId: string;
  status: string;
  totalAmount: number;
  paymentStatus?: string;
  paymentReservedAmount?: number;
  updatedAt: string;
}

export interface Organization {
  id: string;
  name: string;
}

export interface FundOperationForm {
  rechargeAmount: number;
  rechargeNote: string;
  captureNote: string;
  releaseNote: string;
}

export interface LedgerRow extends FundLedgerEntry {
  account: FundAccount;
}
