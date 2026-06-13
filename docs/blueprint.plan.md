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
      autocomplete: string | null  // HTML5 autocomplete
      list:         string | null  // HTML5 list（关联 datalist）
      min:          string | null  // HTML5 min
      max:          string | null  // HTML5 max
      step:         string | null  // HTML5 step
      maxlength:    string | null  // HTML5 maxlength
      pattern:      string | null  // HTML5 pattern
      accept:       string | null  // input[type=file] accept
      multiple:     boolean | null // multiple 属性
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
    events:        string[]         // ★ 该元素支持的所有交互事件类型（见 InteractionEventDictionary）
    actionable:    boolean          // 综合判断：可交互角色 + 可见 + 非 disabled + 有 boundingBox
    scrollNeeded:  boolean          // actionable 但不在视口内
    obscured:      boolean          // 是否被其他元素遮挡
    currentValue:  string | number | boolean | string[] | null  // 当前取值
    options:       string[] | null  // 可选值列表（用于 select/combobox）
    checked:       boolean | "mixed" | null  // 选中状态
    constraints: {                  // 交互参数约束
      min:              number | null
      max:              number | null
      step:             number | null
      maxLength:        number | null
      inputType:        string | null
      maxSelection:     number | null
      acceptTypes:      string[] | null
      allowCustomInput: boolean | null
      dateFormat:       string | null
    } | null
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
          events:
            - fill
            - clear
            - focus
            - blur
            - press_key
          actionable: true
          scrollNeeded: false
          obscured: false
          currentValue: ""
          constraints:
            inputType: "text"
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
          events:
            - click
            - hover                    # tooltip
            - focus
            - blur
            - press_key
            - press_shortcut
          actionable: true
          scrollNeeded: false
          obscured: false
          currentValue: ""
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
5. ★ enrichInteraction(node): 标记 actionable + 推断 interaction.events + 提取 currentValue/options/constraints
     交互事件推断规则参见 InteractionEventDictionary (src/types/interaction-events.ts)
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

#### 2.1.5 交互事件推断规则（enrichInteraction）

```typescript
/**
 * 判定元素是否可交互，并推断其支持的交互事件列表
 * 核心: HTML元素 + ARIA角色 + 组件类型 → InteractionEvent[]
 */
function enrichInteraction(node: AccTreeNode): InteractionInfo {
  const interactiveRoles = new Set([
    'button', 'link', 'textbox', 'searchbox', 'combobox',
    'checkbox', 'radio', 'menuitem', 'menuitemcheckbox',
    'menuitemradio', 'option', 'switch', 'tab', 'slider',
    'spinbutton', 'listbox', 'gridcell', 'rowheader', 'columnheader',
    'treeitem',
  ]);

  const actionable =
    interactiveRoles.has(node.a11y.role) &&
    node.geometry.isVisible === true &&
    node.a11y.disabled !== true &&
    node.geometry.boundingBox !== null;

  const events = inferInteractionEvents(node);

  return {
    events,
    actionable,
    scrollNeeded: actionable && !node.geometry.isInViewport,
    obscured: false,                    // Playwright 实际检测后回填
    currentValue: extractCurrentValue(node),
    options: extractOptions(node),
    checked: node.a11y.checked,
    constraints: extractConstraints(node),
  };
}

/**
 * 交互事件推断映射表
 * 根据 HTML 标签 + ARIA 角色 + 组件类型 + DOM属性 推断支持的交互事件
 */
function inferInteractionEvents(node: AccTreeNode): InteractionEvent[] {
  const { tagName, attributes, className } = node.dom;
  const { role, haspopup } = node.a11y;
  const ct = node.framework.componentType;
  const events: Set<InteractionEvent> = new Set();

  // ─── 按钮类 ───
  if (tagName === 'button' || role === 'button' || tagName === 'a') {
    events.add('click');
    events.add('focus').add('blur');
    if (attributes.title) events.add('hover');          // tooltip
    if (ct?.includes('dropdown')) events.add('hover');  // hover 触发下拉
    if (attributes.type === 'submit') events.add('submit_on_enter');
  }

  // ─── 文本输入类 ───
  else if (role === 'textbox' || role === 'searchbox') {
    events.add('fill').add('clear').add('focus').add('blur').add('press_key');
    if (role === 'searchbox') events.add('type_char_by_char');
    if (attributes.autocomplete) events.add('autocomplete');
    if (tagName === 'input' && attributes.type === 'number') {
      events.add('set_value').add('increment').add('decrement');
    }
    if (tagName === 'textarea' || node.a11y.multiline) {
      events.add('paste');
    }
  }

  // ─── 下拉/选择类 ───
  else if (role === 'combobox' || role === 'listbox' || tagName === 'select') {
    events.add('open_dropdown').add('close_dropdown').add('select_single').add('focus').add('blur');
    if (attributes.multiple) events.add('select_multi').add('clear_all').add('deselect');
    if (ct === 'ant-select' && className?.includes('show-search')) events.add('search_and_select');
    if (ct === 'ant-cascader') events.add('expand').add('collapse');
  }

  // ─── 复选框 ───
  else if (role === 'checkbox') {
    events.add('check').add('uncheck').add('toggle').add('focus').add('blur').add('press_key');
  }

  // ─── 单选按钮 ───
  else if (role === 'radio') {
    events.add('check').add('toggle').add('focus').add('blur').add('press_key');
  }

  // ─── 开关 ───
  else if (role === 'switch') {
    events.add('turn_on').add('turn_off').add('toggle').add('focus').add('blur');
  }

  // ─── 滑动条 ───
  else if (role === 'slider') {
    events.add('set_value').add('drag_to').add('increment').add('decrement').add('focus').add('blur');
  }
  else if (role === 'spinbutton') {
    events.add('set_value').add('increment').add('decrement').add('focus').add('blur');
  }

  // ─── 表格列头 ───
  else if (role === 'columnheader') {
    events.add('click').add('focus').add('blur');
    if (className?.includes('column-has-sorters') || className?.includes('ant-table-column-has-sorters'))
      events.add('sort_by_column');
    if (className?.includes('column-has-filters') || className?.includes('ant-table-column-has-filters'))
      events.add('filter_column').add('open_dropdown');
  }

  // ─── 表格行 ───
  else if (role === 'row') {
    events.add('select_row').add('click');
  }

  // ─── 表格容器 ───
  else if (role === 'table' || role === 'grid') {
    events.add('sort_by_column').add('filter_column').add('select_row').add('select_all')
         .add('paginate').add('resize_column');
  }

  // ─── 树节点 ───
  else if (role === 'treeitem') {
    events.add('expand').add('collapse').add('select_item').add('click');
  }

  // ─── 菜单项 ───
  else if (role === 'menuitem' || role === 'menuitemcheckbox' || role === 'menuitemradio') {
    events.add('click').add('select_item').add('hover').add('focus').add('blur');
  }

  // ─── 对话框/弹窗 ───
  else if (role === 'dialog' || role === 'alertdialog') {
    events.add('dialog_close').add('press_key');  // Esc 关闭
    if (className?.includes('confirm')) events.add('dialog_confirm').add('dialog_cancel');
  }

  // ─── 日期/时间选择器（通过 componentType 检测）───
  if (ct === 'ant-picker' || ct === 'el-date-picker' || ct === 'n-date-picker') {
    events.add('pick_date').add('focus').add('blur');
    if (ct?.includes('range') || className?.includes('range'))
      events.add('pick_range').add('date_clear');
  }

  // ─── 文件上传 ───
  if (tagName === 'input' && attributes.type === 'file') {
    events.add('select_file').add('drag_drop_file').add('remove_file');
  }

  // ─── 分页器（通过 componentType 检测）───
  if (ct === 'ant-pagination' || ct === 'el-pagination' || ct === 'n-pagination') {
    events.add('paginate').add('click');
    node.interaction!.constraints = {
      ...node.interaction!.constraints,
      min: 1,
      max: extractMaxPage(node),
      step: 1,
    };
  }

  // ─── 通用事件（所有可交互元素）───
  if (events.size > 0) {
    events.add('scroll_into_view');
  }

  return [...events];
}
```

**InteractionEvent 完整类型定义**：

```typescript
type InteractionEvent =
  | 'click' | 'dblclick' | 'right_click' | 'long_press'
  | 'hover' | 'hover_tooltip' | 'hover_dropdown'
  | 'fill' | 'clear' | 'type_char_by_char' | 'paste' | 'submit_on_enter' | 'autocomplete'
  | 'select_single' | 'select_multi' | 'search_and_select' | 'clear_all' | 'deselect'
  | 'open_dropdown' | 'close_dropdown' | 'filter_options'
  | 'check' | 'uncheck' | 'toggle' | 'turn_on' | 'turn_off'
  | 'set_value' | 'increment' | 'decrement' | 'drag_to'
  | 'dialog_open' | 'dialog_close' | 'dialog_confirm' | 'dialog_cancel' | 'dialog_dismiss'
  | 'expand' | 'collapse' | 'select_item' | 'select_row' | 'select_all'
  | 'sort_by_column' | 'filter_column' | 'resize_column' | 'drag_row' | 'paginate'
  | 'pick_date' | 'pick_time' | 'pick_range' | 'date_clear' | 'date_today'
  | 'select_file' | 'drag_drop_file' | 'remove_file'
  | 'drag_start' | 'drag_end' | 'drop'
  | 'play' | 'pause' | 'stop' | 'seek' | 'volume' | 'fullscreen'
  | 'press_key' | 'press_shortcut'
  | 'focus' | 'blur'
  | 'scroll_to' | 'scroll_into_view';
```

#### 2.1.6 YAML 体积控制

全量 DOM 采集但只写可见+可交互元素，一个典型中后台页面实际写入 50-200 个节点。

| 模式 | 输出字段 | 约行数 | 触发参数 |
|------|---------|--------|----------|
| **完整** | 所有字段（dom+a11y+geometry+locators+interaction(全量 events)+framework+text） | 400-800 行 | 默认 |
| **紧凑** | ref + tagName + role + actionable + events(仅前3个) + locators(仅 getByTestId + getByRole) | 50-100 行 | `web-snapshot --compact` |
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

## 三、工具设计（共 6 个）

