import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../../core/AppContext';
import { BUSINESS_CASES } from '../reference-data';
import { Card } from '../../shared/ui/Card';
import { Badge } from '../../shared/ui/Badge';
import { Button } from '../../shared/ui/Button';
import { Search, Filter, ShieldAlert } from 'lucide-react';
import { StageNames, type Project, type ProjectStage } from '../../shared/types';
import { ProjectContract } from '../../../contracts';
import { apiGet } from '../../../api/http';

interface ApiProject {
  id: string;
  code: string;
  sourceRequestId?: string;
  sourceRequestTitle?: string;
  displayName?: string;
  name: string;
  orgName?: string;
  type?: string;
  status?: string;
  displayStatus?: string;
  category?: string;
  budgetAmount?: number;
  buyer?: string;
  quoteDeadlineAt?: string | null;
  externalTradeFlag?: boolean;
}

interface ApiProcurementRequest {
  id: string;
  code: string;
  title?: string;
  projectId?: string;
  status?: string;
  approvalStatus?: string;
  category?: string;
  methodSuggestion?: string;
  budgetAmount?: number;
  requestDepartment?: string;
  requesterName?: string;
}

const copy = {
  title: '\u91c7\u8d2d\u9879\u76ee\u53f0\u8d26',
  description: '\u67e5\u770b\u548c\u7ba1\u7406\u6388\u6743\u8303\u56f4\u5185\u7684\u91c7\u8d2d\u9879\u76ee\u53ca\u5f85\u627f\u63a5\u7533\u8bf7',
  createProject: '\u65b0\u5efa\u9879\u76ee',
  searchPlaceholder: '\u641c\u7d22\u9879\u76ee\u7f16\u53f7\u3001\u91c7\u8d2d\u7533\u8bf7\u53f7\u3001\u540d\u79f0\u6216\u7ecf\u529e\u4eba',
  ruleFilter: '\u89c4\u5219\u7b5b\u9009',
  projectCodeName: '\u9879\u76ee\u7f16\u53f7 / \u540d\u79f0',
  orgAgent: '\u7ec4\u7ec7\u4e0e\u7ecf\u529e',
  procurementMethod: '\u91c7\u8d2d\u65b9\u5f0f',
  currentStage: '\u5f53\u524d\u9636\u6bb5',
  riskReminder: '\u98ce\u9669\u63d0\u9192',
  operation: '\u64cd\u4f5c',
  detail: '\u5de5\u4f5c\u53f0\u8be6\u60c5',
  highRisk: '\u9ad8\u98ce\u9669',
  attention: '\u6ce8\u610f',
  previous: '\u4e0a\u4e00\u9875',
  next: '\u4e0b\u4e00\u9875',
  loading: '\u6b63\u5728\u52a0\u8f7d\u771f\u5b9e\u9879\u76ee...',
  loadFailed: '\u9879\u76ee\u63a5\u53e3\u6682\u65f6\u4e0d\u53ef\u7528\uff0c\u5df2\u663e\u793a\u672c\u5730\u515c\u5e95\u6570\u636e\u3002',
  empty: '\u6682\u65e0\u91c7\u8d2d\u9879\u76ee\u6216\u5f85\u627f\u63a5\u7533\u8bf7',
  countPrefix: '\u5171 ',
  countSuffix: ' \u6761\u53f0\u8d26\u8bb0\u5f55',
  defaultType: '\u96c6\u4e2d\u91c7\u8d2d',
  defaultMethod: '\u5185\u90e8\u91c7\u8d2d',
  defaultOrg: '\u96c6\u56e2\u91c7\u8d2d\u4e2d\u5fc3',
  defaultAgent: '\u91c7\u8d2d\u7ecf\u529e',
  pendingMethod: '\u5f85\u5224\u5b9a\u91c7\u8d2d\u65b9\u5f0f',
  pendingProject: '\u5f85\u627f\u63a5\u91c7\u8d2d\u7533\u8bf7',
  pendingCreation: '\u5f85\u751f\u6210\u91c7\u8d2d\u9879\u76ee',
  pendingAgent: '\u5f85\u91c7\u8d2d\u7ecf\u529e\u627f\u63a5',
  acceptRequest: '\u627f\u63a5\u7533\u8bf7',
  createFromRequest: '\u751f\u6210\u9879\u76ee'
};

type ProjectRow = Project & {
  sourceRequestId?: string;
  sourceRequestCode?: string;
  sourceRequestTitle?: string;
  displayName?: string;
  pendingRequest?: boolean;
  pendingRequestStatus?: string;
};

