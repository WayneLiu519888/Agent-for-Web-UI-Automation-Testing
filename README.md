<p align="center">
  <br/>
  <img src="https://img.shields.io/badge/Node.js-20%2B-brightgreen?logo=nodedotjs" alt="Node.js 20+">
  <img src="https://img.shields.io/badge/npm-9%2B-red?logo=npm" alt="npm 9+">
  <img src="https://img.shields.io/badge/MCP-2.0.0_alpha-blue?logo=openai" alt="MCP 2.0.0-alpha">
  <img src="https://img.shields.io/badge/Playwright-1.60.0-2EAD33?logo=playwright" alt="Playwright 1.60.0">
  <img src="https://img.shields.io/badge/Apache-2.0-9966FF?logo=apache" alt="Apache-2.0 License">
  <br/>
  <img src="https://img.shields.io/badge/TypeScript-zero_errors-informational?logo=typescript" alt="TypeScript 零错误">
  <img src="https://img.shields.io/badge/核心引擎-15_files-blueviolet" alt="15 个核心文件">
  <img src="https://img.shields.io/badge/MCP工具-6_tools-critical" alt="6 个 MCP 工具">
  <img src="https://img.shields.io/badge/交互事件-65_events-yellow" alt="65 种交互事件">
</p>

<div align="center">

**🌐 Language / 语言 / 言語**: [English](docs/en/README.md) | **[简体中文](README.md)** | [繁體中文](docs/zh-TW/README.md) | [日本語](docs/ja/README.md)

</div>

<h1 align="center">Agent-for-Web-UI-Automation-Testing</h1>

<p align="center">
  <strong>不录制、不写脚本 —— 为 AI Agent 打造的 Web UI 自动化测试 MCP Server</strong>
</p>

<p align="center">
  Agent 读取页面 Accessibility Tree 结合 DOM 语义理解页面结构，<br/>
  按纯文本 YAML 用例自主推理并进程级并行执行 Web 操作。
</p>

<hr/>

<details open>
<summary><strong>📋 快速指引</strong></summary>

<table width="100%">
<tr><th width="40%">我想...</th><th>看这里</th></tr>
<tr><td>快速把项目跑起来</td><td><a href="#-快速开始">🚀 快速开始</a></td></tr>
<tr><td>了解能做什么</td><td><a href="#-核心概念">🧠 核心概念</a></td></tr>
<tr><td>看有哪些工具可用</td><td><a href="#️-6-个-mcp-工具">🛠️ 6 个 MCP 工具</a></td></tr>
<tr><td>配置 Claude Desktop</td><td><a href="#-安装方式">📥 安装方式</a></td></tr>
<tr><td>看完整的 2500+ 行设计蓝图</td><td><a href=".claude/plans/blueprint.plan.md">📐 blueprint.plan.md</a></td></tr>
</table>
</details>

---

## 📦 包含内容

<table width="100%">
<tr><th width="15%">分类</th><th width="55%">内容</th><th width="10%">文件数</th></tr>
<tr><td>🧠 <strong>核心引擎</strong></td><td>Acc Tree 采集、交互事件推断、多策略定位器、YAML 读写</td><td align="center">15 个</td></tr>
<tr><td>🛠️ <strong>MCP 工具</strong></td><td>init / explore / executor / generator / snapshot / scout</td><td align="center">6 个</td></tr>
<tr><td>📖 <strong>字典体系</strong></td><td>65 种交互事件 + 20+ 声明式 match 规则</td><td align="center">2 个 YAML（base/）+ 项目级 YAML 由 web-component-scout 动态生成</td></tr>
<tr><td>🔒 <strong>安全分层</strong></td><td>开源层(提交 GitHub) ↔ 企业机密层(.gitignore)</td><td align="center">双层</td></tr>
<tr><td>🚀 <strong>并行引擎</strong></td><td>推理-执行分离 + 进程级 Worker Pool + 资源感知调度</td><td align="center">4 个核心</td></tr>
</table>

> 这不仅仅是一个 MCP Server。它是一个**从"测试人员人工操作浏览器"到"Agent 自主并行执行 20 个 Chromium"的效率革命**。

