---
description: "【快捷命令】交互式发现项目专属Web组件"
arguments:
  - name: project
    description: "项目名称 → dictionaries/projects/{project}/"
    required: true
  - name: url
    description: "起始 URL（被测系统地址）"
    required: true
---

# /scout — 组件发现

等价于 `web-component-scout project="{project}" base_url="{url}"`

**立即调用** `mcp__agent-for-web-ui-testing__web-component-scout`，参数：
- `project`: "{{project}}"
- `base_url`: "{{url}}"

不要做任何额外确认，直接调用工具并展示结果。
