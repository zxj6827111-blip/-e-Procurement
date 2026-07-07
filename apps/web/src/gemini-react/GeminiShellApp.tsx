import React from "react";
import { AppProvider, AppShell } from "./core/GovernedReactShell";
import type { User, ViewState } from "./shared/types";
import type { FrontendFeatureFlags } from "../meta/feature-flags";
import type { FrontendRuntimeState, PermissionSnapshot, RouteContext } from "../meta/frontend-state-contract";
import type { RegistryMenuConfig } from "../meta/menu-adapter";

export interface GeminiShellAppProps {
  currentUser: User;
  currentView: ViewState;
  currentProjectId: string | null;
  runtimeState: FrontendRuntimeState;
  menuConfig: RegistryMenuConfig;
  routeContext: RouteContext;
  permissionSnapshot: PermissionSnapshot;
  featureFlags: FrontendFeatureFlags;
  canResetRuntimeData?: boolean;
  resettingData?: boolean;
  resetMessage?: string;
  onResetRuntimeData?: () => Promise<boolean> | boolean;
  onNavigate: (path: string) => void;
  onLogout: () => void;
  onReportError?: (error: unknown) => void;
}

interface ReactModuleErrorBoundaryState {
  hasError: boolean;
}

class ReactModuleErrorBoundary extends React.Component<
  { routeContext: RouteContext; onReportError?: (error: unknown) => void; children: React.ReactNode },
  ReactModuleErrorBoundaryState
> {
  state: ReactModuleErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    this.props.onReportError?.(error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 text-slate-700 flex items-center justify-center p-8">
          <div className="max-w-md rounded border border-slate-200 bg-white p-6 shadow-sm">
            <h1 className="text-lg font-semibold text-slate-900">业务界面暂不可用</h1>
            <p className="mt-2 text-sm leading-6">当前 React 模块渲染失败，Vue Shell 已保留会话与导航边界。请稍后重试或联系管理员。</p>
            <p className="mt-4 text-xs text-slate-400">Route: {this.props.routeContext.route}</p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export function GeminiShellApp(props: GeminiShellAppProps) {
  return (
    <div className="h-screen overflow-hidden bg-[#F5F7FA] text-slate-900 font-sans">
      <AppProvider
        user={props.currentUser}
        view={props.currentView}
        projectId={props.currentProjectId}
        runtimeState={props.runtimeState}
        menuConfig={props.menuConfig}
        routeContext={props.routeContext}
        permissionSnapshot={props.permissionSnapshot}
        featureFlags={props.featureFlags}
        canResetRuntimeData={props.canResetRuntimeData}
        resettingData={props.resettingData}
        resetMessage={props.resetMessage}
        onResetRuntimeData={props.onResetRuntimeData}
        onNavigate={props.onNavigate}
        onLogout={props.onLogout}
      >
        <ReactModuleErrorBoundary routeContext={props.routeContext} onReportError={props.onReportError}>
          <AppShell />
        </ReactModuleErrorBoundary>
      </AppProvider>
    </div>
  );
}