---

## 🧠 核心概念

### 编排层 ≠ 执行层

```
┌──────────────────────────────────────────────┐
│  Agent-for-Web-UI-Automation-Testing         │
│  编排层 — 6 个 MCP 工具                      │
│                                              │
│  环境编排 → 页面探索 → LLM 推理 → 进程并行   │
│  Acc Tree 增强 → 组件发现 → Excel 转 YAML    │
└──────────────────┬───────────────────────────┘
                   │ 委托底层浏览器操作
                   ▼
┌──────────────────────────────────────────────┐
│  @playwright/mcp — 执行层 — 22 个工具         │
│  navigate / click / type / fill_form /       │
│  select / hover / snapshot / screenshot / ... │
└──────────────────────────────────────────────┘
```

> 📐 **为什么这样设计？** Playwright MCP 已经有 23 个成熟的浏览器操作工具，我们不做重复轮子。我们的 6 个工具专注于**编排层**——环境初始化、页面探索工作流、用例推理调度、并行执行管理。

### 推理-执行分离（核心突破）

```
Phase 1 — LLM 批量推理 (主进程, 约 1-3 min)
  所有用例 → LLM → ExecutionPlan（纯 Playwright 操作序列）
  
Phase 2 — 进程级并行执行 (Worker Pool, 无 LLM)
  Worker-1 (Chromium-1) ─┐
  Worker-2 (Chromium-2) ─┼─→ 20 个 Chromium 真正同时运转
  ...                     │   无需 LLM，不受 rate limit
  Worker-N (Chromium-N) ─┘
  
Phase 3 — 按需补救 (LLM)
  失败用例 → 错误截图 + Acc Tree → LLM → Worker 重试
```

> 💡 **关键**：Phase 1 集中推理一次，Phase 2 就可以**完全无 LLM** 地并行——这是突破 LLM rate limit 瓶颈的唯一方式。

### Acc Tree 8 维融合快照

每个页面元素采集：`DOM` + `A11y` + `Geometry` + `Locators` + `Interaction` + `Framework` + `Text` + `Children`

> 📖 详见 [蓝图第二章](.claude/plans/blueprint.plan.md)

### 交互事件字典（可配置）

```
dictionaries/
├── base/events.yaml      # 65 种交互事件注册表（11 类别）
└── base/controls.yaml    # 20+ 声明式 match 规则引擎
```

**三级优先级**：`_overrides.yaml (人工)` → `components.yaml (自动)` → `base/controls.yaml (默认)`

---

## 🚀 快速开始

### 1️⃣ 克隆并安装

```bash
git clone https://github.com/WayneLiu519888/Agent-for-Web-UI-Automation-Testing.git
cd Agent-for-Web-UI-Automation-Testing
npm install
```

### 2️⃣ 安装 Chromium 浏览器

```bash
npx playwright-core install chromium
```

### 3️⃣ 编译项目

```bash
npm run build
# tsc --noEmit: 零错误
```

### 4️⃣ 验证 MCP Server 启动

```bash
# Stdio 模式（Claude Desktop 用）
npm run start:stdio

# HTTP 模式（远程访问用）
MCP_API_KEY=your-secret npm run start:http
```

---

## 📥 安装方式

### Claude Desktop

`settings.json`:

```json
{
  "mcpServers": {
    "webui-test": {
      "command": "node",
      "args": ["dist/entries/stdio.js"],
      "env": {
        "ENTERPRISE_ROOT": "./enterprise"
      }
    },
    "playwright-mcp": {
      "command": "npx",
      "args": ["@playwright/mcp", "--headless", "--browser=chromium"]
    }
  }
}
```

### OpenCode / VS Code 插件

在 `.opencode/settings.json` 或 VS Code MCP 配置中同样添加以上两段 `mcpServers`。

### HTTP 远程模式

```bash
# 安全模式（推荐）
MCP_API_KEY=my-secret-key MCP_HOST=0.0.0.0 PORT=3000 npm run start:http

# 开发模式
npm run dev:http
```

