import { createAdapters, type AdapterRegistry } from "./adapters/mock-adapters.js";
import { createSsoAdapter, type SsoAdapter } from "./adapters/identity-adapter.js";
import { AdminBusinessIsolationPolicy } from "./policies/admin-business-isolation-policy.js";
import { AuditRequiredActionPolicy } from "./policies/audit-required-action-policy.js";
import { BidConfidentialityPolicy } from "./policies/bid-confidentiality-policy.js";
import { ExpertAssignmentPolicy } from "./policies/expert-assignment-policy.js";
import { ExternalTradeBlockingPolicy } from "./policies/external-trade-blocking-policy.js";
import { SupplierDataIsolationPolicy } from "./policies/supplier-data-isolation-policy.js";
import { R3SupplierProductRepository } from "./repositories/r3-supplier-product-repository.js";
import { R4SourcingRepository } from "./repositories/r4-sourcing-repository.js";
import { R5ReviewAwardRepository } from "./repositories/r5-review-award-repository.js";
import { R6OrderFulfillmentRepository } from "./repositories/r6-order-fulfillment-repository.js";
import { R7SettlementFinanceRepository } from "./repositories/r7-settlement-finance-repository.js";
import { R8WorkflowTaskRepository } from "./repositories/r8-workflow-task-repository.js";
import { InternalBusinessEventRepository } from "./repositories/internal-business-event-repository.js";
import { BpmnDefinitionRepository } from "./repositories/bpmn-definition-repository.js";
import { BpmnPilotRepository } from "./repositories/bpmn-pilot-repository.js";
import { ProcessRepository } from "./repositories/process-repository.js";
import type { SeedState } from "./seed/data.js";
import { AuditService } from "./services/audit-service.js";
import { BpmnDefinitionService } from "./services/bpmn-definition-service.js";
import { BpmnPilotService } from "./services/bpmn-pilot-service.js";
import { InternalEventBus } from "./services/internal-event-bus.js";
import { ProcessService } from "./services/process-service.js";
import { R8ToProcessAdapter } from "./services/r8-to-process-adapter.js";
import { AuthStore, BusinessTableStore, FileStore, getRuntimeConfig, RuntimeDb, RuntimeStateStore, type RuntimeConfig } from "./runtime/index.js";
import { seedRuntimeFiles } from "./runtime/seed-files.js";

export interface AppContext {
  state: SeedState;
  auditService: AuditService;
  adapters: AdapterRegistry;
  ssoAdapter: SsoAdapter;
  config: RuntimeConfig;
  runtimeDb: RuntimeDb;
  businessTableStore: BusinessTableStore;
  r3SupplierProductRepository: R3SupplierProductRepository;
  r4SourcingRepository: R4SourcingRepository;
  r5ReviewAwardRepository: R5ReviewAwardRepository;
  r6OrderFulfillmentRepository: R6OrderFulfillmentRepository;
  r7SettlementFinanceRepository: R7SettlementFinanceRepository;
  r8WorkflowTaskRepository: R8WorkflowTaskRepository;
  internalBusinessEventRepository: InternalBusinessEventRepository;
  bpmnDefinitionRepository: BpmnDefinitionRepository;
  bpmnDefinitionService: BpmnDefinitionService;
  bpmnPilotRepository: BpmnPilotRepository;
  bpmnPilotService: BpmnPilotService;
  eventBus: InternalEventBus;
  processRepository: ProcessRepository;
  processService: ProcessService;
  stateStore: RuntimeStateStore;
  authStore: AuthStore;
  fileStore: FileStore;
  policies: {
    supplierDataIsolation: SupplierDataIsolationPolicy;
    expertAssignment: ExpertAssignmentPolicy;
    bidConfidentiality: BidConfidentialityPolicy;
    externalTradeBlocking: ExternalTradeBlockingPolicy;
    adminBusinessIsolation: AdminBusinessIsolationPolicy;
    auditRequiredAction: AuditRequiredActionPolicy;
  };
}

export interface AppContextOptions {
  runtime?: import("./runtime/index.js").RuntimeConfigOverrides;
}