function mapProjectStage(status?: string): ProjectStage {
  if (!status) return 'INITIATION';
  if (status.includes('document')) return 'DOCUMENT';
  if (status.includes('registration')) return 'REGISTRATION';
  if (status.includes('bidding') || status.includes('bid')) return 'BIDDING';
  if (status.includes('review')) return 'REVIEW';
  if (status.includes('award')) return 'AWARD';
  if (status.includes('settlement') || status.includes('paid')) return 'SETTLEMENT';
  if (status.includes('fulfillment') || status.includes('contract') || status.includes('performing') || status.includes('received') || status.includes('evaluated')) return 'FULFILLMENT';
  if (status.includes('archive')) return 'ARCHIVE';
  if (status.includes('external')) return 'EXTERNAL_FILED';
  return 'INITIATION';
}

function riskForProject(project: ApiProject): Project['riskLevel'] {
  if (project.externalTradeFlag) return 'LOW';
  if (project.status?.includes('exception')) return 'HIGH';
  if (project.status?.includes('award')) return 'MEDIUM';
  return 'LOW';
}

function toGeminiProject(project: ApiProject, sourceRequestCode?: string): ProjectRow {
  const stage = mapProjectStage(project.status);
  return {
    id: project.id,
    code: project.code,
    name: project.name,
    type: project.category || project.type || copy.defaultType,
    method: project.type || project.displayStatus || copy.defaultMethod,
    stage,
    organization: project.orgName || copy.defaultOrg,
    agent: project.buyer || copy.defaultAgent,
    budget: project.budgetAmount ?? 0,
    bidDeadline: project.quoteDeadlineAt ?? undefined,
    riskLevel: riskForProject(project),
    archiveCompleteness: stage === 'ARCHIVE' ? 100 : stage === 'FULFILLMENT' || stage === 'SETTLEMENT' ? 90 : 65,
    isExternal: Boolean(project.externalTradeFlag),
    sourceRequestId: project.sourceRequestId,
    sourceRequestCode,
    sourceRequestTitle: project.sourceRequestTitle,
    displayName: project.displayName
  };
}

function toPendingRequestRow(request: ApiProcurementRequest): ProjectRow {
  return {
    id: `pending-request:${request.id}`,
    code: request.code,
    name: request.title || request.code,
    type: request.category || copy.defaultType,
    method: request.status === 'method_decided' ? request.methodSuggestion || copy.defaultMethod : copy.pendingMethod,
    stage: 'INITIATION',
    organization: request.requestDepartment || copy.defaultOrg,
    agent: copy.pendingAgent,
    budget: request.budgetAmount ?? 0,
    riskLevel: 'LOW',
    archiveCompleteness: 0,
    isExternal: false,
    sourceRequestId: request.id,
    sourceRequestCode: request.code,
    sourceRequestTitle: request.title,
    displayName: request.title,
    pendingRequest: true,
    pendingRequestStatus: request.status
  };
}

async function loadProjects(userId?: string, includePendingRequests = false): Promise<ProjectRow[]> {
  const [projectData, requestData] = await Promise.all([
    apiGet<{ projects: ApiProject[] }>('/api/projects', userId),
    apiGet<{ procurementRequests: ApiProcurementRequest[] }>('/api/procurement-requests', userId).catch(() => ({ procurementRequests: [] }))
  ]);
  const requestCodeById = new Map(requestData.procurementRequests.map((request) => [request.id, request.code]));
  const requestCodeByProjectId = new Map(
    requestData.procurementRequests
      .filter((request) => request.projectId)
      .map((request) => [request.projectId as string, request.code])
  );
  const projects = projectData.projects.map((project) =>
    toGeminiProject(project, requestCodeById.get(project.sourceRequestId ?? '') ?? requestCodeByProjectId.get(project.id))
  );
  if (!includePendingRequests) return projects;
  const pendingRequests = requestData.procurementRequests
    .filter(
      (request) =>
        !request.projectId &&
        request.approvalStatus === 'approved' &&
        ['submitted', 'method_decided'].includes(String(request.status))
    )
    .map(toPendingRequestRow);
  return [...pendingRequests, ...projects];
}

