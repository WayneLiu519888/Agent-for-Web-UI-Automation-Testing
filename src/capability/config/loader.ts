/**
 * 配置加载器 — 读取 mcp.config.yaml + 硬编码默认值
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { load as yamlLoad } from 'js-yaml';

// 以下为不变常量，直接硬编码
const BROWSER_CHANNEL = 'chromium';
const BROWSER_LOCALE = 'zh-CN';
const BROWSER_TIMEZONE = 'Asia/Shanghai';
const BROWSER_ARGS = ['--disable-dev-shm-usage'];
const STOP_ON_CRITICAL_FAILURE = true;
const SCREENSHOT_ON_FAILURE = true;
const REALTIME_PROGRESS = true;
const REPORT_FORMAT = 'json';

export interface McpConfig {
  browser: {
    headless: boolean;
    viewport: { width: number; height: number };
  };
  explorer: {
    mode: string; max_depth: number; max_pages: number;
    filter_exclude: string[];
  };
  executor: {
    plan_mode: string; llm_max_concurrency: number;
    batch_size: number; plan_timeout_ms: number;
    retry: number;
    action_timeout: number; navigation_timeout: number; expect_timeout: number;
    trace_on_failure: boolean;
    per_worker_request_delay_ms: number;
  };
  report: { include_screenshots: boolean; include_traces: boolean };
  logging: { level: string; file: string; max_size: string; max_files: number };
  ip_whitelist: string[];
}

const defaultConfig: McpConfig = {
  browser: {
    headless: true,
    viewport: { width: 1920, height: 1080 },
  },
  explorer: {
    mode: 'quick', max_depth: 2, max_pages: 50,
    filter_exclude: ['logout', '/api/'],
  },
  executor: {
    plan_mode: 'sprint', llm_max_concurrency: 4, batch_size: 10, plan_timeout_ms: 60000,
    retry: 1,
    action_timeout: 10000, navigation_timeout: 30000, expect_timeout: 5000,
    trace_on_failure: true,
    per_worker_request_delay_ms: 100,
  },
  report: { include_screenshots: true, include_traces: false },
  logging: { level: 'info', file: 'logs/mcp-server.log', max_size: '10MB', max_files: 5 },
  ip_whitelist: ['127.0.0.1', '::1'],
};

function deepMerge(base: any, override: any): any {
  const result = { ...base };
  for (const key of Object.keys(override)) {
    if (override[key] && typeof override[key] === 'object' && !Array.isArray(override[key])) {
      result[key] = deepMerge(base[key] || {}, override[key]);
    } else {
      result[key] = override[key];
    }
  }
  return result;
}

/**
 * 根据 CHROMIUM_SANDBOX 环境变量控制沙箱
 * CHROMIUM_SANDBOX=false 时添加 --no-sandbox（仅限 Docker/CI）
 */
function applySandboxConfig(args: string[]): string[] {
  return process.env.CHROMIUM_SANDBOX === 'false'
    ? [...args, '--no-sandbox']
    : args;
}

let cachedConfig: McpConfig | null = null;

export function loadConfig(): McpConfig {
  if (cachedConfig) return cachedConfig;

  let config = { ...defaultConfig };
  const configPath = path.join(process.cwd(), 'mcp.config.yaml');
  if (fs.existsSync(configPath)) {
    const fileConfig = yamlLoad(fs.readFileSync(configPath, 'utf8'));
    config = deepMerge(config, fileConfig);
  }

  cachedConfig = config;
  return config;
}

/** 获取包含硬编码常量的完整浏览器配置（供执行层使用） */
export function getBrowserConfig(config: McpConfig) {
  return {
    channel: BROWSER_CHANNEL,
    headless: config.browser.headless,
    viewport: config.browser.viewport,
    locale: BROWSER_LOCALE,
    timezone: BROWSER_TIMEZONE,
    args: applySandboxConfig([...BROWSER_ARGS]),
  };
}

/** 获取执行器运行时配置（合并硬编码不变项） */
export function getExecutorConfig(config: McpConfig) {
  return {
    ...config.executor,
    stop_on_critical_failure: STOP_ON_CRITICAL_FAILURE,
    screenshot_on_failure: SCREENSHOT_ON_FAILURE,
  };
}

/** 获取报告运行时配置 */
export function getReportConfig(config: McpConfig) {
  return {
    ...config.report,
    format: REPORT_FORMAT,
    realtime_progress: REALTIME_PROGRESS,
  };
}