### 3.0 核心原则：编排层 ≠ 执行层

```
┌─────────────────────────────────────────┐
│ Agent-for-Web-UI-Automation-Testing     │  ← 我们（编排层）
│ web-init / web-explore / executor /     │
│ case-generator / web-snapshot /         │
│ web-component-scout                     │
│                                         │
│  职责：环境编排、页面探索工作流、        │
│        用例→Agent推理、测试报告、       │
│        Acc Tree增强采集、组件发现       │
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
| `web-snapshot` | `all` | 增强工具 | 增强版 Acc Tree 快照（DOM+几何+locator+框架+事件） |
| `web-component-scout` | `all` | 发现工具 | 交互式组件发现 → 生成项目级组件配置 |

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
| `/scout` | web-component-scout | `/scout my-app --url=https://admin.example.com` |

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

### 工具 3：`test-case-executor`（测试用例执行器 — 进程级并行）

```
名称: test-case-executor
标题: Test Case Executor (Worker Pool + 推理执行分离)
描述: |
  读取极简 YAML 用例 → 推理-执行分离三阶段 → 进程级并行执行 → 报告聚合。

  这是本项目最核心的工具——它是"编排者"，通过 Worker Pool 把机器 CPU/内存用尽，
  最大化并行度，解决测试人员"无法同时操作多个浏览器"的效率瓶颈。

输入:
  - cases (必填): 用例 YAML 文件路径或 glob 模式
  - parallel (可选, 默认 "auto"): "auto"(自动检测) | number(固定值) | "serial"(串行)
  - plan_mode (可选, 默认 "sprint"): "sprint" | "strict" | "hybrid"
  - retry (可选, 默认 0): 失败重试次数
  - stop_on_failure (可选, 默认 false): P0 失败是否终止

===== 推理-执行分离三阶段 =====

Phase 1 — 批量推理 (主进程, LLM 单线程):
  for each case (并发 ≤ llm_max_concurrency):
    1. 解析 YAML → preconditions / steps / expected
    2. 若有关联 Acc Tree → 加载
    3. LLM 推理 → 生成 ExecutionPlan (含每一步的 action + locators[] + wait_after + value)
    4. ExecutionPlan 存入计划队列
  该阶段限流: llm_max_concurrency=4, 每条超时 60s

Phase 2 — 并行执行 (Worker Pool, 无 LLM):
  Worker Pool Manager:
    - 自动检测 CPU/内存 → 确定 max_workers
    - 每个 Worker = 独立 Node.js 子进程 (child_process.fork)
    - 每个 Worker = 独立 Playwright 实例 + 独立 Chromium 进程
    - ★ 20 条用例 → 20 个 Chromium 进程 → 用尽机器资源
    - 工作窃取: 空闲 Worker 从繁忙 Worker 队列末尾拉取任务
  
  Worker 执行循环 (纯 Playwright API, 不调 LLM):
    for each step in executionPlan:
      1. 按 locators 优先级链尝试定位元素
      2. 执行操作 (click/fill/select/...)
      3. 截图/collection trace (按配置)
      4. 操作失败 → 尝试下一个 locator → 全部失败 → 记录错误
    → 返回 {case_id, status, duration_ms, error, screenshots[], trace_path}

Phase 3 — 按需补救 (主进程, LLM 调度):
  for each failed_case:
    1. 将错误截图 + 失败步骤前的 Acc Tree → LLM
    2. LLM 重新推理 → 生成纠正后的 ExecutionPlan
    3. 分配到空闲 Worker 重试
    4. 重试仍失败 → 标记 FAILED

===== plan_mode 对比 =====
| 模式      | Phase 1 行为                    | 需要 Acc Tree? | 适用场景        |
|-----------|--------------------------------|:---:|---------------|
| sprint    | LLM快速规划→Phase2执行→Phase3补救 | 可选 | 先锋探索,无AccTree |
| strict    | 必须有AccTree,严格验证→Phase2执行  | 必须 | 回归测试       |
| hybrid    | 有AccTree的严格,无AccTree的冲刺   | 混合 | 默认推荐       |

===== Worker Pool 架构 =====

Worker 状态机:
  idle → assigned → running → completed | failed | crashed
                              ↓
                         completed → idle (接下一任务)

资源感知调度:
  - 启动时 detectResources(): CPU核心+内存 → 推荐 max_workers
  - 运行时 runtimeCheck(): 每分钟检测内存/CPU → 动态调整
  - 内存 < 1GB → 暂停分配新任务, 标记 draining
  - CPU > 85% → 暂停扩容
  - crash ≥ 3 次 → 降低 max_workers

渐进式启动:
  避免 20 个 Chromium 同时启动导致 I/O 风暴
  → 每 800ms 启动一个 Worker

报告聚合:
  - Worker 完成→IPC 回传结果→主进程收集
  - 实时进度 WebSocket 推送
  - 最终: JSON 报告 + 汇总统计

输出:
  - total / passed / failed / skipped
  - duration_ms, workers_used, peak_memory_mb
  - results: [{case_id, status, duration_ms, phase, error, screenshots[]}]
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
### 工具 6：`web-component-scout`（组件发现器）

```
名称: web-component-scout
标题: Web Component Scout
描述: |
  交互式组件发现工具。打开 Chromium（非 headless），测试人员手动浏览所有页面，
  系统自动采集 DOM 组件签名 → 识别项目专属组件 → 生成项目级组件配置。
  web-explore=自动爬虫(headless+BFS→AccTree)，scout=交互探索(非headless+人工浏览→组件字典)
visibility: all

输入:
  - project (必填): 项目名称 → dictionaries/projects/{project}/
  - base_url (必填): 起始 URL
  - session_timeout (可选, 默认 3600): 最长会话秒数

内部流程:
  1. 加载 base/controls.yaml + base/events.yaml
  2. browser_navigate(base_url) → Chromium(非headless)
  3. 监听器: URL变化 + DOM突变(MutationObserver,debounce 500ms) + 轮询 3s
  4. 每次变化 → DOM采集 → 拆分className提取组件前缀 → 去重
  5. 对照base字典 → 标记known/unknown(pending_review)
  6. stop或超时 → 汇总生成 components.yaml + discovery_report.json

输出:
  - project_config_path: components.yaml路径
  - discovery_report: {total_pages,total_found,known[],new[],new_prefixes[],recommendations[]}

命令: /scout <project> --url=<base_url>
```

### 2.4 交互事件字典体系（可配置）

> **交互事件字典从硬编码重构成外部 YAML 配置文件**，支持按项目扩展。不同项目的前端架构各不相同（Ant Design Vue / Element Plus / Naive UI / 自研组件库），字典必须可定制。

#### 2.4.1 字典目录结构

```
dictionaries/
├── README.md                   # 字典体系说明 + match 语法文档
├── base/                       # ★ 基础字典（提交 git，随版本发布）
│   ├── events.yaml             # 60+ 交互事件注册表
│   └── controls.yaml           # 通用 HTML/ARIA 控件 → 事件映射规则
├── projects/                   # ★ 项目字典（整体 .gitignore）
│   └── {project-name}/
│       ├── components.yaml     # web-component-scout 自动生成
│       └── _overrides.yaml     # 人工修正（优先级最高，不会因重新运行 scout 丢失）
└── schemas/                    # JSON Schema 校验文件
```

#### 2.4.2 三级字典优先级

加载顺序（后者覆盖前者）：

```
优先级 1 (最高): projects/{name}/_overrides.yaml   — 人工精确控制
优先级 2:        projects/{name}/components.yaml   — 工具自动发现
优先级 3 (默认): base/events.yaml + base/controls.yaml — 通用默认
```

#### 2.4.3 base/events.yaml

```yaml
# 交互事件字典 v1.0
# 所有 [references] 标记表示该事件被 controls.yaml 中的某条规则引用

