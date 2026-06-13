# 蓝图：Agent-for-Web-UI-Automation-Testing MCP Server

**设计日期**: 2026-06-14 | **复杂度**: Large

---

## 一、总体愿景

不录制、不写脚本。Agent 读取页面**完整 DOM + Accessibility Tree 融合快照** → 理解语义结构 + CSS 组件脉络 + DOM 属性锚点 → 按 YAML 测试用例自主执行 Web 操作。

核心思路：
- **DOM + A11y 双重采集**：Playwright `page.accessibility.snapshot()` 给出 ARIA 语义角色，`page.evaluate()` 遍历 DOM 采集标签/class/data-testid/几何/样式
- **多策略定位器冗余**：每个元素自动生成 getByTestId → getByRole → getByPlaceholder → getByText → CSS → XPath 的降级链
- **Vue 3 / AUI 组件库感知**：自动识别 Ant Design Vue (ant-)、Element Plus (el-)、Naive UI (n-)、Arco Design (arco-) 等组件前缀，标记组件类型以供 Agent 选择正确的交互策略

---

## 二、YAML 数据格式设计（共 3 种）

### 2.1 Acc Tree YAML（页面探索产出 — v2 完整版）

每个 URL 一个独立 YAML 文件，保存在 `acc-trees/{host}/{path-hash}.yaml`。

#### 2.1.1 设计原则

> **采集一切，Agent 按优先级消费。** Acc Tree 不是 UI 截图，也不是单纯的 ARIA 树——它是 **DOM 属性 + ARIA 语义 + 几何信息 + 多策略定位器** 的融合快照。Agent 执行用例时从定位器链中择优尝试，无需回查浏览器。

#### 2.1.2 Acc Tree Node Schema（完整字段）

```
AccTreeNode {
  // ========== 标识 ==========
  ref:           string           // 唯一引用 ID（e1, e2, ...），同次探索内稳定

  // ========== DOM 基础信息 ==========
  dom: {
    tagName:     string           // HTML 标签名（小写，如 button / input / div）
    id:          string | null    // DOM id 属性
    className:   string | null    // 完整 className（如 "ant-btn ant-btn-primary"）
    attributes: {                 // 关键 DOM 属性（精选采集）
      dataTestid:   string | null
      dataQa:       string | null
      dataCy:       string | null
      dataVAttrs:   string[]     // Vue 3 scoped CSS 属性，如 ["data-v-7ba5bd90"]
      href:         string | null
      type:         string | null    // input type
      placeholder:  string | null
      name:         string | null    // form field name
      value:        string | null    // 当前值
      title:        string | null    // tooltip
      src:          string | null    // img src
      alt:          string | null    // img alt
      tabindex:     number | null
      ariaLabel:    string | null
      ariaExpanded: string | null
    }
  }

  // ========== ARIA Accessibility 信息 ==========
  a11y: {
    role:          string           // ARIA 角色：button / textbox / combobox / heading / link ...
    name:          string           // 无障碍名称（accessible name）
    level:         number | null    // heading 层级 1-6
    checked:       boolean | "mixed" | null
    disabled:      boolean | null
    expanded:      boolean | null
    selected:      boolean | null
    pressed:       boolean | null
    required:      boolean | null
    readonly:      boolean | null
    multiline:     boolean | null
    haspopup:      string | null    // menu / listbox / tree / grid / dialog
    roledescription: string | null  // 角色可读描述
  }

  // ========== 几何与可见性 ==========
  geometry: {
    boundingBox:   { x: number, y: number, width: number, height: number } | null
    isInViewport:  boolean          // 是否在视口内
    isVisible:     boolean          // display != none && visibility != hidden && opacity > 0
    zIndex:        number | null    // 层叠顺序
  }

  // ========== 多策略定位器（降级链）==========
  // Agent 执行时按以下顺序尝试，第一条成功即止
  locators: {
    getByTestId:    string[] | null   // data-testid / data-qa / data-cy 数组
    getByRole:      [string, object] | null  // 例: ["button", { name: "提交" }]
    getByLabel:     string | null
    getByText:      string[] | null   // 完整内嵌文本列表
    getByPlaceholder: string[] | null
    css:            CssLocator[] | null  // 候选 CSS 选择器（按优先级排列）
    xpath:          string | null     // 最后手段
  }

  // ========== 交互状态 ==========
  interaction: {
    actionable:    boolean          // 综合判断：可交互角色 + 可见 + 非 disabled + 有 boundingBox
    scrollNeeded:  boolean          // actionable 但不在视口内
    obscured:      boolean          // 是否被其他元素遮挡
  }

  // ========== 框架感知 ==========
  framework: {
    detected:      string | null     // "vue" | "react" | null
    componentType: string | null     // AUI 组件名：ant-btn / el-input / n-button / arco-menu-item
    componentPrefix: string | null   // 组件前缀：ant- / el- / n- / arco- / vxe- / a- / t-
  }

  // ========== 文本内容 ==========
  text: {
    innerText:     string | null     // 内部可见文本（截断到 200 字符）
    textContent:   string | null     // 所有文本节点（截断到 200 字符）
  }

  // ========== 子节点 ==========
  children?:      AccTreeNode[]
}
```