export function ProjectListView() {
  const { currentUser, navigateToPath, setCurrentView, setCurrentProjectId } = useApp();
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setLoadError('');
    const includePendingRequests = ['PROCUREMENT_AGENT', 'PLATFORM_OPERATIONS'].includes(String(currentUser?.role));
    loadProjects(currentUser?.id, includePendingRequests)
      .then((items) => {
        if (!mounted) return;
        setProjects(items);
      })
      .catch(() => {
        if (!mounted) return;
        setProjects(BUSINESS_CASES);
        setLoadError(copy.loadFailed);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [currentUser?.id, currentUser?.role]);

  const filteredProjects = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return projects;
    return projects.filter((project) =>
      [project.code, project.sourceRequestCode, project.sourceRequestId, project.sourceRequestTitle, project.displayName, project.name, project.organization, project.agent, project.method]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(keyword))
    );
  }, [projects, query]);

  const handleViewProject = (id: string) => {
    setCurrentProjectId(id);
    setCurrentView('PROJECT_DETAIL');
  };

  const handleAcceptRequest = (requestId: string) => {
    navigateToPath(`/procurement-requests/${encodeURIComponent(requestId)}`);
  };

  const handleCreateProject = () => {
    setCurrentProjectId(null);
    setCurrentView('PURCHASE_REQUEST');
  };

  const projectRows = filteredProjects.map((project) => ({
    source: project,
    contract: ProjectContract.toWorkbenchViewModel({
      ...project,
      stageLabel: StageNames[project.stage],
      archiveStatus: project.archiveCompleteness >= 100 ? '\u5df2\u5f52\u6863' : '\u5f52\u6863\u4e2d',
      supplierRiskLevel: project.riskLevel,
      quotationVersion: project.stage === 'BIDDING' ? 'V1' : 'V2'
    }).viewModel
  }));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900 tracking-tight">{copy.title}</h2>
          <p className="text-sm text-slate-500 mt-1">{copy.description}</p>
        </div>
        <Button data-ui-check="project-create-entry" variant="primary" onClick={handleCreateProject}>{copy.createProject}</Button>
      </div>

      <Card>
        <div className="p-4 border-b border-slate-100 flex gap-4 bg-slate-50/50 rounded-t-lg">
          <div className="flex-1 relative">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={copy.searchPlaceholder}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
            />
          </div>
          <Button variant="outline" className="gap-2">
            <Filter className="w-4 h-4" /> {copy.ruleFilter}
          </Button>
        </div>

        {loadError ? <div className="px-6 py-3 text-sm text-amber-700 bg-amber-50 border-b border-amber-100">{loadError}</div> : null}

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">{copy.projectCodeName}</th>
                <th className="px-6 py-4">{copy.orgAgent}</th>
                <th className="px-6 py-4">{copy.procurementMethod}</th>
                <th className="px-6 py-4">{copy.currentStage}</th>
                <th className="px-6 py-4">{copy.riskReminder}</th>
                <th className="px-6 py-4 text-right">{copy.operation}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td className="px-6 py-8 text-center text-slate-500" colSpan={6}>{copy.loading}</td>
                </tr>
              ) : projectRows.length ? projectRows.map(({ source: project, contract }) => (
                <tr key={project.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-medium text-slate-900">{contract.name}</div>
                    <div className="text-slate-500 text-xs mt-1 font-mono">
                      {project.pendingRequest
                        ? project.sourceRequestCode || project.sourceRequestId
                        : `${contract.code}${project.sourceRequestCode ? ` / ${project.sourceRequestCode}` : project.sourceRequestId ? ` / ${project.sourceRequestId}` : ''}`}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-slate-900">{contract.organization}</div>
                    <div className="text-slate-500 text-xs mt-1">{contract.agent}</div>
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant={project.pendingRequest ? 'warning' : project.isExternal ? 'outline' : 'default'}>
                      {project.pendingRequest ? project.method : contract.procurementMethod}
                    </Badge>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                      {project.pendingRequest
                        ? project.pendingRequestStatus === 'method_decided' ? copy.pendingCreation : copy.pendingProject
                        : contract.currentStage.label}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {project.riskLevel === 'HIGH' && <Badge variant="danger"><ShieldAlert className="w-3 h-3 mr-1 inline"/>{copy.highRisk}</Badge>}
                    {project.riskLevel === 'MEDIUM' && <Badge variant="warning">{copy.attention}</Badge>}
                    {project.riskLevel === 'LOW' && <span className="text-slate-400">-</span>}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {project.pendingRequest && project.sourceRequestId ? (
                      <Button variant="ghost" size="sm" onClick={() => handleAcceptRequest(project.sourceRequestId!)}>
                        {project.pendingRequestStatus === 'method_decided' ? copy.createFromRequest : copy.acceptRequest}
                      </Button>
                    ) : (
                      <Button variant="ghost" size="sm" onClick={() => handleViewProject(project.id)}>
                        {copy.detail}
                      </Button>
                    )}
                  </td>
                </tr>
              )) : (
                <tr>
                  <td className="px-6 py-8 text-center text-slate-500" colSpan={6}>{copy.empty}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between text-sm text-slate-500">
          <span>{copy.countPrefix}{projectRows.length}{copy.countSuffix}</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled>{copy.previous}</Button>
            <Button variant="outline" size="sm" disabled>{copy.next}</Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