events:
  # === 点击类 ===
  - id: click
    category: pointer
    description: 鼠标左键单击
  - id: dblclick
    category: pointer
    description: 鼠标左键双击
  - id: right_click
    category: pointer
    description: 鼠标右键单击
  - id: long_press
    category: pointer
    description: 长按（移动端）

  # === 悬停类 ===
  - id: hover
    category: hover
    description: 鼠标悬停（触发 tooltip/dropdown/highlight）
  - id: hover_tooltip
    category: hover
    description: 悬停显示 tooltip 提示
  - id: hover_dropdown
    category: hover
    description: 悬停打开下拉菜单

  # === 输入类 ===
  - id: fill
    category: input
    description: 填充文本
  - id: clear
    category: input
    description: 清空内容
  - id: type_char_by_char
    category: input
    description: 逐字符输入（触发实时搜索）
  - id: paste
    category: input
    description: 粘贴
  - id: submit_on_enter
    category: input
    description: 回车提交表单
  - id: autocomplete
    category: input
    description: HTML5 autocomplete 下拉建议

  # === 选择类 ===
  - id: select_single
    category: select
    description: 单选
  - id: select_multi
    category: select
    description: 多选
  - id: search_and_select
    category: select
    description: 搜索后选择（可搜索下拉框）
  - id: clear_all
    category: select
    description: 清除所有已选项
  - id: deselect
    category: select
    description: 取消单个已选项

  # === 下拉/弹出类 ===
  - id: open_dropdown
    category: popup
    description: 打开下拉面板
  - id: close_dropdown
    category: popup
    description: 关闭下拉面板
  - id: filter_options
    category: popup
    description: 过滤下拉选项

  # === 勾选类 ===
  - id: check
    category: toggle
    description: 勾选
  - id: uncheck
    category: toggle
    description: 取消勾选
  - id: toggle
    category: toggle
    description: 切换选中状态
  - id: turn_on
    category: toggle
    description: 打开开关
  - id: turn_off
    category: toggle
    description: 关闭开关

  # === 滑动/数值类 ===
  - id: set_value
    category: range
    description: 设置具体值
  - id: increment
    category: range
    description: 增加步长
  - id: decrement
    category: range
    description: 减少步长
  - id: drag_to
    category: range
    description: 拖拽到指定位置

  # === 对话框类 ===
  - id: dialog_open
    category: dialog
    description: 打开对话框/弹窗
  - id: dialog_close
    category: dialog
    description: 关闭对话框
  - id: dialog_confirm
    category: dialog
    description: 确认对话框
  - id: dialog_cancel
    category: dialog
    description: 取消对话框
  - id: dialog_dismiss
    category: dialog
    description: 点击遮罩关闭

  # === 菜单/树/展开类 ===
  - id: expand
    category: tree
    description: 展开节点
  - id: collapse
    category: tree
    description: 折叠节点
  - id: select_item
    category: tree
    description: 选择菜单项/树节点

  # === 表格类 ===
  - id: select_row
    category: table
    description: 选中行
  - id: select_all
    category: table
    description: 全选
  - id: sort_by_column
    category: table
    description: 按列排序
  - id: filter_column
    category: table
    description: 列过滤
  - id: resize_column
    category: table
    description: 调整列宽
  - id: drag_row
    category: table
    description: 拖拽行排序
  - id: paginate
    category: table
    description: 翻页

  # === 日期类 ===
  - id: pick_date
    category: date
    description: 选择日期
  - id: pick_time
    category: date
    description: 选择时间
  - id: pick_range
    category: date
    description: 选择日期范围
  - id: date_clear
    category: date
    description: 清空日期
  - id: date_today
    category: date
    description: 跳转到今天

  # === 文件类 ===
  - id: select_file
    category: file
    description: 选择文件
  - id: drag_drop_file
    category: file
    description: 拖放文件
  - id: remove_file
    category: file
    description: 移除已选文件

  # === 拖拽类 ===
  - id: drag_start
    category: drag
    description: 开始拖拽
  - id: drag_end
    category: drag
    description: 结束拖拽
  - id: drop
    category: drag
    description: 释放拖拽目标

  # === 多媒体类 ===
  - id: play
    category: media
    description: 播放
  - id: pause
    category: media
    description: 暂停
  - id: stop
    category: media
    description: 停止
  - id: seek
    category: media
    description: 跳转进度
  - id: volume
    category: media
    description: 调整音量
  - id: fullscreen
    category: media
    description: 全屏

  # === 键盘类 ===
  - id: press_key
    category: keyboard
    description: 按键盘按键
  - id: press_shortcut
    category: keyboard
    description: 按组合快捷键

  # === 焦点类 ===
  - id: focus
    category: focus
    description: 获得焦点
  - id: blur
    category: focus
    description: 失去焦点

  # === 滚动类 ===
  - id: scroll_to
    category: scroll
    description: 滚动到指定位置
  - id: scroll_into_view
    category: scroll
    description: 滚动到可视区
```

#### 2.4.4 base/controls.yaml（声明式 match 语法）

```yaml
# 控件→事件映射规则 v1.0
# match 语法: 每个条件字段 AND 逻辑，规则间叠加合并

rules:
  # ─── 按钮类 ───
  - id: btn-basic
    priority: 10
    match:
      any:                          # 任一条件满足即命中
        - tagName: "button"
        - role: "button"
        - tagName: "a"
    events:
      - click
      - focus
      - blur
    conditional_events:
      - when:
          domAttr:
            type: "submit"
        events:
          - submit_on_enter
      - when:
          domHasAttr: "title"
        events:
          - hover
      - when:
          componentContains: "dropdown"
        events:
          - hover
          - open_dropdown

  # ─── 文本输入类 ───
  - id: textbox-basic
    priority: 10
    match:
      any:
        - role: "textbox"
        - role: "searchbox"
    events:
      - fill
      - clear
      - focus
      - blur
      - press_key
      - scroll_into_view
    conditional_events:
      - when:
          role: "searchbox"
        events:
          - type_char_by_char
      - when:
          domHasAttr: "autocomplete"
        events:
          - autocomplete
      - when:
          a11yAttr:
            multiline: true
        events:
          - paste

  # ─── HTML input[type=number] ───
  - id: input-number-spin
    priority: 20
    match:
      all:
        - tagName: "input"
        - domAttr:
            type: "number"
    events:
      - fill
      - set_value
      - increment
      - decrement
      - focus
      - blur
      - press_key

  # ─── 下拉/选择类 ───
  - id: combobox-basic
    priority: 10
    match:
      any:
        - role: "combobox"
        - role: "listbox"
        - tagName: "select"
    events:
      - open_dropdown
      - close_dropdown
      - select_single
      - focus
      - blur
      - scroll_into_view
    conditional_events:
      - when:
          domHasAttr: "multiple"
        events:
          - select_multi
          - clear_all
          - deselect
      - when:
          componentContains: "ant-select"
        events:
          - select_single
      - when:
          classContains: "ant-select-show-search"
        events:
          - search_and_select
      - when:
          componentContains: "el-select"
        events:
          - select_single

  # ─── 复选框 ───
  - id: checkbox-basic
    priority: 10
    match:
      role: "checkbox"
    events:
      - check
      - uncheck
      - toggle
      - focus
      - blur
      - press_key

  # ─── 单选框 ───
  - id: radio-basic
    priority: 10
    match:
      role: "radio"
    events:
      - check
      - toggle
      - focus
      - blur
      - press_key

  # ─── 开关类 ───
  - id: switch-basic
    priority: 10
    match:
      role: "switch"
    events:
      - turn_on
      - turn_off
      - toggle
      - focus
      - blur

  # ─── 滑动条 ───
  - id: slider-basic
    priority: 10
    match:
      role: "slider"
    events:
      - set_value
      - drag_to
      - increment
      - decrement
      - focus
      - blur

  - id: spinbutton-basic
    priority: 10
    match:
      role: "spinbutton"
    events:
      - set_value
      - increment
      - decrement
      - focus
      - blur

  # ─── 表格列头 ───
  - id: columnheader-basic
    priority: 10
    match:
      role: "columnheader"
    events:
      - click
      - focus
      - blur
    conditional_events:
      - when:
          any:
            - classContains: "ant-table-column-has-sorters"
            - classContains: "column-has-sorters"
        events:
          - sort_by_column
      - when:
          any:
            - classContains: "ant-table-column-has-filters"
            - classContains: "column-has-filters"
        events:
          - filter_column
          - open_dropdown

  # ─── 表格行 ───
  - id: row-basic
    priority: 10
    match:
      role: "row"
    events:
      - select_row
      - click

  # ─── 表格容器 ───
  - id: table-basic
    priority: 15
    match:
      any:
        - role: "table"
        - role: "grid"
    events:
      - sort_by_column
      - filter_column
      - select_row
      - select_all
      - paginate
      - resize_column

  # ─── 树节点 ───
  - id: treeitem-basic
    priority: 10
    match:
      role: "treeitem"
    events:
      - expand
      - collapse
      - select_item
      - click

  # ─── 级联选择器 ───
  - id: ant-cascader
    priority: 30
    match:
      componentContains: "ant-cascader"
    events:
      - open_dropdown
      - close_dropdown
      - expand
      - collapse
      - select_single

  # ─── 菜单项 ───
  - id: menuitem-basic
    priority: 10
    match:
      any:
        - role: "menuitem"
        - role: "menuitemcheckbox"
        - role: "menuitemradio"
    events:
      - click
      - select_item
      - hover
      - focus
      - blur

  # ─── 对话框/弹窗 ───
  - id: dialog-basic
    priority: 10
    match:
      any:
        - role: "dialog"
        - role: "alertdialog"
    events:
      - dialog_close
      - press_key
    conditional_events:
      - when:
          classContains: "confirm"
        events:
          - dialog_confirm
          - dialog_cancel

  # ─── 日期选择器（组件类型检测）───
  - id: datepicker-component
    priority: 30
    match:
      any:
        - componentContains: "picker"
        - componentContains: "date-picker"
        - componentContains: "datepicker"
    events:
      - pick_date
      - focus
      - blur
    conditional_events:
      - when:
          componentContains: "range"
        events:
          - pick_range
          - date_clear

  # ─── 文件上传 ───
  - id: file-upload
    priority: 20
    match:
      all:
        - tagName: "input"
        - domAttr:
            type: "file"
    events:
      - select_file
      - drag_drop_file
      - remove_file

  # ─── 分页器 ───
  - id: pagination-component
    priority: 30
    match:
      any:
        - componentContains: "ant-pagination"
        - componentContains: "el-pagination"
        - componentContains: "n-pagination"
        - componentContains: "arco-pagination"
    events:
      - paginate
      - click
```

#### 2.4.5 projects/{name}/_overrides.yaml（人工修正示例）

```yaml
# 项目自定义覆盖配置
# 此文件不会因重新运行 web-component-scout 而丢失

project: "my-admin-system"
last_updated: "2026-06-14"

# 完全替换某组件的交互事件
override:
  - component: "ant-select"
    events:
      - search_and_select    # 本项目的 Select 全是可搜索的
      - open_dropdown
      - close_dropdown
      - select_single
      - focus
      - blur

# 对已发现组件追加事件
add_events:
  - component: "custom-signature"
    events:
      - drag_to
      - click

# 对已发现组件移除事件
remove_events:
  - component: "ant-btn-link"
    events:
      - submit_on_enter      # 链接按钮不解 submit
```

#### 2.4.6 projects/{name}/components.yaml（scout 自动生成示例）

```yaml
# 项目组件配置 — 由 web-component-scout 自动生成
project: "my-admin-system"
generated_at: "2026-06-14T10:30:00Z"
base_url: "https://admin.example.com"
pages_visited: 12
components_total: 38
known_components: 28
new_components: 10

components:
  - id: "ant-btn"
    prefix: "ant-"
    role: "button"
    tagName: "button"
    events:
      - click
      - focus
      - blur
    usage: 87
    pages: ["/login", "/dashboard", "/users", "/settings"]

  - id: "ant-select"
    prefix: "ant-"
    role: "combobox"
    tagName: "div"
    variants:
      - "ant-select-show-search"    # 可搜索版本
      - "ant-select-multiple"       # 多选版本
    events:
      - open_dropdown
      - close_dropdown
      - select_single
      - search_and_select
      - focus
      - blur
    usage: 23
    pages: ["/users", "/settings"]

  - id: "custom-chart-card"
    prefix: null
    role: "generic"
    tagName: "div"
    status: "pending_review"
    suggested_events:
      - click
      - hover
    usage: 5
    pages: ["/dashboard"]