**CSS 定位器子结构**：

```
CssLocator {
  selector:  string     // CSS 选择器字符串
  priority:  number     // 1(唯一) 2(高) 3(中) 4(低)
  strategy:  string     // id / testid / data-attr / class-chain / tag-nth / aria
  uniqueness: number    // 匹配到的元素数量（1 表示唯一定位）
  sample:    boolean    // true 表示经过实际 page.locator() 验证
}
```

#### 2.1.3 完整示例（AUI 登录页）

```yaml
# ===== 页面元数据 =====
page:
  url: "https://admin.example.com/login"
  title: "登录 - 管理后台"
  explored_at: "2026-06-14T10:00:00Z"
  mode: "quick"
  total_elements: 23
  load_time_ms: 870
  framework: "vue"                     # 自动检测
  ui_library: "ant-design-vue"        # 自动检测

# ===== 链接发现 =====
links: []

# ===== Acc Tree =====
tree:
  - ref: "e1"
    dom:
      tagName: "div"
      id: null
      className: "ant-pro-form-login-container"
      attributes:
        dataVAttrs: ["data-v-7ba5bd90"]
    a11y:
      role: "generic"
      name: ""
    geometry:
      boundingBox: { x: 0, y: 0, width: 1920, height: 1080 }
      isInViewport: true
      isVisible: true
    locators:
      css:
        - selector: "div.ant-pro-form-login-container[data-v-7ba5bd90]"
          priority: 3
          strategy: "data-attr"
          uniqueness: 1
          sample: true
    interaction:
      actionable: false
    framework:
      detected: "vue"
      componentPrefix: "ant-"
    text:
      innerText: null

    children:
      - ref: "e2"
        dom:
          tagName: "h2"
          id: null
          className: "ant-pro-form-login-title"
          attributes:
            dataVAttrs: ["data-v-7ba5bd90"]
        a11y:
          role: "heading"
          name: "管理后台"
          level: 2
        geometry:
          boundingBox: { x: 860, y: 200, width: 200, height: 36 }
          isInViewport: true
          isVisible: true
        locators:
          getByRole: ["heading", { name: "管理后台", level: 2 }]
          getByText: ["管理后台"]
          css:
            - selector: "h2.ant-pro-form-login-title"
              priority: 3
              strategy: "class-chain"
              uniqueness: 1
              sample: true
        interaction:
          actionable: false
        framework:
          detected: "vue"
          componentType: "ant-pro-form-login-title"
          componentPrefix: "ant-"
        text:
          innerText: "管理后台"

      - ref: "e3"
        dom:
          tagName: "input"
          id: "username"
          className: "ant-input ant-input-lg"
          attributes:
            dataTestid: "login-username"
            type: "text"
            placeholder: "请输入用户名"
            name: "username"
            dataVAttrs: ["data-v-7ba5bd90"]
            tabindex: 1
        a11y:
          role: "textbox"
          name: "用户名"
          required: true
          disabled: false
          readonly: false
        geometry:
          boundingBox: { x: 760, y: 320, width: 400, height: 40 }
          isInViewport: true
          isVisible: true
          zIndex: 1
        locators:
          getByTestId: ["login-username"]
          getByRole: ["textbox", { name: "用户名" }]
          getByPlaceholder: ["请输入用户名"]
          getByLabel: ["用户名"]
          css:
            - selector: "[data-testid=\"login-username\"]"
              priority: 1
              strategy: "testid"
              uniqueness: 1
              sample: true
            - selector: "#username"
              priority: 1
              strategy: "id"
              uniqueness: 1
              sample: true
            - selector: "input.ant-input.ant-input-lg[data-v-7ba5bd90]"
              priority: 3
              strategy: "data-attr"
              uniqueness: 1
              sample: true
        interaction:
          actionable: true
          scrollNeeded: false
          obscured: false
        framework:
          detected: "vue"
          componentType: "ant-input"
          componentPrefix: "ant-"
        text:
          innerText: ""

      - ref: "e4"
        dom:
          tagName: "input"
          id: "password"
          className: "ant-input ant-input-lg"
          attributes:
            dataTestid: "login-password"
            type: "password"
            placeholder: "请输入密码"
            name: "password"
            dataVAttrs: ["data-v-7ba5bd90"]
            tabindex: 2
        a11y:
          role: "textbox"
          name: "密码"
          required: true
          disabled: false
          readonly: false
        geometry:
          boundingBox: { x: 760, y: 380, width: 400, height: 40 }
          isInViewport: true
          isVisible: true
        locators:
          getByTestId: ["login-password"]
          getByRole: ["textbox", { name: "密码" }]
          getByPlaceholder: ["请输入密码"]
          getByLabel: ["密码"]
          css:
            - selector: "[data-testid=\"login-password\"]"
              priority: 1
              strategy: "testid"
              uniqueness: 1
              sample: true
            - selector: "#password"
              priority: 1
              strategy: "id"
              uniqueness: 1
              sample: true
        interaction:
          actionable: true
        framework:
          detected: "vue"
          componentType: "ant-input"
          componentPrefix: "ant-"
        text:
          innerText: ""

      - ref: "e5"
        dom:
          tagName: "button"
          id: null
          className: "ant-btn ant-btn-primary ant-btn-lg ant-btn-block"
          attributes:
            dataTestid: "login-submit"
            type: "submit"
            dataVAttrs: ["data-v-7ba5bd90"]
            tabindex: 3
        a11y:
          role: "button"
          name: "登 录"
          disabled: false
          pressed: false
        geometry:
          boundingBox: { x: 760, y: 450, width: 400, height: 44 }
          isInViewport: true
          isVisible: true
        locators:
          getByTestId: ["login-submit"]
          getByRole: ["button", { name: "登 录" }]
          getByText: ["登 录"]
          css:
            - selector: "[data-testid=\"login-submit\"]"
              priority: 1
              strategy: "testid"
              uniqueness: 1
              sample: true
            - selector: "button.ant-btn.ant-btn-primary.ant-btn-lg[data-v-7ba5bd90]"
              priority: 3
              strategy: "data-attr"
              uniqueness: 1
              sample: true
        interaction:
          actionable: true
        framework:
          detected: "vue"
          componentType: "ant-btn"
          componentPrefix: "ant-"
        text:
          innerText: "登 录"
```

