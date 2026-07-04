# UI Layout Check Report

- Generated at: 2026-07-04T18:50:18.032Z
- Result: PASS

| Check | Status | Evidence |
| --- | --- | --- |
| login-no-scroll-1366x768 | PASS | scrollHeight=768, viewport=768, loginLayout=1 |
| login-balanced-portal-1366x768 | PASS | loginWidthRatio=0.78, brandRatio=0.47, cardRatio=0.53 |
| login-no-scroll-1440x900 | PASS | scrollHeight=900, viewport=900, loginLayout=1 |
| login-balanced-portal-1440x900 | PASS | loginWidthRatio=0.74, brandRatio=0.47, cardRatio=0.53 |
| app-shell-sidebar-width | PASS | sidebarWidth=246 |
| app-shell-light-sidebar | PASS | sidebarToken=#FFFFFF, computed=rgb(255, 255, 255) |
| no-single-character-nav-icons | PASS | navIcons=0, bodyLength=709 |
| dashboard-information-architecture | PASS | layout=1, side=1, summaryStrip=1, taskItems=5, activityItems=4 |
| dashboard-not-function-matrix | PASS | legacy workbench section titles are absent |
| controlled-decoration | PASS | gradientMentions=0 |
| dashboard-no-horizontal-overflow | PASS | bodyScrollWidth=1440, viewport=1440, tableOverflow=0 |
| dashboard-panel-count | PASS | workbenchSurfaces=4 |
| dashboard-no-stacked-action-buttons | PASS | stackedActionButtons=0 |

## Boundary

This check validates second-pass visual layout rules: one-screen login on desktop, light commercial sidebar, no single-character nav icons, and dashboard information architecture. It does not change production readiness decisions.
