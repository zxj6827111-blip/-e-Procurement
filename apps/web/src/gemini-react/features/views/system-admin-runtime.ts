import { apiGet } from '../../../api/http';
import type { R8ApprovalRuleDto } from '../../../../../api/src/workflow-ui-contract';

export interface SystemRoleRow {
  id: string;
  name: string;
  hint?: string;
}

export interface SystemUserRow {
  id: string;
  name: string;
  roleId: string;
  orgId: string;
  status?: string;
  departmentId?: string;
  position?: string;
}

export interface SystemOrganizationRow {
  id: string;
  name: string;
  level?: string;
  parentId?: string | null;
  status?: string;
}

export interface SystemRolePermissionRow {
  roleId: string;
  menus: string[];
  actions: string[];
}

export interface SystemAdminSnapshot {
  menus: string[];
  actions: string[];
  roles: SystemRoleRow[];
  users: SystemUserRow[];
  organizations: SystemOrganizationRow[];
  rolePermissions: SystemRolePermissionRow[];
  approvalRules: R8ApprovalRuleDto[];
  adminError: string;
}

export async function loadSystemAdminSnapshot(userId?: string): Promise<SystemAdminSnapshot> {
  const [menusResult, actionsResult, rolesResult, usersResult, organizationsResult, permissionsResult, rulesResult] = await Promise.allSettled([
    apiGet<{ menus: string[] }>('/api/me/menus', userId),
    apiGet<{ actions: string[] }>('/api/me/actions', userId),
    apiGet<{ roles: SystemRoleRow[] }>('/api/roles', userId),
    apiGet<{ users: SystemUserRow[] }>('/api/users', userId),
    apiGet<{ organizations: SystemOrganizationRow[] }>('/api/organizations', userId),
    apiGet<{ rolePermissions: SystemRolePermissionRow[] }>('/api/role-permissions', userId),
    apiGet<{ approvalRules: R8ApprovalRuleDto[] }>('/api/workflow/approval-rules', userId)
  ]);

  const adminErrorCandidates = [rolesResult, usersResult, permissionsResult].filter((result) => result.status === 'rejected') as PromiseRejectedResult[];

  return {
    menus: menusResult.status === 'fulfilled' ? menusResult.value.menus : [],
    actions: actionsResult.status === 'fulfilled' ? actionsResult.value.actions : [],
    roles: rolesResult.status === 'fulfilled' ? rolesResult.value.roles : [],
    users: usersResult.status === 'fulfilled' ? usersResult.value.users : [],
    organizations: organizationsResult.status === 'fulfilled' ? organizationsResult.value.organizations : [],
    rolePermissions: permissionsResult.status === 'fulfilled' ? permissionsResult.value.rolePermissions : [],
    approvalRules: rulesResult.status === 'fulfilled' ? rulesResult.value.approvalRules : [],
    adminError:
      adminErrorCandidates.length > 0
        ? adminErrorCandidates
            .map((result) => (result.reason instanceof Error ? result.reason.message : '管理员配置数据加载失败'))
            .join('；')
        : ''
  };
}
