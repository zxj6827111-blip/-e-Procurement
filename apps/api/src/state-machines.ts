import {
  archiveStatuses,
  bidStatuses,
  bidViewApprovalStatuses,
  externalProjectStatuses,
  internalProjectStatuses,
  scoringSheetStatuses,
  type ArchiveStatus,
  type BidStatus,
  type BidViewApprovalStatus,
  type ExternalProjectStatus,
  type InternalProjectStatus,
  type ProcurementProject,
  type ScoringSheetStatus
} from "./types.js";

export interface StateMachine<TState extends string> {
  name: string;
  states: readonly TState[];
  canUse(state: string): state is TState;
}

function createStateMachine<TState extends string>(name: string, states: readonly TState[]): StateMachine<TState> {
  return {
    name,
    states,
    canUse(state: string): state is TState {
      return states.includes(state as TState);
    }
  };
}

export const stateMachines = {
  internalProject: createStateMachine<InternalProjectStatus>("internalProject", internalProjectStatuses),
  externalProject: createStateMachine<ExternalProjectStatus>("externalProject", externalProjectStatuses),
  bid: createStateMachine<BidStatus>("bid", bidStatuses),
  scoringSheet: createStateMachine<ScoringSheetStatus>("scoringSheet", scoringSheetStatuses),
  bidViewApproval: createStateMachine<BidViewApprovalStatus>("bidViewApproval", bidViewApprovalStatuses),
  archive: createStateMachine<ArchiveStatus>("archive", archiveStatuses)
};

type ProjectStatusValidation =
  | { allowed: true; status: InternalProjectStatus | ExternalProjectStatus }
  | { allowed: false; code: "PROJECT_STATUS_INVALID"; message: string };

export function validateProjectStatus(project: ProcurementProject, nextStatus: string): ProjectStatusValidation {
  const machine = project.externalTradeFlag ? stateMachines.externalProject : stateMachines.internalProject;
  if (!machine.canUse(nextStatus)) {
    return {
      allowed: false,
      code: "PROJECT_STATUS_INVALID",
      message: project.externalTradeFlag ? "外部交易项目状态不在允许的状态机内。" : "内部采购项目状态不在允许的状态机内。"
    };
  }
  return { allowed: true, status: nextStatus };
}