```

---

### 2.5 交互事件推断器（InteractionInferrer — 配置驱动版）

```typescript
/**
 * 交互事件推断器（配置驱动，替代硬编码 inferInteractionEvents()）
 * 三级字典优先级: _overrides.yaml > components.yaml > base/controls.yaml
 */
class InteractionInferrer {
  private baseEvents: Map<string, EventDef>;
  private baseControls: ControlRule[];
  private projectComponents: Map<string, string[]>;
  private removeEvents: Map<string, Set<string>>;
  private overrideComponents: Map<string, string[]>;
  private interactiveRoles: Set<string>;

  constructor(dictDir: string, projectName?: string);

  /** 根据 AccTreeNode 推断该元素支持的所有交互事件 */
  infer(node: AccTreeNode): string[];

  /** 判定元素是否可交互 */
  isActionable(node: AccTreeNode): boolean;

  /** 评估 YAML match 条件 */
  private evaluateMatch(node: AccTreeNode, cond: MatchCondition): boolean;
}

function enrichInteraction(
  node: AccTreeNode,
  inferrer: InteractionInferrer,  // ★ 依赖注入
): InteractionInfo {
  const events = inferrer.infer(node);
  const actionable = inferrer.isActionable(node);
  return {
    events,
    actionable,
    scrollNeeded: actionable && !node.geometry.isInViewport,
    obscured: false,
    currentValue: extractCurrentValue(node),
    options: extractOptions(node),
    checked: node.a11y.checked,
    constraints: extractConstraints(node),
  };
}
```

**采集算法第 5 步变更**：

```
旧: ★ enrichInteraction(node): 交互事件推断规则参见 InteractionEventDictionary
新: ★ enrichInteraction(node, inferrer):
      交互事件由 dictionaries/base/controls.yaml + projects/{name}/components.yaml
      + projects/{name}/_overrides.yaml 三级字典规则引擎推断
      inferrer 在工具初始化时根据项目名选择性加载项目字典
```

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
  # ===== 推理-执行分离 =====
  plan_mode: "sprint"                  # sprint | strict | hybrid
  llm_max_concurrency: 4               # Phase 1 LLM 最大并发（避免 rate limit）
  batch_size: 10                       # 批量推理批次大小
  plan_timeout_ms: 60000               # 单条用例推理超时

  # ===== Worker Pool（进程级并行）=====
  worker_pool:
    max_workers: "auto"                # "auto" | number (自动检测 CPU/内存)
    min_workers: 1
    initial_workers: "auto"            # auto=min(4, max_workers)
    spawn_interval_ms: 800            # 渐进式启动间隔（防 I/O 风暴）
    resource_check:
      enabled: true
      interval_ms: 5000
      memory_low_watermark_mb: 1024
      memory_high_watermark_mb: 2048
    lifecycle:
      heartbeat_interval_ms: 3000
      heartbeat_timeout_ms: 15000
      max_consecutive_crashes: 3
      crash_backoff_base_ms: 5000
      restart_after_n_tasks: 10        # 防 Chromium 内存泄漏
      task_timeout_ms: 120000
    work_stealing: true
    group_affinity: "soft"             # soft | hard | off

  # ===== 执行层 =====
  retry: 1
  stop_on_critical_failure: true
  action_timeout: 10000
  navigation_timeout: 30000
  expect_timeout: 5000
  screenshot_on_failure: true
  trace_on_failure: true
  per_worker_request_delay_ms: 100     # 防服务器限流

  # ===== 报告 =====
  report:
    realtime_progress: true
    aggregate_timeout_ms: 300000

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
│
│   ╔══════════════════════════════════════════════════════════╗
│   ║  开放源码层（提交到 GitHub，Apache-2.0 许可证）           ║
│   ╚══════════════════════════════════════════════════════════╝
│
├── package.json              # NPM 包清单（不含企业信息）
├── tsconfig.json             # TypeScript 配置
├── .gitignore                # Git 忽略规则（关键文件，见第十章）
├── LICENSE                   # Apache-2.0
├── README.md                 # 公开项目说明（不含企业信息）
│
├── docs/                     # 公开文档
│   ├── architecture.md       # 架构说明
│   ├── tool-reference.md     # 工具参考手册
│   └── examples/             # 示例（用公开的 demo 数据）
│
├── src/                      # 源码（框架引擎，与任何企业无关）
│   ├── index.ts              # 公共 API 导出
│   ├── config/               # mcp.config.yaml 加载器 + Zod schema
│   │   ├── loader.ts         # 双层配置加载：开源默认 → 企业覆盖
│   │   └── schema.ts
│   ├── types/                # 类型定义
│   │   ├── tool.ts
│   │   ├── yaml.ts            # AccTree / TestCase / Environment schema
│   │   └── interaction-events.ts
│   ├── tools/                # 6 个 MCP 工具（集中在 registry.ts）
│   │   ├── index.ts           # re-export ALL_TOOLS
│   │   └── registry.ts        # 6 个工具完整定义
│   ├── core/                 # 核心引擎 (15 个文件)
│   │   ├── acc-tree.ts            # Acc Tree 增强采集
│   │   ├── case-generator.ts      # Excel→YAML 转换
│   │   ├── component-analyzer.ts  # 组件分析 (known/unknown)
│   │   ├── config-generator.ts    # 项目配置生成
│   │   ├── dom-collector.ts       # DOM 组件签名采集
│   │   ├── execution-plan.ts      # 执行计划生成
│   │   ├── explorer.ts            # BFS 页面探索 (quick/deep)
│   │   ├── interaction-inferrer.ts# 配置驱动事件推断器
│   │   ├── locator-builder.ts     # 多策略定位器
│   │   ├── report-aggregator.ts   # 报告聚合器
│   │   ├── resource-detector.ts   # 机器资源检测
│   │   ├── task-scheduler.ts      # 优先级队列+parGroup亲和性+工作窃取
│   │   ├── worker-pool-manager.ts # Worker Pool 管理器
│   │   ├── yaml-reader.ts         # YAML 读取
│   │   └── yaml-writer.ts         # YAML 写入
│   ├── server/
│   │   ├── factory.ts        # McpServer 工厂
│   │   └── index.ts
│   ├── entries/
│   │   ├── stdio.ts          # Stdio 入口
│   │   └── http.ts           # HTTP 入口
│   └── utils/
│       ├── env.ts            # ${env.VAR} 替换
│       ├── paths.ts          # ★ 路径解析：开源路径 → 企业路径覆盖
│       └── logger.ts
│
├── dictionaries/             # 交互事件字典
│   ├── README.md
│   ├── base/                 # ★ 提交 git：通用事件 + 通用控件规则
│   │   ├── events.yaml
│   │   └── controls.yaml
│   ├── projects/             # ★ .gitignore：项目字典（禁止提交）
│   └── schemas/
│       ├── events.schema.json
│       ├── controls.schema.json
│       └── components.schema.json
│
├── enterprise/               # ★★★ .gitignore 整目录禁止提交 ★★★
│   ├── .gitkeep              #    ← 仅保留空目录占位标记
│   │
│   ├── configs/              # 企业级配置
│   │   ├── codehub/          # CodeHub 仓库信息（禁止提交）
│   │   │   └── repo.yaml
│   │   └── mcp.enterprise.yaml  # 企业覆盖配置（覆盖 mcp.config.yaml）
│   │
│   ├── environments/         # 企业测试环境（URL/账号/租户/登录流程）
│   │   ├── test-env.yaml
│   │   ├── staging-env.yaml
│   │   └── prod-env.yaml
│   │
│   ├── test-cases/           # 企业测试用例 YAML
│   │   ├── login/
│   │   ├── user-mgmt/
│   │   └── smoke/
│   │
│   ├── acc-trees/            # 探索产物（页面结构快照）
│   ├── auth/                 # 登录态文件
│   │
│   ├── dictionaries/         # ★ 企业项目字典覆盖
│   │   └── projects/
│   │       └── {project-name}/
│   │           ├── components.yaml
│   │           └── _overrides.yaml
│   │
│   ├── screenshots/          # 截图产出
│   ├── reports/              # 测试报告
│   ├── traces/               # Playwright Trace
│   ├── logs/                 # 运行日志
│   │
│   └── docs/                 # ★ 企业文档（禁止提交，可与内部 wiki 同步）
│       ├── enterprise-readme.md
│       ├── project-blueprint.md
│       └── code-review-notes.md
│
│   ╔══════════════════════════════════════════════════════════╗
│   ║  以上 enterprise/ 中的所有文件均受 .gitignore 保护        ║
│   ║  在任何网络环境下 git push 都不会将 enterprise/ 传出    ║
│   ╚══════════════════════════════════════════════════════════╝
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

/test-case-executor (进程级并行)
  ┌─────────────────────────────────────────────────────────────┐
  │ Phase 1 — 批量推理 (主进程, LLM, 并发≤4)                       │
  │   解析 YAML → Acc Tree(可选) → LLM → ExecutionPlan[]          │
  └──────────────┬──────────────────────────────────────────────┘
                 ▼
  ┌─────────────────────────────────────────────────────────────┐
  │ Phase 2 — 并行执行 (Worker Pool)                              │
  │   Worker-1 (Chromium-1): executionPlan[0].step[_] → ...      │
  │   Worker-2 (Chromium-2): executionPlan[1].step[_] → ...      │
  │   ...                                                        │
  │   Worker-N (Chromium-N): executionPlan[k].step[_] → ...      │
  │   ↑ N=min(cases, auto_detect_max_workers), 进程级隔离        │
  │   资源感知: CPU>85%暂停扩容, 内存<1GB暂停分配                │
  │   工作窃取: 空闲Worker从繁忙队列末尾拉取任务                   │
  └──────────────┬──────────────────────────────────────────────┘
                 ▼
  ┌─────────────────────────────────────────────────────────────┐
  │ Phase 3 — 按需补救 (主进程, LLM)                              │
  │   failed_case → 错误截图+AccTree → LLM重新推理 → Worker重试  │
  └──────────────┬──────────────────────────────────────────────┘
                 ▼
  结果聚合 → JSON 报告 + 实时进度推送

/case-generator
  └─ 纯数据: Excel 列名匹配 → YAML 文件

/web-snapshot
  ├─ 委托 Playwright MCP: browser_snapshot() → ARIA 树
  ├─ page.evaluate() → DOM/几何/框架 补采增强
  └─ InteractionInferrer.infer() → events[] (配置驱动)

/web-component-scout
  ├─ 加载 dictionaries/base/controls.yaml
  ├─ 委托 Playwright MCP: browser_navigate(base_url) → Chromium(非headless)
  ├─ 循环监听（直到用户停止）:
  │   ├─ URL变化 + DOM突变 + 定时轮询
  │   ├─ page.evaluate() → 全量DOM组件签名
  │   ├─ 拆分className → 组件前缀 + 去重
  │   └─ 对照base字典 → known/unknown
  └─ 生成: projects/{name}/components.yaml + discovery_report
```