#### 2.1.4 采集算法

```
采集: 全量 DOM 遍历（DFS，不限 viewport）⊕ ARIA snapshot → 合并 → 过滤

步骤:
1. page.evaluate() 全量遍历 DOM → 采集 dom / geometry / text（不限视口）
2. page.accessibility.snapshot() → 采集 a11y（role/name/checked/disabled...）
3. 按 boundingBox + tagName + 层级 对两条树做结构对齐合并
4. LocationBuilder：为每个元素生成多策略定位器
5. 标记 actionable（可交互角色 + 可见 + 非 disabled + 有 box）
6. Framework.detected：扫描 className 中的已知前缀（ant-/el-/n-/arco-/vxe-/a-/t-）
7. ★ 过滤: 丢弃不可见节点(isVisible=false)和不可交互的纯容器节点
       但保留其 children 中符合条件的节点（树结构不丢）
8. 序列化为 YAML 写入磁盘
```

**过滤规则（关键）**：

```
YAML 中保留的节点:
  ✓ isVisible = true 且 actionable = true    → 写入（可交互元素）
  ✓ isVisible = true 且 role ∈ {heading, link, cell, rowheader, columnheader, listitem, tab, treeitem, menuitem} → 写入（可视语义元素）
  ✓ isVisible = true 且包含符合条件的子节点    → 作为容器写入（结构完整性，但不展开自身属性）

YAML 中丢弃的节点:
  ✗ isVisible = false                        → 跳过（但检查其 children）
  ✗ isVisible = true 但 role = generic/none 且无子节点 → 跳过（无用容器）
```

