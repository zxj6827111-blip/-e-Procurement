export interface ReactLegacyInventoryItem {
  path: string;
  reason: string;
  trackedBy: "route-matrix" | "migration-report";
}

export const reactLegacyInventory: ReactLegacyInventoryItem[] = [];
