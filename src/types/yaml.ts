/**
 * YAML 数据格式类型定义
 * Acc Tree — 4 扁维: locators / a11y+text / geometry / interaction
 */

import type { InteractionInfo } from './interaction-events.js';

// ===== Acc Tree =====

/** DOM 属性（精简到 8 个核心字段 + 组件感知字段） */
export interface DomAttributes {
  dataTestid: string | null;
  dataQa: string | null;
  placeholder: string | null;
  type: string | null;
  value: string | null;
  name: string | null;
  href: string | null;
  title: string | null;
}

export interface DomInfo {
  tagName: string;
  id: string | null;
  className: string | null;
  /** 检测到的组件前缀 (ant-/el-/n-/arco- 等) */
  componentPrefix: string | null;
  attributes: DomAttributes;
}

/** ARIA 信息 + 文本内容合并 */
export interface A11yInfo {
  role: string;
  name: string;
  level: number | null;
  checked: boolean | 'mixed' | null;
  disabled: boolean | null;
  expanded: boolean | null;
  selected: boolean | null;
  pressed: boolean | null;
  required: boolean | null;
  haspopup: string | null;
  /** 元素内文本（截断到 200 字符） */
  textContent: string | null;
}

export interface GeometryInfo {
  boundingBox: { x: number; y: number; width: number; height: number } | null;
  isInViewport: boolean;
  isVisible: boolean;
}

export interface CssLocator {
  selector: string;
  priority: number;
  strategy: string;
  uniqueness: number;
  sample: boolean;
}

export interface Locators {
  getByTestId?: string[] | null;
  getByRole?: [string, Record<string, unknown>] | null;
  getByLabel?: string | null;
  getByText?: string[] | null;
  getByPlaceholder?: string[] | null;
  css?: CssLocator[] | null;
  xpath?: string | null;
}

/** Acc Tree 节点 — 4 扁维: locators / a11y+text / geometry / interaction */
export interface AccTreeNode {
  ref: string;
  dom: DomInfo;
  a11y: A11yInfo;
  geometry: GeometryInfo;
  locators: Locators;
  interaction: InteractionInfo;
  children?: AccTreeNode[];
}

export interface PageMeta {
  url: string;
  title: string;
  explored_at: string;
  mode: 'quick' | 'deep';
  total_elements: number;
  load_time_ms: number;
  framework?: string | null;
  ui_library?: string | null;
}

export interface PageLink {
  text: string;
  href: string;
  element_ref: string;
}

export interface AccTreeDocument {
  page: PageMeta;
  links: PageLink[];
  tree: AccTreeNode[];
}
