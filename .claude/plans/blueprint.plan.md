# 蓝图：Agent-for-Web-UI-Automation-Testing MCP Server

**设计日期**: 2026-06-14 | **复杂度**: Large

---

## 一、总体愿景

不录制、不写脚本。Agent 读取页面 Accessibility Tree → 理解语义结构 → 按 YAML 测试用例自主执行 Web 操作。核心思路是用 **结构化 a11y 语义** 替代传统 XPath/CSS 脚本，用 **Agent 推理** 替代脆弱的录制回放。

---

## 二、YAML 数据格式设计（共 3 种）

### 2.1 Accessibility Tree YAML（页面探索产出）

每个 URL 一个独立 YAML 文件，保存在 `acc-trees/{host}/{path-hash}.yaml`。

```yaml
# ===== 页面元数据 =====
page:
  url: "https://example.com/dashboard"
  title: "Dashboard - Example"
  explored_at: "2026-06-14T08:30:00Z"
  mode: "deep"                        # quick | deep
  total_elements: 47
  load_time_ms: 1230

# ===== 链接发现（深度探索模式会递归探索这些链接）=====
links:
  - text: "用户管理"
    href: "/admin/users"
    element_ref: "e15"
  - text: "系统设置"
    href: "/admin/settings"
    element_ref: "e22"

# ===== Accessibility Tree =====
tree:
  - role: "banner"
    name: ""
    ref: "e1"
    children:
      - role: "heading"
        name: "Dashboard"
        level: 1
        ref: "e2"
      - role: "navigation"
        name: "主导航"
        ref: "e3"
        children:
          - role: "link"
            name: "首页"
            ref: "e4"
            actionable: true
            locators:
              getByRole: ["link", { name: "首页" }]
              getByText: "首页"
          - role: "link"
            name: "用户管理"
            ref: "e5"
            actionable: true
            locators:
              getByRole: ["link", { name: "用户管理" }]
  - role: "main"
    name: ""
    ref: "e6"
    children:
      - role: "heading"
        name: "用户列表"
        level: 2
        ref: "e7"
      - role: "button"
        name: "新建用户"
        ref: "e8"
        actionable: true
        locators:
          getByRole: ["button", { name: "新建用户" }]
      - role: "table"
        name: "用户表格"
        ref: "e9"
        children:
          - role: "rowgroup"
            ref: "e10"
            children:
              - role: "row"
                ref: "e11"
                children:
                  - role: "columnheader"
                    name: "用户名"
                    ref: "e12"
                  - role: "columnheader"
                    name: "邮箱"
                    ref: "e13"
                  - role: "columnheader"
                    name: "操作"
                    ref: "e14"
      - role: "row"
        name: ""
        ref: "e20"
        children:
          - role: "cell"
            name: "张三"
            ref: "e21"
          - role: "cell"
            name: "zhangsan@example.com"
            ref: "e22"
          - role: "button"
            name: "编辑"
            ref: "e23"
            actionable: true
            locators:
              getByRole: ["button", { name: "编辑" }]
```

**字段设计原则**：

| 字段 | 来源 | 说明 |
|------|------|------|
| `role` | ARIA `role` | Playwright a11y snapshot 直接产出 |
| `name` | accessible name | aria-label → 标签文本 → 内部文字 |
| `ref` | Playwright MCP 格式 | eN 递增编号，Agent 可引用 |
| `level` | 仅 heading | 标题层级 1-6 |
| `actionable` | 推导 | role 为 button/link/combobox/textbox/checkbox/radio/menuitem/tab/switch/option 时设为 true |
| `locators` | 自动生成 | 至少有 getByRole，按优先级补齐 getByLabel、getByText、getByTestId、getByPlaceholder |
| `checked/disabled/expanded/selected` | a11y 属性 | 状态标记 |
| `value` | 输入框当前值 | textbox/combobox 的当前内容 |

---

### 2.2 测试用例 YAML（test-case-executor 输入）

保存在 `test-cases/{category}/{name}.yaml`。

