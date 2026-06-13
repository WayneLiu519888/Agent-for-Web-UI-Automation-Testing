---
description: "【快捷命令】探索Web页面结构并生成Acc Tree YAML"
arguments:
  - name: url
    description: "要探索的页面 URL"
    required: true
  - name: mode
    description: "探索模式 — quick(单页)/deep(递归同域，默认 quick)"
    required: false
---

# /web_explore — 探索页面结构

等价于 `web-explore url="{url}" [mode={mode}]`

**立即调用** `mcp__agent-for-web-ui-testing__web-explore`，参数：
- `url`: "{{url}}"
- 如果用户提供了 mode，加上 `mode`: "{{mode}}"

不要做任何额外确认，直接调用工具并展示结果。
