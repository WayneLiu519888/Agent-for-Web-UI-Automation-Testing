/**
 * 双层配置加载器 — 开源默认 + 企业覆盖深度合并
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { resolvePath } from '../utils/paths.js';

export interface McpConfig {
  browser: {
    channel: string; headless: boolean;
    viewport: { width: number; height: number };
    locale: string; timezone: string; args: string[];
  };
  explorer: {
    mode: string; max_depth: number; max_pages: number;
    filter_exclude: string[]; snapshot_compact: boolean;
  };
  executor: {
    plan_mode: string; llm_max_concurrency: number;
    batch_size: number; plan_timeout_ms: number;
    worker_pool: {
      max_workers: number | 'auto'; min_workers: number;
      initial_workers: number | 'auto'; spawn_interval_ms: number;
      resource_check: { enabled: boolean; interval_ms: number; memory_low_watermark_mb: number; memory_high_watermark_mb: number };
      lifecycle: { heartbeat_interval_ms: number; heartbeat_timeout_ms: number; max_consecutive_crashes: number; crash_backoff_base_ms: number; restart_after_n_tasks: number; task_timeout_ms: number };
      work_stealing: boolean; group_affinity: string;
    };
    retry: number; stop_on_critical_failure: boolean;
    action_timeout: number; navigation_timeout: number; expect_timeout: number;
    screenshot_on_failure: boolean; trace_on_failure: boolean;
    per_worker_request_delay_ms: number;
    report: { realtime_progress: boolean; aggregate_timeout_ms: number };
  };
  paths: {
    environments: string; acc_trees: string; test_cases: string;
    auth_states: string; screenshots: string; reports: string; traces: string;
  };
  report: { format: string; include_screenshots: boolean; include_traces: boolean; webhook_url: string | null };
  logging: { level: string; file: string; max_size: string; max_files: number };
}

const defaultConfig: McpConfig = {
  browser: {
    channel: 'chromium', headless: true,
    viewport: { width: 1920, height: 1080 },
    locale: 'zh-CN', timezone: 'Asia/Shanghai',
    args: ['--disable-dev-shm-usage', '--no-sandbox'],
  },
  explorer: {
    mode: 'quick', max_depth: 2, max_pages: 50,
    filter_exclude: ['logout', '/api/'], snapshot_compact: false,
  },
  executor: {
    plan_mode: 'sprint', llm_max_concurrency: 4, batch_size: 10, plan_timeout_ms: 60000,
    worker_pool: {
      max_workers: 'auto', min_workers: 1, initial_workers: 'auto', spawn_interval_ms: 800,
      resource_check: { enabled: true, interval_ms: 5000, memory_low_watermark_mb: 1024, memory_high_watermark_mb: 2048 },
      lifecycle: { heartbeat_interval_ms: 3000, heartbeat_timeout_ms: 15000, max_consecutive_crashes: 3, crash_backoff_base_ms: 5000, restart_after_n_tasks: 10, task_timeout_ms: 120000 },
      work_stealing: true, group_affinity: 'soft',
    },
    retry: 1, stop_on_critical_failure: true,
    action_timeout: 10000, navigation_timeout: 30000, expect_timeout: 5000,
    screenshot_on_failure: true, trace_on_failure: true,
    per_worker_request_delay_ms: 100,
    report: { realtime_progress: true, aggregate_timeout_ms: 300000 },
  },
  paths: {
    environments: 'environments', acc_trees: 'acc-trees', test_cases: 'test-cases',
    auth_states: 'auth', screenshots: 'screenshots', reports: 'reports', traces: 'traces',
  },
  report: { format: 'json', include_screenshots: true, include_traces: false, webhook_url: null },
  logging: { level: 'info', file: 'logs/mcp-server.log', max_size: '10MB', max_files: 5 },
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

let cachedConfig: McpConfig | null = null;

export function loadConfig(): McpConfig {
  if (cachedConfig) return cachedConfig;
  let config = { ...defaultConfig };
  // 尝试加载开源 mcp.config.yaml
  const openPath = path.join(process.cwd(), 'mcp.config.yaml');
  if (fs.existsSync(openPath)) {
    const yaml = require('js-yaml');
    const fileConfig = yaml.load(fs.readFileSync(openPath, 'utf8'));
    config = deepMerge(config, fileConfig);
  }
  // 企业覆盖
  const epPath = resolvePath('configs', 'mcp.enterprise.yaml');
  if (fs.existsSync(epPath)) {
    const yaml = require('js-yaml');
    const epConfig = yaml.load(fs.readFileSync(epPath, 'utf8'));
    config = deepMerge(config, epConfig);
  }
  cachedConfig = config;
  return config;
}