---

## 七、任务分解（6 Phase）

| Phase | 内容 | 核心产出 |
|-------|------|----------|
| 1 | 基础能力层 | AccTree采集、Locator构建、YAML读写、InteractionInferrer(配置驱动) + dictionaries/base/ |
| 2 | YAML 类型体系 | types/yaml.ts + dictionaries/ 相关 Zod schema |
| 3 | 探索器 | explorer.ts (quick/deep), explore.tool.ts, web-component-scout.tool.ts |
| 4 | 执行器 | worker-pool-manager.ts, task-scheduler.ts, worker.js, resource-detector.ts, execution-plan.ts, report-aggregator.ts, executor.tool.ts |
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
| 交互事件推断覆盖不足 | ~~低~~ → **极低** | 字典体系(三级优先级) + web-component-scout 自动发现 + _overrides.yaml 人工兜底 |
| 项目字典与基础字典版本不一致 | 低 | YAML version 字段做兼容检查；base 更新时 tools/dict-migrate 迁移 |
| 20 个 Chromium 同时启动 I/O 风暴 | 中 | 渐进式启动（间隔 800ms），启动完检测内存再继续 |
| 被测服务器限流（高并发请求）| 高 | `per_worker_request_delay_ms` 可配延迟；par_group 分批 |
| LLM API rate limit（Phase 1 批量推理）| 中 | 内置 rate limiter，`llm_max_concurrency` 限流 |
| Chromium 长时间运行内存泄漏 | 中 | `restart_after_n_tasks` 每 N 个任务自动重启 Worker |

---

## 九、待评审的关键决策

> 📋 **已移至第十一章** — 包含全部 13 项决策的最新状态。第九章为历史归档。


---

## 十、信息安全分层设计（InfoSec Layering）

### 10.0 问题背景

| 场景 | 网络环境 | Git 远端 | 安全约束 |
|------|---------|----------|---------|
| **家庭办公** | 家庭网络，无 DLP | GitHub 公开仓库 | 企业信息不得推送 |
| **企业内部** | 企业内网，CodeHub 监控 + DLP | 企业内部 Git + GitHub（两套 remote） | `enterprise/` 目录严格禁止推送到 GitHub |

**核心矛盾**：同一份 Repository 在两套网络间流转，必须确保企业信息在任何网络环境下都不会被 git push 到 GitHub。

### 10.1 分层模型

```
┌─────────────────────────────────────────────────────────┐
│                  Repository 根目录                        │
│                                                         │
│  ╔═══════════════════════════════════════════════════╗  │
│  ║ Layer 1: 开放源码层 (Public Open Source)          ║  │
│  ║ 提交到 GitHub，Apache-2.0 许可证                   ║  │
│  ║                                                   ║  │
│  ║ src/          框架引擎源码                          ║  │
│  ║ dictionaries/base/  通用字典                       ║  │
│  ║ docs/         公开文档                             ║  │
│  ║ package.json  项目清单                             ║  │
│  ║ README.md     项目介绍                             ║  │
│  ║ mcp.config.yaml  默认配置（无企业信息）              ║  │
│  ╚═══════════════════════════════════════════════════╝  │
│                                                         │
│  ╔═══════════════════════════════════════════════════╗  │
│  ║ Layer 2: 企业机密层 (Enterprise Private)          ║  │
│  ║ ★ 整目录 .gitignore — 永不提交到 GitHub            ║  │
│  ║                                                   ║  │
│  ║ enterprise/                                       ║  │
│  ║   ├── configs/       企业配置                       ║  │
│  ║   ├── environments/  测试环境（URL/账号/租户）        ║  │
│  ║   ├── test-cases/    企业测试用例                    ║  │
│  ║   ├── acc-trees/     探索产物                       ║  │
│  ║   ├── auth/          登录态                         ║  │
│  ║   ├── dictionaries/  企业项目字典                    ║  │
│  ║   ├── screenshots/   截图                           ║  │
│  ║   ├── reports/       测试报告                       ║  │
│  ║   ├── traces/        Playwright Trace               ║  │
│  ║   ├── logs/          日志                           ║  │
│  ║   └── docs/          企业文档                       ║  │
│  ╚═══════════════════════════════════════════════════╝  │
└─────────────────────────────────────────────────────────┘
```

### 10.2 企业信息归类与风险等级

| 信息类别 | 存放位置 | 典型内容 | 风险 |
|---------|---------|------------|:---:|
| **CodeHub 仓库信息** | `enterprise/configs/codehub/repo.yaml` | codehub 地址、branch 名、仓库命名空间 | 🔴 致命 |
| **测试环境 URL** | `enterprise/environments/*.yaml` | 企业内网域名、IP、登录地址 | 🔴 致命 |
| **测试账号** | `enterprise/environments/*.yaml` | 用户名、角色；密码通过 `${ENV_}` 外化 | 🔴 致命 |
| **租户/组织信息** | `enterprise/environments/*.yaml` | 租户 ID、组织架构名 | 🟠 高危 |
| **页面 Acc Tree** | `enterprise/acc-trees/*.yaml` | 企业内部系统页面结构、字段名 | 🟠 高危 |
| **测试用例** | `enterprise/test-cases/*.yaml` | 内部业务流程步骤、验收标准 | 🟡 中危 |
| **项目组件字典** | `enterprise/dictionaries/projects/*/` | 自研组件库前缀、CSS 类名 | 🟡 中危 |
| **登录态** | `enterprise/auth/*.json` | Cookie / localStorage / session | 🔴 致命 |
| **截图/报告** | `enterprise/screenshots/` `enterprise/reports/` | 内部系统截图、测试数据 | 🟠 高危 |

### 10.3 .gitignore 关键规则

```gitignore
# ===== 信息安全：企业机密层（整目录禁止提交）=====
/enterprise/

# ===== 防御纵深（捕获意外移动到其他位置的企业文件）=====
**/codehub/
**/*.storage-state.json
**/auth/*.json
**/test-cases/*-enterprise-*.yaml

# ===== 已有规则 =====
node_modules/
dist/
.env
.env.local
*.log
logs/
coverage/
.nyc_output/

# ===== 项目字典（见 2.4 节）=====
dictionaries/projects/
```

### 10.4 路径解析策略（`src/utils/paths.ts`）

所有工具通过统一入口解析数据路径，自动选择企业层或开源默认层：

```typescript
/**
 * 双层路径解析：企业覆盖优先，开源默认兜底
 *
 * 约定：
 *   - 环境变量 ENTERPRISE_ROOT 指向 enterprise/ 目录
 *   - 若未设置，默认根目录为项目根（开源模式）
 *   - 所有工具读取数据文件时先检查 enterprise/ 是否存在对应文件
 *     存在 → 用企业版，不存在 → 用开源默认
 */
export function resolvePath(category: string, name: string): string {
  const root = process.env.ENTERPRISE_ROOT || process.cwd();
  const enterprisePath = path.join(root, 'enterprise', category, name);
  if (fs.existsSync(enterprisePath)) return enterprisePath;
  return path.join(root, category, name);
}

// resolvePath('environments', 'test-env.yaml')
//   → enterprise/environments/test-env.yaml (优先)
//   → environments/test-env.yaml (fallback)
```

### 10.5 配置双层覆盖（`src/config/loader.ts`）

```typescript
/**
 * 双层配置加载：
 *   1. 先加载 mcp.config.yaml（开源默认）
 *   2. 若 enterprise/configs/mcp.enterprise.yaml 存在 → 深度合并覆盖
 */
export function loadConfig(): McpConfig {
  const baseConfig = loadYaml('mcp.config.yaml');
  const enterpriseConfigPath = resolvePath('configs', 'mcp.enterprise.yaml');
  if (fs.existsSync(enterpriseConfigPath)) {
    return deepMerge(baseConfig, loadYaml(enterpriseConfigPath));
  }
  return baseConfig;
}
```

**`mcp.enterprise.yaml` 覆盖示例**：

```yaml
# 企业级覆盖配置（仅覆盖与开源默认不同的部分）
paths:
  environments: "enterprise/environments"
  test_cases: "enterprise/test-cases"
  acc_trees: "enterprise/acc-trees"
  auth_states: "enterprise/auth"
  dictionaries: "enterprise/dictionaries"
  screenshots: "enterprise/screenshots"
  reports: "enterprise/reports"
  traces: "enterprise/traces"

browser:
  headless: true                    # CI 强制无头
  args:
    - "--proxy-server=internal-proxy:8080"
```

### 10.6 源码硬编码隔离规则

| 规则 | 说明 |
|------|------|
| **禁止在 src/ 中出现任何具体 URL** | URL 从 `environments/*.yaml` 读取 |
| **禁止在 src/ 中出现账号/密码** | 密码仅通过 `${ENV_VAR}` 从环境变量注入 |
| **禁止在 src/ 中出现内部域名/IP** | 外部访问端点全部可配置 |
| **README.md 中的示例 URL** | 必须使用 `example.com` / `localhost` / `demo.test` 等非真实域名 |
| **docs/ 中的截图** | 仅允许 demo 应用截图，不得出现企业内部系统界面 |
| **dictionaries/base/ 中的 componentType** | 仅含开源 AUI 库（ant-/el-/n-/arco-），不得含企业自研组件库前缀 |

### 10.7 Pre-commit Hook 自动拦截（`.husky/pre-commit`）

