---
description: "【快捷命令】获取当前页面增强Acc Tree快照"
arguments:
  - name: compact
    description: "紧凑模式 — 仅输出 ref+role+actionable+locators(前2级)"
    required: false
---

# /snap — 增强页面快照

等价于 `web-snapshot [compact={compact}]`

**立即调用** `mcp__agent-for-web-ui-testing__web-snapshot`，参数：
- 如果用户提供了 compact=true，加上 `compact`: true

不要做任何额外确认，直接调用工具并展示结果。
