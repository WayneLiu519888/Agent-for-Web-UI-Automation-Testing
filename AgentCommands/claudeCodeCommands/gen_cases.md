---
description: "【快捷命令】Excel测试用例批量转换为YAML格式"
arguments:
  - name: source
    description: ".xlsx 文件路径"
    required: true
  - name: environment
    description: "若Excel中无环境列则统一使用此环境"
    required: false
---

# /gen_cases — Excel→YAML 用例转换

等价于 `case-generator source="{source}" [environment={environment}]`

**立即调用** `mcp__agent-for-web-ui-testing__case-generator`，参数：
- `source`: "{{source}}"
- 如果用户提供了 environment，加上 `environment`: "{{environment}}"

不要做任何额外确认，直接调用工具并展示结果。