---

## 🛠️ 6 个 MCP 工具

<table width="100%">
<tr><th width="22%">我想...</th><th width="20%">使用此命令</th><th width="14%">工具</th><th>细节</th></tr>
<tr><td>一键初始化浏览器并自动登录</td><td><code>/web-init test-env</code></td><td><code>web-init</code></td><td>读取环境 YAML → 执行登录流程 → 保存登录态</td></tr>
<tr><td>探索页面结构生成 Acc Tree</td><td><code>/web-explore https://xxx --mode=deep</code></td><td><code>web-explore</code></td><td>BFS 递归爬取同域页面 → 每个页面一个 YAML</td></tr>
<tr><td>并行执行测试用例</td><td><code>/exec-test test-cases/login/*.yaml</code></td><td><code>test-case-executor</code></td><td>Phase 1 LLM 推理 → Phase 2 Worker Pool 执行</td></tr>
<tr><td>Excel 用例转 YAML</td><td><code>/gen-cases test-cases/登录模块.xlsx</code></td><td><code>case-generator</code></td><td>智能列名匹配（中英文多别名）</td></tr>
<tr><td>获取当前页面增强快照</td><td><code>/snap</code></td><td><code>web-snapshot</code></td><td>DOM + A11y + 几何 + 定位器 + 事件</td></tr>
<tr><td>发现项目专属组件</td><td><code>/scout my-app --url=https://xxx</code></td><td><code>web-component-scout</code></td><td>交互式浏览 → 生成项目组件配置</td></tr>
</table>

### 工具 Visibility 分级

| 可见性 | 含义 | Stdio 模式 | HTTP 模式 |
|:---|:---|:---:|:---:|
| `all` | 所有模式可见 | ✅ | ✅ |
| `stdio` | 仅本地 Stdio 可见 | ✅ | ❌ |
| `http` | 仅远程 HTTP 可见 | ❌ | ✅ |

所有 6 个工具均为 `all` 级别。

### 多平台命令注册

所有 `/` 命令通过以下目录自动注册到各 AI 编程框架：

<table width="100%">
<tr><th width="12%">平台</th><th width="20%">命令注册目录</th><th width="8%">命令数</th><th>文件示例</th></tr>
<tr><td><strong>Claude Code</strong></td><td><code>.claude/commands/</code></td><td align="center">6</td><td><code>web_init.md</code> — 含 YAML frontmatter + arguments 声明</td></tr>
<tr><td><strong>OpenCode</strong></td><td><code>.opencode/commands/</code></td><td align="center">6</td><td><code>web_init.md</code> — 含 $ARG 参数语法</td></tr>
<tr><td><strong>Codex</strong></td><td><code>.codex/skills/&lt;name&gt;/SKILL.md</code></td><td align="center">6</td><td><code>SKILL.md</code> — 含 YAML frontmatter name/description</td></tr>
</table>

```
.claude/commands/          ← Claude Code 斜杠命令（自动发现）
├── web_init.md
├── web_explore.md
├── exec_test.md
├── gen_cases.md
├── snap.md
└── scout.md

.opencode/commands/        ← OpenCode 命令
├── web_init.md
├── web_explore.md
├── exec_test.md
├── gen_cases.md
├── snap.md
└── scout.md

.codex/skills/             ← Codex 技能（每技能一个子目录）
├── web-init/SKILL.md
├── web-explore/SKILL.md
├── test-case-executor/SKILL.md
├── case-generator/SKILL.md
├── web-snapshot/SKILL.md
└── web-component-scout/SKILL.md
```

> 📖 完整工具设计见 [蓝图第三章](.claude/plans/blueprint.plan.md)

---

## ⚙️ 环境变量

| 变量 | 说明 | 默认值 |
|:---|:---|:---|
| `PORT` | HTTP 模式监听端口 | `3000` |
| `MCP_HOST` | HTTP 监听地址 | `127.0.0.1` |
| `MCP_API_KEY` | Bearer Token 认证密钥 | ⚠️ 未设置时无认证 |
| `ENTERPRISE_ROOT` | 企业机密层路径 | `./enterprise` |

---

## 📂 仓库目录

```
Agent-for-Web-UI-Automation-Testing/
│
├── mcp.config.yaml              # 全局配置（浏览器/探索器/执行器/报告/日志）
├── package.json / tsconfig.json / .gitignore
├── README.md
│
├── dictionaries/                # ★ 交互事件字典体系
│   ├── README.md                #   字典说明 + match 语法文档
│   ├── base/                    #   基础字典 — 提交 git
│   │   ├── events.yaml          #     65 种交互事件
│   │   └── controls.yaml        #     20+ match 规则
│   └── projects/                #   项目字典 — .gitignore
│
├── src/
│   ├── core/                    # ★ 15 个核心引擎文件
│   │   ├── acc-tree.ts          #     Acc Tree 增强采集
│   │   ├── interaction-inferrer.ts  # 配置驱动事件推断
│   │   ├── locator-builder.ts   #     多策略定位器
│   │   ├── explorer.ts          #     BFS 页面探索
│   │   ├── worker-pool-manager.ts   # 进程级 Worker Pool
│   │   ├── task-scheduler.ts    #     优先级队列 + 工作窃取
│   │   ├── resource-detector.ts #     机器资源检测
│   │   ├── yaml-reader.ts       #     YAML 读取
│   │   ├── yaml-writer.ts       #     YAML 写入
│   │   ├── execution-plan.ts    #     执行计划生成
│   │   ├── report-aggregator.ts #     报告聚合
│   │   ├── case-generator.ts    #     Excel→YAML
│   │   ├── dom-collector.ts     #     DOM 采集
│   │   ├── component-analyzer.ts#     组件分析
│   │   └── config-generator.ts  #     项目配置生成
│   ├── types/                   #   类型定义
│   │   ├── tool.ts
│   │   ├── interaction-events.ts
│   │   └── yaml.ts
│   ├── tools/registry.ts        #   6 个 MCP 工具注册
│   ├── server/factory.ts        #   McpServer 工厂
│   ├── config/loader.ts         #   双层配置加载
│   ├── utils/paths.ts           #   双层路径解析
│   └── entries/stdio.ts + http.ts
│
├── enterprise/                  # ★ 企业机密层 — .gitignore 整目录
│   ├── configs/mcp.enterprise.yaml
│   ├── environments/            #   测试环境（URL/账号/租户）
│   ├── test-cases/              #   企业测试用例
│   ├── acc-trees/               #   探索产物
│   └── auth/                    #   登录态
│
└── .claude/plans/blueprint.plan.md  # 完整蓝图(2500+ 行)
```

---

## 🔒 信息安全

```
┌─────────────────────────────────┐
│ Layer 1: 开放源码层              │
│ src/ docs/ dictionaries/base/   │  → 提交 GitHub ✅
│ package.json README.md          │
├─────────────────────────────────┤
│ Layer 2: 企业机密层              │
│ enterprise/ 整目录               │  → .gitignore ❌
│   URL / 账号 / 租户 / 登录态    │     永不提交到 GitHub
│   测试用例 / Acc Tree / 截图    │
└─────────────────────────────────┘
```

4 重防护：`.gitignore` + Pre-commit hook + `paths.ts` 代码层隔离 + 双层 Remote 工作流。

> 📖 详见 [蓝图第十章](.claude/plans/blueprint.plan.md)

---

## ❓ FAQ

<details>
<summary><strong>为什么不做传统的"录制回放"模式？</strong></summary>

录制回放的致命问题是**脆**——页面改一个 class 名或用例加一步，脚本全废。我们的方案是：测试人员写**自然语言用例**（不是代码），Agent 读取页面 Acc Tree 推理执行。改用例改文本即可，不需要重新"录制"。
</details>

<details>
<summary><strong>为什么依赖 Playwright MCP 而不是直接调 Playwright？</strong></summary>

Playwright MCP 已经封装了 23 个成熟的浏览器操作工具——我们不需要重复造轮子。它在 LLM 环境中已可用，我们的 6 个编排层工具直接委托它执行底层操作。详见[第三章](.claude/plans/blueprint.plan.md)。
</details>

<details>
<summary><strong>为什么要"推理-执行分离"？</strong></summary>

如果每个 Worker 内部都调用 LLM 做推理，LLM API rate limit 会让 20 个 Worker 排队等待，并行毫无意义。Phase 1 集中推理一次（1-3 分钟），Phase 2 的 20 个 Worker 就可以**完全无 LLM** 地并行执行——这是唯一突破 rate limit 的方式。
</details>

<details>
<summary><strong>20 个 Chromium 内存不会爆吗？</strong></summary>

启动时会自动检测机器资源（`resource-detector.ts`）。16C32T + 64GB 典型机：推荐 `max_workers=12`。运行时内存 < 1GB 自动暂停分配新任务。详见[第十二章](.claude/plans/blueprint.plan.md)。
</details>

<details>
<summary><strong>如何添加我的 React / Vue 项目的专属组件配置？</strong></summary>

1. `/scout my-app --url=https://your-app.com` — 打开 Chromium，手动浏览所有页面
2. 系统自动采集组件签名 → 生成 `dictionaries/projects/my-app/components.yaml`
3. 如需修正，编辑同级 `_overrides.yaml`（不会因重新运行 scout 丢失）
</details>

<details>
<summary><strong>Stdio 和 HTTP 模式我该用哪个？</strong></summary>

- **Stdio** — Claude Desktop / VS Code / Codex 本地调用，最常用
- **HTTP** — 远程 Agent 调用或 CI/CD 流水线中运行，需要 `MCP_API_KEY` 做认证
</details>

---

## 📋 环境要求

| 依赖 | 版本 |
|:---|:---|
| Node.js | >= 20.0.0 |
| npm | >= 9.0.0 |
| @playwright/mcp | 0.0.76 |
| playwright-core | 1.60.0 |
| @modelcontextprotocol/server | 2.0.0-alpha.2 |
| TypeScript | 5.8+ |

---

## 🔧 可用命令

| 命令 | 说明 |
|:---|:---|
| `npm run build` | TypeScript 编译到 dist/ |
| `npm run typecheck` | 纯类型检查（不产出文件） |
| `npm run start:stdio` | 启动 Stdio MCP Server |
| `npm run start:http` | 启动 HTTP MCP Server |
| `npm run dev:stdio` | 开发模式 Stdio（tsx 热重载） |
| `npm run dev:http` | 开发模式 HTTP |
| `npm run clean` | 清理编译产物 |

---

## 🌐 跨平台支持

| 平台 | 支持情况 | 备注 |
|:---|:---:|:---|
| Windows 11 | ✅ | 主开发平台 |
| macOS | ✅ | Chromium 内存稍低于 Windows |
| Linux | ✅ | CI/CD 常用 |

> 📐 **并行度差异**：Windows 下 Chromium 开销约高 20%，自动检测会自动调低 `max_workers`。

---

## 🧪 测试

```bash
npm run typecheck               # 编译时类型验证（零错误）
# 单元测试 — Phase 1 后续
# E2E 测试 — Playwright MCP 集成后
```

---

## 📄 许可证

Apache-2.0

---

## 🔗 参考项目

| 项目 | 说明 |
|:---|:---|
| [Microsoft Playwright](https://github.com/microsoft/playwright) | Web 自动化引擎 |
| [Microsoft Playwright MCP](https://github.com/microsoft/playwright-mcp) | MCP 工具封装（23 个工具） |
| [ECC (Everything Claude Code)](https://github.com/xu-xiang/everything-claude-code-zh) | README 风格参考 |

---

<p align="center">
  <sub>设计蓝图完整版 → <a href="https://github.com/WayneLiu519888/Agent-for-Web-UI-Automation-Testing/blob/main/.claude/plans/blueprint.plan.md">blueprint.plan.md</a> (2500+ 行)</sub>
</p>

<p align="center">
  <sub>🤖 Generated with <a href="https://claude.com/claude-code">Claude Code</a></sub>
</p>
