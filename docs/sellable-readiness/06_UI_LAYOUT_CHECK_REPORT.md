# UI Layout Check Report

- Generated at: 2026-07-05T23:54:17.693Z
- Result: PASS

| Check | Status | Evidence |
| --- | --- | --- |
| login-no-scroll-1366x768 | PASS | scrollHeight=768, viewport=768, loginLayout=1 |
| login-balanced-portal-1366x768 | PASS | loginWidthRatio=0.82, brandRatio=0.47, cardRatio=0.53 |
| login-no-scroll-1440x900 | PASS | scrollHeight=900, viewport=900, loginLayout=1 |
| login-balanced-portal-1440x900 | PASS | loginWidthRatio=0.78, brandRatio=0.47, cardRatio=0.53 |
| app-shell-sidebar-width | PASS | sidebarWidth=220 |
| app-shell-spruce-sidebar | PASS | sidebarToken=#173F3D, computed=rgb(23, 63, 61) |
| app-shell-actions-visible | PASS | navIcons=0, topbar=1, roleSwitches=1, bellButtons=1 |
| dashboard-template-a-architecture | PASS | templateA=1, templateB=0, templateC=0, templateD=0, quickCards=4, gantt=1, flow=1, summaryCards=4, tables=1 |
| dashboard-no-wasted-middle-band | PASS | todoToTimelineGap=16, timelineStartsBeforeQuickEnds=true |
| dashboard-action-density | PASS | quickCards=4, surfaces=3 |
| controlled-decoration | PASS | gradientMentions=4 |
| dashboard-no-horizontal-overflow | PASS | bodyScrollWidth=1440, viewport=1440, tableOverflow=0 |
| dashboard-activity-remains-focused | PASS | waterfallItems=0, activityItems=0 |

## Boundary

This check validates second-pass visual layout rules: one-screen login on desktop, the low-saturation spruce shell, visible topbar actions, and template-A dashboard architecture. It does not change production readiness decisions.