```bash
#!/bin/sh
# 信息安全 Pre-commit Hook — 阻断 enterprise/ 目录的意外提交

if git diff --cached --name-only | grep -q '^enterprise/'; then
  echo "block: enterprise/ 目录中的文件禁止提交到 Git"
  echo "   以下文件将被提交:"
  git diff --cached --name-only | grep '^enterprise/'
  echo "   请执行: git reset HEAD enterprise/"
  exit 1
fi
```

### 10.8 双层 Remote 工作流

```bash
# 家庭办公 — 单 remote 模式
git remote -v
# origin  https://github.com/WayneLiu519888/Agent-for-Web-UI-Automation-Testing.git

# 企业内部 — 双 remote 模式
git remote add internal https://codehub.internal.company.com/wayne/agent-webui-testing.git

# 日常推送（企业内部网络）
git push internal main     # 推企业内部 Git（企业内部自行管理 enterprise/）
# ⚠️ 永远不要在企业网络内执行 git push origin main
#    origin (GitHub) 仅在家庭网络推送
```

### 10.9 风险矩阵

| 风险 | 场景 | 等级 | 缓解 |
|------|------|:---:|------|
| `enterprise/` 被误提交到 GitHub | 开发者忘记 .gitignore | 🔴 | Pre-commit hook + `.gitignore` 双重防护 |
| 企业信息通过 force push 泄露 | 强制推送覆盖历史 | 🔴 | GitHub Branch Protection + force push 禁用 |
| CodeHub 信息通过 commit 泄露 | commit 中写了内部 URL | 🟡 | Pre-commit hook + 团队规范 |
| 配置路径硬编码在源码中 | 硬编码了 enterprise/ 路径 | 🟢 | `paths.ts` + Code Review |
| 截图/报告/acc tree 残留 | 本地文件忘记清理 | 🟢 | 全在 `enterprise/` 下，一次 gitignore |

---

## 十一、待评审的关键决策

1. ~~**Acc Tree YAML 的 locators 字段**~~ ✅
2. ~~**测试用例 YAML 的 acc_tree_ref**~~ ✅
3. ~~**用例格式复杂性**~~ ✅
4. ~~**Excel→YAML 转换**~~ ✅
5. ~~**底层原子工具重复**~~ ✅
6. ~~**Acc Tree 采集深度**~~ ✅
7. ~~**交互事件字典**~~ ✅
8. ~~**事件字典可配置化**~~ ✅
9. ~~**组件发现工具**~~ ✅
10. ~~**信息安全分层设计**~~ ✅ 方案见第十章
11. ~~**进程级并行架构**~~ ✅ 进程级隔离 + 推理执行分离 + 资源感知调度，方案见第十二章
12. ~~**events 字段升级**~~ ✅ 当前保持 `string[]`，Phase 2+ 评估。**详细扩展方案见第十三章**
13. ~~**推理-执行分离模式默认值**~~ ✅ sprint 为默认，见第十二章 plan_mode 三模式对比表
14. ~~**能力层与企业运行时层分层**~~ ✅ 最终两层架构见第十四章：`src/capability/`(全部工具代码→GitHub) + `enterprise/`(全部数据产出→.gitignore)


---

## 十三、events 字段扩展方案（待 Phase 2+ 激活）

### 13.0 当前状态

`interaction.events` 为 `string[]`（即 `InteractionEvent[]`），每个节点示例：

```yaml
interaction:
  events: [click, hover, focus, blur, press_key]
  actionable: true
```

Agent (LLM) 从步骤文本"点击登录按钮" + events 列表中推理选 `click`，够用。

### 13.1 升级触发条件

满足**任一**条件时激活本扩展方案：

| # | 触发条件 | 信号 |
|---|---------|------|
| 1 | Agent 在 20+ 次测试执行中因选错事件导致操作失败 | 事件选择准确率 < 90% |
| 2 | `web-component-scout` 自动发现的组件事件与人工修正冲突 | 有 `_overrides.yaml` 覆盖但 Agent 未感知 |
| 3 | 65 种事件在复杂控件上共存，Agent 推理上下文窗口不够 | 单节点 events > 8 个时 LLM 选择错误率上升 |
| 4 | 多人协作中，测试用例描述的"操作动词"与事件名不匹配频率高 | "填入" vs "fill"、"勾选" vs "check" 映射失败 |

### 13.2 升级目标：从 `string[]` 到 `InteractionEventDetail[]`

```typescript
// ===== 升级前 (Phase 1) =====
interface InteractionInfo {
  events: InteractionEvent[];       // ['click', 'fill', 'hover']
  // ...
}

// ===== 升级后 (Phase 2+) =====
interface InteractionEventDetail {
  /** 事件名 */
  event: InteractionEvent;

  /** 推断来源 */
  source: InteractionEventSource;

  /** 置信度 0-1 */
  confidence: number;

  /** 推荐操作参数（可选）*/
  params?: Record<string, unknown>;

  /** 自然语言操作动词映射（帮助 LLM 精确匹配）*/
  actionVerbs?: string[];

  /** 推荐操作描述（喂给 LLM 的上下文片段）*/
  description?: string;
}

type InteractionEventSource =
  | 'base'          // 来自 dictionaries/base/controls.yaml 通用规则
  | 'project'       // 来自 dictionaries/projects/{name}/components.yaml 自动发现
  | 'override'      // 来自 _overrides.yaml 人工覆盖（最高优先级）
  | 'heuristic';    // 来自启发式推断（组件前缀/class名猜测）

interface InteractionInfo {
  events: InteractionEventDetail[];
  // ... 其余字段不变
}
```

### 13.3 YAML 示例（升级后）

```yaml
interaction:
  events:
    - event: search_and_select
      source: override               # ★ 来自人工覆盖，最高优先级
      confidence: 1.0
      actionVerbs: [搜索选择, 搜索后选择, search, select]
      description: 打开下拉框后键入搜索文本，从过滤结果中选择

    - event: open_dropdown
      source: base                   # 来自 base/controls.yaml combobox-basic 规则
      confidence: 0.95
      actionVerbs: [打开下拉, open]

    - event: close_dropdown
      source: base
      confidence: 0.95

    - event: select_single
      source: base
      confidence: 0.95
      actionVerbs: [选择, select, 单选]

    - event: focus
      source: base
      confidence: 1.0

    - event: blur
      source: base
      confidence: 1.0
  actionable: true
```

### 13.4 升级涉及的源码修改

| 文件 | 变更 |
|------|------|
| `src/types/interaction-events.ts` | 新增 `InteractionEventDetail`、`InteractionEventSource` 类型；`InteractionInfo.events` 改为 `InteractionEventDetail[]` |
| `src/capability/engine/interaction-inferrer.ts` | `infer()` 返回 `InteractionEventDetail[]`；`enrichInteraction()` 附上 source/confidence |
| `src/capability/engine/acc-tree.ts` | `buildAccTreeNode()` 中 interaction 构建适配新结构 |
| `src/types/yaml.ts` | `InteractionInfo` 导入路径不变，内容自动同步 |
| `dictionaries/base/controls.yaml` | 可选：每条规则追加 `confidence` 和 `description` 默认值 |
| `dictionaries/base/events.yaml` | 可选：每个事件追加 `action_verbs` 和 `description` |

### 13.5 source 推断逻辑（升级后 InteractionInferrer.infer）

```typescript
infer(node: AccTreeNode): InteractionEventDetail[] {
  const ct = node.framework?.componentType;
  const results: Map<string, InteractionEventDetail> = new Map();

  // Step 1: _overrides override → source='override', confidence=1.0
  if (ct && this.overrideComponents.has(ct)) {
    for (const e of this.overrideComponents.get(ct)!) {
      results.set(e, { event: e, source: 'override', confidence: 1.0 });
    }
    return [...results.values()];
  }

  // Step 2: project components → source='project', confidence=0.8
  if (ct && this.projectComponents.has(ct)) {
    for (const e of this.projectComponents.get(ct)!) {
      if (!results.has(e)) results.set(e, { event: e, source: 'project', confidence: 0.8 });
    }
  }

  // Step 3: base controls → source='base', confidence=0.95
  for (const rule of this.baseControls) {
    if (this.evaluateMatch(node, rule.match)) {
      for (const e of rule.events) {
        if (!results.has(e)) results.set(e, { event: e, source: 'base', confidence: 0.95 });
      }
    }
  }

  // Step 4: heuristic → source='heuristic', confidence=0.5
  // (无任何规则命中时，根据 tagName+className 粗粒度猜测)

  return [...results.values()];
}
```

### 13.6 Agent Prompt 模板升级（升级后）

```
当前: "该元素支持的事件: click, hover, fill, focus, blur"
升级: "该元素支持的操作:
        • search_and_select (来源:人工覆盖, 置信度:1.0)
          → 打开下拉框后键入搜索文本，从过滤结果中选择
        • open_dropdown (来源:base规则, 置信度:0.95)
        • close_dropdown (来源:base规则, 置信度:0.95)
        • select_single (来源:base规则, 置信度:0.95)

       请优先使用高置信度且来源为'人工覆盖'或'base规则'的事件。"
```

### 13.7 升级成本预估

| 维度 | 估算 |
|------|------|
| 代码改动 | ~200 行（主要改 interaction-inferrer.ts + types） |
| YAML 体积增加 | 每个事件的 YAML 从 1 行变为 4-7 行，平均增 3-5 倍 |
| Agent 推理成本 | 每条用例 prompt 增加约 200-500 tokens |
| 向后兼容 | 旧 YAML 中 `events: [click, fill]` 需自动迁移为 `events: [{event:click,source:base,confidence:0.9}]` |

### 13.8 降级策略（不想升级时）

如果升级后发现体积膨胀不可接受，可通过 `mcp.config.yaml` 中的紧凑模式降级：

```yaml
explorer:
  snapshot_compact: true   # 紧凑模式下 events 回退为 string[]
```

紧凑模式输出：
```yaml
interaction:
  events: [search_and_select, open_dropdown, close_dropdown]
  actionable: true
  # 当 compact=true 时，省略 source/confidence/actionVerbs/description
```

### 13.9 激活条件

> **当 Agent 实际执行 Web 操作时，事件选择准确率（按 operations 计数）低于 90% 时，启动本扩展方案。**


