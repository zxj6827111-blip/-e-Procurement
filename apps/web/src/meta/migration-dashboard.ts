import { buildMigrationReport } from "./migration-controller";

export function getMigrationDashboard() {
  return buildMigrationReport();
}

export const migrationDashboardBaseline = buildMigrationReport("phase-1-dashboard-baseline");