#### 2.1.5 actionable 判定规则

```typescript
function isActionable(node: AccTreeNode): boolean {
  const interactiveRoles = new Set([
    'button', 'link', 'textbox', 'searchbox', 'combobox',
    'checkbox', 'radio', 'menuitem', 'menuitemcheckbox',
    'menuitemradio', 'option', 'switch', 'tab', 'slider',
    'spinbutton', 'listbox',
  ]);
  if (!interactiveRoles.has(node.a11y.role)) return false;
  if (!node.geometry.isVisible) return false;
  if (node.a11y.disabled === true) return false;
  if (!node.geometry.boundingBox) return false;
  return true;
}
```

#### 2.1.6 YAML 体积控制

全量 DOM 采集但只写可见+可交互元素，一个典型中后台页面实际写入 50-200 个节点。

| 模式 | 输出字段 | 约行数 | 触发参数 |
|------|---------|--------|----------|
| **完整** | 所有字段（dom+a11y+geometry+locators+interaction+framework+text） | 300-600 行 | 默认 |
| **紧凑** | ref + tagName + role + actionable + locators(仅 getByTestId + getByRole) | 40-80 行 | `web-snapshot --compact` |
| **调试** | 完整 + rawAttributes（所有 HTML 属性） | 500-1000 行 | `--debug` |

其他控制：`text.innerText` / `text.textContent` 统一截断到 200 字符；`locators.xpath` 仅在无其他有效定位器时生成。

---

### 2.2 测试用例 YAML（test-case-executor 输入）

保存在 `test-cases/{category}/{name}.yaml`。

#### 2.2.1 设计理念

> **用例 = 人类语言，执行 = Agent 推理。** 测试人员用自然语言编写前置条件、执行步骤、预期结果；执行器将其和 Acc Tree 一起喂给 Agent，Agent 自主推理要执行哪些 Web 操作。不再需要 ID、不再需要 type、不再需要 target 引用。

#### 2.2.2 极简格式

```yaml
# ===== 用例元数据 =====
id: "TC-LOGIN-001"
title: "正常登录 — 有效凭据"
priority: "P0"                       # P0 | P1 | P2 | P3
tags: ["login", "smoke"]
author: "wayne"
created_at: "2026-06-14"

# ===== 环境 & 前置条件 =====
environment: "test-env"              # 引用 environments/{name}.yaml
account: "admin"                     # 使用的账号名
preconditions: |
  1. 浏览器已启动并初始化 test-env 环境（登录态已就绪）
  2. Account: admin / ${ENV_ADMIN_PASSWORD}
  3. 被测页面: https://admin.example.com/login

# ===== 执行步骤 =====
steps: |
  1. 打开登录页 https://admin.example.com/login
  2. 在"用户名"输入框填入 admin
  3. 在"密码"输入框填入密码（从环境变量 TEST_PASSWORD 读取）
  4. 点击"登录"按钮
  5. 等待页面跳转到 /dashboard

# ===== 预期结果 =====
expected: |
  ✓ 页面 URL 包含 /dashboard
  ✓ 页面标题显示"Dashboard"
  ✓ 顶部导航栏显示当前用户名"admin"
  ✓ 左侧菜单可见

# ===== 补充信息（可选）=====
acc_tree: "acc-trees/admin.example.com/login.yaml"   # 关联 acc tree 加速查找
par_group: "group-1"                                  # 并行执行组
retry: 1                                              # 失败重试次数
screenshot_on: "failure"                              # always | failure | never
```

