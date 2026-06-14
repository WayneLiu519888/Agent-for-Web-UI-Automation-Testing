# CLAUDE.md — Agent-for-Web-UI-Automation-Testing

项目简称 **WebUI-Test**，一个基于 MCP 协议的 Web UI 自动化测试 MCP Server。

## 设计原则（最高优先级）

项目运行于**企业内网**环境，所有设计决策必须服从以下六条原则：

1. **简单** — 能一个文件搞定的不拆两个，能标准库搞定的不加依赖，能硬编码的不抽象配置。优先使用 Node.js 内置模块。
2. **实用** — 只实现真正会被用到的功能。占位代码、预留扩展点、未激活的配置项都是债务而非资产。
3. **可扩展** — 扩展点通过约定优于配置实现（如命名约定、目录约定），而非通过抽象层/插件系统/依赖注入。
4. **开箱即用** — 克隆后 `npm install && npm run build && npm run dev:stdio` 三连即可工作。零额外配置、零环境变量（除密钥外）。
5. **免维护** — 代码即文档，命名自解释。拒绝"配置驱动"的过度抽象——每多一层间接层，就多一个排查故障的障碍。
6. **内联优先** — 交互事件推断不再依赖外部 YAML 字典，改为内联 role 映射表。Acc Tree 从 8 维精简为 4 扁维，去掉外部依赖。

违反以上原则的典型反模式：
- 为"未来可能"的需求预留接口/配置项/抽象层
- 引入第三方依赖替代 Node.js 标准库已有功能
- 创建只 re-export 一个符号的 barrel 文件
- 低于 10 行的文件（除非是独立的类型定义或脚本入口）
- 可配置但实际只有一个合理值的配置项

## 技术栈
- TypeScript 6.0+ / Node.js >=20 / ESM (NodeNext)
- @modelcontextprotocol/server 2.0.0-alpha.2 + @modelcontextprotocol/node + @modelcontextprotocol/express
- @playwright/mcp 0.0.76 + playwright-core 1.60.0
- Zod v4 / js-yaml / express

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
2. **推理-执行分离** — 蓝图预留（当前版本未实现 Phase 2/3 的 Worker Pool 并行执行）
3. **Acc Tree 4 扁维融合** — locators + a11y+text + geometry + interaction（从原始 8 维精简）
4. **交互事件内联映射** — 交互事件推断从三级字典(YAML)精简为内联 `ROLE_EVENT_MAP`（~16 个 role 映射）
5. **信息安全双层** — src/ 开源层-> GitHub OK / enterprise/ 企业机密层-> .gitignore 忽略
6. **纯 ESM 无 require()** — 项目 package.json `"type":"module"`，`require()` 在 ESM 模块中不可用会导致运行时崩溃。动态加载必须使用 `await import()`，静态加载使用顶部 `import`。CJS 互操作需手动处理 `(mod as any).default ?? mod`

## 目录结构
```
src/
├── types/              # tool.ts / interaction-events.ts / yaml.ts
├── utils/paths.ts       # 双层路径解析 (企业覆盖优先)
├── server/factory.ts    # McpServer 工厂 (按 transport 过滤工具)
├── entries/stdio.ts + http.ts  # 双入口
└── capability/          # 能力层
    ├── engine/          # 核心引擎（3 个文件）
    │   ├── acc-tree.ts          # Acc Tree 4扁维采集 + 内联 domCollectScript
    │   └── interaction-inferrer.ts  # 内联 ROLE_EVENT_MAP 事件推断
    ├── yaml/            # YAML IO (io.ts)
    ├── config/          # 配置加载 (loader.ts)
    ├── analysis/        # 组件分析 (component-analyzer.ts + component-scout.ts)
    └── tools/           # MCP 工具注册 (registry.ts)
```

## 自定义错误类型

- **McpConfigError** (`src/types/errors.ts`) — 配置加载错误，基础配置损坏时抛出阻断启动
- **FileWriteError** (`src/types/errors.ts`) — 文件写入错误，携带 filePath 便于诊断和重试

## 静默失败防护规则 (SF1-SF6)

所有 I/O 操作必须遵循以下规则，防止异常被静默吞掉：

1. **空 catch 块禁止** — 任何 catch 块必须至少记录 console.warn/error 或向上传播
2. **配置加载分层处理** — 基础配置损坏抛 McpConfigError 阻断启动，企业配置损坏 console.warn + 降级
3. **异步 fire-and-forget 必须 catch** — .catch() 中记录 console.error 并 emit 事件通知外部
4. **YAML/文件写入统一错误类型** — 所有 write 函数抛出 FileWriteError 带路径信息
5. **批量循环逐行容错** — Excel 转换等批量操作按行 try-catch，失败行记录到 warnings 继续处理

## 常用命令
- `npm run build` — tsc 编译
- `npm run typecheck` — 纯类型检查
- `npm run dev:stdio` — 开发模式 Stdio

## 安全配置

### IP 白名单
- HTTP 传输模式下，`/mcp` 端点仅允许 `mcp.config.yaml` 的 `ip_whitelist` 中配置的 IP 地址访问
- 支持精确 IP（如 `192.168.1.100`）和 CIDR 子网（如 `10.0.0.0/8`）
- 默认仅允许本机回环地址 `127.0.0.1` 和 `::1`
- 非白名单 IP 返回 HTTP 403
- 参见 `src/entries/http.ts` 中的 `ipWhitelistMiddleware()`

### Chromium 沙箱
- 默认启用 Chromium 安全沙箱
- 仅在 Docker/CI 容器环境中通过 `CHROMIUM_SANDBOX=false` 禁用
- 任何来自 YAML 配置的 `--no-sandbox` 都会被运行时逻辑清理，除非显式设置环境变量

### 密码注入机制
- `resolveEnvVars()` 递归遍历配置对象，将所有 `${VAR_NAME}` 替换为 `process.env[VAR_NAME]`
- 若引用的环境变量未设置，保留原始占位符并输出 `console.warn`

## 蓝图
完整设计蓝图：`docs/blueprint.plan.md`
