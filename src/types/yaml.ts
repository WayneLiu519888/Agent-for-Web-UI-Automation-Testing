/**
 * YAML 数据格式类型定义
 * Acc Tree / TestCase / Environment / ExecutionPlan / Report
 */

import type { InteractionInfo } from './interaction-events.js';

// ===== Acc Tree =====
export interface DomAttributes {
  dataTestid: string | null;
  dataQa: string | null;
  dataCy: string | null;
  dataVAttrs: string[];
  href: string | null;
  type: string | null;
  placeholder: string | null;
  name: string | null;
  value: string | null;
  title: string | null;
  src: string | null;
  alt: string | null;
  tabindex: number | null;
  autocomplete: string | null;
  list: string | null;
  min: string | null;
  max: string | null;
  step: string | null;
  maxlength: string | null;
  pattern: string | null;
  accept: string | null;
  multiple: boolean | null;
  ariaLabel: string | null;
  ariaExpanded: string | null;
}

export interface DomInfo {
  tagName: string;
  id: string | null;
  className: string | null;
  attributes: DomAttributes;
}

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
  readonly: boolean | null;
  multiline: boolean | null;
  haspopup: string | null;
  roledescription: string | null;
}

export interface GeometryInfo {
  boundingBox: { x: number; y: number; width: number; height: number } | null;
  isInViewport: boolean;
  isVisible: boolean;
  zIndex: number | null;
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

export interface FrameworkInfo {
  detected: string | null;
  componentType: string | null;
  componentPrefix: string | null;
}

export interface TextContent {
  innerText: string | null;
  textContent: string | null;
}

export interface AccTreeNode {
  ref: string;
  dom: DomInfo;
  a11y: A11yInfo;
  geometry: GeometryInfo;
  locators: Locators;
  interaction: InteractionInfo;
  framework: FrameworkInfo;
  text: TextContent;
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

// ===== 测试用例 =====
export interface TestCase {
  id: string;
  title: string;
  priority: 'P0' | 'P1' | 'P2' | 'P3';
  tags?: string[];
  author?: string;
  created_at?: string;
  environment: string;
  account?: string;
  preconditions: string;
  steps: string;
  expected: string;
  acc_tree?: string;
  par_group?: string;
  retry?: number;
  screenshot_on?: 'always' | 'failure' | 'never';
}

// ===== 环境配置 =====
export interface EnvironmentConfig {
  name: string;
  description: string;
  target: { base_url: string; login_url: string; logout_url?: string };
  accounts: Record<string, { username: string; password: string; role: string; tenant: string }>;
  tenants?: Array<{ name: string; id: string; display_name: string }>;
  browser: { channel: string; headless: boolean; viewport: { width: number; height: number }; locale: string; timezone: string };
  timeouts: { navigation: number; action: number; expect: number };
  login_flow: {
    type: 'form' | 'sso' | 'oauth' | 'custom';
    steps: Array<{ type: string; url?: string; target?: Record<string, unknown>; value?: string }>;
    success_indicator: { type: string; value: string };
    save_storage_state?: string;
  };
  hooks: { before_all: unknown; after_all: unknown; on_error: string };
}

// ===== 执行计划 =====
export interface ExecutionStep {
  index: number;
  action: { type: string; description: string };
  locators: Array<{ strategy: string; args: unknown[]; selector?: string }>;
  value?: string;
  waitAfter?: { type: 'time' | 'text' | 'url'; value?: string | number };
  screenshot?: boolean;
}

export interface ExecutionPlan {
  caseId: string;
  title: string;
  priority: string;
  preconditions: string;
  steps: ExecutionStep[];
  expected: string;
  environment: string;
  accTreeRef?: string;
  parGroup?: string;
  generatedAt: string;
  planMode: 'sprint' | 'strict' | 'hybrid';
}

// ===== 执行报告 =====
export interface CaseResult {
  caseId: string;
  title: string;
  status: 'passed' | 'failed' | 'skipped' | 'error';
  durationMs: number;
  phase: string;
  error?: string;
  screenshots: string[];
  tracePath?: string;
  workerId?: string;
}

export interface TestReport {
  total: number; passed: number; failed: number; skipped: number;
  durationMs: number; workersUsed: number; peakMemoryMb: number;
  results: CaseResult[];
  startedAt: string; completedAt: string;
}
