import type { ProcessService, MirrorApprovalActionArgs, MirrorApprovalStartedArgs } from "./process-service.js";

export class R8ToProcessAdapter {
  constructor(private readonly processService: ProcessService) {}

  approvalStarted(args: MirrorApprovalStartedArgs) {
    this.processService.mirrorApprovalStarted(args);
  }

  approvalActionRecorded(args: MirrorApprovalActionArgs) {
    this.processService.mirrorApprovalActionRecorded(args);
  }
}