#### 2.2.3 字段说明

| 字段 | 是否必填 | 说明 |
|------|:---:|------|
| `id` | ✅ | 唯一标识符 |
| `title` | ✅ | 用例标题 |
| `priority` | ✅ | P0(核心流程)/P1(重要)/P2(一般)/P3(边缘) |
| `tags` | ❌ | 标签列表，用于筛选运行 |
| `author` | ❌ | 编写者 |
| `environment` | ✅ | 引用的环境配置名 |
| `account` | ❌ | 使用哪个账号（默认 admin） |
| `preconditions` | ✅ | **纯文本段落**：环境状态、账号信息、URL 等 |
| `steps` | ✅ | **纯文本段落**：编号列表，每行一个操作描述 |
| `expected` | ✅ | **纯文本段落**：编号列表，每行一条验收标准 |
| `acc_tree` | ❌ | 关联的 acc tree 文件路径（加速查找） |
| `par_group` | ❌ | 并行执行组标识 |
| `retry` | ❌ | 失败重试次数（不填则继承全局配置） |
| `screenshot_on` | ❌ | 截图策略 |

#### 2.2.4 Agent 执行逻辑

```
1. 读取用例 YAML → 解析 preconditions / steps / expected
2. 若 environment 有值 → 加载 environments/{name}.yaml 获取 URL、账号、登录配置
3. 运行时调用 web-snapshot 获取当前页面 Acc Tree
4. 将 preconditions + steps + Acc Tree 文本喂给 LLM：
   "你是一个 Web 自动化助手。这是当前页面的 Accessibility Tree 结构：
    {acc_tree_text}
    
    请执行以下测试步骤，返回每一步的操作指令（action + locator）：
    {steps_text}"
5. LLM 返回操作指令 → 执行器按指令调用 Playwright 底层 API
6. 每步操作后自动获取新 Acc Tree，传给 LLM 做下一步推理
7. 所有步骤完成后，LLM 对比 expected 文本 → 判定 pass/fail
```

#### 2.2.5 执行器内部的 target 定位协议（隐含，用例不暴露）

> **此协议内置于执行器，测试用例编写者无需关心。** 执行器将 LLM 输出的操作指令映射为 Playwright 定位：

```
LLM 输出: "点击'登录'按钮"
       ↓
执行器在 Acc Tree 中搜索 name="登 录" 且 role="button" 的节点
       ↓
读取该节点的 locators 数组
       ↓
按优先级尝试: getByTestId → getByRole → getByPlaceholder → getByText → css
       ↓
第一条成功 → 执行操作 → 返回新 Acc Tree
全部失败 → 降级到 LLM 重新推理（换一种描述方式）
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

## 三、工具设计（共 5 个）

### 3.0 核心原则：编排层 ≠ 执行层

```
┌─────────────────────────────────────────┐
│ Agent-for-Web-UI-Automation-Testing     │  ← 我们（编排层）
│ web-init / web-explore / executor /     │
│ case-generator / web-snapshot           │
│                                         │
│  职责：环境编排、页面探索工作流、        │
│        用例→Agent推理、测试报告、       │
│        Acc Tree增强采集                 │
└──────────────┬──────────────────────────┘
               │ 委托底层操作
               ▼
