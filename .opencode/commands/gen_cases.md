# /gen_cases — Excel→YAML 用例转换

等价于 `case-generator source=$SOURCE [$ENV]`

## 参数

- `$SOURCE`（必填）：.xlsx 文件路径
- `$ENV`（可选）：若 Excel 无环境列则统一使用此环境

## 执行步骤

**立即调用** MCP 工具 `case-generator`（属于 mcp server `agent-for-web-ui-testing`）：
- `source`: `$SOURCE`
- 如果 `$ENV` 非空，加入 `environment: "$ENV"`

将结果原样展示。