```yaml
# ===== 用例元数据 =====
case:
  id: "TC-LOGIN-001"
  title: "正常登录 — 有效凭据"
  description: "使用正确的用户名和密码登录系统，验证跳转到首页"
  priority: "P0"                       # P0 | P1 | P2 | P3
  tags: ["login", "smoke", "regression"]
  author: "wayne"
  created_at: "2026-06-14"

# ===== 前置条件 =====
preconditions:
  environment: "test-env"              # 引用环境配置名
  storage_state: "auth/admin.json"     # 可选的复用登录态

# ===== 依赖的 Accessibility Tree =====
acc_tree_ref: "acc-trees/example.com/dashboard.yaml"

# ===== 并行执行组 =====
par_group: "group-1"

# ===== 测试步骤 =====
steps:
  - id: 1
    type: "navigate"
    description: "打开登录页"
    url: "https://example.com/login"

  - id: 2
    type: "fill"
    description: "输入用户名"
    target:
      ref: "e12"                       # 引用 acc tree 中的 ref
      fallback:
        - getByRole: ["textbox", { name: "用户名" }]
        - getByPlaceholder: "请输入用户名"
        - getByLabel: "用户名"
    value: "admin"

  - id: 3
    type: "fill"
    description: "输入密码"
    target:
      getByRole: ["textbox", { name: "密码" }]
    value: "${env.TEST_PASSWORD}"

  - id: 4
    type: "click"
    description: "点击登录按钮"
    target:
      getByRole: ["button", { name: "登录" }]
    post_wait: 2000

  - id: 5
    type: "verify"
    description: "验证已跳转到首页"
    target:
      getByRole: ["heading", { name: "Dashboard" }]
    expect: "visible"
    timeout: 5000

  - id: 6
    type: "screenshot"
    description: "首页截图存档"
    filename: "screenshots/login_success.png"
    full_page: false

# ===== 断言汇总 =====
assertions:
  total: 1
  critical: 1
```

**步骤类型完整清单**：

| type | 说明 | 必需参数 | 可选参数 |
|------|------|----------|----------|
| `navigate` | 导航到 URL | `url` | `wait_until` (load/domcontentloaded/networkidle) |
| `click` | 点击元素 | `target` | `double_click`, `button`, `post_wait` |
| `fill` | 填充输入框 | `target`, `value` | `clear_first`, `submit` |
| `select` | 选择下拉选项 | `target`, `values` | — |
| `hover` | 鼠标悬停 | `target` | — |
| `press` | 键盘按键 | `key` | `target` |
| `wait` | 等待条件 | — | `time`, `text`, `text_gone`, `url_contains` |
| `verify` | 断言验证 | `target`, `expect` | `expect_value`, `timeout` |
| `screenshot` | 截图 | — | `filename`, `full_page`, `target` |
| `evaluate` | 执行 JS | `script` | `target` |
| `call_tool` | 调用其他 Agent 工具 | `tool_name`, `arguments` | — |

**expect 枚举值**：`visible` | `hidden` | `enabled` | `disabled` | `text_eq` | `text_contains` | `value_eq` | `url_eq` | `url_contains` | `count_gt`

**target 定位协议**：

```yaml
# 方式 1：引用 acc tree ref
target:
  ref: "e12"

# 方式 2：Playwright Locator API 语义
target:
  getByRole: ["button", { name: "提交" }]

# 方式 3：降级链
target:
  ref: "e12"
  fallback:
    - getByRole: ["textbox", { name: "用户名" }]
    - getByPlaceholder: "请输入用户名"
    - css: "#username"
```

---

### 2.3 测试环境配置 YAML（init 工具输入）

保存在 `environments/{name}.yaml`。

```yaml
# ===== 环境标识 =====
name: "test-env"
description: "测试环境 — SaaS 平台租户面"

# ===== 被测对象 =====
target:
  base_url: "https://test.example.com"
  login_url: "https://test.example.com/login"
  logout_url: "https://test.example.com/logout"

# ===== 账号体系 =====
accounts:
  admin:
    username: "admin"
    password: "${ENV_ADMIN_PASSWORD}"    # 敏感信息走环境变量
    role: "系统管理员"
    tenant: "default"
  operator:
    username: "operator"
    password: "${ENV_OP_PASSWORD}"
    role: "运营人员"
    tenant: "default"

# ===== 租户配置 =====
tenants:
  - name: "default"
    id: "tenant-001"
    display_name: "默认租户"

# ===== 浏览器 =====
browser:
  channel: "chromium"
  headless: true
  viewport: { width: 1920, height: 1080 }
  locale: "zh-CN"
  timezone: "Asia/Shanghai"

# ===== 超时配置 =====
timeouts:
  navigation: 30000
  action: 10000
  expect: 5000

# ===== 登录流程 =====
login_flow:
  type: "form"                         # form | sso | oauth | custom
  steps:
    - type: "navigate"
      url: "${target.login_url}"
    - type: "fill"
      target: { getByRole: ["textbox", { name: "用户名" }] }
      value: "${account.username}"
    - type: "fill"
      target: { getByRole: ["textbox", { name: "密码" }] }
      value: "${account.password}"
    - type: "click"
      target: { getByRole: ["button", { name: "登录" }] }
  success_indicator:
    type: "url_contains"
    value: "/dashboard"
  save_storage_state: "auth/${name}_admin.json"

# ===== 全局钩子 =====
hooks:
  before_all: null
  after_all: null
  on_error: "screenshot"               # screenshot | trace | continue | stop
```