┌─────────────────────────────────────────┐
│ @playwright/mcp  (Playwright MCP)       │  ← 已安装（执行层）
│ browser_navigate / browser_click /      │
│ browser_type / browser_fill_form /      │
│ browser_select_option / browser_hover / │
│ browser_press_key / browser_wait_for /  │
│ browser_take_screenshot / browser_snapshot│
│ browser_tabs / browser_evaluate / ...   │
│                                         │
│  职责：原子浏览器操作、DOM交互、截图    │
└─────────────────────────────────────────┘
```

**不重复实现**：导航、点击、输入、选择、悬停、按键、等待、截图、标签管理 — 这些 Playwright MCP 已有 23 个工具覆盖，我们全部通过 **MCP 工具间调用**复用。

### 工具注册矩阵

| 工具名 | Visibility | 分类 | 说明 |
|--------|-----------|------|------|
| `web-init` | `all` | 编排层 | 初始化测试环境 → 自动登录 → 保存登录态 |
| `web-explore` | `all` | 编排层 | 一键探索页面 → 生成增强版 Acc Tree YAML |
| `test-case-executor` | `all` | 编排层 | 用例执行：Agent 推理 + 委托 Playwright MCP |
| `case-generator` | `all` | 数据工具 | Excel → YAML 批量转换 |
| `web-snapshot` | `all` | 增强工具 | Playwright MCP `browser_snapshot` 增强版（DOM+几何+locator+框架） |

### 平台兼容设计

所有 `/` 命令通过 MCP 工具 + slash command 注册：

```
Claude Code:  在 settings.json 中声明 mcp server 启动配置
OpenCode:     在 opencode.json 中声明
```

命令列表：

| 命令 | 工具 | 用法示例 |
|------|------|----------|
| `/web-init` | web-init | `/web-init test-env` |
| `/web-explore` | web-explore | `/web-explore https://example.com --mode=deep` |
| `/exec-test` | test-case-executor | `/exec-test test-cases/login/*.yaml --parallel=3` |
| `/gen-cases` | case-generator | `/gen-cases test-cases/登录模块.xlsx` |
| `/snap` | web-snapshot | `/snap` (当前页面增强快照) |

---

### 工具 1：`web-init`（环境初始化器）

```
名称: web-init
标题: Test Environment Initializer
描述: |
  读取环境配置 YAML → 委托 Playwright MCP 启动浏览器 → 自动执行登录流程 → 保存登录态。
  内部调用 Playwright MCP 的 browser_navigate / browser_type / browser_click 等工具。

输入:
  - environment (必填): environments/{name}.yaml
  - account (可选, 默认 "admin"): 使用的账号
  - headless (可选, 默认 true)
  - save_state (可选, 默认 true)

内部执行流程:
  1. 读取 environments/{name}.yaml
  2. 调用 Playwright MCP browser_navigate → 打开 login_url
  3. 按 login_flow.steps 依次调用 browser_type / browser_click 等
  4. 验证 success_indicator → 确认登录成功
  5. 可选保存 storage_state 到 auth/ 目录
  6. 返回浏览器就绪状态

输出:
  - status: "initialized"
  - storage_state_path: 登录态文件路径
  - page_title: 当前页面标题
  - login_success: boolean
```

### 工具 2：`web-explore`（页面探索器）

```
名称: web-explore
标题: Web Page Exploration
描述: |
  一键探索 Web 页面，产出增强版 Acc Tree YAML。
  内部流程：
    Playwright MCP browser_navigate(url) → browser_snapshot() 取 ARIA 树
    → 本工具 page.evaluate() 补采 DOM 属性/几何/样式/框架信息
    → 融合生成增强版 Acc Tree YAML → 写入 acc-trees/

输入:
  - url (必填): 页面 URL
  - mode (可选, 默认 "quick"): "quick" (单页) | "deep" (递归同域)
  - max_depth (可选, 默认 2): 深度探索爬取深度
  - max_pages (可选, 默认 20): 最大页面数
  - output_dir (可选, 默认 "acc-trees"): YAML 输出目录

输出:
  - explored_pages: [{url, yaml_path, element_count}]
  - summary: {total_pages, total_elements, total_links}
  - errors: [{url, reason}]
```

### 工具 3：`test-case-executor`（测试用例执行器）