export function createAppContext(options: AppContextOptions = {}): AppContext {
  const config = getRuntimeConfig(options.runtime);
  const runtimeDb = new RuntimeDb(config);
  const businessTableStore = new BusinessTableStore(runtimeDb);
  const r3SupplierProductRepository = new R3SupplierProductRepository(runtimeDb);
  const r4SourcingRepository = new R4SourcingRepository(runtimeDb);
  const r5ReviewAwardRepository = new R5ReviewAwardRepository(runtimeDb);
  const r6OrderFulfillmentRepository = new R6OrderFulfillmentRepository(runtimeDb);
  const r7SettlementFinanceRepository = new R7SettlementFinanceRepository(runtimeDb);
  const internalBusinessEventRepository = new InternalBusinessEventRepository(runtimeDb);
  const bpmnDefinitionRepository = new BpmnDefinitionRepository(runtimeDb);
  const bpmnDefinitionService = new BpmnDefinitionService(bpmnDefinitionRepository);
  const bpmnPilotRepository = new BpmnPilotRepository(runtimeDb);
  const bpmnPilotService = new BpmnPilotService(bpmnPilotRepository, bpmnDefinitionRepository, bpmnDefinitionService, config.appEnv);
  const processRepository = new ProcessRepository(runtimeDb);
  const processService = new ProcessService(processRepository);
  const eventBus = new InternalEventBus(internalBusinessEventRepository);
  eventBus.handle("*", "process-event-writer", (event) => {
    processService.recordInternalBusinessEvent(event);
  });
  eventBus.handle("*", "bpmn-pilot-shadow-runner", (event) => {
    try {
      bpmnPilotService.handleInternalBusinessEvent(event);
    } catch {
      // BPMN pilot is a shadow trial in M5-B and must never block R8/Process.
    }
  });
  const r8ToProcessAdapter = new R8ToProcessAdapter(processService);
  const r8WorkflowTaskRepository = new R8WorkflowTaskRepository(runtimeDb, r8ToProcessAdapter, eventBus);
  const stateStore = new RuntimeStateStore(runtimeDb, businessTableStore);
  const state = stateStore.loadState(config.seedOnBoot, { cleanBusinessData: config.cleanBusinessData });
  state.pricingReports ??= [];
  r4SourcingRepository.syncSourcingState(state);
  r5ReviewAwardRepository.syncReviewAwardState(state);
  r6OrderFulfillmentRepository.syncOrderFulfillmentState(state);
  r7SettlementFinanceRepository.syncSettlementFinanceState(state);
  if (!config.cleanBusinessData) {
    r7SettlementFinanceRepository.ensureBusinessSettlementSamples();
    r7SettlementFinanceRepository.syncSettlementFinanceState(state);
  }
  r8WorkflowTaskRepository.syncWorkflowState(state);
  const authStore = new AuthStore(runtimeDb);
  authStore.seedAccounts(state.users, config.allowLocalPasswordLogin);
  const fileStore = new FileStore(runtimeDb, config.filesRoot, config);
  const auditService = new AuditService(state, runtimeDb);
  const ctx: AppContext = {
    state,
    auditService,
    adapters: createAdapters(runtimeDb, config),
    ssoAdapter: createSsoAdapter(state, config),
    config,
    runtimeDb,
    businessTableStore,
    r3SupplierProductRepository,
    r4SourcingRepository,
    r5ReviewAwardRepository,
    r6OrderFulfillmentRepository,
    r7SettlementFinanceRepository,
    r8WorkflowTaskRepository,
    internalBusinessEventRepository,
    bpmnDefinitionRepository,
    bpmnDefinitionService,
    bpmnPilotRepository,
    bpmnPilotService,
    eventBus,
    processRepository,
    processService,
    stateStore,
    authStore,
    fileStore,
    policies: {
      supplierDataIsolation: new SupplierDataIsolationPolicy(auditService),
      expertAssignment: new ExpertAssignmentPolicy(state, auditService),
      bidConfidentiality: new BidConfidentialPolicyBridge(state, auditService),
      externalTradeBlocking: new ExternalTradeBlockingPolicy(auditService),
      adminBusinessIsolation: new AdminBusinessIsolationPolicy(auditService),
      auditRequiredAction: new AuditRequiredActionPolicy(auditService)
    }
  };
  seedRuntimeFiles(ctx);
  return ctx;
}

class BidConfidentialPolicyBridge extends BidConfidentialityPolicy {}
