# Mock / Stub Adapter 说明

本目录用于记录正式工程骨架中的外部系统 Adapter 占位策略。第二批只允许 mock / stub，不连接真实客户系统，不写死接口地址、密钥或账号。

已预留 Adapter：

- SsoAdapter
- OaAdapter
- OrganizationUserSyncAdapter
- MasterDataAdapter
- ErpAdapter
- ContractSystemAdapter
- FinanceAdapter
- FileServiceAdapter
- MessageNotificationAdapter
- AuditExportAdapter

运行态实现位于 `apps/api/src/adapters/`，每个 Adapter 均保留本地调用日志，可通过配置在 mock / stub 模式之间切换。