```
名称: test-case-executor
标题: Test Case Executor
描述: |
  读取极简 YAML 用例 → 运行时获取 Acc Tree → Agent (LLM) 推理执行计划
  → 委托 Playwright MCP 执行每个操作 → 收集结果 → 生成报告。

  这是本项目最核心的工具——它是"编排者"，Playwright MCP 是它的"手"。

输入:
  - cases (必填): 用例 YAML 文件路径或 glob 模式
  - parallel (可选, 默认 1): 并行数（≤ executor.max_parallel）
  - retry (可选, 默认 0): 失败重试
  - stop_on_failure (可选, 默认 false): P0 失败是否终止

内部执行循环（每个 Worker）:
  for each case:
    1. 解析 YAML → preconditions / steps / expected
    2. 当前页面 Acc Tree = web-snapshot()
    3. 将 steps + Acc Tree → LLM → "点击'登录'按钮" → 委托 browser_click
    4. 每步操作后: 获取新 Acc Tree（委托 browser_snapshot）
    5. 所有 steps 完成后: LLM 对比 expected → pass/fail
    6. 失败 → 截图（委托 browser_take_screenshot）

并行隔离: 每 Worker 独立 BrowserContext（共享 Browser 进程），工作窃取调度

输出:
  - total / passed / failed / skipped
  - duration_ms
  - results: [{case_id, status, duration_ms, error, screenshots[]}]
  - report_path: JSON 报告路径
```

### 工具 4：`case-generator`（Excel→YAML 转换器）

```
名称: case-generator
标题: Test Case Generator (Excel → YAML)
描述: |
  将 Excel 格式的测试用例批量转换为极简 YAML 格式。
  智能列名匹配（支持中英文多别名）。纯数据处理工具，不涉及浏览器。
visibility: all

输入:
  - source (必填): .xlsx 文件路径
  - output_dir (可选, 默认 "test-cases"): YAML 输出目录
  - sheet (可选): 工作表名
  - environment (可选): 若 Excel 中无"环境"列则统一使用

Excel 列名映射（任一别名匹配即可）:
  id ← 用例ID/编号/ID/Case ID
  title ← 用例标题/标题/Title/名称
  priority ← 用例等级/优先级/Priority/Level
  preconditions ← 前置条件/前提/Preconditions
  steps ← 执行步骤/测试步骤/步骤/Steps
  expected ← 预期结果/期望结果/Expected
  environment ← 环境/测试环境/Environment/Env
  account ← 账号/测试账号/Account

输出:
  - total: 转换数量
  - files: [{id, yaml_path}]
  - warnings: 列名不匹配警告
```

### 工具 5：`web-snapshot`（增强版 Acc Tree 快照）

```
名称: web-snapshot
标题: Enhanced Accessibility Tree Snapshot
描述: |
  Playwright MCP browser_snapshot 的增强版。
  browser_snapshot 仅返回 ARIA 角色树（role/name/ref），
  本工具在此基础上通过 page.evaluate() 补采：
    - DOM 属性（tagName/id/className/data-testid/data-v-*/placeholder）
    - 几何信息（boundingBox/isInViewport/zIndex）
    - 框架感知（组件前缀/componentType）
    - 多策略定位器（getByTestId→getByRole→css 降级链）
  返回完整的增强 Acc Tree 片段。

输入:
  - compact (可选, 默认 false): true 时仅输出 ref+role+actionable+locators(前2级)

输出: YAML 格式的增强 Acc Tree 片段（同 2.1 节 schema）
```

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
  max_depth: 2                       # deep 模式最大爬取深度
  max_pages: 50                      # deep 模式最大页面数（防无限爬虫）
  filter_exclude:                    # URL 黑名单正则
    - "logout"
    - "/api/"
  snapshot_compact: false            # false=完整AccTree / true=紧凑模式
  # 采集策略: 全量DOM遍历 → 仅保留 isVisible=true 且 actionable/语义角色 的元素

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
│   ├── tools/      (5 个 MCP 工具定义)
│   ├── core/       (Acc Tree 增强采集、探索器、执行器、YAML 读写)
│   ├── server/     (McpServer 工厂)
│   ├── entries/    (stdio.ts + http.ts)
│   └── utils/      (env 变量替换、日志、Playwright MCP 调用代理)
│
├── screenshots/ / reports/ / traces/ / logs/
```

---

## 六、架构流程（编排层 → 执行层）

```
/web-init
  ├─ 读 environments/{name}.yaml
  ├─ 委托 Playwright MCP: browser_navigate(login_url)
  ├─ 委托 Playwright MCP: browser_type / browser_click (登录流程)
  └─ 保存 storage_state → 就绪