---

## 十二、进程级并行执行架构

### 12.0 终极诉求

> 软件测试人员最大的效率瓶颈在于**人工无法并行操作浏览器执行用例**。并行执行 20 条用例 → 启动 20 个 Chromium → 把机器 CPU 和内存用尽。

### 12.1 推理-执行分离（核心突破）

```
Phase 1 — 批量推理 (主进程，LLM，有 rate limit)
  所有用例 → LLM 批量生成 ExecutionPlan (约 1-3 分钟)

Phase 2 — 并行执行 (Worker Pool，无 LLM)
  N 个 Worker × N 个 Chromium → 纯 Playwright API 执行
  不需要 LLM → 不受 rate limit → 真正 100% 并行

Phase 3 — 按需补救 (主进程，LLM)
  失败用例 → 错误截图 + Acc Tree → LLM → Worker 重试
```

**为什么必须分离**：Phase 1 集中推理一次（LLM 限流），Phase 2 就可以完全无 LLM 地并行——这是突破 LLM rate limit 瓶颈的唯一方式。

**plan_mode 三模式**（默认：`sprint`）：

| 维度 | sprint ★默认 | strict | hybrid |
|------|:---:|:---:|:---:|
| **需要 Acc Tree** | 可选 | 强制 | 混合 |
| **Phase 1 推理质量** | 中（纯 LLM 推断） | 高（对照 Acc Tree） | 混合 |
| **Phase 2 执行成功率** | ~70-85% → Phase 3 提至 95%+ | ~90-98% | ~80-92% |
| **Phase 3 补救频率** | 较高（10-15%步骤需要） | 很低（2-5%） | 中等 |
| **首次使用门槛** | **零门槛** | 需先跑 web-explore | 零门槛 |
| **总耗时** | 最快（无前置探索） | Phase 1 稍慢但 Phase 2 更快 | 居中 |
| **适用场景** | 探索、首次、快速验证 | 回归、CI、已探索 | 混合项目 |

**为什么 sprint 是默认**：

| 理由 | 说明 |
|------|------|
| **零前置门槛** | Excel 写好用例 → /gen-cases → /exec-test 直接跑，不需要先探索页面 |
| **Phase 3 自动兜底** | sprint 的 Phase 2 失败率较高，但 Phase 3 拿到真实截图+Acc Tree 自动修正，最终通过率与 strict 差距不大 |
| **渐进式体验** | 用户先用 sprint 快速跑通 → 发现某些用例经常失败 → 自然去 web-explore → 下次用 strict 提效 |
| **契合"不录制不写脚本"理念** | 强制 strict 必须先探索 = 变相"录制"，违背项目核心设计理念 |

### 12.2 Worker Pool 架构

```
                    ┌─────────────────────┐
                    │   主进程 (master)     │
                    │  WorkerPoolManager   │
                    │  TaskScheduler       │
                    └──────┬──────────────┘
           ┌───────────────┼───────────────┐
           ▼               ▼               ▼
    ┌────────┐      ┌────────┐      ┌────────┐
    │Worker-1│      │Worker-2│      │Worker-N│
    │ Chromium│     │ Chromium│     │ Chromium│
    │ Node.js │      │ Node.js │      │ Node.js │
    └────────┘      └────────┘      └────────┘
    (独立子进程)     (独立子进程)     (独立子进程)

IPC 通信: child_process.fork() → process.send() / process.on('message')
每个 Worker: 独立 Node.js 进程 + 独立 Playwright 实例 + 独立 Chromium
```

**Worker 状态机**：
```
idle → assigned → running → completed | failed | crashed
                                 ↓
                            completed → idle (接下一任务)

crash → 指数退避重启 (5s/10s/20s/...) → 连续 ≥3 次 → 降低 max_workers
```

### 12.3 资源感知调度

**启动时检测**（`detectResources()`）：

```typescript
物理核心 = 平台特定方法检测 (WMIC/proc/cpuinfo/sysctl) → 16 核 (7950X)
可用内存 = os.freemem() → 假设 48GB 空闲
Chromium 基线 = 实测空实例 → ~600MB
max_workers = min(物理核心 - 2, 可用内存 / Chromium基线) → min(14, 60) = 14
machine_profile: "high" (max_workers ≥ 12)
```

**运行时检测**（`runtimeCheck()`，每 5 秒）：

| 条件 | 动作 |
|------|------|
| 空闲内存 < 1GB | 暂停新任务分配，标记部分 Worker draining |
| 空闲内存 > 2GB | 恢复 draining Worker + 可能扩容 |
| CPU > 85% | 暂停扩容 |
| Worker 心跳超时 15s | 判定死亡 → kill → 指数退避重启 |

**渐进式启动**：避免 20 个 Chromium 同时启动导致 I/O 风暴 → 每 800ms 启动一个。

### 12.4 Worker Pool 管理器核心逻辑

```typescript
class WorkerPoolManager {
  // 自动检测机器资源
  resolveConfig(userConfig): PoolConfig {
    physicalCores = detectPhysicalCores()  // 平台特定方法检测 + 兜底假设HT 2:1
    freeMemMB = os.freemem()
    memLimit = floor((freeMemMB - 1024) / 800)
    cpuLimit = max(1, physicalCores - 2)
    autoMax = min(cpuLimit, memLimit)
  }

  // 启动 Pool — 渐进式
  async start(tasks: Task[]) {
    for (let i = 0; i < initialWorkers; i++) {
      await spawnWorker()
      await sleep(800)  // 间隔 800ms
    }
    resourceTimer = setInterval(() => checkResources(), 5000)
    heartbeatTimer = setInterval(() => checkHeartbeats(), 3000)
  }

  // Worker 消息处理
  handleWorkerMessage(workerId, msg):
    WORKER_READY  → dispatchNextTask()
    HEARTBEAT     → 更新 lastHeartbeat/cpu/mem
    TASK_RESULT   → 标记 IDLE → dispatchNextTask() 或 emit task:completed
    WORKER_CRASH  → 指数退避重启

  // 周期性资源检测
  checkResources():
    if (freeMem < lowWatermark) → drain N workers
    if (freeMem > highWatermark) → restore draining + maybe spawn
}
```

### 12.5 Worker 执行循环

每个 Worker 子进程收到 ASSIGN_TASK 消息后：

```typescript
// worker.js — 独立 Node.js 子进程
import playwright from 'playwright';

process.on('message', async (msg: AssignTaskMessage) => {
  const browser = await playwright.chromium.launch({ headless: true });
  const context = await browser.newContext(
    msg.authStatePath ? { storageState: msg.authStatePath } : {}
  );
  const page = await context.newPage();

  for (const step of msg.executionPlan.steps) {
    for (const locator of step.locators) {
      try {
        const el = buildLocator(page, locator);
        await executeAction(el, page, step.action, step.value);
        break; // 成功 → 下一步
      } catch {
        if (isLastLocator) return { status: 'failed', step, error };
      }
    }
  }

  process.send!({ type: 'TASK_RESULT', ... });
});
```

### 12.6 物理瓶颈分析

**16C32T + 64GB 典型 Windows 测试机**：

| 资源 | 约束 | 推荐 |
|------|------|------|
| CPU | 16 物理核 - 2(OS+主进程) = 14 | max_workers=12 (保守) |
| RAM | 64GB - 每 Chromium ~1.2GB × 12 = 14.4GB | 留 50GB 安全 |
| 网络 | 12 并发请求 → 被测服务器可能限流 | per_worker_request_delay_ms=100 |
| I/O | NVMe 截图+Trace 写入 | 无瓶颈 |

**瓶颈排序**：服务器限流 > LLM rate limit > 内存 > 磁盘/GPU。

### 12.7 目录结构补充

```
src/capability/engine/
├── worker-pool-manager.ts     # Worker Pool 管理器
├── resource-detector.ts       # 机器资源检测
├── task-scheduler.ts          # 任务调度器（优先级队​列+parGroup亲和性+工作窃取）
├── execution-plan.ts          # ExecutionPlan 类型定义
├── explorer.ts                # Web 探索引擎
├── acc-tree.ts                # Accessibility Tree 构建
├── interaction-inferrer.ts    # 交互事件推断
├── locator-builder.ts         # 定位器构建
├── dom-collector.ts           # DOM 收集器
└── report/aggregator.ts       # 报告聚合器 (src/capability/report/aggregator.ts)
```


---

## 十四、能力层与企业运行时层 — 最终分层架构

### 14.0 核心原则：只有两层，没有"数据层"

> **先前"数据层"（src/data/）的概念是错误的**——它把"数据操作工具"和"数据本身"混为一谈。
> YAML 读写、Excel 转换、配置加载、报告生成——这些都是**纯工具代码**，应归入能力层。
> 工具产生的**数据产出**（测试用例 YAML、测试报告 JSON、Acc Tree 快照）——这些才属于企业运行时层。

### 14.1 两层架构

```
Repository 根目录

  ╔═══════════════════════════════════════════════════════╗
  ║ 能力层 (Capability) — 所有工具代码 → GitHub ✅      ║
  ║ src/capability/  30+ 文件                           ║
  ║                                                     ║
  ║ tools/        6 个自研 MCP 工具                     ║
  ║ playwright/   pw-tools.ts 合并封装 + adapter.ts 接口 ║
  ║ engine/       核心引擎 (探索/执行/调度/推断)          ║
  ║ analysis/     组件分析                               ║
  ║ yaml/         YAML 读写工具                          ║
  ║ excel/        Excel 转换工具                         ║
  ║ config/       配置加载工具                            ║
  ║ report/       报告生成工具 (聚合+统计)                ║
  ╚═══════════════════════════════════════════════════════╝

  ╔═══════════════════════════════════════════════════════╗
  ║ 企业运行时层 (Enterprise) — 数据产出                  ║
  ║ enterprise/  ★ .gitignore 整目录禁止提交             ║
  ║                                                     ║
  ║ environments/   环境配置 (URL/账号/租户)    🔴致命     ║
  ║ test-cases/     YAML 测试用例 (Excel转换后) 🟡中危    ║
  ║ acc-trees/      Acc Tree 快照 (探索产出)    🟠高危     ║
  ║ plans/          执行计划 (Phase 1 产出)     🟠高危     ║
  ║ reports/        测试报告实例 ★核心产出       🟠高危    ║
  ║ screenshots/    截图 ★                      🟠高危    ║
  ║ traces/         Playwright Trace ★          🟠高危    ║
  ║ auth/           登录态缓存 (可选加速)        🔴致命    ║
  ║ dictionaries/   项目组件字典                 🟡中危    ║
  ║ configs/        企业覆盖配置                 🔴致命    ║
  ╚═══════════════════════════════════════════════════════╝

不变层: src/types/ src/server/ src/entries/ src/utils/ src/index.ts
```

