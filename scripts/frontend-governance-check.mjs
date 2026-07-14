import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const routerSource = readFileSync(join(root, "apps/web/src/router/index.ts"), "utf8");
const matrixSource = readFileSync(join(root, "apps/web/src/meta/route-matrix.ts"), "utf8");
const appShellSource = readFileSync(join(root, "apps/web/src/gemini-react/core/AppShell.tsx"), "utf8");
const geminiShellAppSource = readFileSync(join(root, "apps/web/src/gemini-react/GeminiShellApp.tsx"), "utf8");
const legacyInventorySource = readFileSync(join(root, "apps/web/src/gemini-react/legacy/legacy-inventory.ts"), "utf8");
const roleModelSource = readFileSync(join(root, "apps/web/src/permissions/role-model.ts"), "utf8");
const menuAdapterSource = readFileSync(join(root, "apps/web/src/meta/menu-adapter.ts"), "utf8");
const prototypePathExists = existsSync(join(root, "apps/web/src/gemini-react/prototype"));

const routerPaths = new Set([...routerSource.matchAll(/\{\s*path:\s*"([^"]+)"/g)].map((match) => match[1]));
const matrixRoutes = new Set([
  ...[...matrixSource.matchAll(/route:\s*"([^"]+)"/g)].map((match) => match[1]),
  ...[...matrixSource.matchAll(/redirect\("([^"]+)"/g)].map((match) => match[1])
]);

const missingRoutes = [...routerPaths].filter((route) => !matrixRoutes.has(route));
const shellUsesIndependentRoleMenu = /export\s+const\s+getRoleMenus|function\s+getRoleMenus/.test(appShellSource);
const formalShellImportsLegacyPrototype = geminiShellAppSource.includes("/prototype") || geminiShellAppSource.includes("./prototype");
const legacyInventoryIsStructured = legacyInventorySource.includes("reactLegacyInventory") && legacyInventorySource.includes("trackedBy");
const menuAdapterUsesRoleModel =
  menuAdapterSource.includes("visibleNavItems") &&
  menuAdapterSource.includes("roleHome") &&
  menuAdapterSource.includes("roleLabels");

function getRoleBlock(roleId) {
  const match = roleModelSource.match(new RegExp(`${roleId}:\\s*\\{([\\s\\S]*?)\\n\\s*\\}`));
  return match?.[1] ?? "";
}

function getSidebar(roleId) {
  const block = getRoleBlock(roleId);
  const match = block.match(/sidebar:\s*\[([^\]]*)\]/);
  return match ? [...match[1].matchAll(/"([^"]+)"/g)].map((item) => item[1]) : [];
}

function getHome(roleId) {
  const block = getRoleBlock(roleId);
  return block.match(/home:\s*"([^"]+)"/)?.[1] ?? "";
}

const roleSmokeCases = [
  { roleId: "group_manager", home: "/", requiredMenus: ["demandApproval", "projectWorkbench"] },
  { roleId: "buyer", home: "/", requiredMenus: ["procurementRequests", "projectWorkbench"] },
  { roleId: "hotel_buyer", home: "/", requiredMenus: ["dashboard", "procurementRequests", "supplyMall", "orderFulfillment"] }
];
const failedRoleSmoke = roleSmokeCases
  .map((role) => {
    const sidebar = getSidebar(role.roleId);
    const missingMenus = role.requiredMenus.filter((menuId) => !sidebar.includes(menuId));
    const home = getHome(role.roleId);
    return { ...role, sidebar, home, missingMenus, passed: home === role.home && missingMenus.length === 0 };
  })
  .filter((role) => !role.passed);

if (missingRoutes.length > 0) {
  console.error("Route Matrix is missing Vue Router routes:");
  for (const route of missingRoutes) console.error(`- ${route}`);
}

if (shellUsesIndependentRoleMenu) {
  console.error("React Shell still exposes an independent getRoleMenus permission source.");
}

if (!menuAdapterUsesRoleModel) {
  console.error("Menu adapter is not wired to role-model.ts as the menu authority.");
}

if (failedRoleSmoke.length > 0) {
  console.error("Role smoke failed for governed menu/home checks:");
  for (const role of failedRoleSmoke) {
    console.error(`- ${role.roleId}: home=${role.home}, missingMenus=${role.missingMenus.join(", ")}`);
  }
}

if (prototypePathExists) {
  console.error("React prototype directory still exists under gemini-react.");
}

if (formalShellImportsLegacyPrototype) {
  console.error("Formal GeminiShellApp render path still imports prototype directly.");
}

if (!legacyInventoryIsStructured) {
  console.error("Legacy inventory is missing structured route-matrix tracking fields.");
}

if (
  missingRoutes.length > 0 ||
  shellUsesIndependentRoleMenu ||
  !menuAdapterUsesRoleModel ||
  failedRoleSmoke.length > 0 ||
  prototypePathExists ||
  formalShellImportsLegacyPrototype ||
  !legacyInventoryIsStructured
) {
  process.exit(1);
}

console.log(`frontend-governance-check passed: ${routerPaths.size} Vue Router routes covered by Route Matrix; role smoke covered group_manager, buyer, hotel_buyer; prototype directory removed from formal React tree.`);