---

## 三、工具设计（共 8 个）

### 工具注册矩阵

| 工具名 | Visibility | 说明 |
|--------|-----------|------|
| `web-explore` | `all` | 页面探索（核心） |
| `web-init` | `all` | 初始化测试环境 |
| `test-case-executor` | `all` | 测试用例执行器（核心） |
| `web-navigate` | `all` | 底层页面导航 |
| `web-act` | `all` | 底层页面操作（click/fill/select/hover） |
| `web-assert` | `all` | 底层页面断言 |
| `web-snapshot` | `all` | 获取当前页面 acc tree 快照 |
| `web-state` | `stdio` | 查看浏览器/Context/Page 状态（调试用） |

### 平台兼容设计

所有 `/` 命令在 Claude Code 和 OpenCode 中均通过 MCP 工具 + slash command 机制注册：

```
Claude Code:  在 CLAUDE.md 或 .claude/settings.json 中声明 mcp server 启动配置
OpenCode:     在 opencode.json 或 .opencode/settings.json 中声明
```

命令列表：

| 命令 | 工具 | 用法示例 |
|------|------|----------|
| `/web-init` | web-init | `/web-init test-env` |
| `/web-explore` | web-explore | `/web-explore https://example.com --mode=deep` |
| `/exec-test` | test-case-executor | `/exec-test TC-LOGIN-001 --parallel=3` |
| `/snap` | web-snapshot | `/snap` (当前页面快照) |

---

### 工具 1：`web-explore`

```
输入:
  - url (必填): 页面 URL
  - mode (可选, 默认 "quick"): "quick" | "deep"
  - max_depth (可选, 默认 2): 深度探索爬取深度
  - max_pages (可选, 默认 20): 最大页面数
  - output_dir (可选, 默认 "acc-trees"): 输出目录

输出:
  - explored_pages: 页面列表及 YAML 路径
  - summary: 总页面数、总元素数
  - errors: 失败的 URL
```

### 工具 2：`web-init`

```
输入:
  - environment (必填): 环境名 (environments/{name}.yaml)
  - account (可选, 默认 "admin")
  - headless (可选, 默认 true)
  - save_state (可选, 默认 true)

输出:
  - status: "initialized"
  - browser_ws_endpoint: WebSocket 端点
  - storage_state_path: 登录态路径
  - page_title: 当前页面标题
  - login_success: 是否登录成功
```

### 工具 3：`test-case-executor`

```
输入:
  - cases (必填): 用例 YAML 路径数组
  - parallel (可选, 默认 1): 并行数（≤ executor.max_parallel）
  - environment (可选): 环境配置名
  - headless (可选, 默认 true)
  - retry (可选, 默认 0): 失败重试
  - stop_on_failure (可选, 默认 false): P0 失败终止

输出:
  - total / passed / failed / skipped
  - duration_ms
  - results: [{case_id, status, duration_ms, error, screenshots[]}]
  - report_path: 报告文件路径
```

并行隔离：每 Worker 独立 BrowserContext，共享 Browser 进程。工作窃取模式调度。

### 工具 4-7：底层原子操作

| 工具 | 参数 | 行为 |
|------|------|------|
| `web-navigate` | `url`, `wait_until`, `referer` | 导航并返回 acc tree |
| `web-act` | `action`, `target`, `value?`, `post_wait?` | 单步操作后返回 acc tree |
| `web-assert` | `target`, `expect`, `expect_value?`, `timeout?` | 断言验证 |
| `web-snapshot` | `compact?` | 获取当前页面 acc tree |