### 14.2 四个存疑点的判定

| # | 项目 | 判定 | 理由 |
|---|------|:---:|------|
| 1 | **YAML 读写** | → 能力层 | `readTestCase()`/`writeAccTree()` 是纯函数工具，不含数据。数据本身在企业层 |
| 2 | **Excel 转换** | → 能力层 | `async convertXlsxToYaml()` 纯转换逻辑（ESM 动态 import xlsx）。Excel 由用户提供，产出 YAML 存入 `enterprise/test-cases/` |
| 3 | **配置加载** | → 能力层 | `loadConfig()` 是纯代码。`mcp.config.yaml`(开源默认)在仓库根；`mcp.enterprise.yaml`(企业覆盖)在 `enterprise/configs/` |
| 4 | **测试报告** | → 分开 | **工具**（aggregator 聚合/统计/计算）→ 能力层；**实例**（report-xxx.json）→ `enterprise/reports/` ★.gitignore |

### 14.3 `enterprise/` 各目录功能定义

#### 14.3.1 environments/ — 环境配置（必须）🔴致命

```yaml
# enterprise/environments/test-env.yaml
name: "test-env"
target:
  base_url: "https://test.internal.company.com"
  login_url: "https://test.internal.company.com/login"
accounts:
  admin:
    username: "admin"
    password: "${ENV_ADMIN_PASSWORD}"   # 密码走环境变量
```

#### 14.3.2 test-cases/ — YAML 测试用例（必须）🟡中危

`case-generator` 工具读取 Excel → 转换产出 YAML → 存入此处。或测试人员直接手写极简 YAML。

#### 14.3.3 acc-trees/ — Acc Tree 快照（必须）🟠高危

`web-explore` → 委托 Playwright MCP `browser_snapshot` → 融合 `page.evaluate()` DOM 数据 → 写入增强 Acc Tree YAML。含企业内部系统页面结构、字段名、API 端点。

#### 14.3.4 plans/ — 执行计划（必须）🟠高危

**功能**：Phase 1 LLM 推理的**结构化产出**——将人工写的自然语言用例翻译为机器可执行的 Playwright 操作序列，是推理-执行分离架构的关键依赖。

**核心作用**：让 Phase 2 的 Worker Pool **完全脱离 LLM** 执行。Worker 直接读取 `.plan.yaml` → 按 locators 降级链依次尝试 → 纯 Playwright API。

**三个额外作用**：缓存加速（同一条用例第二次跑跳过 Phase 1）、人工审计（检查 LLM 推理是否合理）、人工修正（LLM 推理有误时直接编辑 plan 文件）。

**重新生成条件**：用例 YAML 或关联 Acc Tree 被修改时自动触发；用户可显式加 `--replan` 强制重推理。

#### 14.3.5 reports/ — 测试报告实例（必须）🟠高危

`test-case-executor` 执行完成后 → `report/aggregator.ts` 聚合 → `report/writer.ts` 写入 JSON 到 `enterprise/reports/`。测试结果反映企业内部系统质量和缺陷信息。

#### 14.3.6 screenshots/ + traces/ — 截图 + Trace（必须）🟠高危

Phase 2/3 执行中：失败自动截图 + 录 Trace。截图直接暴露企业内部系统界面。

#### 14.3.7 auth/ — 登录态缓存（可选）🔴致命

| 观点 | 判定 |
|------|:---:|
| "每条 case 都重新登录" | ✅ 完全可行 — 企业测试环境无反爬，Cookie 15 分钟过期无所谓 |
| "Worker Pool 多进程共享" | ✅ 有价值 — 12 个 Worker 一次登录全部复用，节省 12× 登录耗时 |
| "CI/CD 跨 session 缓存" | ⚠️ 企业 Cookie 15 分钟过期 → 跨天缓存无意义。仅同一次 CI Run 内有价值 |

**结论**：保留 `auth/` 作为**可选加速缓存**——不登录也能跑但更慢。企业 Cookie 短过期意味着跨 session 缓存价值有限，但对同一批并行执行的 12 个 Worker 仍有 12× 加速价值。含企业系统 Cookie/Token 🔴致命。

#### 14.3.8 dictionaries/projects/ — 项目组件字典（必须）🟡中危

`web-component-scout` → 采集 DOM 组件签名 → 对照 `base/controls.yaml` → 写入 `enterprise/dictionaries/projects/`。

#### 14.3.9 configs/ — 企业覆盖配置（必须）🔴致命

`codehub/repo.yaml`（企业 CodeHub 仓库地址/branch）+ `mcp.enterprise.yaml`（覆盖 `mcp.config.yaml`）。

### 14.4 能力层完整目录

```
src/capability/
├── index.ts                          # 统一导出
├── tools/registry.ts                 # 6 个自研 MCP 工具
├── playwright/                       # pw-tools.ts 合并封装 + adapter.ts 接口
│   ├── adapter.ts                    #   PwAdapter 统一接口
│   ├── navigate.ts                   # → browser_navigate
│   ├── click.ts                      # → browser_click
│   ├── fill.ts                       # → browser_type
│   ├── form.ts                       # → browser_fill_form
│   ├── select.ts                     # → browser_select_option
│   ├── hover.ts                      # → browser_hover
│   ├── keyboard.ts                   # → browser_press_key
│   ├── wait.ts                       # → browser_wait_for
│   ├── snapshot.ts                   # → browser_snapshot
│   ├── screenshot.ts                 # → browser_take_screenshot
│   ├── evaluate.ts                   # → browser_evaluate
│   └── ...10 files...
├── engine/                           # 核心引擎
│   ├── acc-tree.ts                   #   Acc Tree 增强采集
│   ├── interaction-inferrer.ts       #   配置驱动事件推断
│   ├── locator-builder.ts            #   多策略定位器
│   ├── explorer.ts                   #   BFS 页面探索
│   ├── worker-pool-manager.ts        #   Worker Pool 管理
│   ├── task-scheduler.ts             #   任务调度(parGroup亲和性+工作窃取)
│   ├── resource-detector.ts          #   资源检测
│   └── dom-collector.ts              #   DOM 采集
├── analysis/                         # 组件分析
│   ├── component-analyzer.ts
│   └── component-scout.ts
├── yaml/reader.ts + writer.ts        # YAML 读写工具
├── excel/parser.ts + converter.ts    # Excel 转换工具
├── config/loader.ts + generator.ts   # 配置加载工具
└── report/aggregator.ts + writer.ts  # 报告生成工具
```

### 14.5 数据流：能力层工具 → 企业运行时层

```
能力层工具                              产出                       企业运行时层
─────────────────────────────────────  ────────────────────      ────────────
web-init                               (登录态 Cookie)     →     auth/*.json
web-explore                            (增强 Acc Tree)    →     acc-trees/*.yaml
case-generator                         (YAML 测试用例)    →     test-cases/*.yaml
test-case-executor (Phase 1)           (执行计划)         →     plans/*.plan.yaml
test-case-executor (Phase 2-3)         (测试报告 JSON)    →     reports/*.json
                                       (失败截图)         →     screenshots/*.png
                                       (Trace)            →     traces/*.zip
web-component-scout                    (项目组件配置)     →     dictionaries/projects/*/
config/loader (企业覆盖)               (企业配置读取)     ←     configs/mcp.enterprise.yaml
```

### 14.6 迁移计划 (7 阶段)

| 阶段 | 内容 | 编译保证 |
|:---:|------|:---:|
| 1 | 新建 `src/capability/` 目录结构 (engine/playwright/yaml/excel/config/report/analysis/tools) — playwright 已合并为 pw-tools.ts | ✅ 目录不影响编译 |
| 2 | 迁移 15 个 `src/core/*.ts` → `src/capability/` 对应子目录 + 修正 import 路径 | ✅ 逐文件 mv + sed |
| 3 | 新建 Playwright 封装层 (adapter.ts + 23 个封装工具) | ✅ 新文件 |
| 4 | 更新 `src/server/factory.ts` + `src/entries/` 的 import 路径 | ✅ 仅改路径 |
| 5 | 拆分 `case-generator.ts` → `excel/parser.ts` + `excel/converter.ts`；拆分 `report-aggregator.ts` → `report/aggregator.ts` + `report/writer.ts` | ✅ 拆分纯数据部分 |
| 6 | 删除 `src/core/` + `src/config/` + `src/tools/` 旧目录；`grep -r` 验证零引用 | ✅ 零残留引用 |
| 7 | 更新蓝图第五章 (目录结构)、CLAUDE.md、四语言 README | ✅ 仅文档 |

每阶段独立可编译 `npx tsc --noEmit`。

### 14.7 企业层判定总结

| 目录 | 保留? | 风险 | 说明 |
|------|:---:|:---:|------|
| `environments/` | ✅ 必须 | 🔴 | URL/账号/租户 |
| `test-cases/` | ✅ 必须 | 🟡 | 用例文本 |
| `acc-trees/` | ✅ 必须 | 🟠 | 页面结构 |
| `plans/` | ✅ 必须 | 🟠 | 执行计划 |
| `reports/` | ✅ 必须 | 🟠 | 测试报告 ★核心产出 |
| `screenshots/` | ✅ 必须 | 🟠 | 内部界面 |
| `traces/` | ✅ 必须 | 🟠 | Trace |
| `auth/` | ✅ 可选 | 🔴 | Cookie 15分钟过期，仅同次 CI Run 有价值 |
| `dictionaries/projects/` | ✅ 必须 | 🟡 | 组件字典 |
| `configs/` | ✅ 必须 | 🔴 | CodeHub 信息 |
