# Enterprise UI Platform Report

## Scope

This report is generated from the current Vue 3 + Vite worktree and the enterprise UI platform tooling.

## Summary

- Pages classified: 43
- Root route pages rewritten as thin wrappers: 41
- Feature folders: 34
- Page implementation files: 247
- Base components: 13
- Visual regression baseline routes: 8
- Browser page-kind smoke routes: 43
- Legacy design-system policy: token and eds/enterprise namespaces only

## Page Kinds

- DASHBOARD_PAGE: 1
- FORM_PAGE: 10
- LIST_PAGE: 21
- DETAIL_PAGE: 11

## Tooling Coverage

- UI linter: scripts/ui-violation-scan.mjs
- Token compiler: node scripts/ui-platform.mjs tokens:compile
- Component generator: node scripts/ui-platform.mjs component:generate Name --write
- Page generator: node scripts/ui-platform.mjs page:generate domain LIST --write
- Dependency map: node scripts/ui-platform.mjs dependency-map
- Codemod engine: node scripts/ui-platform.mjs codemod --write
- Visual regression: node scripts/ui-platform.mjs visual:regression
- Figma sync metadata: node scripts/ui-platform.mjs figma:sync
- Governance check: node scripts/ui-platform.mjs governance:check
- CI gate: npm run ui:ci

## Validation Evidence

- UI platform gate: npm run ui:platform
- UI linter fixture regression: npm run ui:scan:test
- UI compliance scan: npm run ui:scan
- Page-kind browser smoke: npm run ui:smoke
- Visual regression baseline/check: npm run ui:visual -- --update; npm run ui:visual
- Type and production build gate: npm run typecheck; npm run build

## Compliance Statement

The system is structured as a custom token-based enterprise procurement SaaS UI system on Vue 3 + Vite. It does not depend on Ant Design Vue or another external UI framework as the primary UI system.