### 工具 8：`web-state`（仅 stdio）

查看浏览器状态，参数 `scope`: "browser" | "context" | "page" | "all"

---

## 四、全局配置文件

### `mcp.config.yaml`（项目根目录）

```yaml
browser:
  channel: "chromium"
  headless: true
  viewport: { width: 1920, height: 1080 }
  locale: "zh-CN"
  timezone: "Asia/Shanghai"
  args:
    - "--disable-dev-shm-usage"
    - "--no-sandbox"

explorer:
  mode: "quick"
  max_depth: 2
  max_pages: 50
  filter_exclude:
    - "logout"
    - "/api/"
  screenshot_on_explore: false
  snapshot_compact: false

executor:
  max_parallel: 4                    # 硬上限
  default_parallel: 1
  retry: 1
  stop_on_critical_failure: true
  action_timeout: 10000
  navigation_timeout: 30000
  expect_timeout: 5000
  screenshot_on_failure: true
  trace_on_failure: true

paths:
  environments: "environments"
  acc_trees: "acc-trees"
  test_cases: "test-cases"
  auth_states: "auth"
  screenshots: "screenshots"
  reports: "reports"
  traces: "traces"

report:
  format: "json"
  include_screenshots: true
  include_traces: false
  webhook_url: null

logging:
  level: "info"
  file: "logs/mcp-server.log"
  max_size: "10MB"
  max_files: 5
```

---

## 五、项目最终目录结构

```
Agent-for-Web-UI-Automation-Testing/
├── mcp.config.yaml                  # 全局配置
├── package.json / tsconfig.json / .gitignore
│
├── environments/   (测试环境 YAML)
├── test-cases/     (测试用例 YAML)
├── acc-trees/      (探索产物，可 .gitignore)
├── auth/           (登录态，.gitignore)
│
├── src/
│   ├── index.ts
│   ├── config/     (mcp.config.yaml 加载 + Zod schema)
│   ├── types/      (tool.ts + yaml.ts)
│   ├── tools/      (8 个 MCP 工具定义)
│   ├── core/       (浏览器管理、acc tree、探索器、执行器、YAML 读写)
│   ├── server/     (McpServer 工厂)
│   ├── entries/    (stdio.ts + http.ts)
│   └── utils/      (env 变量替换、日志)
│
├── screenshots/ / reports/ / traces/ / logs/
```

---

## 六、架构流程

```
/web-init        → Browser + Login → 认证就绪
/web-explore     → Page → Acc Tree → acc-trees/*.yaml
/test-case-executor → Yaml 解析 → Worker Pool 并行 → 报告
/web-navigate|act|assert|snapshot  → 底层原子操作
/web-state       → 调试诊断
```

---

## 七、任务分解（6 Phase）

| Phase | 内容 | 核心产出 |
|-------|------|----------|
| 1 | 基础能力层 | browser-manager, accessibility, locator-builder |
| 2 | YAML 体系 | yaml-writer/reader, types/yaml.ts |
| 3 | 探索器 | explorer.ts (quick/deep), explore.tool.ts |
| 4 | 执行器 | executor.ts (并行调度), executor.tool.ts |
| 5 | init + 原子工具 | init.tool.ts, navigate/act/assert/snapshot/state |
| 6 | 集成 + 文档 | mcp.config.yaml, config loader, README, 示例 |

---

## 八、关键风险

| 风险 | 等级 | 缓解 |
|------|------|------|
| Playwright MCP API break | 中 | 锁定版本，核心逻辑自研 |
| 深度探索触发反爬 | 中 | Stealth 模式，可配延迟 |
| Context 资源耗尽 | 低 | 配置硬上限 max_parallel |
| YAML 用例维护成本 | 低 | Agent 可直接根据 acc tree 编写用例 |

---

## 九、待评审的关键决策

1. **Acc Tree YAML 的 locators 字段** — 存储多种定位策略，还是只存 ref？
2. **测试用例 YAML 的 acc_tree_ref** — 必须关联 acc tree，还是运行时动态获取？
3. **深度探索递归策略** — BFS 全量爬取，还是支持按分类选择性爬取？
4. **并行隔离粒度** — 同 par_group 共享 Context（快），不同组独立（安全），是否合理？
5. **`/` 命令注册方式** — Claude Code 和 OpenCode 各自有什么规范？
