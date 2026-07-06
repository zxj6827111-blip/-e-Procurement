import React from "react";
import { AppProvider } from "./prototype/context/AppContext";
import { AppShell } from "./prototype/components/layout/AppShell";
import type { User, ViewState } from "./prototype/types";

export interface GeminiShellAppProps {
  currentUser: User;
  currentView: ViewState;
  currentProjectId: string | null;
  onViewChange: (view: ViewState) => void;
  onProjectIdChange: (projectId: string | null) => void;
  onLogout: () => void;
}

export function GeminiShellApp(props: GeminiShellAppProps) {
  return (
    <div className="h-screen overflow-hidden bg-[#F5F7FA] text-slate-900 font-sans">
      <AppProvider
        user={props.currentUser}
        view={props.currentView}
        projectId={props.currentProjectId}
        onViewChange={props.onViewChange}
        onProjectIdChange={props.onProjectIdChange}
        onLogout={props.onLogout}
      >
        <AppShell />
      </AppProvider>
    </div>
  );
}
