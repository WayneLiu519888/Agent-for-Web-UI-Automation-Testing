# 交互事件字典体系

## 层级归属

| 路径 | 层级 | Git | 说明 |
|------|------|:---:|------|
| `base/` | **能力层** | ✅ 提交 | 通用交互事件 + 控件规则，随版本发布 |
| `schemas/` | **能力层** | ✅ 提交 | JSON Schema 校验文件 |
| `README.md` | **能力层** | ✅ 提交 | 字典体系说明 |
| `projects/` | **企业运行时层** | ❌ .gitignore | 项目组件字典，`web-component-scout` 自动生成 |

## 目录结构
```
dictionaries/
├── README.md
├── base/                  # 能力层（提交 git）
│   ├── events.yaml        # 65 种交互事件注册表
│   └── controls.yaml      # 20+ 声明式 match 规则
├── projects/              # 企业运行时层（.gitignore）
│   └── {project-name}/
│       ├── components.yaml    # web-component-scout 自动生成
│       └── _overrides.yaml    # 人工修正（最高优先级）
└── schemas/               # 能力层（提交 git）
```

## 三级优先级
1. _overrides.yaml (最高) — 人工精确控制
2. components.yaml — web-component-scout 自动生成
3. base/controls.yaml (默认) — 通用 HTML/ARIA 规则

## match 语法
- `tagName`: HTML 标签名
- `role`: ARIA 角色
- `classContains`: className 包含子串
- `componentContains`: 组件类型包含子串
- `domHasAttr`: DOM 属性存在
- `domAttr`: DOM 属性等于指定值
- `a11yAttr`: ARIA 属性等于指定值
- `all`: AND 组合
- `any`: OR 组合
