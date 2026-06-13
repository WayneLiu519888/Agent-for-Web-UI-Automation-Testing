# 交互事件字典体系

## 目录结构
```
dictionaries/
├── README.md
├── base/                  # 基础字典（提交 git）
│   ├── events.yaml        # 60+ 交互事件注册表
│   └── controls.yaml      # 声明式 match 规则引擎
├── projects/              # 项目字典（.gitignore）
│   └── {project-name}/
│       ├── components.yaml
│       └── _overrides.yaml
└── schemas/               # JSON Schema 校验
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