/web-explore
  ├─ 委托 Playwright MCP: browser_navigate(url)
  ├─ 委托 Playwright MCP: browser_snapshot() → ARIA 角色树
  ├─ page.evaluate() → DOM/几何/框架 补采
  ├─ 融合生成增强 Acc Tree YAML
  └─ [deep 模式] 遍历 links → 递归

/test-case-executor
  ├─ 解析 YAML → preconditions / steps / expected
  ├─ web-snapshot() → 增强 Acc Tree
  ├─ LLM(steps + Acc Tree) → 操作指令
  ├─ 委托 Playwright MCP: browser_click / browser_type / ...
  ├─ 每步后 browser_snapshot() 更新 Acc Tree
  ├─ LLM(expected + 最终 Acc Tree) → pass/fail
  └─ 生成 JSON 报告

/case-generator
  └─ 纯数据: Excel 列名匹配 → YAML 文件

/web-snapshot
  ├─ 委托 Playwright MCP: browser_snapshot() → ARIA 树
  └─ page.evaluate() → DOM/几何/框架 补采增强
```

---

## 七、任务分解（6 Phase）

| Phase | 内容 | 核心产出 |
|-------|------|----------|
| 1 | 基础能力层 | Acc Tree 增强采集器、Locator 构建器、YAML 读写 |
| 2 | YAML 类型体系 | types/yaml.ts（全部 Zod schema） |
| 3 | 探索器 | explorer.ts (quick/deep), explore.tool.ts |
| 4 | 执行器 | executor.ts (Agent 推理调度+并行), executor.tool.ts |
| 5 | init + 快照 + 用例生成 | init.tool.ts, snapshot.tool.ts, case-generator.tool.ts |
| 6 | 集成 + 文档 | mcp.config.yaml, config loader, README, 示例 |

---

## 八、关键风险

| 风险 | 等级 | 缓解 |
|------|------|------|
| Playwright MCP 命令行接口变更 | 中 | 不在代码层直接调用，通过 MCP 工具间调用（同一 LLM session） |
| 深度探索触发反爬 | 中 | Stealth 模式，可配请求延迟 + 随机行为 |
| Context 资源耗尽 | 低 | 配置硬上限 `max_parallel: 4`，单 Browser 可承载数十 Context |
| YAML 用例维护成本 | 低 | case-generator 从 Excel 自动转换；Agent 可直接根据 acc tree 编写用例 |
| LLM 推理步骤翻译不准确 | 中 | Acc Tree 提供多策略定位器降级链；失败时截图→LLM 重新推理 |

---

## 九、待评审的关键决策

1. ~~**Acc Tree YAML 的 locators 字段**~~ ✅ 已解决：全量多策略定位器
2. ~~**测试用例 YAML 的 acc_tree_ref**~~ ✅ 已解决：运行时动态获取
3. ~~**用例格式复杂性**~~ ✅ 已解决：极简纯文本
4. ~~**Excel→YAML 转换**~~ ✅ 已解决：case-generator
5. ~~**底层原子工具重复**~~ ✅ 已解决：砍掉 web-navigate/act/assert/state，全部委托 Playwright MCP
6. **并行隔离粒度** — 同 par_group 共享 Context（快），不同组独立（安全），设计合理？→ **建议合理**
7. **组件交互知识库** — Acc Tree v2 标记了 componentType（如 ant-select），是否需要维护 AUI 组件交互策略库？→ **建议 Phase 2-3 后根据实际体验决定**
8. ~~**Acc Tree 采集深度**~~ ✅ 已解决：**全量 DOM 遍历**（不限于 viewport），但**只保留可见 + 可交互元素**写入 YAML。不可见/纯容器节点跳过，但其 children 中符合条件的子节点保留（树结构不丢）
