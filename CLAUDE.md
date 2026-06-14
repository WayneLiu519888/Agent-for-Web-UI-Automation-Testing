# CLAUDE.md — Agent-for-Web-UI-Automation-Testing

项目简称 **WebUI-Test**，一个基于 MCP 协议的 Web UI 自动化测试 MCP Server。

## 技术栈
- TypeScript 6.0+ / Node.js >=20 / ESM (NodeNext)
- @modelcontextprotocol/server 2.0.0-alpha.2 + @modelcontextprotocol/node + @modelcontextprotocol/express
- @playwright/mcp 0.0.76 + playwright-core 1.60.0
- Zod v4 / js-yaml / express / xlsx

## 核心架构

```
编排层 (6 个 MCP 工具)
  web-init / web-explore / test-case-executor / case-generator / web-snapshot / web-component-scout
        │ 委托底层浏览器操作
        ▼
执行层 @playwright/mcp (23 个工具)
  browser_navigate / browser_click / browser_type / browser_fill_form / browser_snapshot ...
```

## 关键设计决策
1. **编排层不等于执行层** — 不重复实现 Playwright 浏览器操作，全部委托 Playwright MCP
2. **推理-执行分离** — Phase1(LLM批量规划) -> Phase2(Worker Pool并行执行,零LLM) -> Phase3(按需补救)
3. **进程级并行** — 每个 Worker = 独立 Node.js 子进程 + 独立 Chromium，用尽机器 CPU/内存；parGroup 亲和性调度避免同组认证任务分散到多个 Worker
4. **Acc Tree 8维融合** — DOM+A11y+Geometry+Locators+Interaction+Framework+Text+Children
5. **TaskScheduler 分区队列 + 二分插入** — C2: unassigned[] + assigned[] + unassignedByParGroup Map 索引使 assignTask/steal 达到 O(1); C3: 二分插入保持优先级排序 O(log n)，替代 sort() 的 O(n log n)
6. **ResourceDetector 双重约束 + 水位线缓存** — C1: Worker 容量基于 totalMemoryMB 避免 freeMemoryMB 瞬时波动; C4: runtimeCheck 水位线值在 detectResources() 时缓存为模块级变量
7. **信息安全双层** — src/ 开源层 -> GitHub OK / enterprise/ 企业机密层 -> .gitignore 忽略
8. **交互事件字典三级** — _overrides.yaml(人工) > components.yaml(自动) > base/controls.yaml(默认)
9. **纯 ESM 无 require()** — 项目 package.json `"type":"module"`，`require()` 在 ESM 模块中不可用会导致运行时崩溃。动态加载必须使用 `await import()`，静态加载使用顶部 `import`。CJS 互操作需手动处理 `(mod as any).default ?? mod`
## 目录结构
```
src/
├── types/              # tool.ts / interaction-events.ts / yaml.ts / errors.ts
├── utils/paths.ts       # 双层路径解析 (企业覆盖优先)
├── server/factory.ts    # McpServer 工厂 (按 transport 过滤工具)
├── entries/stdio.ts + http.ts  # 双入口
└── capability/          # 两层架构重构后的能力层
    ├── engine/          # 9 个核心引擎文件
    │   ├── acc-tree.ts  / interaction-inferrer.ts  / locator-builder.ts
    │   ├── explorer.ts  / execution-plan.ts
    │   ├── worker-pool-manager.ts / task-scheduler.ts (分区队列+二分插入C2+C3) / resource-detector.ts (双重约束C1+水位线缓存C4)
    │   └── dom-collector.ts
    ├── playwright/      # Playwright 封装适配 (pw-tools.ts 合并封装 + adapter.ts 接口)
    ├── yaml/            # YAML 读写工具 (reader.ts + writer.ts)
    ├── excel/           # Excel 转换工具 (converter.ts)
    ├── config/          # 配置加载工具 (loader.ts + generator.ts)
    ├── report/          # 报告生成工具 (aggregator.ts)
    ├── analysis/        # 组件分析 (component-analyzer.ts + component-scout.ts)
    └── tools/           # MCP 工具注册 (registry.ts)
```

## 自定义错误类型

- **McpConfigError** (`src/types/errors.ts`) — 配置加载错误，基础配置损坏时抛出阻断启动
- **FileWriteError** (`src/types/errors.ts`) — 文件写入错误，携带 filePath 便于诊断和重试

## 静默失败防护规则 (SF1-SF9)

所有 I/O 操作必须遵循以下规则，防止异常被静默吞掉：

1. **空 catch 块禁止** — 任何 catch 块必须至少记录 console.warn/error 或向上传播
2. **配置加载分层处理** — 基础配置损坏抛 McpConfigError 阻断启动，企业配置损坏 console.warn + 降级
3. **异步 fire-and-forget 必须 catch** — .catch() 中记录 console.error 并 emit 事件通知外部
4. **YAML/文件写入统一错误类型** — 所有 write 函数抛出 FileWriteError 带路径信息
5. **批量循环逐行容错** — Excel 转换等批量操作按行 try-catch，失败行记录到 warnings 继续处理
6. **字典加载暴露状态** — InteractionInferrer.loadErrors 数组对外暴露加载失败详情

## 常用命令
- `npm run build` — tsc 编译
- `npm run typecheck` — 纯类型检查
- `npm run dev:stdio` — 开发模式 Stdio

## 安全配置

### Chromium 沙箱 (C1)
- 默认启用 Chromium 安全沙箱
- 仅在 Docker/CI 容器环境中通过 `CHROMIUM_SANDBOX=false` 禁用
- 任何来自 YAML 配置的 `--no-sandbox` 都会被运行时逻辑清理，除非显式设置环境变量
- 参见 `src/capability/config/loader.ts` 中的 `applySandboxConfig()`

### HTTP 认证 (H3)
- HTTP 传输模式下 `MCP_API_KEY` 为**必填**环境变量，未设置时 `process.exit(1)` 拒绝启动
- 原因：/mcp 端点可被远程访问，无认证运行允许攻击者任意调用 MCP 工具
- 健康检查端点 `/health` 无需认证

### 密码注入机制 (H4)
- `resolveEnvVars()` 递归遍历配置对象，将所有 `${VAR_NAME}` 替换为 `process.env[VAR_NAME]`
- 若引用的环境变量未设置，保留原始占位符并输出 `console.warn`
- 此机制覆盖所有配置字段（包括但不限于 password、api_key 等敏感字段）

### xlsx 依赖已知风险 (C2, P1)
- 依赖 xlsx (SheetJS) 社区版，该库已停维且存在已知原型污染漏洞 (GHSA-4r6h-8v6p-xvw6)
- 缓解策略：
  1. `convertXlsxToYaml()` 入口处强制文件大小限制 (10MB)
  2. 仅允许 `.xlsx` / `.xls` 扩展名白名单
  3. 通过 .gitignore 限制输入文件来源，不接受来自不可信来源的 Excel 文件
- 长期方案：评估迁移至 ExcelJS 或仅接受 YAML 输入
- 参见 `src/capability/excel/converter.ts`


## 蓝图
完整设计蓝图：`docs/blueprint.plan.md` (~2500 行)
